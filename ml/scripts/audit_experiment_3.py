"""
FALCON-404: Experiment 3 Validation Error Analysis Script
Audits validation predictions of exp_20261104_pretrained_v1_1_harmonized
Strictly on the VALIDATION split. Never consumes or touches test split.
"""
import os
import sys
import json
from collections import defaultdict
import torch
from torch.utils.data import DataLoader

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from ml.src.model import create_mobilenet_v3_small
from ml.src.dataset import FalconDocumentDataset
from ml.src.transforms import get_eval_transforms


def run_audit():
    model_path = os.path.join(PROJECT_ROOT, "ml", "experiments", "exp_20261104_pretrained_v1_1_harmonized", "best_model.pt")
    ckpt = torch.load(model_path, map_location="cpu")

    model = create_mobilenet_v3_small(num_classes=2, pretrained=False)
    model.load_state_dict(ckpt["model_state_dict"])
    model.eval()

    eval_tf = get_eval_transforms((224, 224))
    dataset_dir = os.path.join(PROJECT_ROOT, "ml_data", "FALCON_404_DATASET_v1.1")
    val_ds = FalconDocumentDataset(dataset_dir, split="validation", transform=eval_tf, return_metadata=True)
    val_loader = DataLoader(val_ds, batch_size=16, shuffle=False)

    cat_counts = defaultdict(lambda: {"tn": 0, "fp": 0, "fn": 0, "tp": 0})
    tamp_counts = defaultdict(lambda: {"total": 0, "detected": 0, "missed": 0})
    conf_stats = {"tn": [], "fp": [], "fn": [], "tp": []}
    sample_details = []

    with torch.no_grad():
        for images, targets, metas in val_loader:
            logits = model(images)
            probs = torch.softmax(logits, dim=-1)
            preds = torch.argmax(logits, dim=-1)

            for i in range(len(targets)):
                target = int(targets[i].item())
                pred = int(preds[i].item())
                prob_manip = float(probs[i, 1].item())
                prob_gen = float(probs[i, 0].item())
                cat = metas["document_category"][i]
                tamp = metas["tampering_type"][i]
                sample_id = metas["sample_id"][i]

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

                sample_details.append({
                    "sample_id": sample_id,
                    "target": target,
                    "pred": pred,
                    "outcome": outcome,
                    "category": cat,
                    "tampering_type": tamp,
                    "prob_genuine": round(prob_gen, 4),
                    "prob_manipulated": round(prob_manip, 4)
                })

    print("======================================================================")
    print("FALCON-404: EXPERIMENT 3 VALIDATION ERROR ANALYSIS AUDIT")
    print("======================================================================")
    print(f"Total Validation Samples: {len(val_ds)}")
    print(f"Checkpoint Epoch: {ckpt.get('epoch')}")

    print("\n--- CATEGORY BREAKDOWN ---")
    for cat in sorted(cat_counts.keys()):
        c = cat_counts[cat]
        tot = c["tp"] + c["tn"] + c["fp"] + c["fn"]
        acc = (c["tp"] + c["tn"]) / tot if tot > 0 else 0
        rec = c["tp"] / (c["tp"] + c["fn"]) if (c["tp"] + c["fn"]) > 0 else 0
        prec = c["tp"] / (c["tp"] + c["fp"]) if (c["tp"] + c["fp"]) > 0 else 0
        f1 = 2 * (prec * rec) / (prec + rec) if (prec + rec) > 0 else 0
        print(f"{cat:22s} | Acc: {acc*100:5.1f}% | Rec: {rec*100:5.1f}% | Prec: {prec*100:5.1f}% | F1: {f1*100:5.1f}% | TN={c['tn']:2d}, FP={c['fp']:2d}, FN={c['fn']:2d}, TP={c['tp']:2d}")

    print("\n--- TAMPERING TYPE BREAKDOWN (MANIPULATED SPECIMENS ONLY) ---")
    for tamp in sorted(tamp_counts.keys()):
        c = tamp_counts[tamp]
        rec = c["detected"] / c["total"] if c["total"] > 0 else 0
        print(f"{tamp:22s} | Total: {c['total']:2d} | Detected (TP): {c['detected']:2d} | Missed (FN): {c['missed']:2d} | Recall: {rec*100:5.1f}%")

    print("\n--- PREDICTION CONFIDENCE DISTRIBUTION ---")
    for outcome in ["tn", "fp", "fn", "tp"]:
        vals = conf_stats[outcome]
        if vals:
            avg_p = sum(vals) / len(vals)
            min_p = min(vals)
            max_p = max(vals)
            print(f"{outcome.upper():2s} (N={len(vals):2d}) | Mean Pred Prob: {avg_p:.4f} | Min: {min_p:.4f} | Max: {max_p:.4f}")
        else:
            print(f"{outcome.upper():2s} (N= 0) | N/A")

    return {
        "cat_counts": dict(cat_counts),
        "tamp_counts": dict(tamp_counts),
        "conf_stats": {k: [round(x, 4) for x in v] for k, v in conf_stats.items()},
        "sample_details": sample_details
    }


if __name__ == "__main__":
    results = run_audit()
    out_json = os.path.join(PROJECT_ROOT, "ml", "scripts", "exp3_val_audit_results.json")
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"\nDetailed audit saved to {out_json}")
