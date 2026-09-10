"""
Lead Time and Multi-Step Trajectory Evaluation Script for SIH26153.
Benchmarks Temporal LSTM, XGBoost, and Logistic Regression across horizons K=1..5.
Computes K-step accuracy, top-2 accuracy, trajectory match, and forecast lead time (seconds).
Saves results to models/checkpoints/phase5_evaluation.json and .md.
"""

import os
import sys
import json
import argparse
import numpy as np

# Add project root to sys.path
sys.path.insert(0, os.path.abspath("."))

from models.forecasting.forecasting_service import AttackForecastingService
from models.forecasting.evaluator import MultiStepEvaluator


def run_phase5_evaluation(horizon: int = 5, dt_sec: float = 20.0):
    print("=" * 80)
    print("SIH26153: PHASE 5 MULTI-STEP TRAJECTORY & LEAD TIME EVALUATION")
    print("=" * 80)

    test_x_path = "data/processed/X_test.npy"
    test_y_path = "data/processed/Y_test.npy"

    if not os.path.exists(test_x_path) or not os.path.exists(test_y_path):
        print("Processed test data not found. Run scripts/train_models.py first.")
        sys.exit(1)

    X_test = np.load(test_x_path)
    Y_test = np.load(test_y_path)
    print(f"\nLoaded chronological test sequences: {X_test.shape} | Targets: {Y_test.shape}")
    print(f"Horizon K: {horizon} steps | Step lead time: {dt_sec}s | Max Horizon: {horizon * dt_sec}s\n")

    models_to_evaluate = ["lstm", "xgboost", "lr"]
    results = {}

    for model_type in models_to_evaluate:
        print(f"--> Evaluating Model: {model_type.upper()}...")
        try:
            service = AttackForecastingService(model_type=model_type)
            evaluator = MultiStepEvaluator(
                forecaster=service.forecaster,
                horizon=horizon,
                dt_sec=dt_sec,
            )
            eval_metrics = evaluator.evaluate_sequence(X_test, Y_test)
            results[model_type] = eval_metrics
            print(f"    * Step 1 Acc: {eval_metrics['k_step_accuracy']['step_1 (+20s)']*100:.1f}%")
            print(f"    * Step 3 Acc: {eval_metrics['k_step_accuracy']['step_3 (+60s)']*100:.1f}%")
            print(f"    * Step 5 Acc: {eval_metrics['k_step_accuracy']['step_5 (+100s)']*100:.1f}%")
            print(f"    * Mean Forecast Lead Time: {eval_metrics['forecast_lead_time']['mean_lead_time_sec']}s")
            print(f"    * Max Forecast Lead Time : {eval_metrics['forecast_lead_time']['max_lead_time_sec']}s")
            print(f"    * Total Advance Warnings : {eval_metrics['forecast_lead_time']['total_successful_advance_forecasts']}")
        except Exception as e:
            print(f"    Error evaluating {model_type}: {e}")
            import traceback
            traceback.print_exc()

    # Save JSON report
    out_dir = "models/checkpoints"
    os.makedirs(out_dir, exist_ok=True)
    json_path = os.path.join(out_dir, "phase5_evaluation.json")
    with open(json_path, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\n[+] Saved detailed evaluation metrics to: {json_path}")

    # Generate Markdown Summary
    md_path = os.path.join(out_dir, "phase5_evaluation.md")
    with open(md_path, "w") as f:
        f.write("# SIH26153 Phase 5: Multi-Step Attack Trajectory & Forecast Lead Time Report\n\n")
        f.write("## 1. Experimental Overview\n")
        f.write(f"- **Horizon K**: {horizon} future steps\n")
        f.write(f"- **Window Duration**: {dt_sec} seconds per step\n")
        f.write(f"- **Max Forecast Horizon**: {horizon * dt_sec} seconds ({horizon * dt_sec / 60:.1f} minutes)\n")
        f.write(f"- **Evaluation Dataset**: CTU-13 Scenario 5 Held-out Chronological Test Partition\n\n")

        f.write("## 2. Multi-Step Accuracy Comparison (K=1 to K=5)\n\n")
        f.write("| Step Horizon | Lead Time | Logistic Regression | XGBoost | Temporal LSTM |\n")
        f.write("| :--- | :--- | :--- | :--- | :--- |\n")
        for k in range(1, horizon + 1):
            k_key = f"step_{k} (+{k*dt_sec:.0f}s)"
            lr_acc = results.get("lr", {}).get("k_step_accuracy", {}).get(k_key, 0.0) * 100
            xgb_acc = results.get("xgboost", {}).get("k_step_accuracy", {}).get(k_key, 0.0) * 100
            lstm_acc = results.get("lstm", {}).get("k_step_accuracy", {}).get(k_key, 0.0) * 100
            f.write(f"| **Step {k}** | +{k*dt_sec:.0f}s | {lr_acc:.1f}% | {xgb_acc:.1f}% | **{lstm_acc:.1f}%** |\n")

        f.write("\n## 3. Forecast Lead Time & Early Warning Metrics\n\n")
        f.write("| Metric | Logistic Regression | XGBoost | Temporal LSTM |\n")
        f.write("| :--- | :--- | :--- | :--- |\n")
        for metric_name, field in [
            ("Mean Advance Lead Time", "mean_lead_time_sec"),
            ("Max Advance Lead Time", "max_lead_time_sec"),
            ("Total Advance Warnings", "total_successful_advance_forecasts"),
            ("False Warnings (False Alarms)", "false_warnings"),
        ]:
            lr_val = results.get("lr", {}).get("forecast_lead_time", {}).get(field, 0)
            xgb_val = results.get("xgboost", {}).get("forecast_lead_time", {}).get(field, 0)
            lstm_val = results.get("lstm", {}).get("forecast_lead_time", {}).get(field, 0)
            unit = "s" if "sec" in field else ""
            f.write(f"| **{metric_name}** | {lr_val}{unit} | {xgb_val}{unit} | **{lstm_val}{unit}** |\n")

        f.write("\n## 4. Trajectory Path Similarity\n\n")
        f.write("| Metric | Logistic Regression | XGBoost | Temporal LSTM |\n")
        f.write("| :--- | :--- | :--- | :--- |\n")
        for metric_name, field in [
            ("Trajectory Exact Match Accuracy", "trajectory_exact_match_accuracy"),
            ("Average Path Similarity", "trajectory_average_similarity"),
        ]:
            lr_val = results.get("lr", {}).get(field, 0.0) * 100
            xgb_val = results.get("xgboost", {}).get(field, 0.0) * 100
            lstm_val = results.get("lstm", {}).get(field, 0.0) * 100
            f.write(f"| **{metric_name}** | {lr_val:.1f}% | {xgb_val:.1f}% | **{lstm_val:.1f}%** |\n")

    print(f"[+] Saved markdown comparison report to: {md_path}\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate Multi-Step Attack Trajectory and Lead Time")
    parser.add_argument("--horizon", type=int, default=5, help="Number of future forecast steps K")
    parser.add_argument("--dt", type=float, default=20.0, help="Window duration in seconds")
    args = parser.parse_args()

    run_phase5_evaluation(horizon=args.horizon, dt_sec=args.dt)
