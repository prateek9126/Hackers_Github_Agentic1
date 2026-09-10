"""
Unit Tests for SIH26153 Phase 6: Model Explainability Engine.
Verifies Integrated Gradients temporal-spatial attributions for PyTorch LSTM
and TreeSHAP exact Shapley values for Baseline XGBoost.
"""

import unittest
import numpy as np
import torch

from models.lstm.lstm_model import TemporalLSTMNetwork
from models.xgboost.xgboost_model import BaselineXGBoost
from explainability.integrated_gradients import LSTMIntegratedGradientsExplainer
from explainability.shap_explainer import XGBoostShapExplainer
from explainability.explainer_facade import ModelExplainer


class TestExplainability(unittest.TestCase):

    def setUp(self):
        torch.manual_seed(42)
        np.random.seed(42)
        self.W, self.D, self.C = 4, 10, 10
        self.feature_names = [f"feat_{i}" for i in range(self.D)]

        # Synthetic LSTM Network
        self.lstm_net = TemporalLSTMNetwork(
            input_size=self.D,
            hidden_size=16,
            num_layers=1,
            num_classes=self.C,
        )

        # Synthetic sequence
        self.x_seq = np.random.randn(1, self.W, self.D).astype(np.float32)

    def test_lstm_integrated_gradients(self):
        """Integrated Gradients should compute (W, D) attributions and identify time windows."""
        explainer = LSTMIntegratedGradientsExplainer(
            pytorch_model=self.lstm_net,
            feature_names=self.feature_names,
            num_steps=15,
            dt_sec=20.0,
            device="cpu",
        )

        result = explainer.explain(self.x_seq, top_n=3)

        self.assertEqual(result["explainer_type"], "Integrated Gradients (PyTorch LSTM)")
        self.assertIn("predicted_stage", result)
        self.assertIn("top_signals", result)
        self.assertEqual(len(result["top_signals"]), 3)

        # Each signal must contain time window, feature name, observed value, and direction
        for sig in result["top_signals"]:
            self.assertIn("time_window", sig)
            self.assertIn("feature_name", sig)
            self.assertIn(sig["direction"], ["INCREASES_RISK", "DECREASES_RISK"])
            self.assertIn("explanation_text", sig)

    def test_xgboost_shap_explainer(self):
        """XGBoost TreeSHAP should compute exact Shapley values for instantaneous state."""
        # Train a small XGBoost baseline
        X_train = np.random.randn(30, self.D).astype(np.float32)
        y_train = np.random.choice([0, 2, 7, 8], size=30)
        xgb = BaselineXGBoost(n_estimators=5, max_depth=2, num_classes=self.C)
        xgb.fit(X_train, y_train)

        explainer = XGBoostShapExplainer(
            xgboost_model=xgb,
            feature_names=self.feature_names,
        )

        result = explainer.explain(X_train[0:1], top_n=3)
        self.assertEqual(result["explainer_type"], "TreeSHAP (XGBoost)")
        self.assertEqual(len(result["top_signals"]), 3)
        for sig in result["top_signals"]:
            self.assertIn("attribution_score", sig)
            self.assertIn(sig["direction"], ["INCREASES_RISK", "DECREASES_RISK"])

    def test_model_explainer_facade(self):
        """Unified ModelExplainer should seamlessly wrap LSTM."""
        facade = ModelExplainer(
            forecasting_model=self.lstm_net,
            model_type="lstm",
            feature_names=self.feature_names,
        )
        report = facade.explain_forecast(self.x_seq, top_n=4)
        self.assertEqual(len(report["top_signals"]), 4)


if __name__ == "__main__":
    unittest.main()
