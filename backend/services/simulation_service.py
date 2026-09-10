"""
Backend Simulation Service for SIH26153.
Orchestrates What-If defense simulation, counterfactual state perturbation,
and persistence of defense evaluation results to the database.
"""

from typing import Dict, List, Optional, Any
from simulation.what_if import (
    WhatIfSimulator,
    create_standard_defense,
    DefenseActionType,
    WhatIfSimulationResult,
)
from backend.services.forecasting_service import BackendForecastingService
from backend.database.repository import DatabaseRepository


class BackendSimulationService:
    """Service executing and logging counterfactual defense simulations."""

    def __init__(self, forecasting_service: BackendForecastingService):
        self.forecasting_service = forecasting_service
        self.simulator = WhatIfSimulator(
            forecaster=self.forecasting_service.ml_service.forecaster,
            feature_names=self.forecasting_service.feature_names,
        )

    def simulate_defense(
        self,
        action_type: str,
        target_entity: Optional[str] = None,
        horizon: int = 5,
        repository: Optional[DatabaseRepository] = None,
    ) -> Dict[str, Any]:
        """
        Applies counterfactual intervention, re-forecasts trajectory, and saves result.
        """
        action_spec = create_standard_defense(action_type=action_type, target=target_entity)

        result: WhatIfSimulationResult = self.simulator.simulate(
            observation_sequence=self.forecasting_service.current_sequence,
            action=action_spec,
            horizon=horizon,
        )

        res_dict = result.to_dict()

        if repository:
            try:
                repository.save_simulation_result(
                    action_type=action_spec.action_type.value,
                    target_entity=action_spec.target_entity,
                    original_risk=result.original_risk,
                    simulated_risk=result.simulated_risk,
                    risk_difference=result.risk_difference,
                    risk_reduction_pct=result.risk_reduction_pct,
                    original_forecast=result.original_forecast,
                    simulated_forecast=result.simulated_forecast,
                    feature_modifications=result.feature_modifications,
                    assumptions=result.assumptions,
                    disclaimer=result.disclaimer,
                )
            except Exception:
                pass

        return res_dict
