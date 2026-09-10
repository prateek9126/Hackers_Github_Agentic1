"""
CSV Network Traffic Parser for SIH26153.
Ingests tabular flow datasets (e.g. CIC-IDS2017, CSE-CIC-IDS2018, NetFlow/IPFIX)
and normalizes records into UnifiedTrafficRecord instances.
"""

from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Union, Any
import math
import logging
import pandas as pd
import numpy as np

from network.schema import UnifiedTrafficRecord

logger = logging.getLogger(__name__)

# Standard column aliases across intrusion detection CSV datasets
COLUMN_ALIASES: Dict[str, List[str]] = {
    "timestamp": [
        "timestamp", "time", "start_time", "starttime", "flow_start_time", "first_switched",
        "date_time", "datetime"
    ],
    "duration_sec": [
        "flow_duration", "duration", "dur", "flow duration", "duration_sec", "flow_duration_ms"
    ],
    "src_ip": ["src_ip", "source_ip", "srcip", "srcaddr", "source ip", "ip_src", "ipv4_src_addr"],
    "dst_ip": ["dst_ip", "destination_ip", "dstip", "dstaddr", "destination ip", "ip_dst", "ipv4_dst_addr"],
    "src_port": ["src_port", "source_port", "srcport", "sport", "source port", "l4_src_port"],
    "dst_port": ["dst_port", "destination_port", "dstport", "dport", "destination port", "l4_dst_port"],
    "protocol": ["protocol", "proto", "ip_proto", "protocol_name"],
    "fwd_packets": [
        "total_fwd_packets", "total fwd packets", "totpkts", "tot_fwd_pkts", "fwd_packets",
        "fwd_pkts", "in_pkts"
    ],
    "bwd_packets": [
        "total_backward_packets", "total backward packets", "tot_bwd_pkts",
        "bwd_packets", "bwd_pkts", "out_pkts"
    ],
    "fwd_bytes": [
        "total_length_of_fwd_packets", "total length of fwd packets", "totbytes", "tot_fwd_bytes",
        "srcbytes", "fwd_bytes", "in_bytes"
    ],
    "bwd_bytes": [
        "total_length_of_bwd_packets", "total length of bwd packets", "tot_bwd_bytes",
        "bwd_bytes", "out_bytes"
    ],
    "syn_count": ["syn_flag_count", "syn flag count", "syn_count", "syn_flags", "syn"],
    "ack_count": ["ack_flag_count", "ack flag count", "ack_count", "ack_flags", "ack"],
    "fin_count": ["fin_flag_count", "fin flag count", "fin_count", "fin_flags", "fin"],
    "rst_count": ["rst_flag_count", "rst flag count", "rst_count", "rst_flags", "rst"],
    "psh_count": ["psh_flag_count", "psh flag count", "psh_count", "psh_flags", "psh"],
    "urg_count": ["urg_flag_count", "urg flag count", "urg_count", "urg_flags", "urg"],
    "packet_size_mean": [
        "average_packet_size", "average packet size", "packet_length_mean",
        "packet length mean", "pkt_len_mean"
    ],
    "packet_size_std": ["packet_length_std", "packet length std", "pkt_len_std"],
    "packet_size_min": ["min_packet_length", "min packet length", "pkt_len_min"],
    "packet_size_max": ["max_packet_length", "max packet length", "pkt_len_max"],
    "iat_mean": ["flow_iat_mean", "flow iat mean", "iat_mean"],
    "iat_std": ["flow_iat_std", "flow iat std", "iat_std"],
    "iat_max": ["flow_iat_max", "flow iat max", "iat_max"],
    "iat_min": ["flow_iat_min", "flow iat min", "iat_min"],
    "retransmission_count": ["retransmission_count", "retransmissions", "retrans_pkts"],
    "fragmented_packets": ["fragmented_packets", "fragments", "frag_pkts"],
    "ttl_mean": ["ttl_mean", "ttl", "ip_ttl_mean"],
    "tcp_win_mean": ["tcp_win_mean", "init_win_bytes_forward", "init win bytes forward"],
    "conn_state": ["conn_state", "state", "tcp_state"],
    "label": ["label", "attack", "class", "target", "attack_cat"]
}


