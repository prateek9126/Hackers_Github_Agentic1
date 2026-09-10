"""
SIH26153 FastAPI Application Entry Point.
Coordinates service layer routing, CORS middleware, exception logging, and OpenAPI documentation.
"""

import logging
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from .core.config import settings
from .routes.api import router as api_router

# Configure structured application logger
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("sih26153.api")

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description=(
        "SIH26153: AI-Based Network Attack Progression Forecasting Platform.\n\n"
        "Features:\n"
        "- Real-time telemetry ingestion and temporal feature extraction\n"
        "- Multi-step attack trajectory forecasting (K=5 horizons)\n"
        "- Evidence-based MITRE ATT&CK technique mapping\n"
        "- Model explainability via TreeSHAP and Integrated Gradients\n"
        "- What-If defense counterfactual simulation\n"
        "- Quantified forecast lead time and risk reduction metrics"
    ),
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware for standalone frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.method} {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error occurred in forecasting service."},
    )

# Mount API router
app.include_router(api_router)


@app.get("/")
async def root():
    return {
        "status": "online",
        "project": "SIH26153 — AI Based Network Attack Forecasting",
        "version": "1.0.0",
        "offline_mode": True,
        "docs_url": "/docs",
        "endpoints": [
            "/api/health",
            "/api/ingest",
            "/api/current-state",
            "/api/forecast",
            "/api/trajectory",
            "/api/explanation",
            "/api/mitre",
            "/api/simulate",
            "/api/risk",
            "/api/metrics",
        ],
    }


@app.get("/health")
async def root_health():
    """Convenience alias for /api/health."""
    from backend.database.session import get_db_status
    status = get_db_status()
    return {
        "status": "healthy",
        "database": status["database"],
        "engine": status["engine"],
        "version": "1.0.0",
    }
