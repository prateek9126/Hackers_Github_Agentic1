"""
Unified Network Traffic Schema for SIH26153.
Defines canonical data structures shared across CSV, PCAP, and Zeek telemetry.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, Optional, Any


@dataclass
class UnifiedTrafficRecord:
    """
    Canonical representation of a single network flow or summarized connection event.
    Standardizes inputs from CIC-IDS/NetFlow CSVs, Scapy PCAP parsers, and Zeek logs.
    """
    # Temporal bounds
    timestamp: datetime
    end_timestamp: Optional[datetime] = None
    duration_sec: float = 0.0

    # 5-Tuple Network Addressing
    src_ip: str = "0.0.0.0"
    dst_ip: str = "0.0.0.0"
    src_port: int = 0
    dst_port: int = 0
    protocol: str = "TCP"  # e.g., 'TCP', 'UDP', 'ICMP'

    # Flow & Volume Metrics
    fwd_packets: int = 0
    bwd_packets: int = 0
    fwd_bytes: int = 0
    bwd_bytes: int = 0
    total_packets: int = 0
    total_bytes: int = 0

    # Rate Statistics
    packet_rate: float = 0.0  # pkts/s
    byte_rate: float = 0.0    # bytes/s

    # TCP Control Flags
    syn_count: int = 0
    ack_count: int = 0
    fin_count: int = 0
    rst_count: int = 0
    psh_count: int = 0
    urg_count: int = 0

    # Packet & Statistical Indicators
    packet_size_min: float = 0.0
    packet_size_max: float = 0.0
    packet_size_mean: float = 0.0
    packet_size_std: float = 0.0

    # Inter-Arrival Time (IAT) Statistics (seconds or ms)
    iat_mean: float = 0.0
    iat_std: float = 0.0
    iat_min: float = 0.0
    iat_max: float = 0.0

    # IP & TCP Header Specifics
    ttl_mean: float = 64.0
    ttl_min: int = 64
    ttl_max: int = 64
    tcp_win_mean: float = 0.0
    retransmission_count: int = 0
    fragmented_packets: int = 0

    # Connection State & Diagnostics
    conn_state: str = "SF"  # Zeek / TCP state (SF: Normal, S0: SYN sent no reply, REJ: Rejected, etc.)
    is_failed: bool = False

    # Metadata & Ground Truth (if present in training set)
    raw_label: str = "BENIGN"
    additional_metadata: Dict[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        """Derive totals and rates if not pre-populated."""
        if self.total_packets == 0:
            self.total_packets = self.fwd_packets + self.bwd_packets
        if self.total_bytes == 0:
            self.total_bytes = self.fwd_bytes + self.bwd_bytes

        if self.duration_sec > 0:
            if self.packet_rate == 0.0 and self.total_packets > 0:
                self.packet_rate = self.total_packets / self.duration_sec
            if self.byte_rate == 0.0 and self.total_bytes > 0:
                self.byte_rate = self.total_bytes / self.duration_sec

        # Determine connection failure state if not explicitly marked
        if not self.is_failed:
            if self.conn_state in ("REJ", "RSTO", "RSTOS0", "S0", "SHR"):
                self.is_failed = True
            elif self.syn_count > 0 and self.ack_count == 0 and self.protocol == "TCP":
                self.is_failed = True
            elif self.rst_count > 0 and self.ack_count == 0:
                self.is_failed = True
