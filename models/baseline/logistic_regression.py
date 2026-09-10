"""
Instantaneous Baseline: Logistic Regression Model for SIH26153.
Learns non-temporal mapping: S(t) -> S(t+1).
Receives ONLY the instantaneous state vector at current window t.
Zero access to past sequence history [S(t-3)..S(t-1)].
"""

import os
from typing import Optional, Dict, Any
import numpy as np
import joblib
from sklearn.linear_model import LogisticRegression
from states.taxonomy import AttackStage


class BaselineLogisticRegression:
    """
    Non-temporal baseline predicting next attack stage S(t+1) strictly
    from instantaneous state S(t).
    """

    def __init__(
        self,
        max_iter: int = 1000,
        C: float = 1.0,
        class_weight: str = "balanced",
        num_classes: int = 10,
        random_state: int = 42,
    ):
        self.num_classes = num_classes
        self.random_state = random_state
        self.model = LogisticRegression(
            max_iter=max_iter,
            C=C,
            class_weight=class_weight,
            solver="lbfgs",
            random_state=random_state,
        )
        self.is_fitted = False
        self.fitted_classes_: Optional[np.ndarray] = None

    def fit(self, X_t: np.ndarray, y: np.ndarray) -> "BaselineLogisticRegression":
        """
        Fits on instantaneous feature matrix X_t of shape (N, D).
        If 3D array (N, W, D) is passed, automatically selects the last step S(t) = X[:, -1, :].
        """
        if len(X_t.shape) == 3:
            # Enforce non-temporal requirement: select only current window t
            X_inst = X_t[:, -1, :]
        else:
            X_inst = X_t

        y_flat = np.array(y).flatten()
        self.model.fit(X_inst, y_flat)
        self.fitted_classes_ = self.model.classes_
        self.is_fitted = True
        return self

    def predict(self, X_t: np.ndarray) -> np.ndarray:
        """Predicts integer next attack stage classes for S(t+1)."""
        if not self.is_fitted:
            raise RuntimeError("Model must be fitted before predict().")
        if len(X_t.shape) == 3:
            X_inst = X_t[:, -1, :]
        else:
            X_inst = X_t
        return self.model.predict(X_inst)

    def predict_proba(self, X_t: np.ndarray) -> np.ndarray:
        """
        Predicts full probability distribution across all 10 canonical classes (N, num_classes).
        """
        if not self.is_fitted:
            raise RuntimeError("Model must be fitted before predict_proba().")
        if len(X_t.shape) == 3:
            X_inst = X_t[:, -1, :]
        else:
            X_inst = X_t

        raw_probs = self.model.predict_proba(X_inst)
        N = X_inst.shape[0]
        aligned_probs = np.zeros((N, self.num_classes), dtype=np.float32)

        for col_idx, class_id in enumerate(self.fitted_classes_):
            if 0 <= class_id < self.num_classes:
                aligned_probs[:, class_id] = raw_probs[:, col_idx]

        return aligned_probs

    def save(self, filepath: str):
        """Saves model checkpoint and metadata."""
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        checkpoint = {
            "model": self.model,
            "fitted_classes_": self.fitted_classes_,
            "num_classes": self.num_classes,
            "random_state": self.random_state,
        }
        joblib.dump(checkpoint, filepath)

    @classmethod
    def load(cls, filepath: str) -> "BaselineLogisticRegression":
        """Loads model from serialized checkpoint."""
        checkpoint = joblib.load(filepath)
        instance = cls(num_classes=checkpoint["num_classes"], random_state=checkpoint["random_state"])
        instance.model = checkpoint["model"]
        instance.fitted_classes_ = checkpoint["fitted_classes_"]
        instance.is_fitted = True
        return instance
