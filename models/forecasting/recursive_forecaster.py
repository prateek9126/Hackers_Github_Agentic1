"""
Recursive Multi-Step Forecaster for SIH26153.
Implements autoregressive rollout over future horizons t+1 -> t+2 -> ... -> t+K.
Synthesizes expected feature states using empirical class centroids without
accessing actual future traffic, strictly maintaining the causal temporal barrier.
"""

import os
from typing import Dict, List, Optional, Tuple, Any, Union
import numpy as np

from states.taxonomy import (
    AttackStage,
    StateType,
    STAGE_NAMES,
    STAGE_MITRE_MAPPING,
    STAGE_SEVERITY_WEIGHTS,
    NUM_ATTACK_STAGES,
)
from models.forecasting.trajectory import TrajectoryNode, TrajectoryEdge, AttackTrajectory


class StageFeatureProfiler:
    """
    Computes and manages empirical feature centroids for each attack stage
    based exclusively on the training partition.
    Used to project synthetic state vectors during recursive rollout.
    """

    def __init__(self, num_classes: int = NUM_ATTACK_STAGES, feature_dim: int = 55):
        self.num_classes = num_classes
        self.feature_dim = feature_dim
        # Shape: (num_classes, feature_dim)
        self.centroids = np.zeros((num_classes, feature_dim), dtype=np.float32)
        self.global_mean = np.zeros(feature_dim, dtype=np.float32)
        self.class_counts = np.zeros(num_classes, dtype=np.int64)
        self.is_fitted = False

    def fit(self, X_train: np.ndarray, y_train: np.ndarray) -> "StageFeatureProfiler":
        """
        Fits stage centroids from training sequences.
        Args:
            X_train: (N, W, D) or (N, D) feature array
            y_train: (N,) or (N, 1) attack stage labels
        """
        if len(X_train.shape) == 3:
            # S(t) is at index -1
            X_inst = X_train[:, -1, :]
        else:
            X_inst = X_train

        self.feature_dim = X_inst.shape[1]
        self.global_mean = np.mean(X_inst, axis=0).astype(np.float32)
        y_flat = np.array(y_train).flatten().astype(np.int64)

        for c in range(self.num_classes):
            mask = (y_flat == c)
            count = int(np.sum(mask))
            self.class_counts[c] = count
            if count > 0:
                self.centroids[c] = np.mean(X_inst[mask], axis=0).astype(np.float32)
            else:
                # Fallback to global mean for unrepresented attack stages
                self.centroids[c] = self.global_mean.copy()

        self.is_fitted = True
        return self

    def synthesize_state(self, prob_dist: np.ndarray) -> np.ndarray:
        """
        Computes the expected feature state vector x^(t+k) = sum_c P(Stage=c) * centroid_c.
        This provides a smooth, uncertainty-weighted representation of the future network state.
        """
        if not self.is_fitted:
            raise RuntimeError("StageFeatureProfiler must be fitted before synthesizing states.")
        probs = np.array(prob_dist).flatten()
        # Shape: (D,) = (num_classes, D).T @ (num_classes,)
        synth_x = self.centroids.T @ probs
        return synth_x.astype(np.float32)

    def extract_salient_features(
        self, state_vec: np.ndarray, feature_names: Optional[List[str]] = None, top_n: int = 5
    ) -> Dict[str, float]:
        """
        Extracts top salient features by absolute magnitude for explainability.
        """
        vec = np.abs(np.array(state_vec).flatten())
        top_indices = np.argsort(vec)[::-1][:top_n]
        salient = {}
        for idx in top_indices:
            name = feature_names[idx] if feature_names and idx < len(feature_names) else f"feature_{idx}"
            salient[name] = float(state_vec[idx])
        return salient


