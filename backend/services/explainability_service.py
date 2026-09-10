"""
Backend Explainability Service for SIH26153.
Coordinates Integrated Gradients and TreeSHAP feature attributions and persistence.
"""

from typing import Dict, List, Optional, Any
from explainability.explainer_facade import ModelExplainer
from backend.services.forecasting_service import BackendForecastingService
from backend.database.repository import DatabaseRepository


class BackendExplainabilityService:
    """Service computing and persisting model attribution rationales."""

    def __init__(self, forecasting_service: BackendForecastingService):
        self.forecasting_service = forecasting_service
        self.explainer = ModelExplainer(
            forecasting_model=self.forecasting_service.ml_service.model,
            model_type=self.forecasting_service.model_type,
            feature_names=self.forecasting_service.feature_names,
        )

    def explain_current_forecast(
        self, top_n: int = 5, repository: Optional[DatabaseRepository] = None
    ) -> Dict[str, Any]:
        """Generates mathematically grounded explanation for current forecast."""
        report = self.explainer.explain_forecast(
            input_sequence=self.forecasting_service.current_sequence,
            top_n=top_n,
        )

        if repository:
            try:
                repository.save_explanation(
                    explainer_type=report["explainer_type"],
                    predicted_stage=report["predicted_stage"],
                    confidence=report["confidence"],
                    top_signals=report["top_signals"],
                    attributions=report.get("temporal_attributions", {}),
                )
            except Exception:
                pass

        return report
