"""
FALCON-404: Final Model Test Split Evaluation Script
Milestone: Phase 7.2A.6 / Final Model Preparation
Author: Lead Developer & System Architect: Harshad Mane

Description:
    Independent, rigorous evaluation CLI for the final trained model on the
    PROTECTED test split of FALCON-404 Dataset v1.1.

IMPORTANT GOVERNANCE:
    - This script evaluates the TEST split (180 specimens) strictly once model
      training has completed.
    - NEVER call this script during model training or hyperparameter search.
    - Results represent experimental synthetic-data screening performance.
"""

import os
import sys
import csv
import json
import argparse
import logging
from collections import defaultdict
from typing import Dict, Any, List

import torch
import torch.nn as nn
from torch.utils.data import DataLoader

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from ml.src.model import create_mobilenet_v3_small
from ml.src.dataset import FalconDocumentDataset
from ml.src.transforms import get_eval_transforms
from ml.src.metrics import compute_binary_metrics, format_metrics_summary
from ml.src.device import get_device, get_device_info
from ml.src.visualization import plot_confusion_matrix_heatmap


def setup_cli_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="FALCON-404: Final Model Test Split Evaluation"
    )
    parser.add_argument(
        "--checkpoint",
        type=str,
        default="ml/experiments/exp_20261104_falcon404_final_model/best_model.pt",
        help="Path to trained model checkpoint (.pt)",
    )
    parser.add_argument(
        "--dataset-dir",
        type=str,
        default="ml_data/FALCON_404_DATASET_v1.1",
        help="Path to FALCON-404 dataset directory",
    )
    parser.add_argument(
        "--split",
        type=str,
        default="test",
        choices=["test", "validation"],
        help="Dataset partition to evaluate (default: 'test')",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=16,
        help="Evaluation batch size",
    )
    parser.add_argument(
        "--device",
        type=str,
        default=None,
        help="Execution device ('cuda', 'cuda:0', 'cpu')",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default=None,
        help="Directory to save evaluation reports (defaults to checkpoint folder)",
    )

    return parser.parse_args()


