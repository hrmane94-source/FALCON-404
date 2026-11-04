"""
FALCON-404: Forensic Classification Metrics Harness
Phase: 7.2A.3 — Training Pipeline Development
Author: Lead Developer & System Architect: Harshad Mane

Description:
    Computes comprehensive binary screening metrics with explicit class semantics:
      - Class 0: Genuine (Negative reference class)
      - Class 1: Manipulated (Positive altered class)

    Metrics calculated:
      - Accuracy
      - Precision (Manipulated & Genuine)
      - Recall / Sensitivity (Manipulated & Genuine)
      - Specificity (True Negative Rate for Genuine)
      - F1-score (Overall, Manipulated, Genuine)
      - Balanced Accuracy: (Sensitivity + Specificity) / 2
      - Confusion Matrix: TN, FP, FN, TP
"""

from typing import Dict, Any, List, Union
import numpy as np


def compute_confusion_matrix(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, int]:
    """
    Computes binary confusion matrix counts.

    Definitions:
      TN: True Genuine (y_true=0, y_pred=0)
      FP: False Alarm (y_true=0, y_pred=1)
      FN: Missed Tamper (y_true=1, y_pred=0)
      TP: Detected Tamper (y_true=1, y_pred=1)
    """
    tn = int(np.sum((y_true == 0) & (y_pred == 0)))
    fp = int(np.sum((y_true == 0) & (y_pred == 1)))
    fn = int(np.sum((y_true == 1) & (y_pred == 0)))
    tp = int(np.sum((y_true == 1) & (y_pred == 1)))
    return {"tn": tn, "fp": fp, "fn": fn, "tp": tp}


def compute_binary_metrics(
    y_true: Union[List[int], np.ndarray, Any],
    y_pred: Union[List[int], np.ndarray, Any]
) -> Dict[str, Any]:
    """
    Calculates detailed performance metrics for binary document manipulation detection.

    Args:
        y_true: Array-like of true class labels (0 or 1).
        y_pred: Array-like of predicted class labels (0 or 1).

    Returns:
        Dictionary containing overall and per-class metrics.
    """
    # Convert to 1D numpy int array
    if hasattr(y_true, "cpu"):
        y_true = y_true.detach().cpu().numpy()
    if hasattr(y_pred, "cpu"):
        y_pred = y_pred.detach().cpu().numpy()

    y_t = np.asarray(y_true, dtype=int).ravel()
    y_p = np.asarray(y_pred, dtype=int).ravel()

    if len(y_t) != len(y_p):
        raise ValueError(f"Length mismatch: y_true has {len(y_t)} items, y_pred has {len(y_p)}.")

    total = len(y_t)
    if total == 0:
        return {
            "total_samples": 0,
            "accuracy": 0.0,
            "balanced_accuracy": 0.0,
            "precision": 0.0,
            "recall": 0.0,
            "f1_score": 0.0,
            "specificity": 0.0,
            "confusion_matrix": {"tn": 0, "fp": 0, "fn": 0, "tp": 0},
            "per_class": {
                "genuine": {"precision": 0.0, "recall": 0.0, "f1_score": 0.0, "support": 0},
                "manipulated": {"precision": 0.0, "recall": 0.0, "f1_score": 0.0, "support": 0}
            }
        }

    cm = compute_confusion_matrix(y_t, y_p)
    tn, fp, fn, tp = cm["tn"], cm["fp"], cm["fn"], cm["tp"]

    # Accuracy
    accuracy = (tp + tn) / total

    # Manipulated (Positive = 1) metrics
    prec_manip = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    rec_manip = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1_manip = (
        2.0 * (prec_manip * rec_manip) / (prec_manip + rec_manip)
        if (prec_manip + rec_manip) > 0
        else 0.0
    )

    # Genuine (Negative = 0) metrics
    prec_gen = tn / (tn + fn) if (tn + fn) > 0 else 0.0
    rec_gen = tn / (tn + fp) if (tn + fp) > 0 else 0.0  # Specificity
    f1_gen = (
        2.0 * (prec_gen * rec_gen) / (prec_gen + rec_gen)
        if (prec_gen + rec_gen) > 0
        else 0.0
    )

    specificity = rec_gen
    balanced_accuracy = (rec_manip + specificity) / 2.0

    # Macro F1
    macro_f1 = (f1_manip + f1_gen) / 2.0

    return {
        "total_samples": total,
        "accuracy": round(float(accuracy), 6),
        "balanced_accuracy": round(float(balanced_accuracy), 6),
        "precision": round(float(prec_manip), 6),       # Precision on positive class (manipulated)
        "recall": round(float(rec_manip), 6),             # Recall on positive class (sensitivity)
        "f1_score": round(float(f1_manip), 6),            # F1 on positive class
        "macro_f1": round(float(macro_f1), 6),
        "specificity": round(float(specificity), 6),     # Specificity on genuine class
        "confusion_matrix": cm,
        "per_class": {
            "genuine": {
                "precision": round(float(prec_gen), 6),
                "recall": round(float(rec_gen), 6),
                "f1_score": round(float(f1_gen), 6),
                "support": int(tn + fp)
            },
            "manipulated": {
                "precision": round(float(prec_manip), 6),
                "recall": round(float(rec_manip), 6),
                "f1_score": round(float(f1_manip), 6),
                "support": int(tp + fn)
            }
        }
    }


# Aliases for API compatibility
compute_classification_metrics = compute_binary_metrics


def format_metrics_summary(metrics: Dict[str, Any]) -> str:

    """Formats metrics dictionary into a readable multi-line summary string."""
    cm = metrics["confusion_matrix"]
    gen = metrics["per_class"]["genuine"]
    man = metrics["per_class"]["manipulated"]

    lines = [
        f"Total Samples: {metrics['total_samples']}",
        f"Accuracy:            {metrics['accuracy'] * 100:.2f}%",
        f"Balanced Accuracy:   {metrics['balanced_accuracy'] * 100:.2f}%",
        f"Precision (Manip):   {metrics['precision'] * 100:.2f}%",
        f"Recall (Manip):      {metrics['recall'] * 100:.2f}%",
        f"Specificity (Gen):   {metrics['specificity'] * 100:.2f}%",
        f"F1-Score (Manip):    {metrics['f1_score'] * 100:.2f}%",
        f"Macro F1-Score:      {metrics['macro_f1'] * 100:.2f}%",
        f"Confusion Matrix:    TN={cm['tn']} | FP={cm['fp']} | FN={cm['fn']} | TP={cm['tp']}",
        f"Genuine Class:       P={gen['precision']*100:.1f}% R={gen['recall']*100:.1f}% F1={gen['f1_score']*100:.1f}% (N={gen['support']})",
        f"Manipulated Class:   P={man['precision']*100:.1f}% R={man['recall']*100:.1f}% F1={man['f1_score']*100:.1f}% (N={man['support']})"
    ]
    return "\n".join(lines)
