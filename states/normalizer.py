"""
Temporal State Normalizer & Scaler for SIH26153.
Ensures zero-leakage feature scaling by strictly fitting statistics only
on historical training time windows.
"""

from typing import Dict, List, Optional
import numpy as np
from states.state_builder import NetworkStateVector


class TemporalStateScaler:
    """
    Fits normalization parameters on training states and transforms future states
    without lookahead contamination.
    """

    def __init__(self, method: str = "standard", clip_range: Optional[tuple] = (-5.0, 5.0)):
        """
        Args:
            method: 'standard' (z-score) or 'minmax' [0, 1].
            clip_range: Optional min/max clipping for scaled features to prevent outlier explosions.
        """
        self.method = method.lower()
        self.clip_range = clip_range
        self.mean: Optional[np.ndarray] = None
        self.std: Optional[np.ndarray] = None
        self.min_val: Optional[np.ndarray] = None
        self.max_val: Optional[np.ndarray] = None
        self.feature_names: Optional[List[str]] = None
        self.is_fitted: bool = False

    def fit(self, train_states: List[NetworkStateVector]) -> "TemporalStateScaler":
        """Fits mean/std or min/max parameters exclusively on training state windows."""
        if not train_states:
            raise ValueError("Cannot fit scaler on empty state list.")

        X = np.stack([s.features for s in train_states], axis=0) # Shape: (N, D)
        self.feature_names = train_states[0].feature_names

        # Replace any residual NaN/Inf
        X = np.nan_to_num(X, nan=0.0, posinf=1e6, neginf=-1e6)

        if self.method == "standard":
            self.mean = np.mean(X, axis=0)
            self.std = np.std(X, axis=0)
            # Avoid division by zero on constant features
            self.std[self.std < 1e-6] = 1.0
        elif self.method == "minmax":
            self.min_val = np.min(X, axis=0)
            self.max_val = np.max(X, axis=0)
            diff = self.max_val - self.min_val
            diff[diff < 1e-6] = 1.0
            self.std = diff # Re-use for denominator
        else:
            raise ValueError(f"Unsupported scaling method: {self.method}")

        self.is_fitted = True
        return self

    def transform(self, state: NetworkStateVector) -> NetworkStateVector:
        """Transforms a single state vector using pre-fitted parameters."""
        if not self.is_fitted:
            raise RuntimeError("TemporalStateScaler must be fit on training data before transform.")

        x = np.nan_to_num(state.features, nan=0.0, posinf=1e6, neginf=-1e6)

        if self.method == "standard":
            scaled = (x - self.mean) / self.std
        elif self.method == "minmax":
            scaled = (x - self.min_val) / self.std

        if self.clip_range is not None:
            scaled = np.clip(scaled, self.clip_range[0], self.clip_range[1])

        # Return new state instance with scaled features
        return NetworkStateVector(
            window_index=state.window_index,
            window_start=state.window_start,
            window_end=state.window_end,
            duration_sec=state.duration_sec,
            features=scaled.astype(np.float32),
            feature_names=state.feature_names,
            ground_truth_stage=state.ground_truth_stage,
            stage_distribution=state.stage_distribution,
            active_connections=state.active_connections,
            failed_connections=state.failed_connections,
            total_bytes=state.total_bytes,
            total_packets=state.total_packets,
        )

    def transform_all(self, states: List[NetworkStateVector]) -> List[NetworkStateVector]:
        """Transforms a list of state vectors."""
        return [self.transform(s) for s in states]
