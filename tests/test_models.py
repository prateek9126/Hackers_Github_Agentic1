"""
Unit Tests for SIH26153 Phase 4: Baseline Models and Temporal LSTM Forecaster.
Verifies model contracts, output shapes, non-temporal input stripping,
probability distribution validity, checkpoint persistence, and temporal integrity.
"""

import os
import tempfile
import unittest
import numpy as np
import torch

from models.baseline.logistic_regression import BaselineLogisticRegression
from models.xgboost.xgboost_model import BaselineXGBoost
from models.lstm.lstm_model import TemporalLSTMNetwork, TemporalLSTMForecaster
from evaluation.metrics import calculate_evaluation_metrics
from states.taxonomy import NUM_ATTACK_STAGES


class TestBaselineModels(unittest.TestCase):
    """Verifies non-temporal baseline models (Logistic Regression & XGBoost)."""

    def setUp(self):
        np.random.seed(42)
        self.num_samples = 30
        self.seq_len = 4
        self.input_dim = 12
        self.num_classes = NUM_ATTACK_STAGES # 10

        # Synthetic sequences: (N, W, D)
        self.X_seq = np.random.randn(self.num_samples, self.seq_len, self.input_dim).astype(np.float32)
        # Non-contiguous target labels common in cybersecurity captures: e.g., 0 (NORMAL), 2 (SCANNING), 7 (C2), 8 (EXFILTRATION)
        self.y_subset = np.random.choice([0, 2, 7, 8], size=self.num_samples)

    def test_logistic_regression_fit_predict(self):
        """Logistic regression should extract S(t)=X[:, -1, :], predict (N,), and output (N, 10) valid probabilities."""
        lr = BaselineLogisticRegression(max_iter=200, num_classes=self.num_classes, random_state=42)
        lr.fit(self.X_seq, self.y_subset)
        self.assertTrue(lr.is_fitted)

        # Predict classes
        preds = lr.predict(self.X_seq)
        self.assertEqual(preds.shape, (self.num_samples,))

        # Predict probabilities
        probs = lr.predict_proba(self.X_seq)
        self.assertEqual(probs.shape, (self.num_samples, self.num_classes))
        # Row-wise sum should be 1.0
        row_sums = probs.sum(axis=1)
        np.testing.assert_allclose(row_sums, np.ones(self.num_samples), atol=1e-5)

        # Unseen classes in training should have exactly 0 probability
        self.assertTrue(np.all(probs[:, 1] == 0.0)) # Class 1 was not in y_subset

    def test_logistic_regression_save_load(self):
        """Logistic regression should accurately serialize and deserialize."""
        lr = BaselineLogisticRegression(max_iter=200, num_classes=self.num_classes)
        lr.fit(self.X_seq, self.y_subset)
        orig_probs = lr.predict_proba(self.X_seq)

        with tempfile.TemporaryDirectory() as tmpdir:
            ckpt_path = os.path.join(tmpdir, "lr_test.joblib")
            lr.save(ckpt_path)
            loaded_lr = BaselineLogisticRegression.load(ckpt_path)
            loaded_probs = loaded_lr.predict_proba(self.X_seq)
            np.testing.assert_allclose(orig_probs, loaded_probs, atol=1e-5)

    def test_xgboost_fit_predict_with_non_contiguous_labels(self):
        """XGBoost must handle non-contiguous labels, map back to taxonomy, and output (N, 10) valid probabilities."""
        xgb = BaselineXGBoost(n_estimators=10, max_depth=3, num_classes=self.num_classes, random_state=42)
        xgb.fit(self.X_seq, self.y_subset)
        self.assertTrue(xgb.is_fitted)

        preds = xgb.predict(self.X_seq)
        self.assertEqual(preds.shape, (self.num_samples,))
        # All predictions must be in the original non-contiguous classes
        for p in preds:
            self.assertIn(p, [0, 2, 7, 8])

        probs = xgb.predict_proba(self.X_seq)
        self.assertEqual(probs.shape, (self.num_samples, self.num_classes))
        row_sums = probs.sum(axis=1)
        np.testing.assert_allclose(row_sums, np.ones(self.num_samples), atol=1e-5)

    def test_xgboost_save_load(self):
        """XGBoost should serialize and deserialize with label mappings intact."""
        xgb = BaselineXGBoost(n_estimators=10, max_depth=3, num_classes=self.num_classes)
        xgb.fit(self.X_seq, self.y_subset)
        orig_preds = xgb.predict(self.X_seq)

        with tempfile.TemporaryDirectory() as tmpdir:
            ckpt_path = os.path.join(tmpdir, "xgb_test.joblib")
            xgb.save(ckpt_path)
            loaded_xgb = BaselineXGBoost.load(ckpt_path)
            loaded_preds = loaded_xgb.predict(self.X_seq)
            np.testing.assert_array_equal(orig_preds, loaded_preds)


