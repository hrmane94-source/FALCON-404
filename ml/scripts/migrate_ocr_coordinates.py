#!/usr/bin/env python3
"""
FALCON-404: OCR Bounding Box Coordinate Migration Tool
Phase: Dataset v1.0 Remediation & Safety
Author: Lead Developer & System Architect: Harshad Mane

Description:
    Migrates OCR ground-truth bounding box coordinates in FALCON_404_DATASET_v1.0
    from original virtual canvas space (1000 x 625) to final image pixel space (640 x 403).

Safety Guarantees & Idempotency:
    1. Pre-flight scan determines overall dataset migration state before modifying any file.
    2. Idempotency Guard: If annotations are already migrated, aborts --apply to prevent double-scaling.
    3. Consistency Guard: If mixed migration states are detected across the dataset, aborts immediately.
    4. Malformed Guard: If coordinates violate expected canvas bounds or geometry, aborts safely.
    5. Dry-Run Default: Dry-run is the default execution mode; --apply is required for writes.
    6. Override Precedence: If both --apply and --dry-run are supplied, dry-run always takes precedence.
    7. Backup Preservation: Preserves existing pre-migration backups and never overwrites them.
"""

import os
import sys
import json
import csv
import math
import hashlib
import shutil
import argparse
from typing import Dict, List, Any, Tuple, Optional
from PIL import Image


# Base canvas resolution used during synthetic credential synthesis
BASE_CANVAS_WIDTH = 1000.0
BASE_CANVAS_HEIGHT = 625.0


class MigrationAbortedError(Exception):
    """Raised when migration is safely aborted due to already-migrated or invalid dataset states."""
    pass


class MigrationError(Exception):
    """Raised when an unrecoverable structural error or file missing condition occurs."""
    pass


def validate_box(box: List[int], img_width: int, img_height: int) -> Tuple[bool, Optional[str]]:
    """Validates that a bounding box satisfies all structural and boundary invariants."""
    if not isinstance(box, (list, tuple)) or len(box) != 4:
        return False, f"Expected 4 coordinates, got {box}"
    x1, y1, x2, y2 = box
    if not all(isinstance(c, int) for c in box):
        return False, f"Non-integer coordinates: {box}"
    if x1 < 0 or y1 < 0:
        return False, f"Negative coordinates: {box}"
    if x1 >= x2:
        return False, f"Inverted or zero X width (x1={x1} >= x2={x2})"
    if y1 >= y2:
        return False, f"Inverted or zero Y height (y1={y1} >= y2={y2})"
    if x2 > img_width:
        return False, f"x2={x2} exceeds image width {img_width}"
    if y2 > img_height:
        return False, f"y2={y2} exceeds image height {img_height}"
    return True, None


def classify_sample_state(
    raw_boxes: Dict[str, List[int]],
    img_w: int,
    img_h: int,
    base_w: float = BASE_CANVAS_WIDTH,
    base_h: float = BASE_CANVAS_HEIGHT
) -> str:
    """
    Classifies a sample's OCR bounding boxes into one of four states:
      - 'ALREADY_MIGRATED': All boxes are strictly valid within target image bounds (img_w, img_h).
      - 'ORIGINAL_UNSCALED': All boxes exceed target image bounds but fit within base canvas bounds (base_w, base_h).
      - 'MIXED': Some boxes are within target bounds while others are in unscaled canvas space.
      - 'MALFORMED': Boxes have negative numbers, inverted edges, zero area, or exceed base canvas.
      - 'EMPTY': No bounding boxes present.
    """
    if not raw_boxes:
        return "EMPTY"

    box_states = []
    for fld, box in raw_boxes.items():
        if not isinstance(box, (list, tuple)) or len(box) != 4:
            return "MALFORMED"
        x1, y1, x2, y2 = box
        if not all(isinstance(v, int) for v in box):
            return "MALFORMED"
        if x1 < 0 or y1 < 0 or x1 >= x2 or y1 >= y2:
            return "MALFORMED"

        # Check target image boundary containment
        in_target = (x2 <= img_w and y2 <= img_h)

        # Check virtual base canvas containment
        in_base = (x2 <= int(base_w) and y2 <= int(base_h))

        if in_target:
            box_states.append("MIGRATED")
        elif in_base:
            box_states.append("UNSCALED")
        else:
            # Exceeds even the base canvas
            return "MALFORMED"

    all_migrated = all(s == "MIGRATED" for s in box_states)
    all_unscaled = all(s == "UNSCALED" for s in box_states)

    if all_migrated:
        return "ALREADY_MIGRATED"
    elif all_unscaled:
        return "ORIGINAL_UNSCALED"
    else:
        return "MIXED"


