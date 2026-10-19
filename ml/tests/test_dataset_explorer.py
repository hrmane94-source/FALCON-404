"""
FALCON-404: Dataset Explorer & Auditor Automated Unit Tests
Author: Harshad Mane (FALCON-404)
Description:
    Unit tests for Dataset Explorer engine, schema adapters, integrity auditors,
    path traversal guards, HTML escaping, and zero-fallback guarantees.
"""

import os
import sys
import unittest
import tempfile
import shutil
import csv
import json
from PIL import Image

# Ensure ml/scripts is in import path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "scripts")))

from build_dataset_explorer import (
    DatasetAdapter,
    DatasetExplorerEngine,
    UnifiedSampleRecord,
    is_path_safe
)


class TestDatasetExplorer(unittest.TestCase):
    """Test suite for Phase 7.1B Dataset Explorer."""

    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()

    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def _create_dummy_image(self, rel_path: str, size=(100, 100), mode="RGB", color=None):
        abs_path = os.path.join(self.temp_dir, rel_path)
        os.makedirs(os.path.dirname(abs_path), exist_ok=True)
        if color is None:
            color = 128 if mode == "L" else (200, 200, 200)
        img = Image.new(mode, size, color)
        img.save(abs_path, format="PNG" if mode == "L" else "JPEG")
        return abs_path

    def test_empty_dataset_handling_and_no_fallback(self):
        """Verifies that an empty dataset reports 0 records and never falls back to another dataset."""
        engine = DatasetExplorerEngine(dataset_dir=self.temp_dir)
        stats = engine.build()

        self.assertEqual(stats["total_records"], 0)
        self.assertEqual(stats["total_images_on_disk"], 0)
        self.assertEqual(stats["audit_status"], "EMPTY_OR_UNPREPARED")
        self.assertTrue(os.path.isfile(engine.html_file))
        self.assertTrue(os.path.isfile(engine.summary_json))

        with open(engine.html_file, "r", encoding="utf-8") as f:
            content = f.read()
            self.assertIn("AWAITING MANUAL COLLECTION", content)
            self.assertNotIn("SYNTHETIC TEST DATASET — STRICT ISOLATION NOTICE", content)

    def test_synthetic_manifest_adapter(self):
        """Verifies detection and parsing of synthetic test dataset manifest."""
        manifest_path = os.path.join(self.temp_dir, "dataset_manifest.csv")
        headers = [
            "sample_id", "source_sample_id", "template_type", "split", "label",
            "manipulation_type", "manipulation_bbox", "image_path", "mask_path",
            "image_width", "image_height", "altered_pixel_count", "altered_pixel_ratio", "created_at"
        ]
        rows = [
            ["ID_0001_PRISTINE", "ID_0001", "ALPHA_CARD", "train", "pristine_synthetic", "none", "[0,0,0,0]", "images/p.png", "masks/p.png", "960", "600", "0", "0.0", "2026-10-19"],
            ["ID_0001_MANIP", "ID_0001", "ALPHA_CARD", "train", "manipulated_synthetic", "text_replacement", "[10,10,20,20]", "images/m.png", "masks/m.png", "960", "600", "400", "0.01", "2026-10-19"]
        ]
        with open(manifest_path, "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(headers)
            w.writerows(rows)

        self._create_dummy_image("images/p.png", (960, 600))
        self._create_dummy_image("masks/p.png", (960, 600), mode="L", color=0)
        self._create_dummy_image("images/m.png", (960, 600))
        self._create_dummy_image("masks/m.png", (960, 600), mode="L", color=255)

        engine = DatasetExplorerEngine(dataset_dir=self.temp_dir)
        stats = engine.build()

        self.assertEqual(stats["total_records"], 2)
        self.assertEqual(stats["distinct_source_specimens"], 1)
        self.assertEqual(stats["unaltered_samples"], 1)
        self.assertEqual(stats["altered_samples"], 1)
        self.assertEqual(stats["audit_status"], "PASSED")

    def test_real_training_manifest_adapter(self):
        """Verifies detection and parsing of team research dataset manifest format."""
        manifest_dir = os.path.join(self.temp_dir, "manifests")
        os.makedirs(manifest_dir, exist_ok=True)
        manifest_path = os.path.join(manifest_dir, "dataset_manifest.csv")

        headers = [
            "sample_id", "source_doc_id", "member_id", "label", "manipulation_type",
            "image_path", "original_image_path", "mask_path", "template_family",
            "capture_device", "capture_condition", "provenance", "license_or_permission",
            "review_status", "image_width", "image_height", "notes"
        ]
        rows = [
            ["M1_DOC001_C01", "M1_DOC001", "M1", "unaltered_mock", "none", "images/unaltered/c01.jpg", "", "masks/c01_mask.png", "CARD_A", "PhoneX", "daylight", "team_capture", "cc0", "approved", "800", "600", "pristine capture"],
            ["M1_DOC001_C01_EDIT", "M1_DOC001", "M1", "altered_mock", "text_replacement", "images/altered/c01_edit.jpg", "images/unaltered/c01.jpg", "masks/c01_edit_mask.png", "CARD_A", "PhoneX", "daylight", "team_alteration", "cc0", "approved", "800", "600", "modified date"]
        ]
        with open(manifest_path, "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(headers)
            w.writerows(rows)

        self._create_dummy_image("images/unaltered/c01.jpg", (800, 600))
        self._create_dummy_image("masks/c01_mask.png", (800, 600), mode="L", color=0)
        self._create_dummy_image("images/altered/c01_edit.jpg", (800, 600))
        self._create_dummy_image("masks/c01_edit_mask.png", (800, 600), mode="L", color=255)

        engine = DatasetExplorerEngine(dataset_dir=self.temp_dir)
        stats = engine.build()

        self.assertEqual(stats["schema_type"], "team_research_dataset")
        self.assertEqual(stats["total_records"], 2)
        self.assertEqual(stats["distinct_source_specimens"], 1)
        self.assertEqual(stats["unaltered_samples"], 1)
        self.assertEqual(stats["altered_samples"], 1)
        self.assertEqual(stats["audit_status"], "PASSED")

    def test_path_traversal_rejection(self):
        """Verifies that manifests attempting to access outside directory are blocked."""
        manifest_path = os.path.join(self.temp_dir, "dataset_manifest.csv")
        headers = ["sample_id", "source_sample_id", "label", "image_path"]
        rows = [
            ["BAD_SAMPLE_1", "SRC_1", "pristine_synthetic", "../../secret_file.jpg"],
            ["BAD_SAMPLE_2", "SRC_2", "pristine_synthetic", "C:\\Windows\\system32\\calc.exe"]
        ]
        with open(manifest_path, "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(headers)
            w.writerows(rows)

        engine = DatasetExplorerEngine(dataset_dir=self.temp_dir)
        stats = engine.build()

        self.assertGreater(stats["path_traversal_errors"], 0)
        self.assertEqual(stats["audit_status"], "FAILED_ISSUES_FOUND")

    def test_html_escaping_security(self):
        """Verifies that malicious HTML/XSS strings in manifest are properly escaped."""
        manifest_path = os.path.join(self.temp_dir, "dataset_manifest.csv")
        headers = ["sample_id", "source_sample_id", "label", "image_path", "template_type"]
        xss_string = "<script>alert('XSS')</script>"
        rows = [
            [xss_string, "SRC_XSS", "pristine_synthetic", "images/safe.jpg", xss_string]
        ]
        with open(manifest_path, "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(headers)
            w.writerows(rows)

        self._create_dummy_image("images/safe.jpg")
        engine = DatasetExplorerEngine(dataset_dir=self.temp_dir)
        engine.build()

        with open(engine.html_file, "r", encoding="utf-8") as f:
            html_content = f.read()
            self.assertNotIn("<script>alert('XSS')</script>", html_content)
            self.assertIn("&lt;script&gt;alert(&#x27;XSS&#x27;)&lt;/script&gt;", html_content)

    def test_dimension_mismatch_detection(self):
        """Verifies that mismatch between image size and mask size is flagged as an error."""
        manifest_path = os.path.join(self.temp_dir, "dataset_manifest.csv")
        headers = ["sample_id", "source_sample_id", "label", "image_path", "mask_path"]
        rows = [
            ["MISMATCH_01", "SRC_1", "manipulated_synthetic", "images/im.png", "masks/im_mask.png"]
        ]
        with open(manifest_path, "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(headers)
            w.writerows(rows)

        # Image is 500x400, mask is 300x200
        self._create_dummy_image("images/im.png", (500, 400))
        self._create_dummy_image("masks/im_mask.png", (300, 200), mode="L")

        engine = DatasetExplorerEngine(dataset_dir=self.temp_dir)
        stats = engine.build()

        self.assertEqual(stats["dimension_mismatches"], 1)
        self.assertEqual(stats["audit_status"], "FAILED_ISSUES_FOUND")

    def test_duplicate_sample_id_detection(self):
        """Verifies that duplicate sample IDs in manifest are detected."""
        manifest_path = os.path.join(self.temp_dir, "dataset_manifest.csv")
        headers = ["sample_id", "source_sample_id", "label", "image_path"]
        rows = [
            ["DUP_ID", "SRC_1", "pristine_synthetic", "images/im1.png"],
            ["DUP_ID", "SRC_2", "pristine_synthetic", "images/im2.png"]
        ]
        with open(manifest_path, "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(headers)
            w.writerows(rows)

        self._create_dummy_image("images/im1.png")
        self._create_dummy_image("images/im2.png")

        engine = DatasetExplorerEngine(dataset_dir=self.temp_dir)
        stats = engine.build()

        self.assertEqual(stats["duplicate_sample_ids"], 1)


if __name__ == "__main__":
    unittest.main()
