"""
Temporal Window Sequence Builder.
Assembles historical state sequences [S(t-W+1), ..., S(t)] and multi-step future targets [y(t+1), ..., y(t+K)].
Guarantees strict causal ordering to prevent temporal data leakage.
"""

from typing import List, Tuple
import numpy as np
from .state_builder import NetworkStateVector


class TemporalWindowSequenceBuilder:
    """
    Transforms an ordered list of NetworkStateVector into PyTorch/ML-compatible
    tensors for sequence modeling.
    """

    def __init__(self, history_window_size: int = 4, forecast_horizon: int = 3):
        self.W = history_window_size
        self.K = forecast_horizon

    def build_sequences(
        self, state_vectors: List[NetworkStateVector]
    ) -> Tuple[np.ndarray, np.ndarray, List[int]]:
        """
        Builds (X, Y, indices) from chronologically ordered states.

        Args:
            state_vectors: List of NetworkStateVector sorted by window_index.

        Returns:
            X: np.ndarray of shape (N, W, D) - historical observation windows
            Y: np.ndarray of shape (N, K) - future attack stage targets
            pivot_indices: List of integer state indices corresponding to current time t
        """
        num_states = len(state_vectors)
        min_required = self.W + self.K
        if num_states < min_required:
            raise ValueError(
                f"Insufficient states ({num_states}) to build sequences. "
                f"Minimum required is W + K = {self.W} + {self.K} = {min_required}."
            )

        X_list = []
        Y_list = []
        pivots = []

        # Feature matrix of shape (num_states, D)
        features_matrix = np.stack([s.features for s in state_vectors], axis=0)
        # Target vector of shape (num_states,)
        labels_vector = np.array([int(s.ground_truth_stage) for s in state_vectors], dtype=np.int64)

        # Slide pivot index t from W-1 up to num_states - K - 1
        for t in range(self.W - 1, num_states - self.K):
            # Past sequence: [t - W + 1, ..., t] inclusive (length W)
            x_seq = features_matrix[t - self.W + 1 : t + 1]
            # Future targets: [t + 1, ..., t + K] inclusive (length K)
            y_future = labels_vector[t + 1 : t + self.K + 1]

            X_list.append(x_seq)
            Y_list.append(y_future)
            pivots.append(t)

        X = np.stack(X_list, axis=0).astype(np.float32) # (N, W, D)
        Y = np.stack(Y_list, axis=0).astype(np.int64)   # (N, K)

        return X, Y, pivots