class CSVTrafficParser:
    """Parses, validates, and standardizes CSV network traffic into UnifiedTrafficRecord objects."""

    def __init__(self, base_timestamp: Optional[datetime] = None):
        # Fallback anchor timestamp if dataset has only relative millisecond offsets
        self.base_timestamp = base_timestamp or datetime(2026, 1, 1, 0, 0, 0, tzinfo=timezone.utc)

    def _resolve_columns(self, df_cols: List[str]) -> Dict[str, str]:
        """Maps canonical schema keys to the actual matching columns in the DataFrame."""
        col_clean_map = {c.strip().lower(): c for c in df_cols}
        resolved = {}

        for canonical_key, aliases in COLUMN_ALIASES.items():
            for alias in aliases:
                norm_alias = alias.lower()
                if norm_alias in col_clean_map:
                    resolved[canonical_key] = col_clean_map[norm_alias]
                    break

        return resolved

    def _safe_float(self, val: Any, default: float = 0.0) -> float:
        """Sanitizes NaN, Inf, and non-numeric values to finite float."""
        if val is None:
            return default
        try:
            f = float(val)
            if math.isnan(f) or math.isinf(f):
                return default
            return f
        except (ValueError, TypeError):
            return default

    def _safe_int(self, val: Any, default: int = 0) -> int:
        """Sanitizes integer fields, supporting decimal and hex formats."""
        if val is None:
            return default
        try:
            val_str = str(val).strip()
            if val_str.startswith("0x") or val_str.startswith("0X"):
                return int(val_str, 16)
            f = float(val_str)
            if math.isnan(f) or math.isinf(f):
                return default
            return int(f)
        except (ValueError, TypeError):
            return default

    def _parse_timestamp(
        self, val: Any, row_idx: int, fallback_sec: float
    ) -> datetime:
        """Parses various timestamp representations into a timezone-aware datetime."""
        if val is None or (isinstance(val, float) and math.isnan(val)):
            return self.base_timestamp + timedelta(seconds=fallback_sec)

        if isinstance(val, (datetime, pd.Timestamp)):
            if val.tzinfo is None:
                return val.replace(tzinfo=timezone.utc)
            return val

        # If numeric offset (e.g. milliseconds or seconds from start)
        try:
            num = float(val)
            if not (math.isnan(num) or math.isinf(num)):
                if num > 1e11:  # Epoch milliseconds
                    return datetime.fromtimestamp(num / 1000.0, tz=timezone.utc)
                elif num > 1e8:  # Epoch seconds
                    return datetime.fromtimestamp(num, tz=timezone.utc)
                else:  # Relative offset seconds
                    return self.base_timestamp + timedelta(seconds=num)
        except (ValueError, TypeError):
            pass

        # String datetime parsing
        val_str = str(val).strip()
        for fmt in (
            "%Y/%m/%d %H:%M:%S.%f",
            "%Y/%m/%d %H:%M:%S",
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%dT%H:%M:%S",
            "%Y-%m-%d %H:%M:%S.%f",
            "%d/%m/%Y %H:%M:%S",
            "%d/%m/%Y %H:%M",
            "%m/%d/%Y %I:%M:%S %p",
            "%m/%d/%Y %H:%M:%S",
        ):
            try:
                dt = datetime.strptime(val_str, fmt)
                return dt.replace(tzinfo=timezone.utc)
            except ValueError:
                continue

        # Fallback to pandas parser
        try:
            dt = pd.to_datetime(val_str, errors="coerce")
            if pd.notnull(dt):
                if dt.tzinfo is None:
                    return dt.to_pydatetime().replace(tzinfo=timezone.utc)
                return dt.to_pydatetime()
        except Exception:
            pass

        return self.base_timestamp + timedelta(seconds=fallback_sec)

    def parse_file(
        self, file_path: str, max_rows: Optional[int] = None
    ) -> List[UnifiedTrafficRecord]:
        """
        Loads and standardizes a CSV file into a chronologically sorted list
        of UnifiedTrafficRecord instances.
        """
        logger.info(f"Parsing CSV network traffic from: {file_path}")
        df = pd.read_csv(file_path, nrows=max_rows, low_memory=False)
        return self.parse_dataframe(df)

    def parse_dataframe(self, df: pd.DataFrame) -> List[UnifiedTrafficRecord]:
        """Converts a pandas DataFrame into UnifiedTrafficRecord list with strict sorting."""
        if df.empty:
            return []

        col_map = self._resolve_columns(list(df.columns))
        records: List[UnifiedTrafficRecord] = []

        has_timestamp_col = "timestamp" in col_map
        ts_col_name = col_map.get("timestamp")
        parsed_ts_list = None
        if has_timestamp_col and ts_col_name in df.columns:
            try:
                ts_series = pd.to_datetime(df[ts_col_name], format="mixed", errors="coerce")
                if ts_series.dt.tz is None:
                    ts_series = ts_series.dt.tz_localize(timezone.utc)
                parsed_ts_list = ts_series.tolist()
            except Exception:
                parsed_ts_list = None

        rows = df.to_dict(orient="records")
        for idx, row in enumerate(rows):
            fallback_offset = float(idx) * 0.1
            if parsed_ts_list is not None and idx < len(parsed_ts_list) and parsed_ts_list[idx] is not None and pd.notnull(parsed_ts_list[idx]):
                record_ts = parsed_ts_list[idx]
            else:
                raw_ts = row.get(ts_col_name) if has_timestamp_col else None
                record_ts = self._parse_timestamp(raw_ts, idx, fallback_offset)

            # Flow duration (detect if in microseconds like CIC-IDS2017 or seconds)
            raw_dur = self._safe_float(row.get(col_map.get("duration_sec", "")))
            duration_sec = raw_dur / 1e6 if raw_dur > 10000 else raw_dur
            if duration_sec < 0:
                duration_sec = 0.0

            end_ts = record_ts + timedelta(seconds=duration_sec)

            # Addressing
            src_ip = str(row.get(col_map.get("src_ip", ""), f"192.168.1.{10 + (idx % 20)}")).strip()
            dst_ip = str(row.get(col_map.get("dst_ip", ""), "10.0.0.1")).strip()
            src_port = self._safe_int(row.get(col_map.get("src_port", "")), 40000 + (idx % 10000))
            dst_port = self._safe_int(row.get(col_map.get("dst_port", "")), 80)

            raw_proto = row.get(col_map.get("protocol", ""), "TCP")
            proto_map = {6: "TCP", 17: "UDP", 1: "ICMP", "6": "TCP", "17": "UDP", "1": "ICMP"}
            if raw_proto in proto_map:
                proto_str = proto_map[raw_proto]
            elif isinstance(raw_proto, (int, float)):
                proto_str = proto_map.get(int(raw_proto), "TCP")
            else:
                proto_clean = str(raw_proto).strip().upper()
                proto_str = proto_map.get(proto_clean, proto_clean or "TCP")

            # Volumes
            fwd_pkts = self._safe_int(row.get(col_map.get("fwd_packets", "")), 1)
            bwd_pkts = self._safe_int(row.get(col_map.get("bwd_packets", "")), 0)
            fwd_bytes = self._safe_int(row.get(col_map.get("fwd_bytes", "")), 64)
            bwd_bytes = self._safe_int(row.get(col_map.get("bwd_bytes", "")), 0)

            # TCP Flags
            syn_cnt = self._safe_int(row.get(col_map.get("syn_count", "")), 0)
            ack_cnt = self._safe_int(row.get(col_map.get("ack_count", "")), 0)
            fin_cnt = self._safe_int(row.get(col_map.get("fin_count", "")), 0)
            rst_cnt = self._safe_int(row.get(col_map.get("rst_count", "")), 0)
            psh_cnt = self._safe_int(row.get(col_map.get("psh_count", "")), 0)
            urg_cnt = self._safe_int(row.get(col_map.get("urg_count", "")), 0)

            # Statistical metrics
            pkt_size_mean = self._safe_float(row.get(col_map.get("packet_size_mean", "")))
            pkt_size_std = self._safe_float(row.get(col_map.get("packet_size_std", "")))
            pkt_size_min = self._safe_float(row.get(col_map.get("packet_size_min", "")))
            pkt_size_max = self._safe_float(row.get(col_map.get("packet_size_max", "")))

            # If packet stats were absent, estimate from total bytes and packets
            tot_pkts = max(1, fwd_pkts + bwd_pkts)
            tot_bytes = fwd_bytes + bwd_bytes
            if pkt_size_mean == 0.0 and tot_bytes > 0:
                pkt_size_mean = float(tot_bytes) / tot_pkts
                pkt_size_min = 40.0
                pkt_size_max = float(tot_bytes)

            iat_mean = self._safe_float(row.get(col_map.get("iat_mean", "")))
            iat_std = self._safe_float(row.get(col_map.get("iat_std", "")))
            iat_min = self._safe_float(row.get(col_map.get("iat_min", "")))
            iat_max = self._safe_float(row.get(col_map.get("iat_max", "")))

            # Labels & states
            label = str(row.get(col_map.get("label", ""), "BENIGN")).strip()
            conn_state = str(row.get(col_map.get("conn_state", ""), "SF")).strip()

            retrans = self._safe_int(row.get(col_map.get("retransmission_count", "")), 0)
            frag = self._safe_int(row.get(col_map.get("fragmented_packets", "")), 0)
            ttl_m = self._safe_float(row.get(col_map.get("ttl_mean", "")), 64.0)
            win_m = self._safe_float(row.get(col_map.get("tcp_win_mean", "")), 14600.0)

            record = UnifiedTrafficRecord(
                timestamp=record_ts,
                end_timestamp=end_ts,
                duration_sec=duration_sec,
                src_ip=src_ip,
                dst_ip=dst_ip,
                src_port=src_port,
                dst_port=dst_port,
                protocol=proto_str,
                fwd_packets=fwd_pkts,
                bwd_packets=bwd_pkts,
                fwd_bytes=fwd_bytes,
                bwd_bytes=bwd_bytes,
                syn_count=syn_cnt,
                ack_count=ack_cnt,
                fin_count=fin_cnt,
                rst_count=rst_cnt,
                psh_count=psh_cnt,
                urg_count=urg_cnt,
                packet_size_mean=pkt_size_mean,
                packet_size_std=pkt_size_std,
                packet_size_min=pkt_size_min,
                packet_size_max=pkt_size_max,
                iat_mean=iat_mean,
                iat_std=iat_std,
                iat_min=iat_min,
                iat_max=iat_max,
                ttl_mean=ttl_m,
                tcp_win_mean=win_m,
                retransmission_count=retrans,
                fragmented_packets=frag,
                conn_state=conn_state,
                raw_label=label,
            )
            records.append(record)

        # STRICT ENGINEERING REQUIREMENT: Preserve chronological ordering
        records.sort(key=lambda r: r.timestamp)
        return records
