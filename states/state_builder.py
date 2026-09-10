"""
Network State Builder.
Aggregates packet and flow telemetry over discrete time windows [t, t+Δt)
into normalized Network State Vectors S(t) ∈ R^D.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Any, Optional
import numpy as np
from .taxonomy import AttackStage


@dataclass
class NetworkStateVector:
    """Represents the global or subnet network state S(t) at a discrete time window."""
    window_index: int
    window_start: datetime
    window_end: datetime
    duration_sec: float
    features: np.ndarray # Shape: (D,)
    feature_names: List[str]
    ground_truth_stage: AttackStage = AttackStage.NORMAL
    stage_distribution: Dict[str, float] = field(default_factory=dict)
    active_connections: int = 0
    failed_connections: int = 0
    total_bytes: int = 0
    total_packets: int = 0

    def to_dict(self) -> Dict[str, Any]:
        """Convert state to serializable dictionary for API/Database."""
        return {
            "window_index": self.window_index,
            "window_start": self.window_start.isoformat(),
            "window_end": self.window_end.isoformat(),
            "duration_sec": self.duration_sec,
            "features": self.features.tolist(),
            "feature_names": self.feature_names,
            "ground_truth_stage": self.ground_truth_stage.name,
            "stage_distribution": self.stage_distribution,
            "active_connections": self.active_connections,
            "failed_connections": self.failed_connections,
            "total_bytes": self.total_bytes,
            "total_packets": self.total_packets,
        }


class StateBuilder:
    """Constructs state vectors S(t) from aggregated flow telemetry."""

    def __init__(self, feature_names: Optional[List[str]] = None):
        self.feature_names = feature_names or [
            # Volumetric
            "total_bytes", "total_packets", "byte_rate", "packet_rate",
            "fwd_bwd_byte_ratio", "fwd_bwd_packet_ratio", "avg_packet_size", "packet_size_std",
            # TCP Flags
            "syn_count", "ack_count", "fin_count", "rst_count",
            "psh_count", "urg_count", "syn_ack_ratio", "rst_ratio",
            # Connection Dynamics
            "total_flows", "active_flows", "failed_conn_ratio", "half_open_ratio",
            "short_flow_ratio", "avg_flow_duration",
            # Graph / Topological
            "unique_src_ips", "unique_dst_ips", "fanout_ratio", "unique_dst_ports",
            "src_port_entropy", "dst_port_entropy", "ip_entropy",
            # Protocol Distribution
            "http_ratio", "https_ratio", "dns_ratio", "ssh_ratio",
            "smb_ratio", "icmp_ratio", "other_proto_ratio"
        ]

    def build_state_from_flows(
        self,
        window_index: int,
        window_start: datetime,
        window_end: datetime,
        flows: List[Dict[str, Any]],
        ground_truth_stage: AttackStage = AttackStage.NORMAL
    ) -> NetworkStateVector:
        """
        Aggregate a list of flow records overlapping the window into NetworkStateVector.
        """
        duration = (window_end - window_start).total_seconds()
        if duration <= 0:
            duration = 1.0

        if not flows:
            # Return baseline zero vector for idle window
            zeros = np.zeros(len(self.feature_names), dtype=np.float32)
            return NetworkStateVector(
                window_index=window_index,
                window_start=window_start,
                window_end=window_end,
                duration_sec=duration,
                features=zeros,
                feature_names=self.feature_names,
                ground_truth_stage=ground_truth_stage,
            )

        # Extraction logic stub for state features
        total_bytes = sum(f.get("fwd_bytes", 0) + f.get("bwd_bytes", 0) for f in flows)
        total_packets = sum(f.get("fwd_packets", 0) + f.get("bwd_packets", 0) for f in flows)
        
        feature_dict = {
            "total_bytes": float(total_bytes),
            "total_packets": float(total_packets),
            "byte_rate": float(total_bytes / duration),
            "packet_rate": float(total_packets / duration),
            "fwd_bwd_byte_ratio": 1.0,
            "fwd_bwd_packet_ratio": 1.0,
            "avg_packet_size": float(total_bytes / max(1, total_packets)),
            "packet_size_std": 0.0,
            "syn_count": 0.0,
            "ack_count": 0.0,
            "fin_count": 0.0,
            "rst_count": 0.0,
            "psh_count": 0.0,
            "urg_count": 0.0,
            "syn_ack_ratio": 0.0,
            "rst_ratio": 0.0,
            "total_flows": float(len(flows)),
            "active_flows": float(len(flows)),
            "failed_conn_ratio": 0.0,
            "half_open_ratio": 0.0,
            "short_flow_ratio": 0.0,
            "avg_flow_duration": 1.0,
            "unique_src_ips": float(len(set(f.get("src_ip", "") for f in flows))),
            "unique_dst_ips": float(len(set(f.get("dst_ip", "") for f in flows))),
            "fanout_ratio": 1.0,
            "unique_dst_ports": float(len(set(f.get("dst_port", 0) for f in flows))),
            "src_port_entropy": 0.0,
            "dst_port_entropy": 0.0,
            "ip_entropy": 0.0,
            "http_ratio": 0.0,
            "https_ratio": 0.0,
            "dns_ratio": 0.0,
            "ssh_ratio": 0.0,
            "smb_ratio": 0.0,
            "icmp_ratio": 0.0,
            "other_proto_ratio": 1.0,
        }

        feature_vector = np.array(
            [feature_dict.get(name, 0.0) for name in self.feature_names],
            dtype=np.float32
        )

        return NetworkStateVector(
            window_index=window_index,
            window_start=window_start,
            window_end=window_end,
            duration_sec=duration,
            features=feature_vector,
            feature_names=self.feature_names,
            ground_truth_stage=ground_truth_stage,
            total_bytes=total_bytes,
            total_packets=total_packets,
            active_connections=len(flows),
        )