class TestTemporalLSTM(unittest.TestCase):
    """Verifies PyTorch Temporal LSTM Forecaster architecture and training wrapper."""

    def setUp(self):
        torch.manual_seed(42)
        np.random.seed(42)
        self.num_samples = 25
        self.seq_len = 4
        self.input_dim = 16
        self.hidden_dim = 32
        self.num_classes = NUM_ATTACK_STAGES

        self.X_seq = np.random.randn(self.num_samples, self.seq_len, self.input_dim).astype(np.float32)
        self.y_targets = np.random.choice([0, 1, 2, 7, 8], size=self.num_samples)

    def test_lstm_network_forward_pass(self):
        """PyTorch network should map (N, W, D) -> (N, num_classes) logits."""
        net = TemporalLSTMNetwork(
            input_size=self.input_dim,
            hidden_size=self.hidden_dim,
            num_layers=2,
            dropout=0.2,
            num_classes=self.num_classes,
        )
        x_tensor = torch.from_numpy(self.X_seq)
        logits = net(x_tensor)
        self.assertEqual(logits.shape, (self.num_samples, self.num_classes))

    def test_lstm_forecaster_fit_and_predict(self):
        """TemporalLSTMForecaster should train, evaluate, and predict valid probability distributions."""
        forecaster = TemporalLSTMForecaster(
            input_size=self.input_dim,
            hidden_size=self.hidden_dim,
            num_layers=1,
            num_classes=self.num_classes,
            learning_rate=0.01,
            batch_size=8,
            epochs=3,
            device="cpu",
        )

        # Train for 3 quick epochs
        forecaster.fit(
            X_train=self.X_seq[:20],
            y_train=self.y_targets[:20],
            X_val=self.X_seq[20:],
            y_val=self.y_targets[20:],
        )
        self.assertEqual(len(forecaster.training_history), 3)

        # Test predict and predict_proba
        preds = forecaster.predict(self.X_seq)
        self.assertEqual(preds.shape, (self.num_samples,))

        probs = forecaster.predict_proba(self.X_seq)
        self.assertEqual(probs.shape, (self.num_samples, self.num_classes))
        self.assertTrue(np.all(probs >= 0.0))
        self.assertTrue(np.all(probs <= 1.0))
        row_sums = probs.sum(axis=1)
        np.testing.assert_allclose(row_sums, np.ones(self.num_samples), atol=1e-5)

    def test_lstm_checkpoint_persistence(self):
        """TemporalLSTMForecaster should save and load checkpoint without error."""
        forecaster = TemporalLSTMForecaster(
            input_size=self.input_dim,
            hidden_size=self.hidden_dim,
            num_layers=1,
            num_classes=self.num_classes,
            epochs=2,
            device="cpu",
        )
        forecaster.fit(self.X_seq, self.y_targets)
        orig_probs = forecaster.predict_proba(self.X_seq)

        with tempfile.TemporaryDirectory() as tmpdir:
            ckpt_path = os.path.join(tmpdir, "lstm_test.pth")
            forecaster.save_checkpoint(ckpt_path)

            loaded = TemporalLSTMForecaster.load_checkpoint(ckpt_path, device="cpu")
            loaded_probs = loaded.predict_proba(self.X_seq)
            np.testing.assert_allclose(orig_probs, loaded_probs, atol=1e-5)


class TestMetricsAndEvaluation(unittest.TestCase):
    """Verifies evaluation metric computations."""

    def test_metric_computation(self):
        y_true = np.array([0, 0, 1, 2, 7, 8])
        y_pred = np.array([0, 1, 1, 2, 7, 8])
        metrics = calculate_evaluation_metrics(y_true, y_pred, num_classes=10)

        self.assertAlmostEqual(metrics["accuracy"], 5 / 6, places=3)
        self.assertIn("f1_macro", metrics)
        self.assertIn("f1_weighted", metrics)
        self.assertIn("normal_false_positive_rate", metrics)
        # 1 of the 2 normal samples was falsely predicted as 1 (non-normal), so FPR = 0.5
        self.assertAlmostEqual(metrics["normal_false_positive_rate"], 0.5, places=3)


if __name__ == "__main__":
    unittest.main()
