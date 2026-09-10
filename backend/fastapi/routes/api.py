"""
FastAPI Route Handlers for SIH26153.
Provides clean HTTP endpoints for ingestion, state retrieval, forecasting,
trajectory generation, explainability, MITRE mapping, defense simulation, and metrics.
Contains NO ML logic directly inside route handlers.
"""

from typing import Dict, List, Optional, Any
import os
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.orm import Session

from backend.database.session import get_db, get_db_status
from backend.database.repository import DatabaseRepository
from backend.fastapi.schemas.schemas import (
    HealthResponse,
    IngestRequest,
    IngestResponse,
    CurrentStateResponse,
    ForecastResponse,
    TrajectoryResponse,
    ExplanationResponse,
    MitreMappingResponse,
    SimulateRequest,
    SimulateResponse,
    RiskTrajectoryResponse,
    MetricsResponse,
    ReplayTimelineResponse,
    ReplayStepRequest,
    ReplayStepResponse,
    PcapUploadResponse,
)

from backend.services.forecasting_service import BackendForecastingService
from backend.services.simulation_service import BackendSimulationService
from backend.services.explainability_service import BackendExplainabilityService
from backend.services.mitre_service import BackendMitreService
from backend.services.ingest_service import BackendIngestService
from backend.services.replay_service import BackendReplayService

router = APIRouter(prefix="/api", tags=["SIH26153 Network Attack Forecasting"])

# Instantiate singletons for service layer
_forecasting_service = BackendForecastingService(model_type="lstm")
_simulation_service = BackendSimulationService(forecasting_service=_forecasting_service)
_explainability_service = BackendExplainabilityService(forecasting_service=_forecasting_service)
_mitre_service = BackendMitreService(forecasting_service=_forecasting_service)
_ingest_service = BackendIngestService(forecasting_service=_forecasting_service)
_replay_service = BackendReplayService(forecasting_service=_forecasting_service)


def get_repository(db: Session = Depends(get_db)) -> DatabaseRepository:
    """Dependency injecting database repository."""
    return DatabaseRepository(db)


# 1. Health Check Endpoint
@router.get("/health", response_model=HealthResponse)
def get_health():
    """Returns service health status, version, and database connectivity."""
    status = get_db_status()
    return HealthResponse(
        status="healthy",
        database=status["database"],
        database_engine=status["engine"],
        version="1.0.0",
        offline_mode=True,
    )


# 2. Ingest Endpoint
@router.post("/ingest", response_model=IngestResponse)
def ingest_telemetry(payload: IngestRequest):
    """
    Ingests PCAP, Zeek, or CSV telemetry, extracting flow features and building state windows.
    """
    try:
        res = _ingest_service.ingest_telemetry(file_path=payload.file_path, window_sec=payload.window_sec or 20.0)
        return IngestResponse(**res)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Ingestion failed: {str(e)}")


