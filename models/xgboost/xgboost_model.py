"""
Instantaneous Baseline: XGBoost Classifier for SIH26153.
Learns non-temporal mapping: S(t) -> S(t+1).
Receives ONLY the instantaneous state vector at current window t.
Zero access to past sequence history [S(t-3)..S(t-1)].
"""

import os
from typing import Optional, Dict, Any
import numpy as np
import joblib
from xgboost import XGBClassifier
from states.taxonomy import AttackStage


class BaselineXGBoost:
    """
    Non-temporal XGBoost baseline predicting next attack stage S(t+1) strictly
    from instantaneous state S(t).
    """

    def __init__(
        self,
        n_estimators: int = 100,
        max_depth: int = 5,
        learning_rate: float = 0.05,
        subsample: float = 0.8,
        colsample_bytree: float = 0.8,
        num_classes: int = 10,
        random_state: int = 42,
    ):
        self.num_classes = num_classes
        self.random_state = random_state
        self.model = XGBClassifier(
            n_estimators=n_estimators,
            max_depth=max_depth,
            learning_rate=learning_rate,
            subsample=subsample,
            colsample_bytree=colsample_bytree,
            objective="multi:softprob",
            eval_metric="mlogloss",
            random_state=random_state,
        )
        self.is_fitted = False
        self.fitted_classes_: Optional[np.ndarray] = None
        self.class_to_idx_: Dict[int, int] = {}
        self.idx_to_class_: Dict[int, int] = {}

    def fit(self, X_t: np.ndarray, y: np.ndarray) -> "BaselineXGBoost":
        """
        Fits on instantaneous feature matrix X_t of shape (N, D).
        If 3D array (N, W, D) is passed, selects strictly current window S(t) = X[:, -1, :].
        """
        if len(X_t.shape) == 3:
            X_inst = X_t[:, -1, :]
        else:
            X_inst = X_t

        y_flat = np.array(y).flatten()
        self.fitted_classes_ = np.unique(y_flat)
        self.class_to_idx_ = {int(c): idx for idx, c in enumerate(self.fitted_classes_)}
        self.idx_to_class_ = {idx: int(c) for idx, c in enumerate(self.fitted_classes_)}
        y_encoded = np.array([self.class_to_idx_[int(c)] for c in y_flat], dtype=np.int32)

        self.model.fit(X_inst, y_encoded)
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
        raw_preds = self.model.predict(X_inst)
        return np.array([self.idx_to_class_[int(idx)] for idx in raw_preds], dtype=np.int32)

    def predict_proba(self, X_t: np.ndarray) -> np.ndarray:
        """Predicts full probability distribution across all 10 canonical classes."""
        if not self.is_fitted:
            raise RuntimeError("Model must be fitted before predict_proba().")
        if len(X_t.shape) == 3:
            X_inst = X_t[:, -1, :]
        else:
            X_inst = X_t

        raw_probs = self.model.predict_proba(X_inst)
        N = X_inst.shape[0]
        aligned_probs = np.zeros((N, self.num_classes), dtype=np.float32)

        for internal_idx, class_id in self.idx_to_class_.items():
            if 0 <= class_id < self.num_classes:
                aligned_probs[:, class_id] = raw_probs[:, internal_idx]

        return aligned_probs

    def save(self, filepath: str):
        """Saves model checkpoint and metadata."""
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        checkpoint = {
            "model": self.model,
            "fitted_classes_": self.fitted_classes_,
            "class_to_idx_": self.class_to_idx_,
            "idx_to_class_": self.idx_to_class_,
            "num_classes": self.num_classes,
            "random_state": self.random_state,
        }
        joblib.dump(checkpoint, filepath)

    @classmethod
    def load(cls, filepath: str) -> "BaselineXGBoost":
        """Loads model from serialized checkpoint."""
        checkpoint = joblib.load(filepath)
        instance = cls(num_classes=checkpoint["num_classes"], random_state=checkpoint["random_state"])
        instance.model = checkpoint["model"]
        instance.fitted_classes_ = checkpoint["fitted_classes_"]
        instance.class_to_idx_ = checkpoint.get("class_to_idx_", {})
        instance.idx_to_class_ = checkpoint.get("idx_to_class_", {})
        instance.is_fitted = True
        return instance
