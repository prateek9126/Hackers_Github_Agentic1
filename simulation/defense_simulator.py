"""
What-If Defense Simulator.
Allows security operators to apply counterfactual mitigations to the current
network state vector S(t) -> S*(t), triggering model re-forecasting and
computing quantified future risk reduction.
"""

from dataclasses import dataclass
from typing import Dict, List, Any, Optional
import numpy as np
from states.taxonomy import AttackStage, STAGE_SEVERITY_WEIGHTS
from states.state_builder import NetworkStateVector


@dataclass
class SimulatedDefenseAction:
    action_id: str
    name: str
    target_entity: str # e.g. "192.168.1.105" or "port:445"
    affected_features: List[str]
    impact_multiplier: float # e.g. 0.1 means feature is scaled down by 90%
    parameters: Dict[str, Any]


@dataclass
class SimulationResult:
    action: SimulatedDefenseAction
    original_risk: float
    counterfactual_risk: float
    risk_reduction_delta: float
    risk_reduction_pct: float
    original_trajectory_probs: np.ndarray # Shape: (K, C)
    counterfactual_trajectory_probs: np.ndarray # Shape: (K, C)
    lead_time_gain_sec: float


class DefenseSimulator:
    """Executes counterfactual defense interventions on state sequences."""

    def __init__(self, severity_weights: Optional[Dict[int, float]] = None):
        self.severity_weights = severity_weights or STAGE_SEVERITY_WEIGHTS

    def apply_action_to_state(
        self, state: NetworkStateVector, action: SimulatedDefenseAction
    ) -> NetworkStateVector:
        """
        Produce a perturbed counterfactual state S*(t) by attenuating features
        targeted by the defensive intervention.
        """
        perturbed_features = state.features.copy()
        for feat_name in action.affected_features:
            if feat_name in state.feature_names:
                idx = state.feature_names.index(feat_name)
                perturbed_features[idx] *= action.impact_multiplier

        return NetworkStateVector(
            window_index=state.window_index,
            window_start=state.window_start,
            window_end=state.window_end,
            duration_sec=state.duration_sec,
            features=perturbed_features,
            feature_names=state.feature_names,
            ground_truth_stage=state.ground_truth_stage,
            total_bytes=int(state.total_bytes * action.impact_multiplier),
            total_packets=int(state.total_packets * action.impact_multiplier),
            active_connections=state.active_connections,
        )

    def calculate_risk(self, trajectory_probs: np.ndarray) -> float:
        """
        Compute cumulative risk score across K future forecast steps:
        Risk = sum_{k=1}^K sum_{c=0}^{C-1} P(Stage_{t+k} = c) * SeverityWeight(c)
        """
        K, C = trajectory_probs.shape
        total_risk = 0.0
        for k in range(K):
            step_risk = 0.0
            for c in range(C):
                step_risk += trajectory_probs[k, c] * self.severity_weights.get(c, 0.0)
            total_risk += step_risk
        return float(total_risk)

    def evaluate_simulation(
        self,
        action: SimulatedDefenseAction,
        orig_probs: np.ndarray,
        counter_probs: np.ndarray,
        dt_sec: float = 10.0,
    ) -> SimulationResult:
        """Evaluate before/after risk trajectory metrics."""
        orig_risk = self.calculate_risk(orig_probs)
        counter_risk = self.calculate_risk(counter_probs)
        delta_risk = max(0.0, orig_risk - counter_risk)
        pct_reduction = (delta_risk / max(1e-6, orig_risk)) * 100.0

        return SimulationResult(
            action=action,
            original_risk=round(orig_risk, 3),
            counterfactual_risk=round(counter_risk, 3),
            risk_reduction_delta=round(delta_risk, 3),
            risk_reduction_pct=round(pct_reduction, 2),
            original_trajectory_probs=orig_probs,
            counterfactual_trajectory_probs=counter_probs,
            lead_time_gain_sec=dt_sec,
        )