# 3. Current Network State
@router.get("/current-state", response_model=CurrentStateResponse)
def get_current_state(repo: DatabaseRepository = Depends(get_repository)):
    """
    Retrieves the current network state vector S(t), observed telemetry features, and active metrics.
    """
    try:
        data = _forecasting_service.get_current_state(repository=repo)
        return CurrentStateResponse(**data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch current state: {str(e)}")


# 4. Next-Stage Forecast
@router.get("/forecast", response_model=ForecastResponse)
def get_forecast(
    horizon: int = Query(5, ge=1, le=10, description="Forecast steps forward"),
    repo: DatabaseRepository = Depends(get_repository),
):
    """
    Predicts next attack stage P(S(t+1)) and multi-horizon projections.
    """
    try:
        data = _forecasting_service.get_forecast(horizon=horizon, repository=repo)
        return ForecastResponse(**data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forecasting error: {str(e)}")


# 5. Attack Trajectory Graph
@router.get("/trajectory", response_model=TrajectoryResponse)
def get_trajectory(
    horizon: int = Query(5, ge=1, le=10, description="Number of steps in attack trajectory"),
    repo: DatabaseRepository = Depends(get_repository),
):
    """
    Generates multi-step attack trajectory graph with nodes, transition edges, and lead times.
    """
    try:
        data = _forecasting_service.get_trajectory(horizon=horizon, repository=repo)
        return TrajectoryResponse(**data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Trajectory generation error: {str(e)}")


# 6. Model Explainability
@router.get("/explanation", response_model=ExplanationResponse)
def get_explanation(
    top_n: int = Query(5, ge=1, le=20, description="Number of top signals to return"),
    repo: DatabaseRepository = Depends(get_repository),
):
    """
    Answers: 'Why does the model forecast this attack stage next?'
    Uses Integrated Gradients (LSTM) or TreeSHAP (XGBoost) to attribute feature contributions.
    """
    try:
        data = _explainability_service.explain_current_forecast(top_n=top_n, repository=repo)
        return ExplanationResponse(
            explainer_type=data["explainer_type"],
            predicted_stage=data["predicted_stage"],
            confidence=data["confidence"],
            top_signals=data["top_signals"],
            natural_language_summary=data["natural_language_summary"],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Explainability computation error: {str(e)}")


# 7. MITRE ATT&CK Mapping
@router.get("/mitre", response_model=MitreMappingResponse)
def get_mitre_mapping(repo: DatabaseRepository = Depends(get_repository)):
    """
    Maps observed and forecasted behaviors to evidence-backed MITRE ATT&CK techniques.
    Clearly distinguishes OBSERVED TECHNIQUE from PREDICTED TECHNIQUE.
    """
    try:
        data = _mitre_service.get_techniques(repository=repo)
        return MitreMappingResponse(**data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"MITRE mapping error: {str(e)}")


# 8. What-If Defense Simulation
@router.post("/simulate", response_model=SimulateResponse)
def simulate_defense(
    payload: SimulateRequest,
    repo: DatabaseRepository = Depends(get_repository),
):
    """
    Executes counterfactual What-If defense simulation (Host Isolation, Block Port, Block Source, Restrict Outbound).
    Perturbs state features based on operational assumptions, re-runs ML forecasting, and compares risk.
    Clearly labeled: SIMULATED DEFENSE OUTCOME.
    """
    try:
        data = _simulation_service.simulate_defense(
            action_type=payload.action_type,
            target_entity=payload.target_entity,
            horizon=payload.horizon or 5,
            repository=repo,
        )
        return SimulateResponse(**data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Defense simulation failed: {str(e)}")


# 9. Cumulative Risk Trajectory
@router.get("/risk", response_model=RiskTrajectoryResponse)
def get_risk(repo: DatabaseRepository = Depends(get_repository)):
    """
    Returns current composite risk score and forward cumulative trajectory.
    """
    try:
        data = _forecasting_service.get_risk_trajectory(repository=repo)
        return RiskTrajectoryResponse(**data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Risk calculation error: {str(e)}")


# 10. Benchmark Evaluation Metrics
@router.get("/metrics", response_model=MetricsResponse)
def get_metrics():
    """
    Returns empirical model evaluation benchmarks, K-step accuracy, and Forecast Lead Time (seconds).
    """
    try:
        data = _forecasting_service.get_benchmark_metrics()
        return MetricsResponse(**data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Metrics retrieval error: {str(e)}")


# 11. PCAP Replay & Offline Demonstration Routes
@router.get("/replay/timeline", response_model=ReplayTimelineResponse)
def get_replay_timeline(
    scenario: str = Query("synthetic", description="Scenario ID: 'synthetic' (10-stage kill chain) or 'ctu13' (Virut)"),
):
    """
    Returns sequential replay timeline metadata and available chronological steps.
    """
    try:
        data = _replay_service.get_timeline(scenario_id=scenario)
        return ReplayTimelineResponse(**data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load replay timeline: {str(e)}")


@router.post("/replay/step", response_model=ReplayStepResponse)
def execute_replay_step(payload: ReplayStepRequest):
    """
    Executes a single chronological replay step:
    - Provides ML model strictly historical telemetry up to step_index (t <= T_obs).
    - Generates multi-step forecast P(S(t+1..K)).
    - Compares past forecasts against the newly revealed ground truth at step_index.
    - Computes and returns empirical Forecast Lead Time evaluations.
    """
    try:
        data = _replay_service.process_step(
            scenario_id=payload.scenario_id or "synthetic",
            step_index=payload.step_index,
            horizon=payload.horizon or 5,
        )
        return ReplayStepResponse(**data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Replay step failed: {str(e)}")


@router.post("/replay/reset")
def reset_replay_session():
    """
    Resets the sequential replay forecast history.
    """
    _replay_service.reset_replay()
    return {"status": "reset", "message": "Replay forecast history cleared."}


# 12. Dynamic PCAP Ingestion & Analysis Route
@router.post("/pcap/upload", response_model=PcapUploadResponse)
async def upload_pcap(
    file: UploadFile = File(...),
    window_duration_sec: float = Form(20.0),
):
    """
    Ingests and analyzes a user-uploaded .pcap or .pcapng file:
    - Validates file extension (.pcap, .pcapng, .cap)
    - Saves safely to temporary upload directory
    - Parses packet streams without execution (data-only passive parsing)
    - Generates dynamic causal time windows (t0, t1, ...) based on actual packet timestamps
    - Runs model forecasting and returns replay timeline metadata
    """
    filename = file.filename or "uploaded.pcap"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in [".pcap", ".pcapng", ".cap"]:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Only .pcap and .pcapng files are supported.",
        )

    upload_dir = os.path.join("data", "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    temp_path = os.path.join(upload_dir, f"upload_{int(datetime.now().timestamp())}_{filename}")

    try:
        contents = await file.read()
        if len(contents) == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty (0 bytes).")

        with open(temp_path, "wb") as f:
            f.write(contents)

        result = _replay_service.load_uploaded_pcap(
            file_path=temp_path,
            original_filename=filename,
            window_duration_sec=float(window_duration_sec or 20.0),
        )
        return PcapUploadResponse(**result)

    except HTTPException:
        raise
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process PCAP file: {str(e)}")

