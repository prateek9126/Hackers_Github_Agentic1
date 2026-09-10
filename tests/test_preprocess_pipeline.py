"""
Unit Tests for SIH26153 Dataset Preprocessing Pipeline and Labeling Engine.
Verifies explicit attack-stage mappings, UNMAPPED handling, and end-to-end tensor generation.
"""

import unittest
import os
import shutil
import numpy as np

from states.taxonomy import AttackStage
from states.labeling import DatasetLabelMapper, MappingRationale
from data.preprocess_pipeline import DatasetPreprocessor


class TestDatasetLabelMapper(unittest.TestCase):
    """Tests explicit label mappings and unmapped label safeguards."""

    def setUp(self):
        self.mapper = DatasetLabelMapper()

    def test_ctu13_mappings(self):
        # 1. Background traffic -> NORMAL
        self.assertEqual(
            self.mapper.map_label("flow=To-Background-UDP-CVUT-DNS-Server"),
            AttackStage.NORMAL
        )
        self.assertEqual(
            self.mapper.map_label("flow=Background-UDP-Established"),
            AttackStage.NORMAL
        )
        self.assertEqual(
            self.mapper.map_label("flow=From-Normal-V46-Stribrek"),
            AttackStage.NORMAL
        )

        # 2. Reconnaissance
        self.assertEqual(
            self.mapper.map_label("flow=From-Botnet-V46-UDP-DNS"),
            AttackStage.RECONNAISSANCE
        )

        # 3. Scanning
        self.assertEqual(
            self.mapper.map_label("flow=From-Botnet-V46-TCP-Attempt"),
            AttackStage.SCANNING
        )

        # 4. Initial Access (Binary payload download)
        self.assertEqual(
            self.mapper.map_label("flow=From-Botnet-V46-TCP-Established-HTTP-Binary-Download-1"),
            AttackStage.INITIAL_ACCESS
        )

        # 5. Command & Control
        self.assertEqual(
            self.mapper.map_label("flow=From-Botnet-V46-TCP-CC12-HTTP-Not-Encrypted"),
            AttackStage.COMMAND_AND_CONTROL
        )
        self.assertEqual(
            self.mapper.map_label("flow=From-Botnet-V46-TCP-Established-Custom-Encryption-1"),
            AttackStage.COMMAND_AND_CONTROL
        )

        # 6. Exfiltration (Spam bulk outbound)
        self.assertEqual(
            self.mapper.map_label("flow=From-Botnet-V46-TCP-Established-SPAM"),
            AttackStage.EXFILTRATION
        )

        # 7. Unmapped / Ambiguous
        self.assertEqual(
            self.mapper.map_label("flow=From-Botnet-V46-TCP-Established-HTTP-Ad-46"),
            AttackStage.UNMAPPED
        )

    def test_cic_ids_mappings(self):
        self.assertEqual(self.mapper.map_label("BENIGN"), AttackStage.NORMAL)
        self.assertEqual(self.mapper.map_label("PortScan"), AttackStage.SCANNING)
        self.assertEqual(self.mapper.map_label("FTP-Patator"), AttackStage.CREDENTIAL_ACCESS)
        self.assertEqual(self.mapper.map_label("SSH-Patator"), AttackStage.CREDENTIAL_ACCESS)
        self.assertEqual(self.mapper.map_label("Infiltration"), AttackStage.LATERAL_MOVEMENT)
        self.assertEqual(self.mapper.map_label("Bot"), AttackStage.COMMAND_AND_CONTROL)
        self.assertEqual(self.mapper.map_label("DDoS"), AttackStage.IMPACT_DOS)
        self.assertEqual(self.mapper.map_label("DoS Hulk"), AttackStage.IMPACT_DOS)

    def test_unmapped_safeguard(self):
        # Arbitrary string not in taxonomy or registries must map to UNMAPPED
        self.assertEqual(self.mapper.map_label("WeirdProtocolAnomaly123"), AttackStage.UNMAPPED)
        self.assertIn("WeirdProtocolAnomaly123", self.mapper.unmapped_labels_seen)

    def test_mapping_rationale_documentation(self):
        rationale = self.mapper.get_rationale("flow=From-Botnet-V46-TCP-CC12-HTTP-Not-Encrypted")
        self.assertIsNotNone(rationale)
        self.assertEqual(rationale.mapped_stage, AttackStage.COMMAND_AND_CONTROL)
        self.assertGreaterEqual(rationale.confidence, 0.9)
        self.assertIn("command and control", rationale.reasoning.lower())


class TestDatasetPreprocessor(unittest.TestCase):
    """Tests end-to-end preprocessing pipeline on synthetic traffic sample."""

    def setUp(self):
        self.temp_out = "data/processed_test_sample"
        os.makedirs(self.temp_out, exist_ok=True)

    def tearDown(self):
        if os.path.exists(self.temp_out):
            shutil.rmtree(self.temp_out)

    def test_pipeline_on_synthetic_data(self):
        csv_path = "data/samples/synthetic_traffic.csv"
        preprocessor = DatasetPreprocessor(
            window_duration_sec=20.0,
            history_window_w=3,
            forecast_horizon_k=1,
            train_ratio=0.70,
            val_ratio=0.15,
            test_ratio=0.15,
        )

        report = preprocessor.run_full_pipeline(
            raw_data_path=csv_path,
            output_dir=self.temp_out,
        )

        # Check report contents
        self.assertIn("pipeline_config", report)
        self.assertIn("partitions", report)
        self.assertTrue(os.path.exists(os.path.join(self.temp_out, "X_train.npy")))
        self.assertTrue(os.path.exists(os.path.join(self.temp_out, "Y_train.npy")))
        self.assertTrue(os.path.exists(os.path.join(self.temp_out, "data_quality_report.json")))
        self.assertTrue(os.path.exists(os.path.join(self.temp_out, "data_quality_report.md")))

        X_train = np.load(os.path.join(self.temp_out, "X_train.npy"))
        Y_train = np.load(os.path.join(self.temp_out, "Y_train.npy"))
        self.assertEqual(len(X_train.shape), 3) # (Samples, W, D)
        self.assertEqual(X_train.shape[1], 3)   # W=3
        self.assertEqual(Y_train.shape[1], 1)   # K=1


if __name__ == "__main__":
    unittest.main()
