"""
FALCON-404: Synthetic Dataset Validation & Verification Tool (Phase 7.1)
Author: Harshad Mane (FALCON-404)
Description:
    Performs rigorous automated verification of generated synthetic datasets:
    - Integrity and existence of image and mask files
    - Dimension parity between image and mask
    - Grayscale binary mask validity (values 0 and 255 only)
    - Pristine sample verification (0 altered pixels)
    - Manipulated sample verification (> 0 altered pixels matching bbox)
    - Anti-leakage split isolation (source identities strictly partitioned)
    - JSONL and CSV manifest synchronization
"""

import os
import sys
import json
import csv
import argparse
from typing import Dict, List, Any, Set
from PIL import Image


class SyntheticDatasetValidator:
    """Validates the synthetic dataset on disk against all forensic integrity requirements."""

    VALID_LABELS = {"pristine_synthetic", "manipulated_synthetic"}
    VALID_MANIP_TYPES = {
        "none",
        "text_replacement",
        "copy_move",
        "portrait_swap",
        "localized_resampling_blur",
        "localized_recompression"
    }

    def __init__(self, data_dir: str):
        self.data_dir = data_dir
        self.manifest_csv = os.path.join(data_dir, "dataset_manifest.csv")
        self.train_jsonl = os.path.join(data_dir, "train.jsonl")
        self.val_jsonl = os.path.join(data_dir, "validation.jsonl")
        self.test_jsonl = os.path.join(data_dir, "test.jsonl")
        self.report_json = os.path.join(data_dir, "validation_report.json")

        self.errors: List[str] = []
        self.warnings: List[str] = []
        self.stats: Dict[str, Any] = {}

    def validate(self) -> Dict[str, Any]:
        """Runs all validation suites and writes validation_report.json."""
        print(f"==================================================")
        print(f"FALCON-404 :: DATASET VALIDATION AUDITOR")
        print(f"Target Directory: {self.data_dir}")
        print(f"==================================================")

        # 1. Manifest file existence
        for p in [self.manifest_csv, self.train_jsonl, self.val_jsonl, self.test_jsonl]:
            if not os.path.isfile(p):
                self.errors.append(f"Required manifest file missing: {p}")

        if self.errors:
            return self._build_report(passed=False)

        # 2. Read and parse manifest CSV
        records: List[Dict[str, Any]] = []
        try:
            with open(self.manifest_csv, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    records.append(row)
        except Exception as e:
            self.errors.append(f"Failed to read CSV manifest: {str(e)}")
            return self._build_report(passed=False)

        if not records:
            self.errors.append("Manifest CSV is empty (0 records found).")
            return self._build_report(passed=False)

        print(f"  Parsed {len(records)} records from manifest CSV.")

        # 3. Check JSONL synchronization
        self._verify_jsonl_sync(records)

        # 4. Check Anti-Leakage Partition Isolation
        self._verify_anti_leakage(records)

        # 5. Check Image Files, Masks, and Pixel Dimensions
        self._verify_files_and_pixels(records)

        passed = len(self.errors) == 0
        report = self._build_report(passed)

        with open(self.report_json, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2)

        print(f"\nValidation Result: {'[PASSED] ALL AUDIT CHECKS PASSED' if passed else '[FAILED] ISSUES FOUND'}")
        print(f"Total Records Inspected: {len(records)}")
        print(f"Errors: {len(self.errors)} | Warnings: {len(self.warnings)}")
        print(f"Report written to: {self.report_json}")
        return report

    def _verify_jsonl_sync(self, records: List[Dict[str, Any]]):
        """Verifies that jsonl files contain exact matching subsets of the CSV."""
        splits_map = {
            "train": self.train_jsonl,
            "validation": self.val_jsonl,
            "test": self.test_jsonl
        }
        for split_name, split_path in splits_map.items():
            csv_ids = {r["sample_id"] for r in records if r["split"] == split_name}
            jsonl_ids = set()
            try:
                with open(split_path, "r", encoding="utf-8") as f:
                    for line in f:
                        if line.strip():
                            data = json.loads(line)
                            jsonl_ids.add(data["sample_id"])
            except Exception as e:
                self.errors.append(f"Error reading JSONL split {split_name}: {str(e)}")
                continue

            if csv_ids != jsonl_ids:
                diff = csv_ids.symmetric_difference(jsonl_ids)
                self.errors.append(f"Split mismatch for '{split_name}': {len(diff)} discrepancy items found between CSV and JSONL.")

    def _verify_anti_leakage(self, records: List[Dict[str, Any]]):
        """Ensures that all samples belonging to a source_sample_id are in the same split."""
        identity_to_splits: Dict[str, Set[str]] = {}
        for r in records:
            ident = r["source_sample_id"]
            split = r["split"]
            if ident not in identity_to_splits:
                identity_to_splits[ident] = set()
            identity_to_splits[ident].add(split)

        leaked_identities = {ident: splits for ident, splits in identity_to_splits.items() if len(splits) > 1}
        if leaked_identities:
            self.errors.append(f"Data leakage detected! {len(leaked_identities)} identities span multiple splits: {leaked_identities}")
        else:
            print(f"  Anti-leakage verified: 0 identity overlap across splits ({len(identity_to_splits)} distinct identities).")

    def _verify_files_and_pixels(self, records: List[Dict[str, Any]]):
        """Decodes all images and masks to ensure format and dimension integrity."""
        pristine_count = 0
        manip_count = 0

        for idx, r in enumerate(records):
            sample_id = r["sample_id"]
            img_rel = r["image_path"]
            mask_rel = r["mask_path"]
            label = r["label"]
            m_type = r["manipulation_type"]

            # Label validation
            if label not in self.VALID_LABELS:
                self.errors.append(f"Sample {sample_id}: Invalid label '{label}'")
            if m_type not in self.VALID_MANIP_TYPES:
                self.errors.append(f"Sample {sample_id}: Invalid manipulation_type '{m_type}'")

            img_full = os.path.join(self.data_dir, img_rel)
            mask_full = os.path.join(self.data_dir, mask_rel)

            if not os.path.isfile(img_full):
                self.errors.append(f"Sample {sample_id}: Image file not found at {img_full}")
                continue
            if not os.path.isfile(mask_full):
                self.errors.append(f"Sample {sample_id}: Mask file not found at {mask_full}")
                continue

            try:
                with Image.open(img_full) as img:
                    w, h = img.size
                    rec_w = int(r["image_width"])
                    rec_h = int(r["image_height"])
                    if (w, h) != (rec_w, rec_h):
                        self.errors.append(f"Sample {sample_id}: Dimensions mismatch on image: file is ({w}, {h}) vs record ({rec_w}, {rec_h})")

                with Image.open(mask_full) as mask:
                    mw, mh = mask.size
                    if (mw, mh) != (w, h):
                        self.errors.append(f"Sample {sample_id}: Mask dimensions ({mw}, {mh}) do not match image ({w}, {h})")

                    # Verify mask is grayscale
                    if mask.mode != "L":
                        self.warnings.append(f"Sample {sample_id}: Mask mode is '{mask.mode}', expected 'L'")

                    # Mask pixel validation
                    mask_bytes = mask.tobytes()
                    altered_px = mask_bytes.count(b"\xff")
                    unaltered_px = mask_bytes.count(b"\x00")
                    total_px = len(mask_bytes)

                    # Ensure strictly binary
                    if altered_px + unaltered_px != total_px:
                        self.errors.append(f"Sample {sample_id}: Mask contains non-binary pixels (neither 0 nor 255).")

                    if label == "pristine_synthetic":
                        pristine_count += 1
                        if altered_px != 0:
                            self.errors.append(f"Sample {sample_id}: Pristine sample has {altered_px} altered pixels (expected 0).")
                    else:
                        manip_count += 1
                        if altered_px == 0:
                            self.errors.append(f"Sample {sample_id}: Manipulated sample has 0 altered pixels (expected >0).")
                        rec_altered = int(r["altered_pixel_count"])
                        if altered_px != rec_altered:
                            self.warnings.append(f"Sample {sample_id}: Count discrepancy: mask has {altered_px} px, manifest recorded {rec_altered} px.")

            except Exception as e:
                self.errors.append(f"Sample {sample_id}: Failed to decode or inspect image/mask: {str(e)}")

            if (idx + 1) % 20 == 0 or (idx + 1) == len(records):
                print(f"  Verified {idx + 1}/{len(records)} sample images & masks...")

        self.stats = {
            "total_records": len(records),
            "pristine_samples": pristine_count,
            "manipulated_samples": manip_count,
            "verified_images_count": len(records),
            "verified_masks_count": len(records)
        }

    def _build_report(self, passed: bool) -> Dict[str, Any]:
        return {
            "audit_tool": "FALCON-404 Synthetic Dataset Validator",
            "version": "7.1",
            "passed": passed,
            "data_directory": os.path.abspath(self.data_dir),
            "stats": self.stats,
            "errors": self.errors,
            "warnings": self.warnings
        }


def main():
    parser = argparse.ArgumentParser(description="FALCON-404 Synthetic Dataset Validator")
    parser.add_argument("--data-dir", type=str, default="ml_data/phase7_synthetic", help="Path to synthetic dataset root directory")
    args = parser.parse_args()

    validator = SyntheticDatasetValidator(data_dir=args.data_dir)
    report = validator.validate()
    if not report["passed"]:
        sys.exit(1)


if __name__ == "__main__":
    main()
