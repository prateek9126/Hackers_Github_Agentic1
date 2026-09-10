"""
Backend MITRE Mapping Service for SIH26153.
Coordinates evaluation of network telemetry against MITRE ATT&CK profiles,
distinguishing OBSERVED vs PREDICTED techniques.
"""

from typing import Dict, List, Optional, Any
from mitre.mapper import MitreMapper
from backend.services.forecasting_service import BackendForecastingService
from backend.database.repository import DatabaseRepository


class BackendMitreService:
    """Service evaluating and logging evidence-based MITRE ATT&CK techniques."""

    def __init__(self, forecasting_service: BackendForecastingService):
        self.forecasting_service = forecasting_service
        self.mapper = MitreMapper()

    def get_techniques(
        self, repository: Optional[DatabaseRepository] = None
    ) -> Dict[str, Any]:
        """Maps current state and forecasted trajectory nodes to MITRE techniques."""
        traj = self.forecasting_service.get_trajectory(horizon=3)
        curr_feat = self.forecasting_service.current_sequence[0, -1, :]

        all_techniques = []

        # 1. Map current state (OBSERVED)
        curr_stage_id = traj["nodes"][0]["stage_id"] if traj["nodes"] else 8
        curr_conf = traj["nodes"][0]["confidence"] if traj["nodes"] else 0.8
        obs_mappings = self.mapper.map_state(
            stage_id=curr_stage_id,
            features=curr_feat,
            feature_names=self.forecasting_service.feature_names,
            is_observed=True,
            stage_confidence=curr_conf,
        )
        for m in obs_mappings:
            all_techniques.append(m.to_dict())

        # 2. Map future trajectory nodes (PREDICTED)
        for node in traj["nodes"][1:3]:
            pred_mappings = self.mapper.map_state(
                stage_id=node["stage_id"],
                features=curr_feat,
                feature_names=self.forecasting_service.feature_names,
                is_observed=False,
                stage_confidence=node["confidence"],
            )
            for m in pred_mappings:
                all_techniques.append(m.to_dict())

        if repository:
            try:
                repository.save_mitre_predictions(all_techniques)
            except Exception:
                pass

        return {
            "total_techniques": len(all_techniques),
            "techniques": all_techniques,
        }
