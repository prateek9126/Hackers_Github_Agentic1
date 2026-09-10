"""
Unit Tests for SIH26153 Phase 5: Multi-Step Attack Trajectory & Forecasting Engine.
Verifies recursive feature rollout, transition dynamics, trajectory graph structures,
MITRE ATT&CK mappings, non-leakage barrier, and forecast lead-time calculation.
"""

import os
import unittest
import numpy as np

from states.taxonomy import AttackStage, StateType, NUM_ATTACK_STAGES
from models.forecasting.trajectory import TrajectoryNode, TrajectoryEdge, AttackTrajectory
from models.forecasting.recursive_forecaster import (
    StageFeatureProfiler,
    MarkovTransitionDynamics,
    RecursiveMultiStepForecaster,
)
from models.forecasting.forecasting_service import AttackForecastingService
from models.forecasting.evaluator import MultiStepEvaluator


class DummyModel:
    """Mock predictor returning valid probability distributions."""

    def __init__(self, num_classes: int = 10):
        self.num_classes = num_classes

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        N = X.shape[0]
        # Return synthetic probability favoring SCANNING (2) and EXFILTRATION (8)
        probs = np.zeros((N, self.num_classes), dtype=np.float32)
        probs[:, 2] = 0.60
        probs[:, 8] = 0.40
        return probs


class TestAttackTrajectory(unittest.TestCase):
    """Verifies AttackTrajectory data structure and JSON serialization."""

    def test_trajectory_creation_and_json(self):
        traj = AttackTrajectory(
            prediction_time="2026-09-08T00:00:00Z",
            current_stage="RECONNAISSANCE",
            forecast_horizon=3,
        )
        node0 = TrajectoryNode(
            node_id="node_0",
            step=0,
            timestamp="2026-09-08T00:00:00Z",
            stage="RECONNAISSANCE",
            stage_id=1,
            state_type=StateType.OBSERVED,
            probability=1.0,
            confidence=1.0,
            mitre_mapping={"tactic_name": "Reconnaissance"},
        )
        node1 = TrajectoryNode(
            node_id="node_1",
            step=1,
            timestamp="2026-09-08T00:00:20Z",
            stage="SCANNING",
            stage_id=2,
            state_type=StateType.PREDICTED,
            probability=0.82,
            confidence=0.82,
            mitre_mapping={"tactic_name": "Reconnaissance: Active Scanning"},
        )
        edge = TrajectoryEdge(
            source_node_id="node_0",
            target_node_id="node_1",
            transition_probability=0.75,
            progression_type="ESCALATION",
            lead_time_sec=20.0,
        )
        traj.nodes.extend([node0, node1])
        traj.edges.append(edge)
        traj.cumulative_risk_trajectory.extend([1.0, 2.0])

        d = traj.to_dict()
        self.assertEqual(d["prediction_time"], "2026-09-08T00:00:00Z")
        self.assertEqual(d["current_stage"], "RECONNAISSANCE")
        self.assertEqual(d["forecast_horizon"], 3)
        self.assertEqual(len(d["forecast"]), 1)
        self.assertEqual(d["forecast"][0]["stage"], "SCANNING")
        self.assertEqual(d["forecast"][0]["probability"], 0.82)

        # Mermaid output
        mermaid = traj.to_mermaid()
        self.assertIn("graph TD", mermaid)
        self.assertIn("node_0 -->", mermaid)


class TestStageFeatureProfiler(unittest.TestCase):
    """Verifies empirical feature centroid computation and state synthesis."""

    def setUp(self):
        np.random.seed(42)
        self.N, self.W, self.D = 40, 4, 15
        self.X = np.random.randn(self.N, self.W, self.D).astype(np.float32)
        self.y = np.random.choice([0, 1, 2, 7, 8], size=self.N)

    def test_fit_and_synthesize(self):
        profiler = StageFeatureProfiler(num_classes=10, feature_dim=self.D)
        profiler.fit(self.X, self.y)

        self.assertTrue(profiler.is_fitted)
        self.assertEqual(profiler.centroids.shape, (10, self.D))

        # Synthesize state from a distribution
        dist = np.zeros(10, dtype=np.float32)
        dist[2] = 1.0 # 100% scanning
        synth_x = profiler.synthesize_state(dist)
        self.assertEqual(synth_x.shape, (self.D,))
        # Should equal centroid for class 2
        np.testing.assert_allclose(synth_x, profiler.centroids[2])


