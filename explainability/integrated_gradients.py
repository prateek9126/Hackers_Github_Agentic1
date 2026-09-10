"""
Integrated Gradients Temporal Attribution Explainer for PyTorch LSTM in SIH26153.
Computes path-integral feature attributions over both spatial feature dimensions (D)
and temporal historical windows (W), revealing which past time window and which
telemetry signal drove the model's attack-stage forecast.
"""

from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple, Any
import numpy as np
import torch

from states.taxonomy import STAGE_NAMES


@dataclass
class TemporalSignalExplanation:
    feature_name: str
    time_window: str                    # e.g. "S(t) (Current)", "S(t-1) (-20s)", etc.
    time_index: int                     # 0..W-1
    feature_index: int
    observed_value: float
    attribution_score: float            # Integrated Gradients attribution
    direction: str                      # "INCREASES_RISK" or "DECREASES_RISK"
    explanation_text: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "feature_name": self.feature_name,
            "time_window": self.time_window,
            "time_index": self.time_index,
            "observed_value": round(float(self.observed_value), 4),
            "attribution_score": round(float(self.attribution_score), 4),
            "direction": self.direction,
            "explanation_text": self.explanation_text,
        }


class LSTMIntegratedGradientsExplainer:
    """
    Computes Integrated Gradients for TemporalLSTMNetwork:
    IG(x) = (x - x_0) * integral_0^1 (grad_x F(x_0 + alpha * (x - x_0))) d_alpha.
    """

    def __init__(
        self,
        pytorch_model: torch.nn.Module,
        feature_names: Optional[List[str]] = None,
        num_steps: int = 25,
        dt_sec: float = 20.0,
        device: str = "cpu",
    ):
        self.model = pytorch_model
        self.feature_names = feature_names or []
        self.num_steps = num_steps
        self.dt_sec = dt_sec
        self.device = torch.device(device)
        self.model.to(self.device)
        self.model.eval()

    def explain(
        self,
        input_sequence: np.ndarray,
        target_class: Optional[int] = None,
        baseline: Optional[np.ndarray] = None,
        top_n: int = 5,
    ) -> Dict[str, Any]:
        """
        Computes temporal integrated gradients for a single input sequence.

        Args:
            input_sequence: Array of shape (1, W, D) or (W, D)
            target_class: Target class index to explain (defaults to argmax predicted class)
            baseline: Optional reference baseline (defaults to zero array of same shape)
            top_n: Number of top temporal signals to return

        Returns:
            Dictionary containing predicted stage, target class, attributions, and top signals.
        """
        if len(input_sequence.shape) == 2:
            x_np = np.expand_dims(input_sequence, axis=0)
        else:
            x_np = input_sequence.copy()

        W = x_np.shape[1]
        D = x_np.shape[2]

        if baseline is None:
            baseline_np = np.zeros_like(x_np, dtype=np.float32)
        else:
            baseline_np = baseline.reshape(x_np.shape)

        x_tensor = torch.tensor(x_np, dtype=torch.float32, device=self.device)
        baseline_tensor = torch.tensor(baseline_np, dtype=torch.float32, device=self.device)

        # Forward pass to determine predicted class if not specified
        with torch.no_grad():
            logits = self.model(x_tensor)
            probs = torch.softmax(logits, dim=-1).cpu().numpy()[0]

        if target_class is None:
            target_class = int(np.argmax(probs))

        target_stage_name = STAGE_NAMES.get(target_class, f"STAGE_{target_class}")
        target_confidence = float(probs[target_class])

        # Compute Riemann path integral
        # Generate interpolated alphas: shape (num_steps, 1, 1)
        alphas = torch.linspace(0.0, 1.0, steps=self.num_steps, device=self.device)
        total_gradients = torch.zeros_like(x_tensor)

        diff = x_tensor - baseline_tensor

        for alpha in alphas:
            interpolated = baseline_tensor + alpha * diff
            interpolated.requires_grad_(True)

            out = self.model(interpolated)
            # Scalar score for target class
            score = out[0, target_class]
            self.model.zero_grad()
            score.backward(retain_graph=False)

            total_gradients += interpolated.grad

        # Average gradient along the path
        avg_gradients = total_gradients / self.num_steps
        # IG = (x - x_0) * avg_grad
        ig_attributions = (diff * avg_gradients).detach().cpu().numpy()[0] # Shape: (W, D)

        # Extract top temporal signals across (W, D)
        flat_indices = np.argsort(np.abs(ig_attributions).flatten())[::-1]

        top_signals: List[TemporalSignalExplanation] = []
        for idx in flat_indices:
            if len(top_signals) >= top_n:
                break
            w_idx = idx // D
            d_idx = idx % D

            feat_name = self.feature_names[d_idx] if d_idx < len(self.feature_names) else f"feature_{d_idx}"
            score = float(ig_attributions[w_idx, d_idx])
            obs_val = float(x_np[0, w_idx, d_idx])

            # Label time window
            step_offset = (W - 1) - w_idx
            if step_offset == 0:
                time_str = "S(t) (Current Window)"
            else:
                time_str = f"S(t-{step_offset}) (-{step_offset * self.dt_sec:.0f}s prior)"

            direction = "INCREASES_RISK" if score > 0 else "DECREASES_RISK"

            # Dynamically synthesize explainability rationale from feature semantics and sign
            action_desc = "elevated" if obs_val > 0 else "suppressed"
            effect_desc = f"drives prediction toward {target_stage_name}" if score > 0 else f"counters progression toward {target_stage_name}"
            rationale = f"{feat_name} ({obs_val:+.2f} z-score) at {time_str} {effect_desc} (attribution: {score:+.3f})."

            top_signals.append(
                TemporalSignalExplanation(
                    feature_name=feat_name,
                    time_window=time_str,
                    time_index=w_idx,
                    feature_index=d_idx,
                    observed_value=obs_val,
                    attribution_score=score,
                    direction=direction,
                    explanation_text=rationale,
                )
            )

        return {
            "explainer_type": "Integrated Gradients (PyTorch LSTM)",
            "predicted_stage": target_stage_name,
            "target_class": target_class,
            "confidence": target_confidence,
            "temporal_attributions": ig_attributions.tolist(),
            "top_signals": [s.to_dict() for s in top_signals],
            "natural_language_summary": [s.explanation_text for s in top_signals],
        }
