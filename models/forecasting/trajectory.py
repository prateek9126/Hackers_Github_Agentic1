"""
Attack Trajectory Data Structures for SIH26153.
Represents multi-step attack progression trajectories as directed graphs
with explicit node metadata, MITRE ATT&CK mappings, edge transition probabilities,
and structured JSON serialization.
"""

from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import Dict, List, Optional, Any
import json

from states.taxonomy import AttackStage, StateType, STAGE_MITRE_MAPPING, STAGE_NAMES, STAGE_SEVERITY_WEIGHTS


@dataclass
class TrajectoryNode:
    """
    Represents an observed or forecasted attack state node in the progression graph.
    """
    node_id: str
    step: int                           # 0 = current/observed state S(t), 1..K = future states S(t+k)
    timestamp: str                      # ISO timestamp or relative time offset string
    stage: str                          # Canonical stage name (e.g. 'SCANNING', 'EXFILTRATION')
    stage_id: int                       # Canonical stage integer ID (0..9)
    state_type: StateType               # OBSERVED, PREDICTED, or ACTUAL_GROUND_TRUTH
    probability: float                  # Top predicted class probability
    confidence: float                   # Confidence score (equal to top probability or calibrated score)
    probability_distribution: Dict[str, float] = field(default_factory=dict)
    supporting_features: Dict[str, float] = field(default_factory=dict) # Key telemetry metrics
    mitre_mapping: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "node_id": self.node_id,
            "step": self.step,
            "timestamp": self.timestamp,
            "stage": self.stage,
            "stage_id": self.stage_id,
            "state_type": self.state_type.value if hasattr(self.state_type, "value") else str(self.state_type),
            "probability": round(float(self.probability), 4),
            "confidence": round(float(self.confidence), 4),
            "probability_distribution": {k: round(float(v), 4) for k, v in self.probability_distribution.items()},
            "supporting_features": {k: round(float(v), 4) for k, v in self.supporting_features.items()},
            "mitre_mapping": self.mitre_mapping,
        }


@dataclass
class TrajectoryEdge:
    """
    Represents a directed transition between two sequential stages S(t+k-1) -> S(t+k).
    """
    source_node_id: str
    target_node_id: str
    transition_probability: float       # Progression probability P(S_{t+k} | S_{t+k-1})
    progression_type: str               # ESCALATION, LATERAL, PERSISTENCE, DE_ESCALATION, STABLE
    lead_time_sec: float                # Forward advance warning delta in seconds

    def to_dict(self) -> Dict[str, Any]:
        return {
            "source_node_id": self.source_node_id,
            "target_node_id": self.target_node_id,
            "transition_probability": round(float(self.transition_probability), 4),
            "progression_type": self.progression_type,
            "lead_time_sec": round(float(self.lead_time_sec), 2),
        }


@dataclass
class AttackTrajectory:
    """
    Root container representing the complete K-step attack trajectory graph.
    """
    prediction_time: str
    current_stage: str
    forecast_horizon: int
    nodes: List[TrajectoryNode] = field(default_factory=list)
    edges: List[TrajectoryEdge] = field(default_factory=list)
    cumulative_risk_trajectory: List[float] = field(default_factory=list)

    @property
    def forecast(self) -> List[Dict[str, Any]]:
        """
        Clean, user-specified forecast list matching SIH26153 schema:
        [
          {"step": 1, "stage": "SCANNING", "probability": 0.82, "lead_time_sec": 20.0}, ...
        ]
        """
        forecast_items = []
        for node in self.nodes:
            if node.step > 0:
                forecast_items.append({
                    "step": node.step,
                    "stage": node.stage,
                    "probability": round(float(node.probability), 4),
                    "confidence": round(float(node.confidence), 4),
                    "timestamp": node.timestamp,
                    "mitre_tactic": node.mitre_mapping.get("tactic_name", "Unknown"),
                })
        return forecast_items

    def to_dict(self) -> Dict[str, Any]:
        """Converts entire trajectory into a fully serializable dictionary."""
        return {
            "prediction_time": self.prediction_time,
            "current_stage": self.current_stage,
            "forecast_horizon": self.forecast_horizon,
            "forecast": self.forecast,
            "cumulative_risk_trajectory": [round(float(r), 4) for r in self.cumulative_risk_trajectory],
            "nodes": [n.to_dict() for n in self.nodes],
            "edges": [e.to_dict() for e in self.edges],
        }

    def to_json(self, indent: int = 2) -> str:
        """Serializes trajectory to structured JSON string."""
        return json.dumps(self.to_dict(), indent=indent)

    def to_mermaid(self) -> str:
        """Generates a Mermaid graph string visualizing the predicted attack trajectory."""
        lines = ["graph TD"]
        # Format nodes
        for node in self.nodes:
            tag = f"<b>{node.stage}</b><br/>Conf: {node.confidence*100:.1f}%<br/>{node.timestamp}"
            if node.step == 0:
                lines.append(f'    {node.node_id}["[CURRENT] {tag}"]')
            else:
                lines.append(f'    {node.node_id}["[t+{node.step}] {tag}"]')

        # Format edges
        for edge in self.edges:
            edge_label = f"{edge.progression_type} ({edge.transition_probability*100:.1f}%)"
            lines.append(f"    {edge.source_node_id} -->|{edge_label}| {edge.target_node_id}")

        return "\n".join(lines)