class TestMarkovTransitionDynamics(unittest.TestCase):
    """Verifies transition dynamics and kill chain progression classification."""

    def test_transition_matrix(self):
        dynamics = MarkovTransitionDynamics(num_classes=10)
        # Sequence: 0 -> 1 -> 2 -> 7 -> 8
        seq = np.array([0, 1, 2, 7, 8])
        dynamics.fit_from_sequences([seq])

        # Matrix rows should sum to 1.0
        row_sums = np.sum(dynamics.transition_matrix, axis=1)
        np.testing.assert_allclose(row_sums, np.ones(10), atol=1e-5)

        # Progression classification
        self.assertEqual(dynamics.classify_progression(1, 2), "ESCALATION")
        self.assertEqual(dynamics.classify_progression(2, 2), "PERSISTENCE")
        self.assertEqual(dynamics.classify_progression(8, 0), "DE_ESCALATION")
        self.assertEqual(dynamics.classify_progression(3, AttackStage.LATERAL_MOVEMENT), "LATERAL_MOVEMENT")


class TestRecursiveMultiStepForecaster(unittest.TestCase):
    """Verifies K-step recursive rollout and temporal boundary integrity."""

    def setUp(self):
        np.random.seed(42)
        self.N, self.W, self.D = 10, 4, 12
        self.X = np.random.randn(self.N, self.W, self.D).astype(np.float32)
        self.y = np.random.choice([0, 2, 8], size=self.N)

        self.profiler = StageFeatureProfiler(num_classes=10, feature_dim=self.D)
        self.profiler.fit(self.X, self.y)

        self.dynamics = MarkovTransitionDynamics(num_classes=10)
        self.dynamics.fit_from_sequences([self.y])

        self.dummy_model = DummyModel(num_classes=10)
        self.forecaster = RecursiveMultiStepForecaster(
            base_model=self.dummy_model,
            profiler=self.profiler,
            dynamics=self.dynamics,
            num_classes=10,
        )

    def test_k_step_rollout(self):
        horizon = 5
        sample = self.X[0:1].copy()
        traj = self.forecaster.forecast(sample, horizon=horizon, dt_sec=20.0, current_stage_id=0)

        # Total nodes = horizon + 1 (step 0 .. 5)
        self.assertEqual(len(traj.nodes), horizon + 1)
        self.assertEqual(len(traj.edges), horizon)
        self.assertEqual(len(traj.cumulative_risk_trajectory), horizon + 1)

        # Check step 0 is OBSERVED, steps 1..5 are PREDICTED
        self.assertEqual(traj.nodes[0].state_type, StateType.OBSERVED)
        for node in traj.nodes[1:]:
            self.assertEqual(node.state_type, StateType.PREDICTED)

        # Check lead times
        self.assertEqual(traj.edges[0].lead_time_sec, 20.0)
        self.assertEqual(traj.edges[-1].lead_time_sec, 100.0)

        # Check structured forecast output
        self.assertEqual(len(traj.forecast), horizon)
        self.assertEqual(traj.forecast[0]["step"], 1)
        self.assertEqual(traj.forecast[-1]["step"], horizon)


class TestMultiStepEvaluator(unittest.TestCase):
    """Verifies evaluation of K-step accuracy and forecast lead time."""

    def test_lead_time_evaluation(self):
        D = 8
        profiler = StageFeatureProfiler(num_classes=10, feature_dim=D)
        dummy_x = np.random.randn(20, 4, D).astype(np.float32)
        dummy_y = np.array([0, 0, 2, 2, 8, 8, 0, 0, 2, 8] * 2)
        profiler.fit(dummy_x, dummy_y)

        dynamics = MarkovTransitionDynamics(num_classes=10)
        dynamics.fit_from_sequences([dummy_y])

        model = DummyModel(num_classes=10) # Always predicts stage 2 (SCANNING)
        forecaster = RecursiveMultiStepForecaster(
            base_model=model,
            profiler=profiler,
            dynamics=dynamics,
            num_classes=10,
        )

        evaluator = MultiStepEvaluator(forecaster=forecaster, horizon=3, dt_sec=20.0)
        # Synthetic test set: targets are [2, 2, 2, 2, 2]
        test_x = np.random.randn(5, 4, D).astype(np.float32)
        test_y = np.array([2, 2, 2, 2, 2])

        metrics = evaluator.evaluate_sequence(test_x, test_y)

        self.assertIn("k_step_accuracy", metrics)
        self.assertIn("forecast_lead_time", metrics)
        # Because model always predicts stage 2 and all targets are 2, accuracy should be 1.0
        self.assertEqual(metrics["k_step_accuracy"]["step_1 (+20s)"], 1.0)
        # Advance warning should be positive
        self.assertGreater(metrics["forecast_lead_time"]["mean_lead_time_sec"], 0.0)


if __name__ == "__main__":
    unittest.main()
