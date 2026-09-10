"""
Unit Tests for SIH26153 Network Traffic Processing and Temporal State Engine.
Uses Python's standard unittest framework for universal offline execution.
"""

import unittest
from datetime import datetime, timezone, timedelta
import numpy as np
import pandas as pd
import os
import tempfile

from network.schema import UnifiedTrafficRecord
from network.csv_parser import CSVTrafficParser
from network.feature_extraction.feature_extractor import NetworkFeatureExtractor, calculate_shannon_entropy
from states.temporal_engine import TemporalStateEngine
from states.taxonomy import AttackStage
from states.labeling import DatasetLabelMapper
from states.normalizer import TemporalStateScaler
from states.windowing import TemporalWindowSequenceBuilder
from states.leakage_validator import TemporalLeakageValidator, TemporalLeakageError


class TestUnifiedTrafficAndCSVParser(unittest.TestCase):
    """Tests schema normalization, alias resolution, and CSV parsing."""

    def setUp(self):
        self.parser = CSVTrafficParser()

    def test_schema_derived_metrics(self):
        rec = UnifiedTrafficRecord(
            timestamp=datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc),
            duration_sec=2.0,
            fwd_packets=10,
            bwd_packets=10,
            fwd_bytes=500,
            bwd_bytes=1500,
            syn_count=1,
            ack_count=1,
            conn_state="SF",
        )
        self.assertEqual(rec.total_packets, 20)
        self.assertEqual(rec.total_bytes, 2000)
        self.assertAlmostEqual(rec.packet_rate, 10.0)
        self.assertAlmostEqual(rec.byte_rate, 1000.0)
        self.assertFalse(rec.is_failed)

    def test_schema_failed_connection_detection(self):
        # Case A: REJ state
        rec_rej = UnifiedTrafficRecord(
            timestamp=datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc),
            conn_state="REJ",
            syn_count=1,
            ack_count=0,
        )
        self.assertTrue(rec_rej.is_failed)

        # Case B: SYN without ACK in TCP
        rec_syn_only = UnifiedTrafficRecord(
            timestamp=datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc),
            protocol="TCP",
            syn_count=1,
            ack_count=0,
            conn_state="S0",
        )
        self.assertTrue(rec_syn_only.is_failed)

    def test_csv_parser_with_aliases_and_missing_values(self):
        # Create small test dataframe with diverse column headers and messy values
        df = pd.DataFrame([
            {
                "time": "2026-01-01 10:00:00",
                "flow duration": "1000000", # 1 sec in microseconds
                "source ip": "192.168.1.10",
                "destination ip": "10.0.0.1",
                "source port": "54321",
                "destination port": "80",
                "protocol": "6", # TCP
                "total fwd packets": "5",
                "total backward packets": "5",
                "total length of fwd packets": "250",
                "total length of bwd packets": "750",
                "syn flag count": "1",
                "ack flag count": "1",
                "average packet size": "100.0",
                "label": "BENIGN",
            },
            {
                "time": "2026-01-01 10:00:15",
                "flow duration": "500000",
                "source ip": "192.168.1.100",
                "destination ip": "10.0.0.5",
                "source port": "44444",
                "destination port": "22",
                "protocol": "TCP",
                "total fwd packets": "2",
                "total backward packets": "0",
                "total length of fwd packets": "80",
                "total length of bwd packets": "0",
                "syn flag count": "2",
                "ack flag count": "0",
                "average packet size": "40.0",
                "label": "PortScan",
            },
        ])

        records = self.parser.parse_dataframe(df)
        self.assertEqual(len(records), 2)
        self.assertEqual(records[0].src_ip, "192.168.1.10")
        self.assertEqual(records[0].dst_port, 80)
        self.assertEqual(records[0].protocol, "TCP")
        self.assertEqual(records[0].total_packets, 10)
        self.assertEqual(records[0].total_bytes, 1000)
        self.assertEqual(records[0].raw_label, "BENIGN")

        self.assertEqual(records[1].dst_port, 22)
        self.assertEqual(records[1].raw_label, "PortScan")
        self.assertTrue(records[1].is_failed)
        self.assertTrue(records[0].timestamp < records[1].timestamp)


