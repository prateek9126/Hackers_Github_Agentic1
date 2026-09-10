"""
Temporal Data Leakage Validator for SIH26153.
Detects and prevents lookahead bias, time-travel bugs, and train/test contamination.
"""

from datetime import datetime
from typing import List, Optional
import numpy as np

from network.schema import UnifiedTrafficRecord
from states.state_builder import NetworkStateVector


class TemporalLeakageError(Exception):
    """Raised when temporal leakage or lookahead bias is detected."""
    pass


class TemporalLeakageValidator:
    """
    Validates that:
    1. Records and windows maintain strictly monotonic chronological ordering.
    2. No state window contains traffic timestamps from the future (>= window_end).
    3. Train, validation, and test splits have absolute temporal separation with zero overlap.
    4. Observation sequences [S(t-W+1)..S(t)] precede target stages [y(t+1)..y(t+K)].
    """

    @staticmethod
    def validate_record_ordering(records: List[UnifiedTrafficRecord]) -> bool:
        """Verifies that traffic records are strictly monotonically increasing in time."""
        if len(records) <= 1:
            return True

        for i in range(len(records) - 1):
            if records[i].timestamp > records[i + 1].timestamp:
                raise TemporalLeakageError(
                    f"Temporal sequence inversion detected! "
                    f"Record[{i}] timestamp ({records[i].timestamp}) is AFTER "
                    f"Record[{i+1}] timestamp ({records[i+1].timestamp})."
                )
        return True

    @staticmethod
    def validate_window_boundaries(
        state: NetworkStateVector, flows: List[UnifiedTrafficRecord]
    ) -> bool:
        """Verifies that no flow in the window violates the window's causal boundary."""
        for idx, flow in enumerate(flows):
            if flow.timestamp >= state.window_end:
                raise TemporalLeakageError(
                    f"Future lookahead detected in Window {state.window_index}! "
                    f"Flow[{idx}] timestamp ({flow.timestamp}) is >= window_end ({state.window_end})."
                )
            if flow.timestamp < state.window_start:
                raise TemporalLeakageError(
                    f"Past contamination detected in Window {state.window_index}! "
                    f"Flow[{idx}] timestamp ({flow.timestamp}) is < window_start ({state.window_start})."
                )
        return True

    @staticmethod
    def validate_train_test_split(
        train_states: List[NetworkStateVector],
        val_states: Optional[List[NetworkStateVector]] = None,
        test_states: Optional[List[NetworkStateVector]] = None,
    ) -> bool:
        """
        Ensures strict chronological partitioning:
        max(train_time) < min(val_time) <= max(val_time) < min(test_time).
        """
        if not train_states:
            raise TemporalLeakageError("Train states partition cannot be empty.")

        max_train_time = max(s.window_end for s in train_states)

        if val_states:
            min_val_time = min(s.window_start for s in val_states)
            if max_train_time > min_val_time:
                raise TemporalLeakageError(
                    f"Temporal leakage between Train and Validation partitions! "
                    f"Max train window end ({max_train_time}) > min val window start ({min_val_time})."
                )
            max_val_time = max(s.window_end for s in val_states)
        else:
            max_val_time = max_train_time

        if test_states:
            min_test_time = min(s.window_start for s in test_states)
            if max_val_time > min_test_time:
                raise TemporalLeakageError(
                    f"Temporal leakage between Val/Train and Test partitions! "
                    f"Max preceding window end ({max_val_time}) > min test window start ({min_test_time})."
                )

        return True

    @staticmethod
    def validate_sequence_causality(
        X: np.ndarray, Y: np.ndarray, pivots: List[int], states: List[NetworkStateVector], K: int
    ) -> bool:
        """
        Verifies that for every sample i with pivot state t:
        Observation window ends at states[t].window_end, and
        Targets y_{t+1} ... y_{t+K} strictly occur after states[t].window_end.
        """
        for i, t in enumerate(pivots):
            current_state = states[t]
            for k in range(1, K + 1):
                target_idx = t + k
                if target_idx >= len(states):
                    raise TemporalLeakageError(
                        f"Target index out of bounds: {target_idx} >= {len(states)}"
                    )
                target_state = states[target_idx]
                if target_state.window_start < current_state.window_end:
                    raise TemporalLeakageError(
                        f"Sequence causality violation! "
                        f"Pivot state {t} window_end={current_state.window_end} is after "
                        f"Target state {target_idx} window_start={target_state.window_start}."
                    )
        return True
