"""
Inference Script for SIH26153 Attack Trajectory Forecasting.
Loads trained model checkpoints and predicts multi-step attack progression
S(t) -> S(t+1) -> ... -> S(t+K) given a historical observation sequence.
Supports --explain (Integrated Gradients / SHAP) and --mitre (evidence mapping).
"""

import os
import sys
import json
import argparse
from typing import Optional
import numpy as np

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath("."))

from models.forecasting.forecasting_service import AttackForecastingService
from network.feature_extraction.feature_extractor import NetworkFeatureExtractor
from explainability.explainer_facade import ModelExplainer
from mitre.mapper import MitreMapper
from states.taxonomy import STAGE_NAMES


def run_inference(
    model_type: str = "lstm",
    checkpoint_path: Optional[str] = None,
    input_sample: Optional[np.ndarray] = None,
    horizon: int = 5,
    dt_lead_time_sec: float = 20.0,
    output_json: bool = False,
    explain: bool = False,
    show_mitre: bool = False,
):
    """
    Executes multi-step recursive trajectory forecast with optional explainability & MITRE evidence.
    """
    feature_extractor = NetworkFeatureExtractor()
    feature_names = feature_extractor.feature_names

    # Default to test partition sample if none provided
    if input_sample is None:
        test_data_path = "data/processed/X_test.npy"
        if os.path.exists(test_data_path):
            X_test = np.load(test_data_path)
            input_sample = X_test[0:1] # First test sequence: shape (1, 4, 55)
        else:
            # Synthetic fallback: 1 sample with 4 time steps of 55 features
            input_sample = np.random.randn(1, 4, 55).astype(np.float32)

    service = AttackForecastingService(
        model_type=model_type,
        checkpoint_path=checkpoint_path,
        feature_names=feature_names,
    )
    trajectory = service.forecast_trajectory(
        observation_sequence=input_sample,
        current_timestamp="2026-09-08T00:00:00Z",
        horizon=horizon,
        dt_sec=dt_lead_time_sec,
    )

    mitre_mapper = MitreMapper() if show_mitre else None
    explainer = ModelExplainer(forecasting_model=service.model, model_type=model_type, feature_names=feature_names, dt_sec=dt_lead_time_sec) if explain else None

    # Optional explainability computation
    explanation_report = None
    if explainer:
        explanation_report = explainer.explain_forecast(input_sample)

    # Optional MITRE mapping computation for all trajectory nodes
    mitre_reports = []
    if mitre_mapper:
        for node in trajectory.nodes:
            is_obs = (node.step == 0)
            feat_vec = input_sample[0, -1, :] if is_obs else input_sample[0, -1, :] # representative
            mappings = mitre_mapper.map_state(
                stage_id=node.stage_id,
                features=feat_vec,
                feature_names=feature_names,
                is_observed=is_obs,
                stage_confidence=node.confidence,
            )
            mitre_reports.append({
                "step": node.step,
                "stage": node.stage,
                "status": "OBSERVED" if is_obs else "PREDICTED",
                "techniques": [m.to_dict() for m in mappings],
            })

    if output_json:
        full_dict = trajectory.to_dict()
        if explanation_report:
            full_dict["model_explanation"] = explanation_report
        if mitre_reports:
            full_dict["mitre_attack_mappings"] = mitre_reports
        print(json.dumps(full_dict, indent=2))
        return full_dict

    print(f"\n=======================================================")
    print(f"SIH26153 INFERENCE RESULT — {horizon}-STEP ATTACK TRAJECTORY")
    print(f"=======================================================")
    print(f"  * Model Used        : {model_type.upper()}")
    print(f"  * Current Stage     : {trajectory.current_stage}")
    print(f"  * Forecast Horizon  : K = {horizon} steps (Total {horizon * dt_lead_time_sec:.0f}s advance lead time)")
    print(f"  * Prediction Time   : {trajectory.prediction_time}")
    print(f"-------------------------------------------------------")
    print(f"  PREDICTED ATTACK TRAJECTORY PROGRESSION:")
    for node in trajectory.nodes:
        if node.step == 0:
            print(f"  [t+0s / CURRENT]  Stage: {node.stage:<20} | Prob: {node.probability*100:5.1f}% | Type: {node.state_type.value}")
        else:
            lead = node.step * dt_lead_time_sec
            mitre = node.mitre_mapping.get("tactic_name", "Unknown")
            print(f"  [t+{lead:3.0f}s / Step {node.step}] Stage: {node.stage:<20} | Prob: {node.probability*100:5.1f}% | MITRE: {mitre}")

    print(f"-------------------------------------------------------")
    print(f"  TRANSITION PROGRESSION EDGES:")
    for edge in trajectory.edges:
        print(f"    {edge.source_node_id} -> {edge.target_node_id} | Type: {edge.progression_type:<15} | Trans Prob: {edge.transition_probability*100:5.1f}%")

    print(f"-------------------------------------------------------")
    print(f"  CUMULATIVE RISK TRAJECTORY:")
    risk_str = " -> ".join([f"{r:.2f}" for r in trajectory.cumulative_risk_trajectory])
    print(f"    {risk_str}")

    # Display Explainability if requested
    if explanation_report:
        print(f"-------------------------------------------------------")
        print(f"  MODEL EXPLAINABILITY & ATTRIBUTION ({explanation_report['explainer_type']}):")
        print(f"  Why model predicted: {explanation_report['predicted_stage']} ({explanation_report['confidence']*100:.1f}% confidence)")
        print(f"  Key Signals:")
        for sig in explanation_report["top_signals"]:
            print(f"    * [{sig['time_window']}] {sig['feature_name']} = {sig['observed_value']:+.2f} ({sig['direction']}, attr={sig['attribution_score']:+.3f})")
            print(f"      -> {sig['explanation_text']}")

    # Display MITRE evidence if requested
    if mitre_reports:
        print(f"-------------------------------------------------------")
        print(f"  EVIDENCE-BACKED MITRE ATT&CK TECHNIQUES:")
        for r in mitre_reports:
            step_tag = f"Step {r['step']} ({r['stage']})" if r['step'] > 0 else f"Current ({r['stage']})"
            for t in r["techniques"]:
                print(f"    * [{t['status']}] [{step_tag}] {t['technique_id']}: {t['technique_name']} (Conf: {t['confidence']*100:.1f}%)")
                for e in t["evidence"]:
                    print(f"        Evidence: {e}")

    print(f"=======================================================\n")
    return trajectory.to_dict()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SIH26153 Multi-Step Attack Trajectory Forecaster")
    parser.add_argument("--model", type=str, default="lstm", choices=["lstm", "xgboost", "lr"], help="Forecasting model to use")
    parser.add_argument("--checkpoint", type=str, default=None, help="Custom checkpoint path")
    parser.add_argument("--horizon", type=int, default=5, help="Forecast horizon K (default 5)")
    parser.add_argument("--dt", type=float, default=20.0, help="Window duration in seconds (default 20.0s)")
    parser.add_argument("--json", action="store_true", help="Output structured JSON")
    parser.add_argument("--explain", action="store_true", help="Include model attribution explanations")
    parser.add_argument("--mitre", action="store_true", help="Include evidence-backed MITRE ATT&CK mappings")
    args = parser.parse_args()

    run_inference(
        model_type=args.model,
        checkpoint_path=args.checkpoint,
        horizon=args.horizon,
        dt_lead_time_sec=args.dt,
        output_json=args.json,
        explain=args.explain,
        show_mitre=args.mitre,
    )