def transform_box(
    box: List[int],
    scale_x: float,
    scale_y: float,
    img_width: int,
    img_height: int,
    rounding_mode: str = "coverage"
) -> List[int]:
    """
    Transforms a single bounding box [x1, y1, x2, y2] by (scale_x, scale_y)
    and applies clipping and rounding convention.

    Rounding modes:
      - 'round': Standard mathematical rounding to nearest integer.
      - 'coverage': Conservative envelope (floor for x1, y1; ceil for x2, y2)
                    to ensure complete pixel coverage of the text region.
    """
    x1, y1, x2, y2 = box

    if rounding_mode == "coverage":
        tx1 = int(math.floor(x1 * scale_x))
        ty1 = int(math.floor(y1 * scale_y))
        tx2 = int(math.ceil(x2 * scale_x))
        ty2 = int(math.ceil(y2 * scale_y))
    else:  # default 'round'
        tx1 = int(round(x1 * scale_x))
        ty1 = int(round(y1 * scale_y))
        tx2 = int(round(x2 * scale_x))
        ty2 = int(round(y2 * scale_y))

    # Clamp to image boundaries to guarantee invariants
    tx1 = max(0, min(tx1, img_width - 1))
    ty1 = max(0, min(ty1, img_height - 1))
    tx2 = max(tx1 + 1, min(tx2, img_width))
    ty2 = max(ty1 + 1, min(ty2, img_height))

    return [tx1, ty1, tx2, ty2]


def compute_mask_bbox(mask_path: str) -> Optional[List[int]]:
    """Extracts the [x1, y1, x2, y2] bounding box of non-zero pixels in a mask."""
    if not os.path.isfile(mask_path):
        return None
    try:
        mask = Image.open(mask_path).convert("L")
        bbox = mask.getbbox()  # returns (left, upper, right, lower) or None if all 0
        return list(bbox) if bbox else None
    except Exception:
        return None


def ensure_backup(
    dataset_path: str,
    ocr_rel_dir: str = "annotations/ocr",
    backup_rel_dir: str = "backups/annotations_ocr_pre_migration"
) -> str:
    """
    Creates a pre-migration backup of annotations/ocr if one does not already exist.
    Preserves existing backup files and SHA-256 records without overwriting them.
    """
    ocr_abs = os.path.join(dataset_path, ocr_rel_dir)
    backup_abs = os.path.join(dataset_path, backup_rel_dir)
    os.makedirs(backup_abs, exist_ok=True)

    hash_file = os.path.join(dataset_path, "backups", "original_ocr_sha256.json")
    existing_backups = [f for f in os.listdir(backup_abs) if f.endswith(".json")]

    if len(existing_backups) > 0 and os.path.isfile(hash_file):
        # Backup already exists, protect and preserve it
        return backup_abs

    # Create backup from current files
    ocr_hashes = {}
    ocr_files = sorted([f for f in os.listdir(ocr_abs) if f.endswith(".json")])
    for f in ocr_files:
        src_path = os.path.join(ocr_abs, f)
        dst_path = os.path.join(backup_abs, f)
        with open(src_path, "rb") as fp:
            h = hashlib.sha256(fp.read()).hexdigest()
        ocr_hashes[f] = h
        if not os.path.isfile(dst_path):
            shutil.copy2(src_path, dst_path)

    if not os.path.isfile(hash_file):
        with open(hash_file, "w", encoding="utf-8") as fp:
            json.dump(ocr_hashes, fp, indent=2)

    return backup_abs


