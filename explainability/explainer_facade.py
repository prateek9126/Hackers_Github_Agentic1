"""
Unified Explainability Facade for SIH26153.
Automatically selects and dispatches between Integrated Gradients (for PyTorch LSTM)
and TreeSHAP (for XGBoost), providing consistent explainability reports.
"""

from typing import Dict, List, Optional, Any
import numpy as np

from models.lstm.lstm_model import TemporalLSTMForecaster
from models.xgboost.xgboost_model import BaselineXGBoost
from explainability.integrated_gradients import LSTMIntegratedGradientsExplainer
from explainability.shap_explainer import XGBoostShapExplainer


class ModelExplainer:
    """
    High-level facade explaining predictions from either LSTM or XGBoost models.
    """

    def __init__(
        self,
        forecasting_model: Any,
        model_type: str = "lstm",
        feature_names: Optional[List[str]] = None,
        dt_sec: float = 20.0,
        device: str = "cpu",
    ):
        self.model = forecasting_model
        self.model_type = model_type.lower()
        self.feature_names = feature_names or []
        self.dt_sec = dt_sec

        if self.model_type == "lstm":
            # Extract PyTorch neural net
            net = getattr(self.model, "model", self.model)
            self.engine = LSTMIntegratedGradientsExplainer(
                pytorch_model=net,
                feature_names=self.feature_names,
                dt_sec=dt_sec,
                device=device,
            )
        elif self.model_type in ("xgboost", "xgb"):
            self.engine = XGBoostShapExplainer(
                xgboost_model=self.model,
                feature_names=self.feature_names,
            )
        else:
            raise ValueError(f"Explainer not supported for model type: {model_type}")

    def explain_forecast(
        self,
        input_sequence: np.ndarray,
        target_class: Optional[int] = None,
        top_n: int = 5,
    ) -> Dict[str, Any]:
        """
        Generates mathematically grounded explanations for why the model predicted an attack stage.
        """
        return self.engine.explain(
            input_sequence if self.model_type == "lstm" else input_sequence[:, -1, :],
            target_class=target_class,
            top_n=top_n,
        )