class MarkovTransitionDynamics:
    """
    Learns and evaluates empirical attack-stage transition probabilities P(S_{t+1} | S_t)
    to score edge progressions in the attack trajectory graph.
    """

    def __init__(self, num_classes: int = NUM_ATTACK_STAGES, smoothing_alpha: float = 1e-3):
        self.num_classes = num_classes
        self.alpha = smoothing_alpha
        # Transition matrix T[i, j] = P(j | i)
        self.transition_matrix = np.full((num_classes, num_classes), smoothing_alpha, dtype=np.float32)
        # Normalize rows to sum to 1.0
        self.transition_matrix /= np.sum(self.transition_matrix, axis=1, keepdims=True)
        self.is_fitted = False

    def fit_from_sequences(self, y_sequences: List[np.ndarray]) -> "MarkovTransitionDynamics":
        """
        Counts transitions S(t) -> S(t+1) across sequential targets.
        """
        counts = np.zeros((self.num_classes, self.num_classes), dtype=np.float64)
        for seq in y_sequences:
            seq_flat = np.array(seq).flatten().astype(np.int64)
            for t in range(len(seq_flat) - 1):
                s_from = seq_flat[t]
                s_to = seq_flat[t + 1]
                if 0 <= s_from < self.num_classes and 0 <= s_to < self.num_classes:
                    counts[s_from, s_to] += 1.0

        # Laplace smoothing
        smoothed = counts + self.alpha
        row_sums = np.sum(smoothed, axis=1, keepdims=True)
        self.transition_matrix = (smoothed / row_sums).astype(np.float32)
        self.is_fitted = True
        return self

    def get_transition_probability(self, from_stage: int, to_stage: int) -> float:
        """Returns P(to_stage | from_stage)."""
        if 0 <= from_stage < self.num_classes and 0 <= to_stage < self.num_classes:
            return float(self.transition_matrix[from_stage, to_stage])
        return float(1.0 / self.num_classes)

    @staticmethod
    def classify_progression(from_stage: int, to_stage: int) -> str:
        """Categorizes attack progression type."""
        if from_stage == to_stage:
            return "PERSISTENCE" if from_stage > 0 else "STABLE_NORMAL"
        if to_stage == AttackStage.LATERAL_MOVEMENT:
            return "LATERAL_MOVEMENT"
        if to_stage > from_stage:
            return "ESCALATION"
        return "DE_ESCALATION"