class TestFeatureExtractor(unittest.TestCase):
    """Tests volumetric, TCP flag, graph topological, and entropy extraction."""

    def setUp(self):
        self.extractor = NetworkFeatureExtractor()

    def test_shannon_entropy(self):
        # Uniform distribution: H([A, B, C, D]) = log2(4) = 2.0
        uniform = ["A", "B", "C", "D"]
        self.assertAlmostEqual(calculate_shannon_entropy(uniform), 2.0)

        # Zero entropy for identical elements
        identical = ["A", "A", "A", "A"]
        self.assertAlmostEqual(calculate_shannon_entropy(identical), 0.0)

        # Empty
        self.assertEqual(calculate_shannon_entropy([]), 0.0)

    def test_feature_extraction_from_records(self):
        t0 = datetime(2026, 1, 1, 10, 0, 0, tzinfo=timezone.utc)
        flows = [
            UnifiedTrafficRecord(
                timestamp=t0,
                duration_sec=1.0,
                src_ip="192.168.1.5",
                dst_ip="10.0.0.1",
                src_port=40001,
                dst_port=80,
                protocol="TCP",
                fwd_packets=10,
                bwd_packets=20,
                fwd_bytes=500,
                bwd_bytes=3000,
                syn_count=1,
                ack_count=1,
                packet_size_mean=116.6,
                conn_state="SF",
            ),
            UnifiedTrafficRecord(
                timestamp=t0 + timedelta(seconds=10),
                duration_sec=0.5,
                src_ip="192.168.1.5",
                dst_ip="10.0.0.2",
                src_port=40002,
                dst_port=443,
                protocol="TCP",
                fwd_packets=5,
                bwd_packets=5,
                fwd_bytes=400,
                bwd_bytes=600,
                syn_count=1,
                ack_count=1,
                packet_size_mean=100.0,
                conn_state="SF",
            ),
        ]

        vec, feat_dict = self.extractor.extract_features(flows, window_duration_sec=60.0)
        self.assertEqual(len(vec), self.extractor.dimension)
        self.assertFalse(np.isnan(vec).any())
        self.assertFalse(np.isinf(vec).any())

        # Check specific values
        self.assertEqual(feat_dict["total_flows"], 2.0)
        self.assertEqual(feat_dict["total_packets"], 40.0)
        self.assertEqual(feat_dict["total_bytes"], 4500.0)
        self.assertAlmostEqual(feat_dict["byte_rate"], 4500.0 / 60.0)
        self.assertEqual(feat_dict["unique_src_ips"], 1.0)
        self.assertEqual(feat_dict["unique_dst_ips"], 2.0)
        self.assertEqual(feat_dict["unique_dst_ports"], 2.0)
        self.assertEqual(feat_dict["failed_conn_ratio"], 0.0)
        self.assertEqual(feat_dict["tcp_ratio"], 1.0)
        self.assertEqual(feat_dict["udp_ratio"], 0.0)


