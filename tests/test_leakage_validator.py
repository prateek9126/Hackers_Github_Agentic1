"""
Unit Tests for Temporal Data Leakage Validator.
Verifies that any lookahead bias, causality violation, or train/test overlap
is strictly caught and rejected.
"""

import unittest
from datetime import datetime, timezone, timedelta
import numpy as np

from network.schema import UnifiedTrafficRecord
from states.temporal_engine import TemporalStateEngine
from states.windowing import TemporalWindowSequenceBuilder
from states.leakage_validator import TemporalLeakageValidator, TemporalLeakageError


class TestTemporalLeakageValidator(unittest.TestCase):
    """Tests leakage detection across records, window boundaries, and train/test partitions."""

    def test_record_ordering_valid(self):
        base = datetime(2026, 1, 1, 10, 0, 0, tzinfo=timezone.utc)
        records = [
            UnifiedTrafficRecord(timestamp=base + timedelta(seconds=1)),
            UnifiedTrafficRecord(timestamp=base + timedelta(seconds=2)),
            UnifiedTrafficRecord(timestamp=base + timedelta(seconds=3)),
        ]
        self.assertTrue(TemporalLeakageValidator.validate_record_ordering(records))

    def test_record_ordering_inverted_raises_error(self):
        base = datetime(2026, 1, 1, 10, 0, 0, tzinfo=timezone.utc)
        # Record 2 has timestamp earlier than Record 1
        records = [
            UnifiedTrafficRecord(timestamp=base + timedelta(seconds=10)),
            UnifiedTrafficRecord(timestamp=base + timedelta(seconds=5)),
        ]
        with self.assertRaises(TemporalLeakageError):
            TemporalLeakageValidator.validate_record_ordering(records)

    def test_train_test_split_temporal_separation(self):
        engine = TemporalStateEngine(window_duration_sec=60.0)
        base = datetime(2026, 1, 1, 10, 0, 0, tzinfo=timezone.utc)
        records = [
            UnifiedTrafficRecord(timestamp=base + timedelta(seconds=i * 60 + 5))
            for i in range(10)
        ]
        states = engine.discretize_records(records)

        # Case 1: Clean temporal split (train: 0..5, val: 6..7, test: 8..9)
        train_states = states[0:6]
        val_states = states[6:8]
        test_states = states[8:10]
        self.assertTrue(
            TemporalLeakageValidator.validate_train_test_split(
                train_states, val_states, test_states
            )
        )

        # Case 2: Contaminated split where test overlaps with train
        bad_test = [states[2]] # Contaminates earlier training period
        with self.assertRaises(TemporalLeakageError):
            TemporalLeakageValidator.validate_train_test_split(train_states, test_states=bad_test)

    def test_sequence_causality_validation(self):
        engine = TemporalStateEngine(window_duration_sec=60.0)
        base = datetime(2026, 1, 1, 10, 0, 0, tzinfo=timezone.utc)
        records = [
            UnifiedTrafficRecord(timestamp=base + timedelta(seconds=i * 60 + 5))
            for i in range(8)
        ]
        states = engine.discretize_records(records)

        builder = TemporalWindowSequenceBuilder(history_window_size=3, forecast_horizon=2)
        X, Y, pivots = builder.build_sequences(states)

        self.assertTrue(
            TemporalLeakageValidator.validate_sequence_causality(
                X, Y, pivots, states, K=2
            )
        )


if __name__ == "__main__":
    unittest.main()
