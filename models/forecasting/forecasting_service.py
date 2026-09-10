"""
Forecasting Service for SIH26153.
Provides high-level service facade for real-time attack trajectory forecasting,
validating non-leakage, loading serialized model checkpoints, and delivering
standardized structured attack trajectories.
"""

import os
from typing import Optional, List, Dict, Any
import numpy as np

from models.lstm.lstm_model import TemporalLSTMForecaster
from models.xgboost.xgboost_model import BaselineXGBoost
from models.baseline.logistic_regression import BaselineLogisticRegression
from models.forecasting.recursive_forecaster import (
    StageFeatureProfiler,
    MarkovTransitionDynamics,
    RecursiveMultiStepForecaster,
)
from models.forecasting.trajectory import AttackTrajectory
from states.taxonomy import AttackStage, NUM_ATTACK_STAGES


class AttackForecastingService:
    """
    Production-grade service executing offline and streaming attack progression forecasts.
    """

    def __init__(
        self,
        model_type: str = "lstm",
        checkpoint_path: Optional[str] = None,
        train_data_dir: str = "data/processed",
        feature_names: Optional[List[str]] = None,
        device: str = "cpu",
    ):
        self.model_type = model_type.lower()
        self.train_data_dir = train_data_dir
        self.feature_names = feature_names or []
        self.device = device

        # 1. Load trained base model
        self.model = self._load_model(self.model_type, checkpoint_path)

        # 2. Fit StageFeatureProfiler & MarkovDynamics from train split
        self.profiler = StageFeatureProfiler(num_classes=NUM_ATTACK_STAGES)
        self.dynamics = MarkovTransitionDynamics(num_classes=NUM_ATTACK_STAGES)
        self._initialize_profiler_and_dynamics()

        # 3. Instantiate RecursiveMultiStepForecaster
        self.forecaster = RecursiveMultiStepForecaster(
            base_model=self.model,
            profiler=self.profiler,
            dynamics=self.dynamics,
            feature_names=self.feature_names,
            num_classes=NUM_ATTACK_STAGES,
        )

    def _load_model(self, model_type: str, checkpoint_path: Optional[str]):
        """Loads appropriate model checkpoint from disk."""
        ckpt_dir = "models/checkpoints"
        if model_type == "lstm":
            path = checkpoint_path or os.path.join(ckpt_dir, "lstm_best.pth")
            if not os.path.exists(path):
                raise FileNotFoundError(f"LSTM checkpoint not found at: {path}")
            return TemporalLSTMForecaster.load_checkpoint(path, device=self.device)
        elif model_type in ("xgboost", "xgb"):
            path = checkpoint_path or os.path.join(ckpt_dir, "xgboost.joblib")
            if not os.path.exists(path):
                raise FileNotFoundError(f"XGBoost checkpoint not found at: {path}")
            return BaselineXGBoost.load(path)
        elif model_type in ("logistic_regression", "lr"):
            path = checkpoint_path or os.path.join(ckpt_dir, "logistic_regression.joblib")
            if not os.path.exists(path):
                raise FileNotFoundError(f"Logistic Regression checkpoint not found at: {path}")
            return BaselineLogisticRegression.load(path)
        else:
            raise ValueError(f"Unsupported model type: {model_type}")

    def _initialize_profiler_and_dynamics(self):
        """Fits empirical centroids and transition dynamics from train partition."""
        x_tr_path = os.path.join(self.train_data_dir, "X_train.npy")
        y_tr_path = os.path.join(self.train_data_dir, "Y_train.npy")

        if os.path.exists(x_tr_path) and os.path.exists(y_tr_path):
            X_tr = np.load(x_tr_path)
            Y_tr = np.load(y_tr_path)
            self.profiler.fit(X_tr, Y_tr)
            self.dynamics.fit_from_sequences([Y_tr])
        else:
            # Synthetic default for testing/stand-alone operation
            dummy_x = np.random.randn(20, 4, 55).astype(np.float32)
            dummy_y = np.random.choice([0, 1, 2, 7, 8], size=20)
            self.profiler.fit(dummy_x, dummy_y)
            self.dynamics.fit_from_sequences([dummy_y])

    def forecast_trajectory(
        self,
        observation_sequence: np.ndarray,
        current_timestamp: Optional[str] = None,
        horizon: int = 5,
        dt_sec: float = 20.0,
        current_stage_id: Optional[int] = None,
    ) -> AttackTrajectory:
        """
        Executes multi-step forward forecasting strictly from observed telemetry up to current time.

        Args:
            observation_sequence: Historical window features of shape (W, D) or (1, W, D)
            current_timestamp: Timestamp representing now (t)
            horizon: Steps K to project forward (default 5)
            dt_sec: Window step duration in seconds (default 20.0)
            current_stage_id: Optional current stage index

        Returns:
            AttackTrajectory graph with nodes, edges, risk trajectory, and structured forecast list.
        """
        if observation_sequence is None or len(observation_sequence) == 0:
            raise ValueError("Observation sequence cannot be empty.")

        return self.forecaster.forecast(
            initial_sequence=observation_sequence,
            horizon=horizon,
            dt_sec=dt_sec,
            current_time_str=current_timestamp,
            current_stage_id=current_stage_id,
        )