class TestTemporalStateEngine(unittest.TestCase):
    """Tests temporal discretization, configurable durations, and sequence generation."""

    def test_discretization_default_60s_and_ordering(self):
        engine = TemporalStateEngine(window_duration_sec=60.0, stride_sec=60.0)
        base = datetime(2026, 1, 1, 10, 0, 0, tzinfo=timezone.utc)

        records = [
            # Window 0 (0-60s)
            UnifiedTrafficRecord(
                timestamp=base + timedelta(seconds=10),
                fwd_packets=5,
                fwd_bytes=200,
                raw_label="BENIGN",
            ),
            UnifiedTrafficRecord(
                timestamp=base + timedelta(seconds=40),
                fwd_packets=10,
                fwd_bytes=500,
                raw_label="BENIGN",
            ),
            # Window 1 (60-120s)
            UnifiedTrafficRecord(
                timestamp=base + timedelta(seconds=80),
                fwd_packets=2,
                fwd_bytes=80,
                raw_label="PortScan",
                conn_state="REJ",
            ),
            # Window 2 (120-180s)
            UnifiedTrafficRecord(
                timestamp=base + timedelta(seconds=150),
                fwd_packets=20,
                fwd_bytes=1000,
                raw_label="SSH-Patator",
            ),
        ]

        states = engine.discretize_records(records)
        self.assertGreaterEqual(len(states), 3)

        # Verify strict chronological ordering
        for i in range(len(states) - 1):
            self.assertTrue(states[i].window_start < states[i + 1].window_start)
            self.assertEqual(states[i].window_end, states[i + 1].window_start)
            self.assertEqual(states[i].window_index, i)

        # Verify stage mappings
        self.assertEqual(states[0].ground_truth_stage, AttackStage.NORMAL)
        self.assertEqual(states[1].ground_truth_stage, AttackStage.SCANNING)
        self.assertEqual(states[2].ground_truth_stage, AttackStage.CREDENTIAL_ACCESS)

    def test_configurable_window_duration(self):
        # 30-second window
        engine_30 = TemporalStateEngine(window_duration_sec=30.0, stride_sec=30.0)
        base = datetime(2026, 1, 1, 10, 0, 0, tzinfo=timezone.utc)
        records = [
            UnifiedTrafficRecord(timestamp=base + timedelta(seconds=10)),
            UnifiedTrafficRecord(timestamp=base + timedelta(seconds=40)),
            UnifiedTrafficRecord(timestamp=base + timedelta(seconds=70)),
            UnifiedTrafficRecord(timestamp=base + timedelta(seconds=100)),
        ]
        states_30 = engine_30.discretize_records(records)
        self.assertEqual(len(states_30), 4)
        for s in states_30:
            self.assertEqual(s.duration_sec, 30.0)

    def test_state_scaler_zero_leakage(self):
        engine = TemporalStateEngine(window_duration_sec=60.0)
        base = datetime(2026, 1, 1, 10, 0, 0, tzinfo=timezone.utc)
        records = [
            UnifiedTrafficRecord(timestamp=base + timedelta(seconds=i * 60 + 5), total_bytes=(i + 1) * 1000)
            for i in range(8)
        ]
        states = engine.discretize_records(records)

        # Partition into train (first 4) and test (remaining 4)
        train_states = states[:4]
        test_states = states[4:]

        scaler = TemporalStateScaler(method="standard")
        # Fit strictly on train states
        scaler.fit(train_states)
        self.assertTrue(scaler.is_fitted)

        scaled_train = scaler.transform_all(train_states)
        scaled_test = scaler.transform_all(test_states)

        self.assertEqual(len(scaled_train), 4)
        self.assertEqual(len(scaled_test), 4)
        self.assertFalse(np.isnan(scaled_test[0].features).any())

    def test_sequence_builder_shapes(self):
        engine = TemporalStateEngine(window_duration_sec=60.0)
        base = datetime(2026, 1, 1, 10, 0, 0, tzinfo=timezone.utc)
        records = [
            UnifiedTrafficRecord(
                timestamp=base + timedelta(seconds=i * 60 + 5),
                raw_label="PortScan" if i % 2 == 1 else "BENIGN"
            )
            for i in range(12)
        ]
        states = engine.discretize_records(records)

        W = 4
        K = 3
        seq_builder = TemporalWindowSequenceBuilder(history_window_size=W, forecast_horizon=K)
        X, Y, pivots = seq_builder.build_sequences(states)

        # Expected number of samples: num_states - W - K + 1 = 12 - 4 - 3 + 1 = 6
        self.assertEqual(X.shape[0], 6)
        self.assertEqual(X.shape[1], W)
        self.assertEqual(X.shape[2], len(states[0].features))
        self.assertEqual(Y.shape[0], 6)
        self.assertEqual(Y.shape[1], K)


if __name__ == "__main__":
    unittest.main()
