"""
Unit Tests for SIH26153 Phase 6: MITRE ATT&CK Mapper.
Verifies telemetry rule matching, evidence extraction, confidence scoring,
and explicit distinction between OBSERVED and PREDICTED techniques.
"""

import unittest
import numpy as np

from mitre.mapper import MitreMapper, MitreTechniqueMapping
from states.taxonomy import AttackStage


class TestMitreMapper(unittest.TestCase):

    def setUp(self):
        self.mapper = MitreMapper()
        self.feature_names = [
            "total_packets", "total_bytes", "fwd_packets", "bwd_packets",
            "fwd_bytes", "bwd_bytes", "byte_rate", "packet_rate",
            "fwd_bwd_byte_ratio", "fwd_bwd_packet_ratio", "total_flows",
            "active_flows", "flow_duration_mean", "flow_duration_std",
            "flow_duration_max", "connection_rate", "failed_conn_ratio",
            "short_flow_ratio", "syn_count", "ack_count", "fin_count",
            "rst_count", "psh_count", "urg_count", "syn_ack_ratio",
            "rst_ratio", "syn_flow_ratio", "packet_size_mean", "packet_size_std",
            "packet_size_min", "packet_size_max", "iat_mean", "iat_std",
            "iat_max", "iat_min", "ttl_mean", "tcp_win_mean",
            "retransmission_count", "retransmission_rate", "fragmented_packets",
            "fragmentation_rate", "unique_src_ips", "unique_dst_ips",
            "unique_dst_ports", "unique_src_ports", "fanout_ratio",
            "src_ip_entropy", "dst_ip_entropy", "dst_port_entropy",
            "tcp_ratio", "udp_ratio", "icmp_ratio", "other_proto_ratio",
            "burst_coefficient_var", "peak_to_avg_rate_ratio",
        ]

    def test_registry_loaded(self):
        """Registry should load techniques from mapping.json."""
        self.assertGreater(len(self.mapper.rules_registry), 5)

    def test_normal_stage_produces_no_attack_techniques(self):
        """Benign normal traffic (stage 0) must produce no malicious MITRE techniques."""
        dummy_feat = np.zeros(len(self.feature_names))
        mappings = self.mapper.map_state(
            stage_id=AttackStage.NORMAL,
            features=dummy_feat,
            feature_names=self.feature_names,
            is_observed=True,
        )
        self.assertEqual(len(mappings), 0)

    def test_scanning_rule_evaluation_observed(self):
        """Scanning telemetry should match T1595/T1046 with observed status and evidence."""
        feat = np.zeros(len(self.feature_names))
        # Set telemetry indicators for scanning
        feat[self.feature_names.index("dst_port_entropy")] = 2.5
        feat[self.feature_names.index("unique_dst_ports")] = 25.0
        feat[self.feature_names.index("connection_rate")] = 12.0
        feat[self.feature_names.index("failed_conn_ratio")] = 0.75

        mappings = self.mapper.map_state(
            stage_id=AttackStage.SCANNING,
            features=feat,
            feature_names=self.feature_names,
            is_observed=True,
            stage_confidence=0.85,
        )
        self.assertGreater(len(mappings), 0)

        # Check observed status
        for m in mappings:
            self.assertEqual(m.status, "OBSERVED TECHNIQUE")
            self.assertGreater(len(m.evidence), 0)
        all_evidence = " ".join([" ".join(m.evidence) for m in mappings])
        self.assertIn("dst_port_entropy", all_evidence)

    def test_exfiltration_predicted_technique(self):
        """Future exfiltration forecast should be tagged PREDICTED TECHNIQUE."""
        feat = np.zeros(len(self.feature_names))
        feat[self.feature_names.index("byte_rate")] = 1500.0
        feat[self.feature_names.index("fwd_bwd_byte_ratio")] = 0.1
        feat[self.feature_names.index("bwd_bytes")] = 60000.0

        mappings = self.mapper.map_state(
            stage_id=AttackStage.EXFILTRATION,
            features=feat,
            feature_names=self.feature_names,
            is_observed=False, # Predicted future state
            stage_confidence=0.75,
        )
        self.assertGreater(len(mappings), 0)
        for m in mappings:
            self.assertEqual(m.status, "PREDICTED TECHNIQUE")
            self.assertIn("TA0010", m.tactic_id)


if __name__ == "__main__":
    unittest.main()
