"""
Feature Extraction Engine for SIH26153.
Computes flow-level, statistical/packet-level, and behavioral/graph features
from a set of UnifiedTrafficRecord instances within a temporal time window.
"""

from typing import Dict, List, Tuple, Optional
import math
import numpy as np
from network.schema import UnifiedTrafficRecord


def calculate_shannon_entropy(values: List[str]) -> float:
    """Calculates Shannon Entropy: H(X) = -sum(p_i * log2(p_i))."""
    if not values:
        return 0.0
    n = len(values)
    counts: Dict[str, int] = {}
    for v in values:
        counts[v] = counts.get(v, 0) + 1

    entropy = 0.0
    for cnt in counts.values():
        p = cnt / n
        if p > 0:
            entropy -= p * math.log2(p)
    return float(entropy)


class NetworkFeatureExtractor:
    """
    Extracts comprehensive security telemetry features from a batch of flows
    observed within time window [t, t+Δt).
    """

    FEATURE_SCHEMA: List[str] = [
        # --- 1. Volumetric & Rate Features ---
        "total_packets",
        "total_bytes",
        "fwd_packets",
        "bwd_packets",
        "fwd_bytes",
        "bwd_bytes",
        "byte_rate",
        "packet_rate",
        "fwd_bwd_byte_ratio",
        "fwd_bwd_packet_ratio",

        # --- 2. Flow Duration & Connection Dynamics ---
        "total_flows",
        "active_flows",
        "flow_duration_mean",
        "flow_duration_std",
        "flow_duration_max",
        "connection_rate",
        "failed_conn_ratio",
        "short_flow_ratio",

        # --- 3. TCP Flags & Handshake Signals ---
        "syn_count",
        "ack_count",
        "fin_count",
        "rst_count",
        "psh_count",
        "urg_count",
        "syn_ack_ratio",
        "rst_ratio",
        "syn_flow_ratio",

        # --- 4. Packet Size Statistics & Distribution ---
        "packet_size_mean",
        "packet_size_std",
        "packet_size_min",
        "packet_size_max",

        # --- 5. Inter-Arrival Time (IAT) Statistics ---
        "iat_mean",
        "iat_std",
        "iat_max",
        "iat_min",

        # --- 6. Packet Header & Protocol Specifics ---
        "ttl_mean",
        "tcp_win_mean",
        "retransmission_count",
        "retransmission_rate",
        "fragmented_packets",
        "fragmentation_rate",

        # --- 7. Behavioral & Topological Entropies ---
        "unique_src_ips",
        "unique_dst_ips",
        "unique_dst_ports",
        "unique_src_ports",
        "fanout_ratio",
        "src_ip_entropy",
        "dst_ip_entropy",
        "dst_port_entropy",

        # --- 8. Protocol Distribution ---
        "tcp_ratio",
        "udp_ratio",
        "icmp_ratio",
        "other_proto_ratio",

        # --- 9. Burst Behavior ---
        "burst_coefficient_var",
        "peak_to_avg_rate_ratio",
    ]

    def __init__(self, schema: Optional[List[str]] = None):
        self.feature_names = schema or self.FEATURE_SCHEMA

    @property
    def dimension(self) -> int:
        return len(self.feature_names)

    def extract_features(
        self, flows: List[UnifiedTrafficRecord], window_duration_sec: float = 60.0
    ) -> Tuple[np.ndarray, Dict[str, float]]:
        """
        Extracts all schema features from a list of records within a window.

        Returns:
            feature_vector: np.ndarray of shape (D,)
            feature_dict: Dictionary mapping feature name to scalar value
        """
        duration = max(0.001, float(window_duration_sec))
        num_flows = len(flows)

        # Handle zero-traffic idle window cleanly
        if num_flows == 0:
            feat_dict = {k: 0.0 for k in self.feature_names}
            feat_dict["ttl_mean"] = 64.0
            vec = np.array([feat_dict[k] for k in self.feature_names], dtype=np.float32)
            return vec, feat_dict

        # Aggregations
        fwd_pkts = sum(f.fwd_packets for f in flows)
        bwd_pkts = sum(f.bwd_packets for f in flows)
        tot_pkts = fwd_pkts + bwd_pkts

        fwd_bytes = sum(f.fwd_bytes for f in flows)
        bwd_bytes = sum(f.bwd_bytes for f in flows)
        tot_bytes = fwd_bytes + bwd_bytes

        byte_rate = tot_bytes / duration
        packet_rate = tot_pkts / duration

        fwd_bwd_byte_ratio = fwd_bytes / max(1.0, float(bwd_bytes))
        fwd_bwd_packet_ratio = fwd_pkts / max(1.0, float(bwd_pkts))

        # Duration stats
        durations = [f.duration_sec for f in flows]
        dur_mean = float(np.mean(durations))
        dur_std = float(np.std(durations)) if num_flows > 1 else 0.0
        dur_max = float(np.max(durations))
        short_flows = sum(1 for d in durations if d < 1.0)
        short_flow_ratio = short_flows / num_flows

        # TCP Flags
        syn = sum(f.syn_count for f in flows)
        ack = sum(f.ack_count for f in flows)
        fin = sum(f.fin_count for f in flows)
        rst = sum(f.rst_count for f in flows)
        psh = sum(f.psh_count for f in flows)
        urg = sum(f.urg_count for f in flows)

        syn_ack_ratio = syn / max(1.0, float(ack))
        rst_ratio = rst / max(1.0, float(tot_pkts))
        syn_flow_ratio = syn / float(num_flows)

        # Connection dynamics & failures
        failed_conns = sum(1 for f in flows if f.is_failed)
        failed_conn_ratio = failed_conns / float(num_flows)
        conn_rate = num_flows / duration

        # Packet size stats (weighted by packet volume across flows)
        pkt_means = [f.packet_size_mean for f in flows if f.packet_size_mean > 0]
        pkt_size_mean = float(np.mean(pkt_means)) if pkt_means else 0.0
        pkt_stds = [f.packet_size_std for f in flows]
        pkt_size_std = float(np.mean(pkt_stds)) if pkt_stds else 0.0
        pkt_mins = [f.packet_size_min for f in flows if f.packet_size_min > 0]
        pkt_size_min = float(np.min(pkt_mins)) if pkt_mins else 0.0
        pkt_maxs = [f.packet_size_max for f in flows if f.packet_size_max > 0]
        pkt_size_max = float(np.max(pkt_maxs)) if pkt_maxs else 0.0

        # IAT stats
        iat_means = [f.iat_mean for f in flows if f.iat_mean > 0]
        iat_mean = float(np.mean(iat_means)) if iat_means else 0.0
        iat_stds = [f.iat_std for f in flows if f.iat_std > 0]
        iat_std = float(np.mean(iat_stds)) if iat_stds else 0.0
        iat_maxs = [f.iat_max for f in flows if f.iat_max > 0]
        iat_max = float(np.max(iat_maxs)) if iat_maxs else 0.0
        iat_mins = [f.iat_min for f in flows if f.iat_min > 0]
        iat_min = float(np.min(iat_mins)) if iat_mins else 0.0

        # Header specifics
        ttls = [f.ttl_mean for f in flows if f.ttl_mean > 0]
        ttl_mean = float(np.mean(ttls)) if ttls else 64.0
        wins = [f.tcp_win_mean for f in flows if f.tcp_win_mean > 0]
        win_mean = float(np.mean(wins)) if wins else 0.0

        retrans = sum(f.retransmission_count for f in flows)
        retrans_rate = retrans / max(1.0, float(tot_pkts))
        frags = sum(f.fragmented_packets for f in flows)
        frag_rate = frags / max(1.0, float(tot_pkts))

        # Addressing, Graph & Topological Entropies
        src_ips = [f.src_ip for f in flows]
        dst_ips = [f.dst_ip for f in flows]
        dst_ports = [str(f.dst_port) for f in flows]
        src_ports = [str(f.src_port) for f in flows]

        unique_src_ips = len(set(src_ips))
        unique_dst_ips = len(set(dst_ips))
        unique_dst_ports = len(set(dst_ports))
        unique_src_ports = len(set(src_ports))

        fanout_ratio = unique_dst_ips / max(1.0, float(unique_src_ips))
        src_ip_entropy = calculate_shannon_entropy(src_ips)
        dst_ip_entropy = calculate_shannon_entropy(dst_ips)
        dst_port_entropy = calculate_shannon_entropy(dst_ports)

        # Protocol distribution
        protos = [f.protocol.upper() for f in flows]
        tcp_cnt = sum(1 for p in protos if p == "TCP")
        udp_cnt = sum(1 for p in protos if p == "UDP")
        icmp_cnt = sum(1 for p in protos if p == "ICMP")
        other_cnt = num_flows - (tcp_cnt + udp_cnt + icmp_cnt)

        tcp_ratio = tcp_cnt / num_flows
        udp_ratio = udp_cnt / num_flows
        icmp_ratio = icmp_cnt / num_flows
        other_proto_ratio = other_cnt / num_flows

        # Burst behavior (sub-window packet distribution across 10 slices)
        num_slices = 10
        slice_duration = duration / num_slices
        slice_counts = [0] * num_slices
        win_start_ts = min(f.timestamp for f in flows).timestamp()

        for f in flows:
            offset = f.timestamp.timestamp() - win_start_ts
            slice_idx = min(num_slices - 1, max(0, int(offset / max(1e-6, slice_duration))))
            slice_counts[slice_idx] += (f.fwd_packets + f.bwd_packets)

        slice_mean = float(np.mean(slice_counts))
        slice_std = float(np.std(slice_counts))
        burst_cv = (slice_std / (slice_mean + 1e-6)) if slice_mean > 0 else 0.0
        peak_rate = (max(slice_counts) / max(1e-6, slice_duration)) if slice_counts else 0.0
        peak_to_avg_ratio = peak_rate / max(1e-6, packet_rate)

        # Assemble full dictionary
        feat_dict: Dict[str, float] = {
            "total_packets": float(tot_pkts),
            "total_bytes": float(tot_bytes),
            "fwd_packets": float(fwd_pkts),
            "bwd_packets": float(bwd_pkts),
            "fwd_bytes": float(fwd_bytes),
            "bwd_bytes": float(bwd_bytes),
            "byte_rate": float(byte_rate),
            "packet_rate": float(packet_rate),
            "fwd_bwd_byte_ratio": float(fwd_bwd_byte_ratio),
            "fwd_bwd_packet_ratio": float(fwd_bwd_packet_ratio),
            "total_flows": float(num_flows),
            "active_flows": float(num_flows),
            "flow_duration_mean": float(dur_mean),
            "flow_duration_std": float(dur_std),
            "flow_duration_max": float(dur_max),
            "connection_rate": float(conn_rate),
            "failed_conn_ratio": float(failed_conn_ratio),
            "short_flow_ratio": float(short_flow_ratio),
            "syn_count": float(syn),
            "ack_count": float(ack),
            "fin_count": float(fin),
            "rst_count": float(rst),
            "psh_count": float(psh),
            "urg_count": float(urg),
            "syn_ack_ratio": float(syn_ack_ratio),
            "rst_ratio": float(rst_ratio),
            "syn_flow_ratio": float(syn_flow_ratio),
            "packet_size_mean": float(pkt_size_mean),
            "packet_size_std": float(pkt_size_std),
            "packet_size_min": float(pkt_size_min),
            "packet_size_max": float(pkt_size_max),
            "iat_mean": float(iat_mean),
            "iat_std": float(iat_std),
            "iat_max": float(iat_max),
            "iat_min": float(iat_min),
            "ttl_mean": float(ttl_mean),
            "tcp_win_mean": float(win_mean),
            "retransmission_count": float(retrans),
            "retransmission_rate": float(retrans_rate),
            "fragmented_packets": float(frags),
            "fragmentation_rate": float(frag_rate),
            "unique_src_ips": float(unique_src_ips),
            "unique_dst_ips": float(unique_dst_ips),
            "unique_dst_ports": float(unique_dst_ports),
            "unique_src_ports": float(unique_src_ports),
            "fanout_ratio": float(fanout_ratio),
            "src_ip_entropy": float(src_ip_entropy),
            "dst_ip_entropy": float(dst_ip_entropy),
            "dst_port_entropy": float(dst_port_entropy),
            "tcp_ratio": float(tcp_ratio),
            "udp_ratio": float(udp_ratio),
            "icmp_ratio": float(icmp_ratio),
            "other_proto_ratio": float(other_proto_ratio),
            "burst_coefficient_var": float(burst_cv),
            "peak_to_avg_rate_ratio": float(peak_to_avg_ratio),
        }

        # Build numpy vector matching feature_names ordering
        vec_list = []
        for name in self.feature_names:
            v = feat_dict.get(name, 0.0)
            if math.isnan(v) or math.isinf(v):
                v = 0.0
            vec_list.append(v)

        return np.array(vec_list, dtype=np.float32), feat_dict
