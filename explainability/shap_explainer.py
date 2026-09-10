"""
SHAP TreeExplainer for XGBoost Baseline in SIH26153.
Computes exact Shapley values for instantaneous state features S(t),
identifying feature contributions, signs (+/-), and natural-language rationales.
"""

from typing import Dict, List, Optional, Any
import numpy as np
import shap

from states.taxonomy import STAGE_NAMES


class XGBoostShapExplainer:
    """
    Computes TreeSHAP feature attributions for BaselineXGBoost.
    """

    def __init__(
        self,
        xgboost_model: Any,
        feature_names: Optional[List[str]] = None,
    ):
        self.model_wrapper = xgboost_model
        # xgboost_model.model is the underlying XGBClassifier
        self.tree_model = xgboost_model.model
        self.feature_names = feature_names or []
        self.explainer = shap.TreeExplainer(self.tree_model)

    def explain(
        self,
        input_data: np.ndarray,
        target_class: Optional[int] = None,
        top_n: int = 5,
    ) -> Dict[str, Any]:
        """
        Computes SHAP attributions for an input sequence or instantaneous state.

        Args:
            input_data: Array of shape (1, W, D) or (1, D)
            target_class: Optional class to explain (defaults to top predicted class)
            top_n: Number of top features to return

        Returns:
            Dictionary containing attributions, direction, and synthesized signals.
        """
        if len(input_data.shape) == 3:
            # XGBoost receives S(t) = X[:, -1, :]
            X_inst = input_data[:, -1, :]
        else:
            X_inst = input_data

        probs = self.model_wrapper.predict_proba(X_inst)[0]
        if target_class is None:
            target_class = int(np.argmax(probs))

        target_stage_name = STAGE_NAMES.get(target_class, f"STAGE_{target_class}")
        target_confidence = float(probs[target_class])

        # Compute raw SHAP values
        raw_shap = self.explainer.shap_values(X_inst)

        # Handle different SHAP output structures for multi-class
        # Can be list of (N, D) or 3D array (N, D, num_classes) or (N, num_classes, D)
        internal_target_idx = target_class
        if hasattr(self.model_wrapper, "class_to_idx_"):
            internal_target_idx = self.model_wrapper.class_to_idx_.get(target_class, target_class)

        if isinstance(raw_shap, list):
            # List of arrays per internal class
            if internal_target_idx < len(raw_shap):
                class_shap = raw_shap[internal_target_idx][0]
            else:
                class_shap = raw_shap[0][0]
        elif len(raw_shap.shape) == 3:
            if raw_shap.shape[2] == len(self.model_wrapper.fitted_classes_):
                class_shap = raw_shap[0, :, internal_target_idx]
            else:
                class_shap = raw_shap[0, internal_target_idx, :]
        else:
            class_shap = raw_shap[0]

        D = len(class_shap)
        top_indices = np.argsort(np.abs(class_shap))[::-1][:top_n]

        signals = []
        for idx in top_indices:
            feat_name = self.feature_names[idx] if idx < len(self.feature_names) else f"feature_{idx}"
            score = float(class_shap[idx])
            obs_val = float(X_inst[0, idx]) if len(X_inst.shape) > 1 else float(X_inst[idx])
            direction = "INCREASES_RISK" if score > 0 else "DECREASES_RISK"

            effect = f"pushed model toward {target_stage_name}" if score > 0 else f"reduced likelihood of {target_stage_name}"
            rationale = f"{feat_name} ({obs_val:+.2f} z-score) {effect} (SHAP: {score:+.3f})."

            signals.append({
                "feature_name": feat_name,
                "time_window": "S(t) (Current Window)",
                "observed_value": round(obs_val, 4),
                "attribution_score": round(score, 4),
                "direction": direction,
                "explanation_text": rationale,
            })

        return {
            "explainer_type": "TreeSHAP (XGBoost)",
            "predicted_stage": target_stage_name,
            "target_class": target_class,
            "confidence": target_confidence,
            "top_signals": signals,
            "natural_language_summary": [s["explanation_text"] for s in signals],
        }