def inspect_dataset_state(
    dataset_path: str,
    manifest_name: str = "dataset_manifest.csv"
) -> Dict[str, Any]:
    """
    Performs a pre-flight inspection across all manifest entries to determine
    the dataset-level migration status before any transformation occurs.
    """
    manifest_path = os.path.join(dataset_path, manifest_name)
    if not os.path.isfile(manifest_path):
        raise FileNotFoundError(f"Manifest not found at {manifest_path}")

    with open(manifest_path, "r", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    image_dim_cache: Dict[str, Tuple[int, int]] = {}
    sample_states: Dict[str, str] = {}
    unscaled_samples: List[str] = []
    migrated_samples: List[str] = []
    mixed_samples: List[str] = []
    malformed_samples: List[str] = []
    missing_samples: List[str] = []

    for r in rows:
        sid = r.get("sample_id", "unknown")
        img_rel = r.get("image_path", "")
        ocr_rel = r.get("ocr_annotation", "")

        img_abs = os.path.join(dataset_path, img_rel)
        ocr_abs = os.path.join(dataset_path, ocr_rel)

        if not os.path.isfile(img_abs) or not os.path.isfile(ocr_abs):
            missing_samples.append(sid)
            sample_states[sid] = "MISSING_FILE"
            continue

        if img_abs not in image_dim_cache:
            with Image.open(img_abs) as im:
                image_dim_cache[img_abs] = im.size
        img_w, img_h = image_dim_cache[img_abs]

        try:
            with open(ocr_abs, "r", encoding="utf-8") as fp:
                data = json.load(fp)
            boxes = data.get("field_bounding_boxes_xyxy", {})
            st = classify_sample_state(boxes, img_w, img_h)
        except Exception:
            st = "MALFORMED"

        sample_states[sid] = st
        if st == "ORIGINAL_UNSCALED":
            unscaled_samples.append(sid)
        elif st == "ALREADY_MIGRATED":
            migrated_samples.append(sid)
        elif st == "MIXED":
            mixed_samples.append(sid)
        else:
            malformed_samples.append(sid)

    total = len(rows)
    if missing_samples or malformed_samples:
        overall = "CORRUPT_OR_MALFORMED"
    elif mixed_samples or (unscaled_samples and migrated_samples):
        overall = "MIXED_STATE"
    elif migrated_samples and not unscaled_samples:
        overall = "ALREADY_MIGRATED"
    elif unscaled_samples and not migrated_samples:
        overall = "ORIGINAL_UNSCALED"
    elif total == 0:
        overall = "EMPTY"
    else:
        overall = "UNKNOWN"

    return {
        "overall_status": overall,
        "total_records": total,
        "unscaled_count": len(unscaled_samples),
        "migrated_count": len(migrated_samples),
        "mixed_count": len(mixed_samples),
        "malformed_count": len(malformed_samples),
        "missing_count": len(missing_samples),
        "unscaled_samples": unscaled_samples,
        "migrated_samples": migrated_samples,
        "mixed_samples": mixed_samples,
        "malformed_samples": malformed_samples,
        "missing_samples": missing_samples,
        "rows": rows,
        "image_dim_cache": image_dim_cache
    }


def run_migration(
    dataset_dir: str,
    manifest_name: str = "dataset_manifest.csv",
    rounding_mode: str = "coverage",
    dry_run: bool = True,
    report_path: Optional[str] = None
) -> Dict[str, Any]:
    """
    Executes the OCR bounding box migration pipeline or dry-run audit with full idempotency protection.
    """
    dataset_path = os.path.abspath(dataset_dir)
    preflight = inspect_dataset_state(dataset_path, manifest_name)
    status = preflight["overall_status"]
    total_records = preflight["total_records"]

    print("=" * 70)
    print("FALCON-404 :: OCR BOUNDING BOX COORDINATE MIGRATION")
    print(f"Mode: {'DRY RUN (NO FILES MODIFIED)' if dry_run else 'APPLY MIGRATION (WRITE MODE)'}")
    print(f"Dataset root: {dataset_path}")
    print(f"Total manifest records: {total_records}")
    print(f"Pre-flight Dataset Status: {status}")
    print(f"  Unscaled samples: {preflight['unscaled_count']}")
    print(f"  Already-migrated samples: {preflight['migrated_count']}")
    print(f"  Mixed-state samples: {preflight['mixed_count']}")
    print(f"  Malformed samples: {preflight['malformed_count']}")
    print(f"Base canvas reference: {BASE_CANVAS_WIDTH:.0f} x {BASE_CANVAS_HEIGHT:.0f}")
    print(f"Rounding mode: {rounding_mode}")
    print("=" * 70)

    # -------------------------------------------------------------------------
    # Idempotency & Safety Guards
    # -------------------------------------------------------------------------

    # Condition 1: Already Migrated
    if status == "ALREADY_MIGRATED":
        msg = (
            f"Dataset at '{dataset_path}' has ALREADY been migrated! "
            f"All {preflight['migrated_count']} samples have valid coordinates in image space. "
            f"Double-scaling is prevented."
        )
        if dry_run:
            print(f"\n[NOTICE] {msg}")
            print("No action required. Dataset coordinates are clean and valid.")
            return {
                "status": "ALREADY_MIGRATED",
                "message": msg,
                "preflight": preflight
            }
        else:
            print(f"\n[ABORT] {msg}")
            raise MigrationAbortedError(
                f"ABORT: Cannot apply migration to an already-migrated dataset! {msg}"
            )

    # Condition 2: Mixed Migration State
    if status == "MIXED_STATE":
        affected = (preflight["mixed_samples"] + preflight["unscaled_samples"] + preflight["migrated_samples"])[:10]
        msg = (
            f"ABORT: Inconsistent dataset state detected! Found {preflight['unscaled_count']} unscaled, "
            f"{preflight['migrated_count']} already-migrated, and {preflight['mixed_count']} mixed samples. "
            f"Cannot safely determine coordinate system. Sample IDs: {affected}"
        )
        print(f"\n[ERROR] {msg}")
        raise MigrationAbortedError(msg)

    # Condition 3: Corrupt or Malformed State
    if status == "CORRUPT_OR_MALFORMED":
        affected = (preflight["malformed_samples"] + preflight["missing_samples"])[:10]
        msg = (
            f"ABORT: Malformed or missing annotations detected in dataset! "
            f"Malformed: {preflight['malformed_count']}, Missing: {preflight['missing_count']}. "
            f"Sample IDs: {affected}"
        )
        print(f"\n[ERROR] {msg}")
        raise MigrationError(msg)

    # Condition 4: Empty Dataset
    if status == "EMPTY":
        msg = "Manifest is empty. Nothing to migrate."
        print(f"\n[NOTICE] {msg}")
        return {"status": "EMPTY", "message": msg}

    # -------------------------------------------------------------------------
    # Execute Migration (Only for ORIGINAL_UNSCALED)
    # -------------------------------------------------------------------------
    stats = {
        "status": "SUCCESS",
        "total_records": total_records,
        "annotations_inspected": 0,
        "total_boxes_inspected": 0,
        "original_valid_boxes": 0,
        "original_oob_boxes": 0,
        "transformed_valid_boxes": 0,
        "transformed_invalid_boxes": 0,
        "categories": {},
        "diagnostic_mask_checks": {
            "text_manipulation_samples": 0,
            "mask_matches_transformed_field": 0
        },
        "examples": []
    }

    # If write mode, ensure backup before modifying
    if not dry_run:
        backup_path = ensure_backup(dataset_path)
        print(f"Pre-migration backup verified at: {backup_path}")

    image_dim_cache = preflight["image_dim_cache"]
    pending_updates: List[Tuple[str, Dict[str, Any]]] = []

    for row in preflight["rows"]:
        cat = row.get("document_category", "unknown")
        if cat not in stats["categories"]:
            stats["categories"][cat] = {
                "records": 0,
                "boxes_inspected": 0,
                "original_valid": 0,
                "original_oob": 0,
                "transformed_valid": 0,
                "transformed_invalid": 0
            }
        stats["categories"][cat]["records"] += 1

        img_rel = row.get("image_path", "")
        ocr_rel = row.get("ocr_annotation", "")
        mask_rel = row.get("mask_path", "")

        img_abs = os.path.join(dataset_path, img_rel)
        ocr_abs = os.path.join(dataset_path, ocr_rel)
        mask_abs = os.path.join(dataset_path, mask_rel)

        img_w, img_h = image_dim_cache[img_abs]
        scale_x = img_w / BASE_CANVAS_WIDTH
        scale_y = img_h / BASE_CANVAS_HEIGHT

        with open(ocr_abs, "r", encoding="utf-8") as f:
            ocr_data = json.load(f)

        stats["annotations_inspected"] += 1
        raw_boxes = ocr_data.get("field_bounding_boxes_xyxy", {})
        transformed_boxes = {}

        for field_name, box in raw_boxes.items():
            stats["total_boxes_inspected"] += 1
            stats["categories"][cat]["boxes_inspected"] += 1

            orig_valid, _ = validate_box(box, img_w, img_h)
            if orig_valid:
                stats["original_valid_boxes"] += 1
                stats["categories"][cat]["original_valid"] += 1
            else:
                stats["original_oob_boxes"] += 1
                stats["categories"][cat]["original_oob"] += 1

            t_box = transform_box(box, scale_x, scale_y, img_w, img_h, rounding_mode=rounding_mode)
            transformed_boxes[field_name] = t_box

            t_valid, t_err = validate_box(t_box, img_w, img_h)
            if t_valid:
                stats["transformed_valid_boxes"] += 1
                stats["categories"][cat]["transformed_valid"] += 1
            else:
                stats["transformed_invalid_boxes"] += 1
                stats["categories"][cat]["transformed_invalid"] += 1
                raise MigrationError(f"Validation failure in {row['sample_id']} [{field_name}]: {t_err}")

        if len(stats["examples"]) < 3:
            stats["examples"].append({
                "sample_id": row["sample_id"],
                "category": cat,
                "image_dimensions": [img_w, img_h],
                "scale_factors": [round(scale_x, 4), round(scale_y, 4)],
                "original_boxes": raw_boxes,
                "transformed_boxes": transformed_boxes
            })

        if row.get("tampering_type") == "text":
            stats["diagnostic_mask_checks"]["text_manipulation_samples"] += 1
            m_box = compute_mask_bbox(mask_abs)
            if m_box:
                doc_id_box = transformed_boxes.get("document_id")
                if doc_id_box:
                    mx1, my1, mx2, my2 = m_box
                    dx1, dy1, dx2, dy2 = doc_id_box
                    if max(mx1, dx1) < min(mx2, dx2) and max(my1, dy1) < min(my2, dy2):
                        stats["diagnostic_mask_checks"]["mask_matches_transformed_field"] += 1

        if not dry_run:
            ocr_data["field_bounding_boxes_xyxy"] = transformed_boxes
            pending_updates.append((ocr_abs, ocr_data))

    # Apply updates atomically across the dataset
    if not dry_run:
        for file_path, content in pending_updates:
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(content, f, indent=2, ensure_ascii=False)
                f.write("\n")

    # Console Summary
    print("\n" + "=" * 70)
    print("MIGRATION SUMMARY AUDIT")
    print("=" * 70)
    print(f"Total annotations inspected: {stats['annotations_inspected']} / {total_records}")
    print(f"Total boxes inspected:       {stats['total_boxes_inspected']}")
    print(f"Original OOB boxes:          {stats['original_oob_boxes']}")
    print(f"Transformed valid boxes:     {stats['transformed_valid_boxes']}")
    print(f"Transformed invalid boxes:   {stats['transformed_invalid_boxes']}")

    if dry_run:
        print("\n" + "=" * 70)
        print("CONFIRMATION: DRY RUN ONLY. ZERO DATASET FILES WERE MODIFIED.")
        print("=" * 70)
    else:
        print("\n" + "=" * 70)
        print("MIGRATION COMPLETED: ALL OCR ANNOTATION FILES WERE SAFELY UPDATED.")
        print("=" * 70)

    if report_path:
        with open(report_path, "w", encoding="utf-8") as f:
            json.dump(stats, f, indent=2)
        print(f"Detailed audit report saved to: {report_path}")

    return stats


def main():
    parser = argparse.ArgumentParser(description="FALCON-404 OCR Bounding Box Coordinate Migration")
    parser.add_argument(
        "--dataset-dir",
        type=str,
        default="ml_data/FALCON_404_DATASET_v1.0",
        help="Path to FALCON_404_DATASET_v1.0 root"
    )
    parser.add_argument(
        "--manifest",
        type=str,
        default="dataset_manifest.csv",
        help="Master manifest filename"
    )
    parser.add_argument(
        "--rounding-mode",
        type=str,
        choices=["round", "coverage"],
        default="coverage",
        help="Rounding convention: 'coverage' (envelope floor/ceil) or 'round' (nearest integer)"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        default=False,
        help="Simulate coordinate migration without writing to disk"
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        default=False,
        help="Explicit flag required to apply and write migrations to disk"
    )
    parser.add_argument(
        "--report-path",
        type=str,
        default=None,
        help="Optional path to output migration audit JSON report"
    )

    args = parser.parse_args()

    # Safety enforce: write mode is ONLY active if --apply is set AND --dry-run is not explicitly asked
    is_dry_run = True
    if args.apply and not args.dry_run:
        is_dry_run = False

    try:
        run_migration(
            dataset_dir=args.dataset_dir,
            manifest_name=args.manifest,
            rounding_mode=args.rounding_mode,
            dry_run=is_dry_run,
            report_path=args.report_path
        )
    except MigrationAbortedError as e:
        print(f"\n[MIGRATION ABORTED] {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"\n[MIGRATION ERROR] {e}", file=sys.stderr)
        sys.exit(2)


if __name__ == "__main__":
    main()