class RecursiveMultiStepForecaster:
    """
    Executes K-step recursive rollout:
    S(t) -> S(t+1) -> S(t+2) -> ... -> S(t+K).
    At each step k, predicts P(S(t+k)), synthesizes synthetic state x^(t+k),
    and updates the rolling observation buffer.
    """

    def __init__(
        self,
        base_model: Any,
        profiler: StageFeatureProfiler,
        dynamics: MarkovTransitionDynamics,
        feature_names: Optional[List[str]] = None,
        num_classes: int = NUM_ATTACK_STAGES,
    ):
        self.model = base_model
        self.profiler = profiler
        self.dynamics = dynamics
        self.feature_names = feature_names or []
        self.num_classes = num_classes

    def forecast(
        self,
        initial_sequence: np.ndarray,
        horizon: int = 5,
        dt_sec: float = 20.0,
        current_time_str: Optional[str] = None,
        current_stage_id: Optional[int] = None,
    ) -> AttackTrajectory:
        """
        Performs recursive K-step forecasting given initial observation sequence.

        Args:
            initial_sequence: Historical state sequence of shape (1, W, D) or (W, D)
            horizon: Number of steps K to project forward (default 5)
            dt_sec: Duration per window in seconds (default 20.0s)
            current_time_str: Formatted string representing current observation time t
            current_stage_id: Optional ground truth or estimated stage at current time t

        Returns:
            AttackTrajectory containing full graph, nodes, edges, risk, and structured forecast.
        """
        # Ensure 3D buffer of shape (1, W, D)
        if len(initial_sequence.shape) == 2:
            buffer = np.expand_dims(initial_sequence, axis=0).copy()
        elif len(initial_sequence.shape) == 3:
            buffer = initial_sequence.copy()
        else:
            raise ValueError(f"Expected 2D or 3D initial sequence, got shape {initial_sequence.shape}")

        W = buffer.shape[1]
        D = buffer.shape[2]
        pred_time = current_time_str or "2026-09-08T00:00:00Z"

        # Step 0: Current State Node S(t)
        current_x = buffer[0, -1, :]
        if current_stage_id is None:
            # Infer current stage via instantaneous prediction or profiler distance
            current_probs = self.model.predict_proba(buffer)[0]
            current_stage_id = int(np.argmax(current_probs))
        else:
            current_probs = np.zeros(self.num_classes, dtype=np.float32)
            current_probs[current_stage_id] = 1.0

        current_stage_name = STAGE_NAMES.get(current_stage_id, f"STAGE_{current_stage_id}")
        nodes: List[TrajectoryNode] = []
        edges: List[TrajectoryEdge] = []
        cumulative_risk: List[float] = []

        # Current node (step 0)
        curr_risk = float(np.sum(current_probs * [STAGE_SEVERITY_WEIGHTS.get(c, 0.0) for c in range(self.num_classes)]))
        cumulative_risk.append(curr_risk)

        nodes.append(
            TrajectoryNode(
                node_id="node_step_0",
                step=0,
                timestamp=f"{pred_time} (+0.0s)",
                stage=current_stage_name,
                stage_id=current_stage_id,
                state_type=StateType.OBSERVED,
                probability=float(current_probs[current_stage_id]),
                confidence=float(current_probs[current_stage_id]),
                probability_distribution={STAGE_NAMES.get(c, str(c)): float(current_probs[c]) for c in range(self.num_classes)},
                supporting_features=self.profiler.extract_salient_features(current_x, self.feature_names),
                mitre_mapping=STAGE_MITRE_MAPPING.get(current_stage_id, {}),
            )
        )

        prev_node_id = "node_step_0"
        prev_stage_id = current_stage_id

        # Recursive Rollout for k = 1 .. K
        for k in range(1, horizon + 1):
            lead_time = k * dt_sec
            # Predict P(S(t+k)) using current rolling buffer
            probs = self.model.predict_proba(buffer)[0]
            top_stage_id = int(np.argmax(probs))
            top_prob = float(probs[top_stage_id])
            top_stage_name = STAGE_NAMES.get(top_stage_id, f"STAGE_{top_stage_id}")

            # Synthesize expected feature vector x^(t+k)
            synth_x = self.profiler.synthesize_state(probs)

            # Roll buffer: drop oldest time step and append synthetic state
            # buffer[:, 1:, :] has shape (1, W-1, D)
            # synth_x[None, None, :] has shape (1, 1, D)
            buffer = np.concatenate([buffer[:, 1:, :], synth_x.reshape(1, 1, D)], axis=1)

            # Transition dynamics from prev_stage_id -> top_stage_id
            trans_prob = self.dynamics.get_transition_probability(prev_stage_id, top_stage_id)
            prog_type = self.dynamics.classify_progression(prev_stage_id, top_stage_id)

            # Calculate risk for step k
            step_risk = float(np.sum(probs * [STAGE_SEVERITY_WEIGHTS.get(c, 0.0) for c in range(self.num_classes)]))
            cumulative_risk.append(step_risk)

            node_id = f"node_step_{k}"
            nodes.append(
                TrajectoryNode(
                    node_id=node_id,
                    step=k,
                    timestamp=f"{pred_time} (+{lead_time:.1f}s)",
                    stage=top_stage_name,
                    stage_id=top_stage_id,
                    state_type=StateType.PREDICTED,
                    probability=top_prob,
                    confidence=top_prob,
                    probability_distribution={STAGE_NAMES.get(c, str(c)): float(probs[c]) for c in range(self.num_classes)},
                    supporting_features=self.profiler.extract_salient_features(synth_x, self.feature_names),
                    mitre_mapping=STAGE_MITRE_MAPPING.get(top_stage_id, {}),
                )
            )

            edges.append(
                TrajectoryEdge(
                    source_node_id=prev_node_id,
                    target_node_id=node_id,
                    transition_probability=trans_prob,
                    progression_type=prog_type,
                    lead_time_sec=lead_time,
                )
            )

            prev_node_id = node_id
            prev_stage_id = top_stage_id

        return AttackTrajectory(
            prediction_time=pred_time,
            current_stage=current_stage_name,
            forecast_horizon=horizon,
            nodes=nodes,
            edges=edges,
            cumulative_risk_trajectory=cumulative_risk,
        )
