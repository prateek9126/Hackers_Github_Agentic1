"""
Pydantic Request and Response Schemas for SIH26153 FastAPI Backend.
Enforces strict input validation, type safety, and clean API contracts.
"""

from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


# --- Health & Ingest ---
class HealthResponse(BaseModel):
    status: str = "healthy"
    database: str
    database_engine: str
    version: str = "1.0.0"
    offline_mode: bool = True


class IngestRequest(BaseModel):
    file_path: Optional[str] = Field(None, description="Path to CSV/PCAP telemetry file")
    window_sec: Optional[float] = Field(20.0, description="Window aggregation duration in seconds")


class IngestResponse(BaseModel):
    status: str
    flows_processed: int
    windows_generated: int
    message: str


# --- Current State ---
class CurrentStateResponse(BaseModel):
    window_index: int
    timestamp: str
    duration_sec: float
    ground_truth_stage: str
    stage_id: int
    top_features: Dict[str, float]
    total_bytes: int
    total_packets: int
    active_connections: int


# --- Forecast & Trajectory ---
class ForecastStepSchema(BaseModel):
    step: int
    stage: str
    probability: float
    confidence: float
    timestamp: str
    mitre_tactic: Optional[str] = "Unknown"


class ForecastResponse(BaseModel):
    model: str
    current_stage: str
    forecast_horizon: int
    prediction_time: str
    forecast: List[ForecastStepSchema]
    next_stage_probabilities: Dict[str, float]


class TrajectoryNodeSchema(BaseModel):
    node_id: str
    step: int
    timestamp: str
    stage: str
    stage_id: int
    state_type: str
    probability: float
    confidence: float
    supporting_features: Dict[str, float]
    mitre_mapping: Dict[str, Any]


class TrajectoryEdgeSchema(BaseModel):
    source_node_id: str
    target_node_id: str
    transition_probability: float
    progression_type: str
    lead_time_sec: float


class TrajectoryResponse(BaseModel):
    prediction_time: str
    current_stage: str
    forecast_horizon: int
    forecast: List[ForecastStepSchema]
    cumulative_risk_trajectory: List[float]
    nodes: List[TrajectoryNodeSchema]
    edges: List[TrajectoryEdgeSchema]


# --- Explainability ---
class SignalSchema(BaseModel):
    feature_name: str
    time_window: str
    observed_value: float
    attribution_score: float
    direction: str
    explanation_text: str


class ExplanationResponse(BaseModel):
    explainer_type: str
    predicted_stage: str
    confidence: float
    top_signals: List[SignalSchema]
    natural_language_summary: List[str]


# --- MITRE ATT&CK ---
class MitreTechniqueSchema(BaseModel):
    technique_id: str
    technique_name: str
    tactic_id: str
    tactic_name: str
    status: str                         # "OBSERVED TECHNIQUE" or "PREDICTED TECHNIQUE"
    confidence: float
    evidence: List[str]
    stage_id: int
    stage_name: str


class MitreMappingResponse(BaseModel):
    total_techniques: int
    techniques: List[MitreTechniqueSchema]


# --- What-If Defense Simulation ---
class SimulateRequest(BaseModel):
    action_type: str = Field(..., description="HOST_ISOLATION, BLOCK_DESTINATION_PORT, BLOCK_SUSPICIOUS_SOURCE, RESTRICT_OUTBOUND_TRAFFIC")
    target_entity: Optional[str] = Field(None, description="IP address or port to target")
    horizon: Optional[int] = Field(5, description="Forecast horizon steps K")


class SimulateResponse(BaseModel):
    disclaimer: str
    defense_action: Dict[str, Any]
    original_stage: str
    original_risk: float
    simulated_risk: float
    risk_difference: float
    risk_reduction_pct: float
    original_forecast: List[Dict[str, Any]]
    simulated_forecast: List[Dict[str, Any]]
    feature_modifications: List[Dict[str, Any]]
    assumptions: List[str]


# --- Risk & Metrics ---
class RiskTrajectoryResponse(BaseModel):
    timestamp: str
    current_stage: str
    current_risk: float
    forward_risk_trajectory: List[float]


class MetricsResponse(BaseModel):
    dataset: str
    forecast_horizon: int
    k_step_accuracy: Dict[str, float]
    k_step_top2_accuracy: Dict[str, float]
    mean_lead_time_sec: float
    max_lead_time_sec: float
    total_advance_warnings: int
    models_compared: Dict[str, Any]


# --- PCAP Replay & Offline Demonstration ---
class ReplayTimelineStepSchema(BaseModel):
    step_index: int
    timestamp: str
    stage_id: int
    stage_name: str
    is_attack: bool
    lead_time_offset_sec: float
    packet_count: Optional[int] = None
    byte_count: Optional[int] = None


class ReplayTimelineResponse(BaseModel):
    scenario_id: str
    scenario_name: str
    scenario_type: str
    total_steps: int
    window_duration_sec: float
    description: str
    available_scenarios: List[Dict[str, Any]]
    timeline: List[ReplayTimelineStepSchema]
    has_ground_truth: bool = True
    pcap_filename: Optional[str] = None
    packet_count: Optional[int] = None
    file_size_bytes: Optional[int] = None
    duration_sec: Optional[float] = None
    status: Optional[str] = None


class ReplayStepRequest(BaseModel):
    scenario_id: Optional[str] = Field("synthetic", description="Scenario ID ('ctu13', 'synthetic', or uploaded scenario ID)")
    step_index: int = Field(0, description="Step index along timeline")
    horizon: Optional[int] = Field(5, description="Forecast horizon steps")


class LeadTimeEvaluationSchema(BaseModel):
    predicted_at_step: int
    current_step: int
    predicted_stage: str
    actual_stage: str
    confidence: float
    lead_time_sec: float
    is_correct: bool
    message: str
    is_ground_truth_available: bool = True


class ReplayStepResponse(BaseModel):
    scenario_id: str
    scenario_type: str
    step_index: int
    total_steps: int
    timestamp: str
    temporal_causality_verified: bool
    future_ground_truth_withheld: bool
    has_ground_truth: bool = True
    pcap_filename: Optional[str] = None
    packet_count: Optional[int] = None
    current_state: CurrentStateResponse
    forecast: ForecastResponse
    trajectory: TrajectoryResponse
    lead_time_evaluations: List[LeadTimeEvaluationSchema]
    has_advance_warning: bool


# --- Dynamic PCAP Upload ---
class PcapUploadResponse(BaseModel):
    success: bool
    message: str
    scenario_id: str
    scenario_name: str
    scenario_type: str
    filename: str
    file_size_bytes: int
    packet_count: int
    duration_sec: float
    total_windows: int
    window_duration_sec: float
    status: str
    has_ground_truth: bool = False
    timeline: List[ReplayTimelineStepSchema]

