"""
FALCON-404: Training Visualization & Plotting Utility
Milestone: Phase 7.2A.4 — First Controlled Experimental Model Training
Author: Lead Developer & System Architect: Harshad Mane

Description:
    Generates high-resolution training loss/metric curves and confusion matrix
    heatmaps for experimental evaluation artifacts.
"""

import os
import csv
from typing import Dict, Any, List, Optional
import numpy as np
import matplotlib
matplotlib.use("Agg")  # Non-interactive backend for headless rendering
import matplotlib.pyplot as plt


def plot_training_curves(csv_path: str, output_path: str, title: str = "Training & Validation Curves") -> str:
    """
    Parses epoch_metrics.csv and renders multi-panel training trajectory curves.

    Panels:
        1. Loss: Train Loss vs Validation Loss
        2. Accuracy: Overall Accuracy vs Balanced Accuracy
        3. Forensic Metrics: Precision, Recall, Specificity, F1-Score
        4. Learning Rate Schedule
    """
    if not os.path.isfile(csv_path):
        raise FileNotFoundError(f"Metrics CSV not found at: {csv_path}")

    epochs: List[int] = []
    train_loss: List[float] = []
    val_loss: List[float] = []
    accuracy: List[float] = []
    balanced_acc: List[float] = []
    precision: List[float] = []
    recall: List[float] = []
    specificity: List[float] = []
    f1_score: List[float] = []
    learning_rate: List[float] = []

    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            epochs.append(int(row["epoch"]))
            train_loss.append(float(row["train_loss"]))
            val_loss.append(float(row["val_loss"]))
            accuracy.append(float(row["accuracy"]))
            balanced_acc.append(float(row["balanced_accuracy"]))
            precision.append(float(row["precision"]))
            recall.append(float(row["recall"]))
            specificity.append(float(row["specificity"]))
            f1_score.append(float(row["f1_score"]))
            learning_rate.append(float(row["learning_rate"]))

    if not epochs:
        raise ValueError(f"Metrics CSV at {csv_path} contains no data rows.")

    fig, axes = plt.subplots(2, 2, figsize=(14, 10))
    fig.suptitle(f"FALCON-404 :: {title}", fontsize=14, fontweight="bold", y=0.98)

    # Panel 1: Loss
    ax = axes[0, 0]
    ax.plot(epochs, train_loss, label="Train Loss", color="#1f77b4", linewidth=2, marker="o", markersize=4)
    ax.plot(epochs, val_loss, label="Validation Loss", color="#d62728", linewidth=2, marker="s", markersize=4)
    ax.set_title("CrossEntropy Loss Trajectory", fontsize=11, fontweight="bold")
    ax.set_xlabel("Epoch")
    ax.set_ylabel("Loss")
    ax.grid(True, linestyle="--", alpha=0.6)
    ax.legend(loc="upper right")

    # Panel 2: Accuracy
    ax = axes[0, 1]
    ax.plot(epochs, [a * 100 for a in accuracy], label="Val Accuracy", color="#2ca02c", linewidth=2, marker="o", markersize=4)
    ax.plot(epochs, [b * 100 for b in balanced_acc], label="Val Balanced Acc", color="#9467bd", linewidth=2, linestyle="--", marker="^", markersize=4)
    ax.set_title("Validation Accuracy Metrics", fontsize=11, fontweight="bold")
    ax.set_xlabel("Epoch")
    ax.set_ylabel("Percentage (%)")
    ax.set_ylim([0, 105])
    ax.grid(True, linestyle="--", alpha=0.6)
    ax.legend(loc="lower right")

    # Panel 3: Forensic Metrics (Precision, Recall, Specificity, F1)
    ax = axes[1, 0]
    ax.plot(epochs, [p * 100 for p in precision], label="Precision (Manip)", color="#ff7f0e", linewidth=1.5, marker="v", markersize=3)
    ax.plot(epochs, [r * 100 for r in recall], label="Recall / Sensitivity", color="#d62728", linewidth=1.5, marker="^", markersize=3)
    ax.plot(epochs, [s * 100 for s in specificity], label="Specificity (Genuine)", color="#17becf", linewidth=1.5, marker="d", markersize=3)
    ax.plot(epochs, [f * 100 for f in f1_score], label="F1-Score (Manip)", color="#2ca02c", linewidth=2, marker="o", markersize=4)
    ax.set_title("Validation Forensic Metrics Breakdown", fontsize=11, fontweight="bold")
    ax.set_xlabel("Epoch")
    ax.set_ylabel("Percentage (%)")
    ax.set_ylim([0, 105])
    ax.grid(True, linestyle="--", alpha=0.6)
    ax.legend(loc="lower right")

    # Panel 4: Learning Rate
    ax = axes[1, 1]
    ax.plot(epochs, learning_rate, label="Learning Rate", color="#8c564b", linewidth=2, marker="x", markersize=4)
    ax.set_title("Cosine Annealing Learning Rate Schedule", fontsize=11, fontweight="bold")
    ax.set_xlabel("Epoch")
    ax.set_ylabel("Learning Rate")
    ax.grid(True, linestyle="--", alpha=0.6)
    ax.legend(loc="upper right")

    plt.tight_layout()
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    fig.savefig(output_path, dpi=300, bbox_inches="tight")
    plt.close(fig)
    return output_path


def plot_confusion_matrix_heatmap(
    cm_dict: Dict[str, int],
    output_path: str,
    title: str = "Validation Confusion Matrix"
) -> str:
    """
    Renders an annotated 2x2 confusion matrix heatmap.

    cm_dict keys: 'tn', 'fp', 'fn', 'tp'
    Row 0: Actual Genuine  [TN, FP]
    Row 1: Actual Manip    [FN, TP]
    """
    tn = cm_dict.get("tn", 0)
    fp = cm_dict.get("fp", 0)
    fn = cm_dict.get("fn", 0)
    tp = cm_dict.get("tp", 0)

    matrix = np.array([[tn, fp], [fn, tp]])
    total = np.sum(matrix)

    fig, ax = plt.subplots(figsize=(6, 5))
    im = ax.imshow(matrix, cmap="Blues", interpolation="nearest")

    cbar = ax.figure.colorbar(im, ax=ax)
    cbar.ax.set_ylabel("Specimen Count", rotation=-90, va="bottom")

    classes = ["Genuine (0)", "Manipulated (1)"]
    ax.set_xticks([0, 1])
    ax.set_yticks([0, 1])
    ax.set_xticklabels(classes, fontsize=10, fontweight="bold")
    ax.set_yticklabels(classes, fontsize=10, fontweight="bold")

    ax.set_xlabel("Predicted Label", fontsize=11, fontweight="bold", labelpad=8)
    ax.set_ylabel("True Ground-Truth Label", fontsize=11, fontweight="bold", labelpad=8)
    ax.set_title(f"FALCON-404 :: {title}\n(Total Samples = {total})", fontsize=12, fontweight="bold", pad=12)

    labels = [
        [f"TN = {tn}\n({tn/total*100:.1f}%)", f"FP = {fp}\n({fp/total*100:.1f}%)"],
        [f"FN = {fn}\n({fn/total*100:.1f}%)", f"TP = {tp}\n({tp/total*100:.1f}%)"]
    ]

    threshold = matrix.max() / 2.0
    for i in range(2):
        for j in range(2):
            color = "white" if matrix[i, j] > threshold else "black"
            ax.text(j, i, labels[i][j], ha="center", va="center", color=color, fontsize=11, fontweight="bold")

    plt.tight_layout()
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    fig.savefig(output_path, dpi=300, bbox_inches="tight")
    plt.close(fig)
    return output_path
