"""
FALCON-404: Unit Tests for OCR Bounding Box Coordinate Migration
Phase: Dataset v1.0 Safety & Idempotency Testing
Author: Lead Developer & System Architect: Harshad Mane
"""

import os
import sys
import json
import csv
import shutil
import tempfile
import unittest
from PIL import Image

# Ensure ml/scripts is in import path
SCRIPTS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "scripts"))
if SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, SCRIPTS_DIR)

from migrate_ocr_coordinates import (
    run_migration,
    classify_sample_state,
    validate_box,
    transform_box,
    inspect_dataset_state,
    ensure_backup,
    MigrationAbortedError,
    MigrationError,
    BASE_CANVAS_WIDTH,
    BASE_CANVAS_HEIGHT
)


class TestMigrateOCRCoordinates(unittest.TestCase):

    def setUp(self):
        self.temp_dir = tempfile.mkdtemp(prefix="falcon_test_ocr_migration_")

    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def _create_synthetic_fixture(self, samples_spec):
        """
        Creates a miniature synthetic dataset in self.temp_dir.
        samples_spec: List of dicts:
          {
            "sample_id": "TEST_001",
            "img_size": (640, 403),
            "boxes": {"name": [100, 190, 660, 246]},
            "fields": {"name": "Aarav Sharma"},
            "text": "Aarav Sharma"
          }
        """
        img_dir = os.path.join(self.temp_dir, "images")
        ocr_dir = os.path.join(self.temp_dir, "annotations", "ocr")
        os.makedirs(img_dir, exist_ok=True)
        os.makedirs(ocr_dir, exist_ok=True)

        manifest_rows = []
        for s in samples_spec:
            sid = s["sample_id"]
            w, h = s.get("img_size", (640, 403))

            # 1. Image
            img_rel = f"images/{sid}.png"
            img_path = os.path.join(self.temp_dir, img_rel)
            im = Image.new("RGB", (w, h), (240, 240, 240))
            im.save(img_path)

            # 2. OCR JSON
            ocr_rel = f"annotations/ocr/{sid}.json"
            ocr_path = os.path.join(self.temp_dir, ocr_rel)
            ocr_content = {
                "sample_id": sid,
                "source": "synthetic_ground_truth",
                "language": "en",
                "text": s.get("text", "Test Text"),
                "fields": s.get("fields", {"name": "Test Text"}),
                "field_bounding_boxes_xyxy": s["boxes"]
            }
            with open(ocr_path, "w", encoding="utf-8") as f:
                json.dump(ocr_content, f, indent=2)

            manifest_rows.append({
                "sample_id": sid,
                "document_category": "identity_documents",
                "image_path": img_rel,
                "mask_path": "",
                "ocr_annotation": ocr_rel,
                "tampering_type": "none"
            })

        # Manifest CSV
        manifest_path = os.path.join(self.temp_dir, "dataset_manifest.csv")
        with open(manifest_path, "w", newline="", encoding="utf-8") as f:
            fieldnames = ["sample_id", "document_category", "image_path", "mask_path", "ocr_annotation", "tampering_type"]
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(manifest_rows)

        return manifest_path

    def test_original_unscaled_coordinates_can_be_transformed(self):
        """1. Original unscaled coordinates (1000x625 space) are successfully transformed."""
        spec = [{
            "sample_id": "TEST_001",
            "img_size": (640, 403),
            "boxes": {
                "name": [100, 190, 660, 246],
                "document_id": [100, 350, 660, 406]
            }
        }]
        self._create_synthetic_fixture(spec)

        res = run_migration(self.temp_dir, dry_run=False, rounding_mode="coverage")
        self.assertEqual(res["status"], "SUCCESS")
        self.assertEqual(res["transformed_valid_boxes"], 2)

        # Verify on-disk file
        migrated_path = os.path.join(self.temp_dir, "annotations", "ocr", "TEST_001.json")
        with open(migrated_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        boxes = data["field_bounding_boxes_xyxy"]
        self.assertEqual(boxes["name"], [64, 122, 423, 159])
        self.assertEqual(boxes["document_id"], [64, 225, 423, 262])
        # Invariants
        self.assertTrue(0 <= boxes["name"][0] < boxes["name"][2] <= 640)
        self.assertTrue(0 <= boxes["name"][1] < boxes["name"][3] <= 403)

    def test_already_migrated_coordinates_cannot_be_transformed_again(self):
        """2. Already-migrated coordinates trigger safe abort in apply mode, preventing double-scaling."""
        spec = [{
            "sample_id": "TEST_002",
            "img_size": (640, 403),
            "boxes": {
                "name": [64, 122, 423, 159],
                "document_id": [64, 225, 423, 262]
            }
        }]
        self._create_synthetic_fixture(spec)

        # Attempt to re-apply migration
        with self.assertRaises(MigrationAbortedError) as ctx:
            run_migration(self.temp_dir, dry_run=False, rounding_mode="coverage")

        self.assertIn("already-migrated dataset", str(ctx.exception).lower())

        # Verify coordinates on disk are completely untouched
        migrated_path = os.path.join(self.temp_dir, "annotations", "ocr", "TEST_002.json")
        with open(migrated_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        self.assertEqual(data["field_bounding_boxes_xyxy"]["name"], [64, 122, 423, 159])

    def test_mixed_migration_states_cause_safe_abort(self):
        """3. Mixed migration states (some unscaled, some migrated) abort without partial transformation."""
        spec = [
            {
                "sample_id": "TEST_UNSCALED",
                "img_size": (640, 403),
                "boxes": {"name": [100, 190, 660, 246]}
            },
            {
                "sample_id": "TEST_MIGRATED",
                "img_size": (640, 403),
                "boxes": {"name": [64, 122, 423, 159]}
            }
        ]
        self._create_synthetic_fixture(spec)

        with self.assertRaises(MigrationAbortedError) as ctx:
            run_migration(self.temp_dir, dry_run=False)

        self.assertIn("inconsistent dataset state", str(ctx.exception).lower())

        # Verify TEST_UNSCALED was NOT partially transformed
        unscaled_path = os.path.join(self.temp_dir, "annotations", "ocr", "TEST_UNSCALED.json")
        with open(unscaled_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        self.assertEqual(data["field_bounding_boxes_xyxy"]["name"], [100, 190, 660, 246])

    def test_dry_run_never_modifies_files(self):
        """4. Dry run calculates metrics and transformations without modifying any dataset files."""
        spec = [{
            "sample_id": "TEST_004",
            "img_size": (640, 403),
            "boxes": {"name": [100, 190, 660, 246]}
        }]
        self._create_synthetic_fixture(spec)
        ocr_path = os.path.join(self.temp_dir, "annotations", "ocr", "TEST_004.json")
        with open(ocr_path, "r", encoding="utf-8") as f:
            before_content = f.read()

        res = run_migration(self.temp_dir, dry_run=True, rounding_mode="coverage")
        self.assertEqual(res["status"], "SUCCESS")
        self.assertEqual(res["transformed_valid_boxes"], 1)

        with open(ocr_path, "r", encoding="utf-8") as f:
            after_content = f.read()
        self.assertEqual(before_content, after_content)

    def test_dry_run_precedence_over_apply_flag(self):
        """5. When both dry_run and apply conditions conflict, dry_run takes precedence."""
        # Test CLI argument parsing behavior
        import subprocess
        spec = [{
            "sample_id": "TEST_005",
            "img_size": (640, 403),
            "boxes": {"name": [100, 190, 660, 246]}
        }]
        self._create_synthetic_fixture(spec)
        ocr_path = os.path.join(self.temp_dir, "annotations", "ocr", "TEST_005.json")
        with open(ocr_path, "r", encoding="utf-8") as f:
            before_content = f.read()

        script_path = os.path.join(SCRIPTS_DIR, "migrate_ocr_coordinates.py")
        cmd = [sys.executable, script_path, "--dataset-dir", self.temp_dir, "--apply", "--dry-run"]
        res = subprocess.run(cmd, capture_output=True, text=True)

        self.assertEqual(res.returncode, 0)
        self.assertIn("DRY RUN (NO FILES MODIFIED)", res.stdout)
        with open(ocr_path, "r", encoding="utf-8") as f:
            after_content = f.read()
        self.assertEqual(before_content, after_content)

    def test_existing_backup_files_remain_unchanged(self):
        """6. Existing pre-migration backup files and SHA-256 records are never overwritten."""
        spec = [{
            "sample_id": "TEST_006",
            "img_size": (640, 403),
            "boxes": {"name": [100, 190, 660, 246]}
        }]
        self._create_synthetic_fixture(spec)

        # Pre-seed a sentinel backup
        backup_dir = os.path.join(self.temp_dir, "backups", "annotations_ocr_pre_migration")
        os.makedirs(backup_dir, exist_ok=True)
        sentinel_path = os.path.join(backup_dir, "TEST_006.json")
        sentinel_content = json.dumps({"sentinel": "DO_NOT_OVERWRITE"})
        with open(sentinel_path, "w", encoding="utf-8") as f:
            f.write(sentinel_content)

        hash_file = os.path.join(self.temp_dir, "backups", "original_ocr_sha256.json")
        with open(hash_file, "w", encoding="utf-8") as f:
            json.dump({"TEST_006.json": "SENTINEL_HASH"}, f)

        # Run migration with write mode
        run_migration(self.temp_dir, dry_run=False, rounding_mode="coverage")

        # Sentinel backup must be strictly intact
        with open(sentinel_path, "r", encoding="utf-8") as f:
            self.assertEqual(f.read(), sentinel_content)
        with open(hash_file, "r", encoding="utf-8") as f:
            hashes = json.load(f)
            self.assertEqual(hashes["TEST_006.json"], "SENTINEL_HASH")

    def test_invalid_or_malformed_bounding_boxes_handled_safely(self):
        """7. Malformed bounding boxes (negative, inverted, out-of-canvas) safely abort."""
        spec = [{
            "sample_id": "TEST_MALFORMED",
            "img_size": (640, 403),
            "boxes": {"bad_box": [-50, 100, 200, 300]}
        }]
        self._create_synthetic_fixture(spec)

        with self.assertRaises(MigrationError) as ctx:
            run_migration(self.temp_dir, dry_run=False)

        self.assertIn("malformed or missing", str(ctx.exception).lower())

    def test_migration_does_not_partially_modify_dataset_after_error(self):
        """8. If any validation fails during migration, zero files are updated on disk."""
        spec = [
            {
                "sample_id": "TEST_VALID_1",
                "img_size": (640, 403),
                "boxes": {"name": [100, 190, 660, 246]}
            },
            {
                "sample_id": "TEST_INVALID_2",
                "img_size": (640, 403),
                "boxes": {"inverted": [500, 300, 400, 600]}  # x1 > x2
            }
        ]
        self._create_synthetic_fixture(spec)
        valid_path = os.path.join(self.temp_dir, "annotations", "ocr", "TEST_VALID_1.json")
        with open(valid_path, "r", encoding="utf-8") as f:
            before_valid_content = f.read()

        with self.assertRaises(MigrationError):
            run_migration(self.temp_dir, dry_run=False)

        # TEST_VALID_1 must NOT have been modified
        with open(valid_path, "r", encoding="utf-8") as f:
            after_valid_content = f.read()
        self.assertEqual(before_valid_content, after_valid_content)


if __name__ == "__main__":
    unittest.main()
