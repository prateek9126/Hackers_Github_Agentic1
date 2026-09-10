"""
SIH26153 Phase 4: Training & Evaluation of Baselines and Temporal LSTM.
Directly answers: "Does temporal information improve next-stage prediction S(t+1)?"

Compares:
1. Instantaneous Baseline: Logistic Regression (Input: S(t))
2. Instantaneous Baseline: XGBoost (Input: S(t))
3. Temporal Sequence Forecaster: PyTorch LSTM (Input: [S(t-3)..S(t)])
"""

import os
import sys
import json
import numpy as np

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath("."))

from models.baseline.logistic_regression import BaselineLogisticRegression
from models.xgboost.xgboost_model import BaselineXGBoost
from models.lstm.lstm_model import TemporalLSTMForecaster
from evaluation.metrics import calculate_evaluation_metrics
from states.taxonomy import STAGE_NAMES


def train_and_evaluate_all():
    data_dir = "data/processed"
    checkpoint_dir = "models/checkpoints"
    os.makedirs(checkpoint_dir, exist_ok=True)

    print("=" * 80)
    print("SIH26153: PHASE 4 EXPERIMENTAL RUN")
    print("TEMPORAL WORLD MODEL VS INSTANTANEOUS BASELINES")
    print("=" * 80)

    # 1. Load preprocessed tensors
    X_train = np.load(os.path.join(data_dir, "X_train.npy"))
    Y_train = np.load(os.path.join(data_dir, "Y_train.npy")).flatten()
    X_val = np.load(os.path.join(data_dir, "X_val.npy"))
    Y_val = np.load(os.path.join(data_dir, "Y_val.npy")).flatten()
    X_test = np.load(os.path.join(data_dir, "X_test.npy"))
    Y_test = np.load(os.path.join(data_dir, "Y_test.npy")).flatten()

    N_train, W, D = X_train.shape
    num_classes = 10
    print(f"\n[1] Loaded chronological partitions:")
    print(f"    - Train sequences: {X_train.shape} | Targets: {Y_train.shape}")
    print(f"    - Val sequences  : {X_val.shape} | Targets: {Y_val.shape}")
    print(f"    - Test sequences : {X_test.shape} | Targets: {Y_test.shape}")
    print(f"    - Observation window W: {W} | Feature dimension D: {D}")

    # ==============================================================================
    # 2. Train Instantaneous Baseline 1: Logistic Regression (Input: S(t) only)
    # ==============================================================================
    print("\n[2] Training Instantaneous Baseline: Logistic Regression...")
    lr_model = BaselineLogisticRegression(max_iter=1000, C=1.0, num_classes=num_classes)
    lr_model.fit(X_train, Y_train) # Internally selects X[:, -1, :] = S(t)
    lr_save_path = os.path.join(checkpoint_dir, "logistic_regression.joblib")
    lr_model.save(lr_save_path)
    print(f"    - Logistic Regression saved to: {lr_save_path}")

    # Evaluate on held-out test partition
    lr_preds = lr_model.predict(X_test)
    lr_probs = lr_model.predict_proba(X_test)
    lr_metrics = calculate_evaluation_metrics(Y_test, lr_preds, lr_probs, num_classes=num_classes)
    print(f"    - Test Accuracy : {lr_metrics['accuracy'] * 100:.2f}%")
    print(f"    - Test Macro F1 : {lr_metrics['f1_macro']:.4f}")

    # ==============================================================================
    # 3. Train Instantaneous Baseline 2: XGBoost (Input: S(t) only)
    # ==============================================================================
    print("\n[3] Training Instantaneous Baseline: XGBoost...")
    xgb_model = BaselineXGBoost(
        n_estimators=100, max_depth=4, learning_rate=0.05, num_classes=num_classes
    )
    xgb_model.fit(X_train, Y_train) # Internally selects X[:, -1, :] = S(t)
    xgb_save_path = os.path.join(checkpoint_dir, "xgboost.joblib")
    xgb_model.save(xgb_save_path)
    print(f"    - XGBoost saved to: {xgb_save_path}")

    xgb_preds = xgb_model.predict(X_test)
    xgb_probs = xgb_model.predict_proba(X_test)
    xgb_metrics = calculate_evaluation_metrics(Y_test, xgb_preds, xgb_probs, num_classes=num_classes)
    print(f"    - Test Accuracy : {xgb_metrics['accuracy'] * 100:.2f}%")
    print(f"    - Test Macro F1 : {xgb_metrics['f1_macro']:.4f}")

    # ==============================================================================
    # 4. Train Temporal Model: PyTorch LSTM (Input: [S(t-3)..S(t)])
    # ==============================================================================
    print("\n[4] Training Temporal Model: PyTorch LSTM Forecaster...")
    lstm_forecaster = TemporalLSTMForecaster(
        input_size=D,
        sequence_length=W,
        hidden_size=64,
        num_layers=2,
        dropout=0.2,
        num_classes=num_classes,
        learning_rate=0.002,
        batch_size=16,
        epochs=60,
        early_stopping_patience=12,
    )
    lstm_forecaster.fit(X_train, Y_train, X_val=X_val, y_val=Y_val)
    lstm_save_path = os.path.join(checkpoint_dir, "lstm_best.pth")
    lstm_forecaster.save_checkpoint(lstm_save_path)
    print(f"    - PyTorch LSTM checkpoint saved to: {lstm_save_path}")

    lstm_preds = lstm_forecaster.predict(X_test)
    lstm_probs = lstm_forecaster.predict_proba(X_test)
    lstm_metrics = calculate_evaluation_metrics(Y_test, lstm_preds, lstm_probs, num_classes=num_classes)
    print(f"    - Test Accuracy : {lstm_metrics['accuracy'] * 100:.2f}%")
    print(f"    - Test Macro F1 : {lstm_metrics['f1_macro']:.4f}")

    # ==============================================================================
    # 5. Compile Model Comparison & Artifacts
    # ==============================================================================
    comparison = {
        "dataset": "CTU-13 Scenario 5 (Virut Botnet)",
        "prediction_task": "Next Attack Stage Forecasting: S(t) or [S(t-3)..S(t)] -> S(t+1)",
        "models": {
            "Logistic Regression": {
                "type": "Instantaneous (Non-Temporal)",
                "input": "S(t) (Current window only)",
                "metrics": lr_metrics,
            },
            "XGBoost": {
                "type": "Instantaneous (Non-Temporal)",
                "input": "S(t) (Current window only)",
                "metrics": xgb_metrics,
            },
            "Temporal LSTM": {
                "type": "Sequential (Temporal)",
                "input": "[S(t-3), S(t-2), S(t-1), S(t)]",
                "metrics": lstm_metrics,
            },
        },
        "ground_truth_test_distribution": {
            STAGE_NAMES.get(int(c), str(c)): int(cnt)
            for c, cnt in zip(*np.unique(Y_test, return_counts=True))
        },
    }

    # Save JSON comparison
    comp_json_path = os.path.join(checkpoint_dir, "model_comparison.json")
    with open(comp_json_path, "w", encoding="utf-8") as f:
        json.dump(comparison, f, indent=2)

    # Save Markdown comparison table
    comp_md_path = os.path.join(checkpoint_dir, "model_comparison.md")
    with open(comp_md_path, "w", encoding="utf-8") as f:
        f.write("# SIH26153 Phase 4: Model Comparison & Benchmark Report\n\n")
        f.write("## 1. Experimental Setup\n")
        f.write("- **Research Question**: Does temporal sequence information improve next attack-stage prediction over instantaneous observation?\n")
        f.write("- **Dataset**: CTU-13 Scenario 5 (Virut Botnet Capture)\n")
        f.write("- **Chronological Partitions**: Train (63 windows), Val (13 windows), Test (13 windows)\n")
        f.write("- **Observation Window W**: 4 windows (80.0 seconds history)\n")
        f.write("- **Target Horizon**: 1 window forward (S(t+1), 20.0s lead time)\n\n")

        f.write("## 2. Performance Comparison Table (Held-Out Test Partition)\n")
        f.write("| Model | Model Type | Input Context | Accuracy | Macro F1 | Weighted F1 | Macro Precision | Macro Recall | Normal FPR |\n")
        f.write("| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n")
        for m_name, data in comparison["models"].items():
            m = data["metrics"]
            f.write(f"| **{m_name}** | {data['type']} | `{data['input']}` | "
                    f"**{m['accuracy']*100:.1f}%** | **{m['f1_macro']:.4f}** | {m['f1_weighted']:.4f} | "
                    f"{m['precision_macro']:.4f} | {m['recall_macro']:.4f} | {m['normal_false_positive_rate']:.4f} |\n")
        f.write("\n")

        f.write("## 3. Per-Class F1-Scores on Test Partition\n")
        f.write("| Attack Stage | Logistic Regression | XGBoost | Temporal LSTM |\n")
        f.write("| :--- | :--- | :--- | :--- |\n")
        test_classes = sorted(list(comparison["ground_truth_test_distribution"].keys()))
        for c_name in test_classes:
            lr_c = lr_metrics["per_class_metrics"].get(c_name, {}).get("f1_score", 0.0)
            xgb_c = xgb_metrics["per_class_metrics"].get(c_name, {}).get("f1_score", 0.0)
            lstm_c = lstm_metrics["per_class_metrics"].get(c_name, {}).get("f1_score", 0.0)
            f.write(f"| `{c_name}` | {lr_c:.4f} | {xgb_c:.4f} | **{lstm_c:.4f}** |\n")
        f.write("\n")

    print("\n" + "=" * 80)
    print("PHASE 4 BENCHMARK SUMMARY (HELD-OUT CHRONOLOGICAL TEST SET):")
    print(f"  * Logistic Regression (S(t) only) : Acc={lr_metrics['accuracy']*100:.1f}% | Macro F1={lr_metrics['f1_macro']:.4f}")
    print(f"  * XGBoost             (S(t) only) : Acc={xgb_metrics['accuracy']*100:.1f}% | Macro F1={xgb_metrics['f1_macro']:.4f}")
    print(f"  * Temporal LSTM       ([S(t-3)..t]): Acc={lstm_metrics['accuracy']*100:.1f}% | Macro F1={lstm_metrics['f1_macro']:.4f}")
    print("=" * 80)

    return comparison


if __name__ == "__main__":
    train_and_evaluate_all()
