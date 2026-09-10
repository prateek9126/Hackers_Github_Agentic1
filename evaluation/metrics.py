"""
Multi-Class Evaluation Metrics for SIH26153.
Computes accuracy, precision, recall, macro F1, weighted F1, per-class F1,
confusion matrices, and false positive rates.
"""

from typing import Dict, List, Optional, Any
import numpy as np
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report,
)
from states.taxonomy import STAGE_NAMES, AttackStage


def calculate_evaluation_metrics(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    y_prob: Optional[np.ndarray] = None,
    num_classes: int = 10,
) -> Dict[str, Any]:
    """
    Computes comprehensive multi-class classification and security metrics.

    Args:
        y_true: 1D array of ground-truth integer stage classes
        y_pred: 1D array of predicted integer stage classes
        y_prob: Optional 2D array of predicted class probabilities (N, num_classes)
        num_classes: Total number of canonical taxonomy classes

    Returns:
        Dictionary of formatted metrics and confusion matrix
    """
    y_true_flat = np.array(y_true).flatten()
    y_pred_flat = np.array(y_pred).flatten()

    # Accuracy
    acc = float(accuracy_score(y_true_flat, y_pred_flat))

    # Macro & Weighted metrics (zero_division=0 to handle unrepresented classes cleanly)
    prec_macro = float(precision_score(y_true_flat, y_pred_flat, average="macro", zero_division=0))
    rec_macro = float(recall_score(y_true_flat, y_pred_flat, average="macro", zero_division=0))
    f1_macro = float(f1_score(y_true_flat, y_pred_flat, average="macro", zero_division=0))

    prec_weighted = float(precision_score(y_true_flat, y_pred_flat, average="weighted", zero_division=0))
    rec_weighted = float(recall_score(y_true_flat, y_pred_flat, average="weighted", zero_division=0))
    f1_weighted = float(f1_score(y_true_flat, y_pred_flat, average="weighted", zero_division=0))

    # Full Confusion Matrix over canonical classes [0 .. num_classes-1]
    all_classes = list(range(num_classes))
    cm = confusion_matrix(y_true_flat, y_pred_flat, labels=all_classes)

    # Per-Class Precision, Recall, F1, Support
    per_class: Dict[str, Dict[str, Any]] = {}
    for c in all_classes:
        stage_name = STAGE_NAMES.get(c, f"STAGE_{c}")
        # Binary masks for class c
        c_true = (y_true_flat == c)
        c_pred = (y_pred_flat == c)
        support = int(np.sum(c_true))

        tp = int(np.sum(c_true & c_pred))
        fp = int(np.sum((~c_true) & c_pred))
        fn = int(np.sum(c_true & (~c_pred)))
        tn = int(np.sum((~c_true) & (~c_pred)))

        p = float(tp / (tp + fp)) if (tp + fp) > 0 else 0.0
        r = float(tp / (tp + fn)) if (tp + fn) > 0 else 0.0
        f1 = float(2 * p * r / (p + r)) if (p + r) > 0 else 0.0
        fpr = float(fp / (fp + tn)) if (fp + tn) > 0 else 0.0

        per_class[stage_name] = {
            "precision": round(p, 4),
            "recall": round(r, 4),
            "f1_score": round(f1, 4),
            "support": support,
            "false_positive_rate": round(fpr, 4),
            "tp": tp,
            "fp": fp,
            "fn": fn,
            "tn": tn,
        }

    # Global False Alarm Rate on Benign Baseline (Benign NORMAL traffic predicted as an attack)
    normal_mask = (y_true_flat == int(AttackStage.NORMAL))
    if np.sum(normal_mask) > 0:
        false_alarms = int(np.sum(normal_mask & (y_pred_flat != int(AttackStage.NORMAL))))
        normal_fpr = float(false_alarms / np.sum(normal_mask))
    else:
        normal_fpr = 0.0

    metrics = {
        "accuracy": round(acc, 4),
        "precision_macro": round(prec_macro, 4),
        "recall_macro": round(rec_macro, 4),
        "f1_macro": round(f1_macro, 4),
        "precision_weighted": round(prec_weighted, 4),
        "recall_weighted": round(rec_weighted, 4),
        "f1_weighted": round(f1_weighted, 4),
        "normal_false_positive_rate": round(normal_fpr, 4),
        "confusion_matrix": cm.tolist(),
        "canonical_classes": [STAGE_NAMES.get(c, str(c)) for c in all_classes],
        "per_class_metrics": per_class,
    }

    return metrics
