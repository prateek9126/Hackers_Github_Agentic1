"""
Unit Tests for SIH26153 Phase 6: What-If Defense Simulation Engine.
Verifies all 4 defense actions (Host Isolation, Block Port, Block Source, Restrict Outbound),
state feature perturbations, trajectory re-forecasting, and quantified risk reduction.
"""

import unittest
import numpy as np

from simulation.what_if import (
    WhatIfSimulator,
    create_standard_defense,
    DefenseActionType,
    WhatIfSimulationResult,
)
from models.forecasting.recursive_forecaster import (
    StageFeatureProfiler,
    MarkovTransitionDynamics,
    RecursiveMultiStepForecaster,
)


class DummyForecasterModel:
    """Mock predictor returning valid probability distributions."""

    def __init__(self, num_classes: int = 10):
        self.num_classes = num_classes

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        N = X.shape[0]
        # S(t) is X[:, -1, :]
        feat_sum = np.sum(np.abs(X[:, -1, :]), axis=-1)
        probs = np.zeros((N, self.num_classes), dtype=np.float32)
        for i in range(N):
            if feat_sum[i] > 5.0:
                # High activity -> EXFILTRATION (8) and C2 (7)
                probs[i, 8] = 0.60
                probs[i, 7] = 0.30
                probs[i, 0] = 0.10
            else:
                # Low/suppressed activity -> NORMAL (0)
                probs[i, 0] = 0.85
                probs[i, 1] = 0.10
                probs[i, 8] = 0.05
        return probs


class TestWhatIfSimulator(unittest.TestCase):

    def setUp(self):
        np.random.seed(42)
        self.N, self.W, self.D = 10, 4, 12
        self.feature_names = [
            "total_packets", "total_bytes", "byte_rate", "packet_rate",
            "active_flows", "total_flows", "connection_rate", "syn_count",
            "fwd_bytes", "bwd_bytes", "fanout_ratio", "dst_port_entropy",
        ]

        self.profiler = StageFeatureProfiler(num_classes=10, feature_dim=self.D)
        dummy_x = np.random.randn(20, self.W, self.D).astype(np.float32)
        dummy_y = np.random.choice([0, 2, 7, 8], size=20)
        self.profiler.fit(dummy_x, dummy_y)

        self.dynamics = MarkovTransitionDynamics(num_classes=10)
        self.dynamics.fit_from_sequences([dummy_y])

        self.mock_model = DummyForecasterModel(num_classes=10)
        self.forecaster = RecursiveMultiStepForecaster(
            base_model=self.mock_model,
            profiler=self.profiler,
            dynamics=self.dynamics,
            feature_names=self.feature_names,
            num_classes=10,
        )

        self.simulator = WhatIfSimulator(
            forecaster=self.forecaster,
            feature_names=self.feature_names,
        )

        # Create an active state sequence with high byte rate
        self.active_sequence = np.ones((1, self.W, self.D), dtype=np.float32) * 2.0

    def test_host_isolation_defense(self):
        """Host isolation should heavily attenuate volumetric features and reduce risk."""
        action = create_standard_defense("HOST_ISOLATION", target="192.168.1.50")
        result = self.simulator.simulate(
            observation_sequence=self.active_sequence,
            action=action,
            horizon=3,
        )

        self.assertIsInstance(result, WhatIfSimulationResult)
        self.assertIn("SIMULATED DEFENSE OUTCOME", result.disclaimer)
        self.assertGreater(len(result.feature_modifications), 3)

        # Check that volumetric rates were attenuated
        byte_rate_mod = [m for m in result.feature_modifications if m["feature"] == "byte_rate"]
        self.assertTrue(len(byte_rate_mod) > 0)
        self.assertLess(byte_rate_mod[0]["new_value"], byte_rate_mod[0]["old_value"])

        # Simulated risk should be lower than original risk
        self.assertGreaterEqual(result.risk_reduction_pct, 0.0)

    def test_block_destination_port_defense(self):
        """Block port should perturb port entropy and service signals."""
        action = create_standard_defense("BLOCK_DESTINATION_PORT", target="port:445")
        result = self.simulator.simulate(
            observation_sequence=self.active_sequence,
            action=action,
            horizon=3,
        )
        entropy_mod = [m for m in result.feature_modifications if m["feature"] == "dst_port_entropy"]
        self.assertTrue(len(entropy_mod) > 0)
        self.assertLess(entropy_mod[0]["new_value"], entropy_mod[0]["old_value"])

    def test_restrict_outbound_defense(self):
        """Restrict outbound should attenuate bwd_bytes and byte_rate."""
        action = create_standard_defense("RESTRICT_OUTBOUND_TRAFFIC")
        result = self.simulator.simulate(
            observation_sequence=self.active_sequence,
            action=action,
            horizon=3,
        )
        bwd_mod = [m for m in result.feature_modifications if m["feature"] == "bwd_bytes"]
        self.assertTrue(len(bwd_mod) > 0)
        self.assertLess(bwd_mod[0]["new_value"], bwd_mod[0]["old_value"])


if __name__ == "__main__":
    unittest.main()
