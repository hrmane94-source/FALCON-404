"""
FALCON-404: Real-Time Document Tampering Screening CLI
Milestone: Phase 7.2A.6 / Final Model Preparation
Author: Lead Developer & System Architect: Harshad Mane

Usage:
    # Screen single document image:
    python ml/scripts/run_inference.py --image path/to/document.jpg --checkpoint ml/experiments/exp_20261104_falcon404_final_model/best_model.pt

    # Screen directory of images:
    python ml/scripts/run_inference.py --dir path/to/docs/ --checkpoint ml/experiments/exp_20261104_falcon404_final_model/best_model.pt
"""

import os
import sys
import json
import argparse
import logging
from typing import List

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from ml.src.inference import FalconDocumentClassifier


def setup_cli_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="FALCON-404: Document Tampering Screening CLI"
    )
    parser.add_argument(
        "--image",
        type=str,
        default=None,
        help="Path to single image file for screening",
    )
    parser.add_argument(
        "--dir",
        type=str,
        default=None,
        help="Directory of images to batch screen",
    )
    parser.add_argument(
        "--checkpoint",
        type=str,
        default="ml/experiments/exp_20261104_falcon404_final_model/best_model.pt",
        help="Path to trained model checkpoint (.pt)",
    )
    parser.add_argument(
        "--device",
        type=str,
        default=None,
        help="Execution device ('cuda', 'cpu', None for auto)",
    )
    parser.add_argument(
        "--threshold",
        type=float,
        default=0.50,
        help="Tampering decision threshold (default: 0.50)",
    )
    parser.add_argument(
        "--review-margin",
        type=float,
        default=0.10,
        help="Margin around threshold for NEEDS_REVIEW status (default: 0.10)",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output raw JSON to stdout",
    )

    return parser.parse_args()


def format_status_badge(status: str) -> str:
    badges = {
        "GENUINE": "[OK: GENUINE]",
        "MANIPULATED": "[ALERT: MANIPULATED]",
        "NEEDS_REVIEW": "[WARN: NEEDS REVIEW]",
        "ERROR": "[ERROR: FAILED]"
    }
    return badges.get(status, f"[{status}]")


def main() -> None:
    setup_cli_logging()
    args = parse_args()
    logger = logging.getLogger("falcon404.cli.inference")

    if not args.image and not args.dir:
        logger.error("Provide either --image <path> or --dir <path>.")
        sys.exit(1)

    if not os.path.isfile(args.checkpoint):
        logger.error(f"Checkpoint not found at: {args.checkpoint}")
        logger.error("Execute model training first before running inference.")
        sys.exit(1)

    classifier = FalconDocumentClassifier(
        checkpoint_path=args.checkpoint,
        device=args.device,
        decision_threshold=args.threshold,
        review_margin=args.review_margin
    )

    image_paths: List[str] = []
    if args.image:
        image_paths.append(args.image)
    elif args.dir:
        valid_exts = {".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".webp"}
        for root, _, files in os.walk(args.dir):
            for f in sorted(files):
                if os.path.splitext(f)[1].lower() in valid_exts:
                    image_paths.append(os.path.join(root, f))

    if not image_paths:
        logger.warning("No valid image files found.")
        sys.exit(0)

    results = []
    for img_p in image_paths:
        res = classifier.predict_image(img_p)
        res["input_path"] = img_p
        results.append(res)

        if not args.json:
            badge = format_status_badge(res["status"])
            p_gen = res["probabilities"]["genuine"]
            p_man = res["probabilities"]["manipulated"]
            t_ms = res["inference_time_ms"]
            print(f"{badge:22s} | Score: {p_man*100:5.1f}% | P(Gen): {p_gen*100:5.1f}% | Latency: {t_ms:5.1f}ms | File: {img_p}")

    if args.json:
        print(json.dumps(results if len(results) > 1 else results[0], indent=2))


if __name__ == "__main__":
    main()
