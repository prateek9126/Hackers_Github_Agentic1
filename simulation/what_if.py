"""
What-If Defense Simulation Engine for SIH26153.
Simulates operational cybersecurity defense actions (Host Isolation, Block Port,
Block Source, Restrict Outbound), perturbs state features based on principled
network assumptions, re-runs multi-step forecasting, and computes risk reduction.
Clearly labeled as: SIMULATED DEFENSE OUTCOME.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Any, Tuple, Union
import numpy as np

from states.taxonomy import AttackStage, STAGE_NAMES, STAGE_SEVERITY_WEIGHTS
from models.forecasting.trajectory import AttackTrajectory
from models.forecasting.recursive_forecaster import RecursiveMultiStepForecaster


class DefenseActionType(str, Enum):
    HOST_ISOLATION = "HOST_ISOLATION"
    BLOCK_DESTINATION_PORT = "BLOCK_DESTINATION_PORT"
    BLOCK_SUSPICIOUS_SOURCE = "BLOCK_SUSPICIOUS_SOURCE"
    RESTRICT_OUTBOUND_TRAFFIC = "RESTRICT_OUTBOUND_TRAFFIC"


@dataclass
class DefenseActionSpecification:
    action_type: DefenseActionType
    target_entity: str                  # e.g., "192.168.1.105", "port:445", "0.0.0.0/0:egress"
    parameters: Dict[str, Any] = field(default_factory=dict)
    description: str = ""
    assumptions: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "action_type": self.action_type.value,
            "target_entity": self.target_entity,
            "parameters": self.parameters,
            "description": self.description,
            "assumptions": self.assumptions,
        }


@dataclass
class WhatIfSimulationResult:
    """
    Complete report comparing original forecast vs simulated counterfactual defense outcome.
    """
    defense_action: DefenseActionSpecification
    disclaimer: str = "SIMULATED DEFENSE OUTCOME — NOT GUARANTEED REAL-WORLD EFFECTIVENESS"
    original_stage: str = ""
    original_risk: float = 0.0
    simulated_risk: float = 0.0
    risk_difference: float = 0.0
    risk_reduction_pct: float = 0.0
    original_forecast: List[Dict[str, Any]] = field(default_factory=list)
    simulated_forecast: List[Dict[str, Any]] = field(default_factory=list)
    simulated_state_features: Dict[str, float] = field(default_factory=dict)
    feature_modifications: List[Dict[str, Any]] = field(default_factory=list)
    assumptions: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "disclaimer": self.disclaimer,
            "defense_action": self.defense_action.to_dict(),
            "original_stage": self.original_stage,
            "original_risk": round(float(self.original_risk), 4),
            "simulated_risk": round(float(self.simulated_risk), 4),
            "risk_difference": round(float(self.risk_difference), 4),
            "risk_reduction_pct": round(float(self.risk_reduction_pct), 2),
            "original_forecast": self.original_forecast,
            "simulated_forecast": self.simulated_forecast,
            "assumptions": self.assumptions,
            "feature_modifications": self.feature_modifications,
        }


class WhatIfSimulator:
    """
    Applies counterfactual defenses to network states and evaluates trajectory impact.
    """

    def __init__(
        self,
        forecaster: RecursiveMultiStepForecaster,
        feature_names: Optional[List[str]] = None,
    ):
        self.forecaster = forecaster
        self.feature_names = feature_names or []

    def simulate(
        self,
        observation_sequence: np.ndarray,
        action: DefenseActionSpecification,
        horizon: int = 5,
        dt_sec: float = 20.0,
    ) -> WhatIfSimulationResult:
        """
        Executes counterfactual simulation:
        1. Generates original forecast from unperturbed sequence.
        2. Applies principled feature perturbations to current window S(t).
        3. Re-runs forecasting on perturbed counterfactual sequence.
        4. Calculates quantified risk reduction.
        """
        if len(observation_sequence.shape) == 2:
            obs = np.expand_dims(observation_sequence, axis=0).copy()
        else:
            obs = observation_sequence.copy()

        # Step 1: Original forecast
        orig_traj: AttackTrajectory = self.forecaster.forecast(
            initial_sequence=obs,
            horizon=horizon,
            dt_sec=dt_sec,
        )
        orig_risk = orig_traj.cumulative_risk_trajectory[1] if len(orig_traj.cumulative_risk_trajectory) > 1 else 0.0

        # Step 2: Perturb current state S(t) = obs[0, -1, :]
        current_state = obs[0, -1, :].copy()
        perturbed_state, mod_log, assumptions = self._apply_defense_mechanics(current_state, action)

        # Construct counterfactual sequence: replace S(t) with perturbed state
        sim_obs = obs.copy()
        sim_obs[0, -1, :] = perturbed_state

        # Step 3: Re-run forecasting on counterfactual sequence
        sim_traj: AttackTrajectory = self.forecaster.forecast(
            initial_sequence=sim_obs,
            horizon=horizon,
            dt_sec=dt_sec,
        )
        sim_risk = sim_traj.cumulative_risk_trajectory[1] if len(sim_traj.cumulative_risk_trajectory) > 1 else 0.0

        # Step 4: Compute risk metrics
        risk_diff = orig_risk - sim_risk
        risk_red_pct = (risk_diff / orig_risk * 100.0) if orig_risk > 1e-4 else 0.0

        feat_dict = {
            self.feature_names[i] if i < len(self.feature_names) else f"feature_{i}": float(perturbed_state[i])
            for i in range(len(perturbed_state))
        }

        # Merge assumptions
        all_assumptions = action.assumptions + assumptions

        return WhatIfSimulationResult(
            defense_action=action,
            original_stage=orig_traj.current_stage,
            original_risk=orig_risk,
            simulated_risk=sim_risk,
            risk_difference=risk_diff,
            risk_reduction_pct=risk_red_pct,
            original_forecast=orig_traj.forecast,
            simulated_forecast=sim_traj.forecast,
            simulated_state_features=feat_dict,
            feature_modifications=mod_log,
            assumptions=all_assumptions,
        )

    def _apply_defense_mechanics(
        self, state_vec: np.ndarray, action: DefenseActionSpecification
    ) -> Tuple[np.ndarray, List[Dict[str, Any]], List[str]]:
        """
        Perturbs features based on the operational mechanism of the defense action.
        """
        new_vec = state_vec.copy()
        mod_log: List[Dict[str, Any]] = []
        assumptions: List[str] = []

        feat_idx_map = {name: i for i, name in enumerate(self.feature_names)}

        def attenuate(feat_name: str, factor: float, rationale: str):
            if feat_name in feat_idx_map:
                idx = feat_idx_map[feat_name]
                old_val = float(new_vec[idx])
                new_vec[idx] *= factor
                mod_log.append({
                    "feature": feat_name,
                    "old_value": round(old_val, 4),
                    "new_value": round(float(new_vec[idx]), 4),
                    "factor": factor,
                    "rationale": rationale,
                })

        if action.action_type == DefenseActionType.HOST_ISOLATION:
            assumptions.extend([
                f"Endpoint {action.target_entity} quarantined via network switch/EDR; 95% of active sessions terminated.",
                "Inbound and outbound throughput drops by 90% to benign management heartbeat baseline.",
                "Lateral traversal to adjacent subnet hosts is completely severed.",
            ])
            attenuate("byte_rate", 0.10, "Host throughput throttled by quarantine ACL")
            attenuate("packet_rate", 0.10, "Host packet rate throttled by quarantine ACL")
            attenuate("total_bytes", 0.10, "Volumetric flow drops post-isolation")
            attenuate("total_packets", 0.10, "Packet counts drop post-isolation")
            attenuate("active_flows", 0.05, "95% of active sockets severed")
            attenuate("total_flows", 0.10, "New socket establishment blocked")
            attenuate("connection_rate", 0.05, "Connection rate suppressed")
            attenuate("bwd_bytes", 0.05, "Outbound exfiltration channel terminated")
            attenuate("fwd_bytes", 0.05, "Inbound payload transmission blocked")
            attenuate("fanout_ratio", 0.20, "Subnet broadcast/sweep connections suppressed")

        elif action.action_type == DefenseActionType.BLOCK_DESTINATION_PORT:
            assumptions.extend([
                f"Perimeter and internal firewalls drop all packets targeted at {action.target_entity}.",
                "SYN connection attempts against the targeted port are rejected or dropped.",
                "Destination port entropy and port sweep metrics normalize.",
            ])
            attenuate("dst_port_entropy", 0.40, "Targeted port traffic suppressed, reducing port entropy")
            attenuate("unique_dst_ports", 0.50, "Targeted listening service removed from accessible ports")
            attenuate("failed_conn_ratio", 0.30, "Rejection bursts against service eliminated")
            attenuate("syn_flow_ratio", 0.50, "SYN scan attempts to blocked port eliminated")
            attenuate("syn_count", 0.50, "Inbound probe volume reduced")

        elif action.action_type == DefenseActionType.BLOCK_SUSPICIOUS_SOURCE:
            assumptions.extend([
                f"Ingress border firewall rule drops all traffic originating from {action.target_entity}.",
                "Unsolicited external scans and brute-force attempts from attacker IP cease.",
                "Source IP entropy and scanning fanout metrics decrease.",
            ])
            attenuate("unique_src_ips", 0.50, "Attacking external IP blocked")
            attenuate("src_ip_entropy", 0.50, "Source diversity reduced by removing rogue scanner")
            attenuate("fanout_ratio", 0.30, "Scanner fanout across internal hosts eliminated")
            attenuate("connection_rate", 0.40, "Probe connection frequency reduced")
            attenuate("failed_conn_ratio", 0.40, "Unsuccessful authentication attempts eliminated")

        elif action.action_type == DefenseActionType.RESTRICT_OUTBOUND_TRAFFIC:
            assumptions.extend([
                "Egress bandwidth limiter and TLS inspection proxy enforce strict outbound policy.",
                "Non-essential egress protocols blocked; high-volume streaming suppressed.",
                "Asymmetric outbound byte transfer reverts to balanced interactive browsing.",
            ])
            attenuate("bwd_bytes", 0.15, "Outbound egress volume throttled by 85%")
            attenuate("byte_rate", 0.20, "Total byte rate throttled by egress policy")
            attenuate("fwd_bwd_byte_ratio", 2.0, "Rebalances forward/backward ratio away from heavy egress")
            attenuate("flow_duration_mean", 0.30, "Long-lived exfiltration streams terminated")
            attenuate("other_proto_ratio", 0.0, "Non-standard encapsulation protocols dropped")

        return new_vec, mod_log, assumptions


def create_standard_defense(
    action_type: Union[DefenseActionType, str], target: Optional[str] = None
) -> DefenseActionSpecification:
    """Convenience helper to instantiate standard defense specifications."""
    if isinstance(action_type, str):
        action_type = DefenseActionType(action_type.upper())

    if action_type == DefenseActionType.HOST_ISOLATION:
        return DefenseActionSpecification(
            action_type=action_type,
            target_entity=target or "Host 192.168.1.105",
            description="Quarantine compromised host using 802.1X / EDR agent.",
        )
    elif action_type == DefenseActionType.BLOCK_DESTINATION_PORT:
        return DefenseActionSpecification(
            action_type=action_type,
            target_entity=target or "port:445 (SMB)",
            description="Apply network ACL blocking vulnerable service destination port.",
        )
    elif action_type == DefenseActionType.BLOCK_SUSPICIOUS_SOURCE:
        return DefenseActionSpecification(
            action_type=action_type,
            target_entity=target or "10.0.2.15 (External Scanner)",
            description="Apply border firewall drop rule on rogue scanning source.",
        )
    elif action_type == DefenseActionType.RESTRICT_OUTBOUND_TRAFFIC:
        return DefenseActionSpecification(
            action_type=action_type,
            target_entity=target or "0.0.0.0/0 (Egress Gateway)",
            description="Restrict egress bandwidth and enforce TLS inspection proxy.",
        )
    else:
        raise ValueError(f"Unknown action type: {action_type}")