def evaluate_checkpoint(
    checkpoint_path: str,
    dataset_dir: str,
    split: str = "test",
    batch_size: int = 16,
    device_name: str = None,
    output_dir: str = None
) -> Dict[str, Any]:
    logger = logging.getLogger("falcon404.evaluate")

    if not os.path.isfile(checkpoint_path):
        logger.error(f"Checkpoint file not found: {checkpoint_path}")
        logger.error("Execute model training first before running evaluation.")
        raise FileNotFoundError(
            f"Checkpoint file not found: {checkpoint_path}. "
            "Execute model training first before running evaluation."
        )

    out_dir = output_dir or os.path.dirname(os.path.abspath(checkpoint_path))
    os.makedirs(out_dir, exist_ok=True)

    device = get_device(device_name)
    logger.info(f"Evaluating checkpoint: {checkpoint_path}")
    logger.info(f"Target Partition:    {split.upper()} split")
    logger.info(f"Dataset Root:        {dataset_dir}")
    logger.info(f"Device:              {device}")

    # Load checkpoint
    ckpt = torch.load(checkpoint_path, map_location=device)
    config_dict = ckpt.get("config", {})

    image_size = tuple(config_dict.get("image_size", (224, 224)))
    unfreeze_layers = config_dict.get("unfreeze_upper_layers", 3)

    model = create_mobilenet_v3_small(
        num_classes=2,
        pretrained=False,
        freeze_features=True,
        unfreeze_upper_layers=unfreeze_layers
    ).to(device)

    model.load_state_dict(ckpt["model_state_dict"])
    model.eval()

    eval_tf = get_eval_transforms(input_size=image_size)
    dataset = FalconDocumentDataset(
        dataset_root=dataset_dir,
        split=split,
        transform=eval_tf,
        return_metadata=True
    )
    dataloader = DataLoader(
        dataset,
        batch_size=batch_size,
        shuffle=False,
        pin_memory=(device.type == "cuda")
    )

    criterion = nn.CrossEntropyLoss()
    total_loss = 0.0
    total_batches = 0

    all_targets: List[int] = []
    all_preds: List[int] = []
    cat_counts = defaultdict(lambda: {"tn": 0, "fp": 0, "fn": 0, "tp": 0})
    tamp_counts = defaultdict(lambda: {"total": 0, "detected": 0, "missed": 0})
    conf_stats = {"tn": [], "fp": [], "fn": [], "tp": []}
    sample_records: List[Dict[str, Any]] = []

    with torch.inference_mode():
        for images, targets, metas in dataloader:
            images = images.to(device, non_blocking=True)
            targets = targets.to(device, non_blocking=True)

            outputs = model(images)
            loss = criterion(outputs, targets)
            total_loss += loss.item()
            total_batches += 1

            probs = torch.softmax(outputs, dim=-1)
            preds = torch.argmax(outputs, dim=-1)

            t_list = targets.cpu().tolist()
            p_list = preds.cpu().tolist()
            probs_list = probs.cpu().tolist()

            all_targets.extend(t_list)
            all_preds.extend(p_list)

            for i in range(len(t_list)):
                target = t_list[i]
                pred = p_list[i]
                prob_gen = probs_list[i][0]
                prob_manip = probs_list[i][1]
                cat = metas["document_category"][i]
                tamp = metas["tampering_type"][i]
                sid = metas["sample_id"][i]

                outcome = ""
                if target == 0 and pred == 0:
                    outcome = "TN"
                    cat_counts[cat]["tn"] += 1
                    conf_stats["tn"].append(prob_gen)
                elif target == 0 and pred == 1:
                    outcome = "FP"
                    cat_counts[cat]["fp"] += 1
                    conf_stats["fp"].append(prob_manip)
                elif target == 1 and pred == 0:
                    outcome = "FN"
                    cat_counts[cat]["fn"] += 1
                    tamp_counts[tamp]["missed"] += 1
                    tamp_counts[tamp]["total"] += 1
                    conf_stats["fn"].append(prob_gen)
                elif target == 1 and pred == 1:
                    outcome = "TP"
                    cat_counts[cat]["tp"] += 1
                    tamp_counts[tamp]["detected"] += 1
                    tamp_counts[tamp]["total"] += 1
                    conf_stats["tp"].append(prob_manip)

                sample_records.append({
                    "sample_id": sid,
                    "ground_truth_label": target,
                    "ground_truth_class": "genuine" if target == 0 else "manipulated",
                    "predicted_label": pred,
                    "predicted_class": "genuine" if pred == 0 else "manipulated",
                    "outcome": outcome,
                    "document_category": cat,
                    "tampering_type": tamp,
                    "prob_genuine": round(prob_gen, 4),
                    "prob_manipulated": round(prob_manip, 4),
                })

    avg_loss = total_loss / max(1, total_batches)
    overall_metrics = compute_binary_metrics(all_targets, all_preds)

    # Per-Category breakdown
    category_summary = {}
    for cat in sorted(cat_counts.keys()):
        c = cat_counts[cat]
        tot = c["tp"] + c["tn"] + c["fp"] + c["fn"]
        acc = (c["tp"] + c["tn"]) / tot if tot > 0 else 0.0
        rec = c["tp"] / (c["tp"] + c["fn"]) if (c["tp"] + c["fn"]) > 0 else 0.0
        prec = c["tp"] / (c["tp"] + c["fp"]) if (c["tp"] + c["fp"]) > 0 else 0.0
        f1 = 2 * (prec * rec) / (prec + rec) if (prec + rec) > 0 else 0.0
        category_summary[cat] = {
            "total_samples": tot,
            "accuracy": round(acc, 4),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1_score": round(f1, 4),
            "tn": c["tn"],
            "fp": c["fp"],
            "fn": c["fn"],
            "tp": c["tp"],
        }

    # Per-Tampering breakdown
    tampering_summary = {}
    for tamp in sorted(tamp_counts.keys()):
        c = tamp_counts[tamp]
        rec = c["detected"] / c["total"] if c["total"] > 0 else 0.0
        tampering_summary[tamp] = {
            "total_samples": c["total"],
            "detected": c["detected"],
            "missed": c["missed"],
            "recall": round(rec, 4),
        }

    # Confidence distribution
    confidence_summary = {}
    for outcome in ["tn", "fp", "fn", "tp"]:
        vals = conf_stats[outcome]
        if vals:
            confidence_summary[outcome] = {
                "count": len(vals),
                "mean_confidence": round(sum(vals) / len(vals), 4),
                "min_confidence": round(min(vals), 4),
                "max_confidence": round(max(vals), 4),
            }
        else:
            confidence_summary[outcome] = {"count": 0, "mean_confidence": None}

    report = {
        "evaluation_split": split,
        "checkpoint": os.path.abspath(checkpoint_path),
        "trained_epoch": ckpt.get("epoch"),
        "total_samples": len(dataset),
        "loss": round(avg_loss, 6),
        "overall_metrics": overall_metrics,
        "per_category": category_summary,
        "per_tampering_type": tampering_summary,
        "confidence_summary": confidence_summary,
        "artifacts": {
            "report_json": os.path.join(out_dir, f"{split}_evaluation_report.json"),
            "category_csv": os.path.join(out_dir, f"{split}_evaluation_per_category.csv"),
            "predictions_csv": os.path.join(out_dir, f"{split}_predictions.csv"),
            "confusion_matrix_png": os.path.join(out_dir, f"confusion_matrix_{split}.png"),
        }
    }

    # Save JSON report
    with open(report["artifacts"]["report_json"], "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    # Save Per-Category CSV
    with open(report["artifacts"]["category_csv"], "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["document_category", "total_samples", "accuracy", "precision", "recall", "f1_score", "tn", "fp", "fn", "tp"])
        for cat, data in category_summary.items():
            writer.writerow([
                cat, data["total_samples"], data["accuracy"], data["precision"],
                data["recall"], data["f1_score"], data["tn"], data["fp"], data["fn"], data["tp"]
            ])

    # Save Predictions CSV
    with open(report["artifacts"]["predictions_csv"], "w", encoding="utf-8", newline="") as f:
        fieldnames = ["sample_id", "ground_truth_label", "ground_truth_class", "predicted_label", "predicted_class", "outcome", "document_category", "tampering_type", "prob_genuine", "prob_manipulated"]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(sample_records)

    # Save Confusion Matrix Heatmap
    if "confusion_matrix" in overall_metrics:
        try:
            plot_confusion_matrix_heatmap(
                overall_metrics["confusion_matrix"],
                report["artifacts"]["confusion_matrix_png"],
                title=f"Final Model {split.capitalize()} Set Evaluation"
            )
        except Exception as viz_err:
            logger.warning(f"Could not generate confusion matrix plot: {viz_err}")

    # Print summary
    print("\n" + "=" * 70)
    print(f"FALCON-404 :: FINAL MODEL {split.upper()} SPLIT EVALUATION REPORT")
    print("=" * 70)
    print(f"Checkpoint:       {checkpoint_path} (Epoch {ckpt.get('epoch')})")
    print(f"Total Samples:    {len(dataset)}")
    print(f"Average Loss:     {avg_loss:.4f}")
    print(f"Accuracy:         {overall_metrics.get('accuracy', 0.0)*100:.2f}%")
    print(f"Balanced Acc:     {overall_metrics.get('balanced_accuracy', 0.0)*100:.2f}%")
    print(f"Precision:        {overall_metrics.get('precision', 0.0)*100:.2f}%")
    print(f"Recall:           {overall_metrics.get('recall', 0.0)*100:.2f}%")
    print(f"Specificity:      {overall_metrics.get('specificity', 0.0)*100:.2f}%")
    print(f"F1-Score:         {overall_metrics.get('f1_score', 0.0)*100:.2f}%")
    cm = overall_metrics.get("confusion_matrix", {})
    print(f"Confusion Matrix: TN={cm.get('tn')} | FP={cm.get('fp')} | FN={cm.get('fn')} | TP={cm.get('tp')}")
    print("-" * 70)
    print("CATEGORY BREAKDOWN:")
    for cat, data in category_summary.items():
        print(f"  {cat:22s} | Acc: {data['accuracy']*100:5.1f}% | Rec: {data['recall']*100:5.1f}% | Prec: {data['precision']*100:5.1f}% | F1: {data['f1_score']*100:5.1f}%")
    print("-" * 70)
    print("TAMPERING TYPE DETECTION (MANIPULATED SPECIMENS):")
    for tamp, data in tampering_summary.items():
        print(f"  {tamp:22s} | Total: {data['total_samples']:2d} | Detected: {data['detected']:2d} | Recall: {data['recall']*100:5.1f}%")
    print("=" * 70)
    print(f"Full Report:      {report['artifacts']['report_json']}")
    print(f"Category CSV:     {report['artifacts']['category_csv']}")
    print(f"Predictions CSV:  {report['artifacts']['predictions_csv']}")
    print(f"CM Heatmap:       {report['artifacts']['confusion_matrix_png']}")
    print("=" * 70 + "\n")

    return report


def main() -> None:
    setup_cli_logging()
    args = parse_args()
    try:
        evaluate_checkpoint(
            checkpoint_path=args.checkpoint,
            dataset_dir=args.dataset_dir,
            split=args.split,
            batch_size=args.batch_size,
            device_name=args.device,
            output_dir=args.output_dir
        )
    except FileNotFoundError as fnf:
        sys.exit(1)


if __name__ == "__main__":
    main()
