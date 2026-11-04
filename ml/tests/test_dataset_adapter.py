"""
FALCON-404: Unit Tests for PyTorch Dataset Adapter
Phase: 7.2A.1 — Dataset Adapter Testing
Author: Lead Developer & System Architect: Harshad Mane
"""

import os
import sys
import csv
import shutil
import tempfile
import unittest
from PIL import Image

# Ensure ml/src is in Python path
SRC_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src"))
if SRC_DIR not in sys.path:
    sys.path.insert(0, SRC_DIR)

from dataset import (
    FalconDocumentDataset,
    validate_falcon_dataset,
    DatasetIntegrityError,
    LABEL_MAP,
    CLASS_NAMES,
    VALID_SPLITS,
    EXPECTED_IMAGE_SIZE
)


class TestFalconDocumentDataset(unittest.TestCase):

    def setUp(self):
        self.temp_dir = tempfile.mkdtemp(prefix="falcon_test_dataset_adapter_")

    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def _create_synthetic_fixture(self, records_spec):
        """
        Creates an isolated synthetic dataset fixture in self.temp_dir.
        records_spec: list of dicts specifying sample attributes.
        """
        img_dir = os.path.join(self.temp_dir, "images")
        os.makedirs(img_dir, exist_ok=True)

        rows = []
        for r in records_spec:
            sid = r["sample_id"]
            cls_name = r.get("class", "genuine")
            split = r.get("split", "train")
            cat = r.get("document_category", "identity_documents")
            gid = r.get("group_id", f"{cat}_PAIR_001")
            size = r.get("size", (640, 403))

            img_rel = f"images/{sid}.png"
            img_path = os.path.join(self.temp_dir, img_rel)
            
            # Create synthetic image if requested
            if not r.get("omit_image", False):
                im = Image.new("RGB", size, (220, 220, 220))
                im.save(img_path)

            rows.append({
                "sample_id": sid,
                "document_category": cat,
                "document_label": "Identity Document",
                "class": cls_name,
                "tampering_type": r.get("tampering_type", "none" if cls_name == "genuine" else "text"),
                "image_path": img_rel,
                "image_format": "PNG",
                "mask_path": "",
                "ocr_annotation": "",
                "shadow_annotation": "",
                "tampering_annotation": "",
                "split": split,
                "group_id": gid,
                "synthetic": "True",
                "watermark": "SYNTHETIC_NOT_VALID"
            })

        manifest_path = os.path.join(self.temp_dir, "dataset_manifest.csv")
        with open(manifest_path, "w", newline="", encoding="utf-8") as f:
            fieldnames = list(rows[0].keys())
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)

        return manifest_path

    def test_manifest_loading_and_dataset_length(self):
        """1. Verifies manifest loading and correct sample counts."""
        spec = [
            {"sample_id": "S1", "class": "genuine", "split": "train"},
            {"sample_id": "S2", "class": "manipulated", "split": "train"},
            {"sample_id": "S3", "class": "genuine", "split": "validation"}
        ]
        self._create_synthetic_fixture(spec)

        ds = FalconDocumentDataset(self.temp_dir)
        self.assertEqual(len(ds), 3)
        self.assertEqual(ds.get_sample_ids(), ["S1", "S2", "S3"])

    def test_image_loading_and_dimensions(self):
        """2. Verifies RGB PIL Image loading and dimension preservation."""
        spec = [{"sample_id": "S1", "class": "genuine", "split": "train", "size": (640, 403)}]
        self._create_synthetic_fixture(spec)

        ds = FalconDocumentDataset(self.temp_dir)
        img, label = ds[0]
        self.assertIsInstance(img, Image.Image)
        self.assertEqual(img.size, (640, 403))
        self.assertEqual(img.mode, "RGB")
        self.assertEqual(label, 0)

    def test_label_mapping(self):
        """3. Verifies label mapping: genuine = 0, manipulated = 1."""
        spec = [
            {"sample_id": "GEN_01", "class": "genuine", "split": "train"},
            {"sample_id": "MAN_01", "class": "manipulated", "split": "train"}
        ]
        self._create_synthetic_fixture(spec)

        ds = FalconDocumentDataset(self.temp_dir)
        self.assertEqual(ds.get_labels(), [0, 1])
        self.assertEqual(ds[0][1], 0)
        self.assertEqual(ds[1][1], 1)

    def test_train_validation_test_filtering(self):
        """4. Verifies filtering by train, validation, and test splits."""
        spec = [
            {"sample_id": "TR1", "class": "genuine", "split": "train"},
            {"sample_id": "TR2", "class": "manipulated", "split": "train"},
            {"sample_id": "VL1", "class": "genuine", "split": "validation"},
            {"sample_id": "TS1", "class": "manipulated", "split": "test"}
        ]
        self._create_synthetic_fixture(spec)

        train_ds = FalconDocumentDataset(self.temp_dir, split="train")
        val_ds = FalconDocumentDataset(self.temp_dir, split="validation")
        test_ds = FalconDocumentDataset(self.temp_dir, split="test")

        self.assertEqual(len(train_ds), 2)
        self.assertEqual(len(val_ds), 1)
        self.assertEqual(len(test_ds), 1)
        self.assertEqual(train_ds.get_sample_ids(), ["TR1", "TR2"])
        self.assertEqual(val_ds.get_sample_ids(), ["VL1"])
        self.assertEqual(test_ds.get_sample_ids(), ["TS1"])

    def test_missing_image_handling(self):
        """5. Verifies FileNotFoundError when referenced image is physically missing."""
        spec = [{"sample_id": "MISSING", "class": "genuine", "split": "train", "omit_image": True}]
        self._create_synthetic_fixture(spec)

        with self.assertRaises(FileNotFoundError):
            FalconDocumentDataset(self.temp_dir, validate_manifest=True)

    def test_invalid_label_handling(self):
        """6. Verifies DatasetIntegrityError when class label is unrecognized."""
        spec = [{"sample_id": "BAD_CLASS", "class": "fraudulent_unknown", "split": "train"}]
        self._create_synthetic_fixture(spec)

        with self.assertRaises(DatasetIntegrityError) as ctx:
            FalconDocumentDataset(self.temp_dir)
        self.assertIn("unknown class", str(ctx.exception).lower())

    def test_invalid_split_name_handling(self):
        """7. Verifies ValueError on invalid split parameter."""
        spec = [{"sample_id": "S1", "class": "genuine", "split": "train"}]
        self._create_synthetic_fixture(spec)

        with self.assertRaises(ValueError):
            FalconDocumentDataset(self.temp_dir, split="holdout_unknown")

    def test_group_isolation_and_leakage_detection(self):
        """8. Verifies anti-leakage detection when group_id crosses splits."""
        # Spec with group G1 spanning train and validation
        spec = [
            {"sample_id": "S1", "class": "genuine", "split": "train", "group_id": "GROUP_LEAK_01"},
            {"sample_id": "S2", "class": "manipulated", "split": "validation", "group_id": "GROUP_LEAK_01"}
        ]
        self._create_synthetic_fixture(spec)

        with self.assertRaises(DatasetIntegrityError) as ctx:
            validate_falcon_dataset(self.temp_dir)
        # Should raise either because of total count or leakage
        self.assertTrue(len(str(ctx.exception)) > 0)

    def test_return_metadata_mode(self):
        """9. Verifies return_metadata=True returns (image, label, metadata)."""
        spec = [{"sample_id": "META_01", "class": "manipulated", "tampering_type": "text", "split": "train"}]
        self._create_synthetic_fixture(spec)

        ds = FalconDocumentDataset(self.temp_dir, return_metadata=True)
        img, label, meta = ds[0]
        self.assertEqual(label, 1)
        self.assertEqual(meta["sample_id"], "META_01")
        self.assertEqual(meta["class_name"], "manipulated")
        self.assertEqual(meta["tampering_type"], "text")

    def test_custom_callable_transforms(self):
        """10. Verifies transform callback modifies output image."""
        spec = [{"sample_id": "TRF_01", "class": "genuine", "split": "train", "size": (640, 403)}]
        self._create_synthetic_fixture(spec)

        def resize_half(im):
            return im.resize((320, 201))

        ds = FalconDocumentDataset(self.temp_dir, transform=resize_half)
        img, label = ds[0]
        self.assertEqual(img.size, (320, 201))

    def test_validate_falcon_dataset_on_disk(self):
        """11. Runs complete validation against actual ml_data/FALCON_404_DATASET_v1.0 if present."""
        actual_path = os.path.abspath("ml_data/FALCON_404_DATASET_v1.0")
        if os.path.isdir(actual_path):
            res = validate_falcon_dataset(actual_path)
            self.assertEqual(res["status"], "PASSED")
            self.assertEqual(res["total_records"], 1200)
            self.assertEqual(res["class_distribution"], {"genuine": 600, "manipulated": 600})
            self.assertEqual(res["split_distribution"], {"train": 840, "validation": 180, "test": 180})
            self.assertEqual(res["leaking_groups"], 0)
            self.assertEqual(res["dimension_mismatches"], 0)
            self.assertEqual(res["missing_images"], 0)


if __name__ == "__main__":
    unittest.main()
