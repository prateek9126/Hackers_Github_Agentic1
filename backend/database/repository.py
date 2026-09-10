"""
Database Repository Layer for SIH26153.
Encapsulates all persistence and retrieval operations for network states,
predictions, trajectories, MITRE mappings, explanations, and simulation results.
"""

from typing import Dict, List, Optional, Any
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.database.models import (
    NetworkStateRecord,
    PredictionRecord,
    TrajectoryRecord,
    MitrePredictionRecord,
    ExplanationRecord,
    SimulationResultRecord,
    RiskScoreRecord,
    ExperimentRecord,
)


class DatabaseRepository:
    """Repository handling database operations."""

    def __init__(self, db: Session):
        self.db = db

    # 1. Network States
    def save_network_state(
        self,
        window_index: int,
        window_start: datetime,
        window_end: datetime,
        duration_sec: float,
        features: List[float],
        feature_names: List[str],
        ground_truth_stage: str = "NORMAL",
        stage_id: int = 0,
        active_connections: int = 0,
        total_bytes: int = 0,
        total_packets: int = 0,
    ) -> NetworkStateRecord:
        record = NetworkStateRecord(
            window_index=window_index,
            window_start=window_start,
            window_end=window_end,
            duration_sec=duration_sec,
            features=features,
            feature_names=feature_names,
            ground_truth_stage=ground_truth_stage,
            stage_id=stage_id,
            active_connections=active_connections,
            total_bytes=total_bytes,
            total_packets=total_packets,
        )
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record

    def get_latest_network_state(self) -> Optional[NetworkStateRecord]:
        return self.db.query(NetworkStateRecord).order_by(desc(NetworkStateRecord.window_index)).first()

    # 2. Predictions
    def save_prediction(
        self,
        model_type: str,
        predicted_stage: str,
        predicted_stage_id: int,
        confidence: float,
        probabilities: Dict[str, float],
        forecast_lead_time_sec: float = 20.0,
        state_id: Optional[str] = None,
    ) -> PredictionRecord:
        record = PredictionRecord(
            state_id=state_id,
            model_type=model_type,
            predicted_stage=predicted_stage,
            predicted_stage_id=predicted_stage_id,
            confidence=confidence,
            probabilities=probabilities,
            forecast_lead_time_sec=forecast_lead_time_sec,
        )
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record

    def get_latest_prediction(self) -> Optional[PredictionRecord]:
        return self.db.query(PredictionRecord).order_by(desc(PredictionRecord.prediction_time)).first()

    # 3. Trajectories
    def save_trajectory(
        self,
        current_stage: str,
        forecast_horizon: int,
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]],
        cumulative_risk: List[float],
        prediction_id: Optional[str] = None,
    ) -> TrajectoryRecord:
        record = TrajectoryRecord(
            prediction_id=prediction_id,
            current_stage=current_stage,
            forecast_horizon=forecast_horizon,
            nodes=nodes,
            edges=edges,
            cumulative_risk=cumulative_risk,
        )
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record

    def get_latest_trajectory(self) -> Optional[TrajectoryRecord]:
        return self.db.query(TrajectoryRecord).order_by(desc(TrajectoryRecord.prediction_time)).first()

    # 4. MITRE Predictions
    def save_mitre_predictions(
        self,
        techniques: List[Dict[str, Any]],
        trajectory_id: Optional[str] = None,
    ) -> List[MitrePredictionRecord]:
        records = []
        for t in techniques:
            rec = MitrePredictionRecord(
                trajectory_id=trajectory_id,
                technique_id=t.get("technique_id", "T0000"),
                technique_name=t.get("technique_name", "Unknown"),
                tactic_id=t.get("tactic_id", "TA0000"),
                tactic_name=t.get("tactic_name", "Unknown"),
                status=t.get("status", "PREDICTED TECHNIQUE"),
                confidence=float(t.get("confidence", 0.0)),
                evidence=t.get("evidence", []),
                step=int(t.get("step", 0)),
            )
            self.db.add(rec)
            records.append(rec)
        self.db.commit()
        return records

    def get_mitre_predictions(self, limit: int = 20) -> List[MitrePredictionRecord]:
        return self.db.query(MitrePredictionRecord).order_by(desc(MitrePredictionRecord.created_at)).limit(limit).all()

    # 5. Explanations
    def save_explanation(
        self,
        explainer_type: str,
        predicted_stage: str,
        confidence: float,
        top_signals: List[Dict[str, Any]],
        attributions: Optional[Dict[str, Any]] = None,
        prediction_id: Optional[str] = None,
    ) -> ExplanationRecord:
        record = ExplanationRecord(
            prediction_id=prediction_id,
            explainer_type=explainer_type,
            predicted_stage=predicted_stage,
            confidence=confidence,
            top_signals=top_signals,
            attributions=attributions or {},
        )
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record

    def get_latest_explanation(self) -> Optional[ExplanationRecord]:
        return self.db.query(ExplanationRecord).order_by(desc(ExplanationRecord.created_at)).first()

    # 6. Simulation Results
    def save_simulation_result(
        self,
        action_type: str,
        target_entity: str,
        original_risk: float,
        simulated_risk: float,
        risk_difference: float,
        risk_reduction_pct: float,
        original_forecast: List[Dict[str, Any]],
        simulated_forecast: List[Dict[str, Any]],
        feature_modifications: List[Dict[str, Any]],
        assumptions: List[str],
        disclaimer: str,
        trajectory_id: Optional[str] = None,
    ) -> SimulationResultRecord:
        record = SimulationResultRecord(
            trajectory_id=trajectory_id,
            action_type=action_type,
            target_entity=target_entity,
            original_risk=original_risk,
            simulated_risk=simulated_risk,
            risk_difference=risk_difference,
            risk_reduction_pct=risk_reduction_pct,
            original_forecast=original_forecast,
            simulated_forecast=simulated_forecast,
            feature_modifications=feature_modifications,
            assumptions=assumptions,
            disclaimer=disclaimer,
        )
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record

    # 7. Risk Scores
    def save_risk_score(
        self,
        current_stage: str,
        current_risk: float,
        forward_risk_trajectory: List[float],
    ) -> RiskScoreRecord:
        record = RiskScoreRecord(
            current_stage=current_stage,
            current_risk=current_risk,
            forward_risk_trajectory=forward_risk_trajectory,
        )
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record

    def get_latest_risk_score(self) -> Optional[RiskScoreRecord]:
        return self.db.query(RiskScoreRecord).order_by(desc(RiskScoreRecord.timestamp)).first()
