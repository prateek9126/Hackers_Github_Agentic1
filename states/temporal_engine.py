"""
Temporal State Discretization Engine for SIH26153.
Aggregates continuous traffic flows into discrete temporal observation windows [t, t+Δt)
and generates standardized NetworkStateVector S(t) instances.
Guarantees strict chronological ordering with zero future lookahead.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import logging
import numpy as np

from network.schema import UnifiedTrafficRecord
from network.feature_extraction.feature_extractor import NetworkFeatureExtractor
from states.taxonomy import AttackStage
from states.labeling import DatasetLabelMapper
from states.state_builder import NetworkStateVector

logger = logging.getLogger(__name__)


class TemporalStateEngine:
    """
    Slices unified traffic flows into chronological time windows of length Δt (default 60s)
    and constructs NetworkStateVector S(t) representations.
    """

    def __init__(
        self,
        window_duration_sec: float = 60.0,
        stride_sec: Optional[float] = None,
        feature_extractor: Optional[NetworkFeatureExtractor] = None,
        label_mapper: Optional[DatasetLabelMapper] = None,
        pad_idle_windows: bool = True,
    ):
        self.window_duration_sec = float(window_duration_sec)
        # Default to non-overlapping windows if stride not specified
        self.stride_sec = float(stride_sec) if stride_sec is not None else self.window_duration_sec
        self.feature_extractor = feature_extractor or NetworkFeatureExtractor()
        self.label_mapper = label_mapper or DatasetLabelMapper()
        self.pad_idle_windows = pad_idle_windows

    def discretize_records(
        self, records: List[UnifiedTrafficRecord]
    ) -> List[NetworkStateVector]:
        """
        Groups traffic records into chronological time windows and outputs S(t) vectors.

        Args:
            records: Chronologically sorted list of UnifiedTrafficRecord.

        Returns:
            List of NetworkStateVector ordered strictly by window_index (t_0 < t_1 < ...).
        """
        if not records:
            return []

        # Enforce chronological ordering
        for i in range(len(records) - 1):
            if records[i].timestamp > records[i + 1].timestamp:
                raise ValueError(
                    f"Traffic records are not chronologically sorted! "
                    f"Record {i} ts={records[i].timestamp} > Record {i+1} ts={records[i+1].timestamp}"
                )

        t_min = records[0].timestamp
        t_max = max(
            r.end_timestamp if r.end_timestamp and r.end_timestamp > r.timestamp else r.timestamp
            for r in records
        )

        state_vectors: List[NetworkStateVector] = []
        window_idx = 0
        current_win_start = t_min
        record_idx = 0
        num_records = len(records)

        win_delta = timedelta(seconds=self.window_duration_sec)
        stride_delta = timedelta(seconds=self.stride_sec)

        while current_win_start <= t_max:
            current_win_end = current_win_start + win_delta

            # Collect all records that start within [current_win_start, current_win_end)
            # CAUSAL INVARIANCE: Never include records starting at or after current_win_end!
            window_flows: List[UnifiedTrafficRecord] = []

            # Fast forward record_idx if records are before current_win_start
            while record_idx < num_records and records[record_idx].timestamp < current_win_start:
                record_idx += 1

            scan_idx = record_idx
            while scan_idx < num_records and records[scan_idx].timestamp < current_win_end:
                window_flows.append(records[scan_idx])
                scan_idx += 1

            if window_flows or self.pad_idle_windows:
                # Extract features for this time window
                feat_vector, feat_dict = self.feature_extractor.extract_features(
                    window_flows, window_duration_sec=self.window_duration_sec
                )

                # Resolve ground truth attack stage for the window
                flow_labels = [f.raw_label for f in window_flows]
                primary_stage, distribution = self.label_mapper.resolve_window_ground_truth(
                    flow_labels
                )

                # Total metrics
                tot_bytes = sum(f.total_bytes for f in window_flows)
                tot_pkts = sum(f.total_packets for f in window_flows)
                failed_cnt = sum(1 for f in window_flows if f.is_failed)

                state = NetworkStateVector(
                    window_index=window_idx,
                    window_start=current_win_start,
                    window_end=current_win_end,
                    duration_sec=self.window_duration_sec,
                    features=feat_vector,
                    feature_names=self.feature_extractor.feature_names,
                    ground_truth_stage=primary_stage,
                    stage_distribution=distribution,
                    active_connections=len(window_flows),
                    failed_connections=failed_cnt,
                    total_bytes=tot_bytes,
                    total_packets=tot_pkts,
                )
                state_vectors.append(state)
                window_idx += 1

            # Advance window by stride
            current_win_start += stride_delta

        return state_vectors
