"""
SQLAlchemy ORM Data Models for SIH26153.
Defines schemas for network_states, predictions, trajectories, mitre_predictions,
explanations, simulation_results, risk_scores, and experiments.
"""

import uuid
from datetime import datetime
from typing import Dict, List, Any
from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    DateTime,
    Text,
    ForeignKey,
    JSON,
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class NetworkStateRecord(Base):
    __tablename__ = "network_states"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    window_index = Column(Integer, nullable=False, index=True)
    window_start = Column(DateTime, nullable=False, index=True)
    window_end = Column(DateTime, nullable=False)
    duration_sec = Column(Float, nullable=False)
    features = Column(JSON, nullable=False) # List[float]
    feature_names = Column(JSON, nullable=False) # List[str]
    ground_truth_stage = Column(String(32), default="NORMAL")
    stage_id = Column(Integer, default=0)
    active_connections = Column(Integer, default=0)
    total_bytes = Column(Integer, default=0)
    total_packets = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


class PredictionRecord(Base):
    __tablename__ = "predictions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    state_id = Column(String(36), ForeignKey("network_states.id"), nullable=True)
    prediction_time = Column(DateTime, default=datetime.utcnow, index=True)
    model_type = Column(String(32), nullable=False)
    forecast_lead_time_sec = Column(Float, default=20.0)
    predicted_stage = Column(String(32), nullable=False)
    predicted_stage_id = Column(Integer, nullable=False)
    confidence = Column(Float, nullable=False)
    probabilities = Column(JSON, nullable=False) # Dict[str, float]
    created_at = Column(DateTime, default=datetime.utcnow)


class TrajectoryRecord(Base):
    __tablename__ = "trajectories"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    prediction_id = Column(String(36), ForeignKey("predictions.id"), nullable=True)
    prediction_time = Column(DateTime, default=datetime.utcnow, index=True)
    current_stage = Column(String(32), nullable=False)
    forecast_horizon = Column(Integer, default=5)
    nodes = Column(JSON, nullable=False) # List[Dict]
    edges = Column(JSON, nullable=False) # List[Dict]
    cumulative_risk = Column(JSON, nullable=False) # List[float]
    created_at = Column(DateTime, default=datetime.utcnow)


class MitrePredictionRecord(Base):
    __tablename__ = "mitre_predictions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    trajectory_id = Column(String(36), ForeignKey("trajectories.id"), nullable=True)
    technique_id = Column(String(32), nullable=False, index=True)
    technique_name = Column(String(128), nullable=False)
    tactic_id = Column(String(32), nullable=False)
    tactic_name = Column(String(64), nullable=False)
    status = Column(String(32), nullable=False) # "OBSERVED TECHNIQUE" or "PREDICTED TECHNIQUE"
    confidence = Column(Float, nullable=False)
    evidence = Column(JSON, nullable=False) # List[str]
    step = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


class ExplanationRecord(Base):
    __tablename__ = "explanations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    prediction_id = Column(String(36), ForeignKey("predictions.id"), nullable=True)
    explainer_type = Column(String(64), nullable=False)
    predicted_stage = Column(String(32), nullable=False)
    confidence = Column(Float, nullable=False)
    top_signals = Column(JSON, nullable=False) # List[Dict]
    attributions = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)


class SimulationResultRecord(Base):
    __tablename__ = "simulation_results"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    trajectory_id = Column(String(36), ForeignKey("trajectories.id"), nullable=True)
    action_type = Column(String(64), nullable=False)
    target_entity = Column(String(128), nullable=False)
    original_risk = Column(Float, nullable=False)
    simulated_risk = Column(Float, nullable=False)
    risk_difference = Column(Float, nullable=False)
    risk_reduction_pct = Column(Float, nullable=False)
    original_forecast = Column(JSON, nullable=False)
    simulated_forecast = Column(JSON, nullable=False)
    feature_modifications = Column(JSON, nullable=False)
    assumptions = Column(JSON, nullable=False)
    disclaimer = Column(Text, nullable=False)
    simulated_at = Column(DateTime, default=datetime.utcnow)


class RiskScoreRecord(Base):
    __tablename__ = "risk_scores"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    current_stage = Column(String(32), nullable=False)
    current_risk = Column(Float, nullable=False)
    forward_risk_trajectory = Column(JSON, nullable=False) # List[float]
    created_at = Column(DateTime, default=datetime.utcnow)


class ExperimentRecord(Base):
    __tablename__ = "experiments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(128), nullable=False)
    dataset = Column(String(128), nullable=False)
    description = Column(Text, nullable=True)
    models_evaluated = Column(JSON, nullable=False)
    metrics = Column(JSON, nullable=False)
    lead_time_metrics = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
