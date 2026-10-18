"""
FALCON-404: Synthetic Dataset Unit Tests
Author: Harshad Mane (FALCON-404)
Description:
    Unit tests for synthetic dataset generator, manipulation engine, and validator.
"""

import os
import sys
import unittest
import tempfile
import shutil
import random
from PIL import Image

# Ensure ml/scripts is in import path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "scripts")))

from generate_synthetic_dataset import (
    SyntheticCredentialGenerator,
    ManipulationEngine,
    SyntheticDatasetPipeline,
    TEMPLATE_TYPES
)
from validate_synthetic_dataset import SyntheticDatasetValidator


class TestSyntheticDatasetPipeline(unittest.TestCase):
    """Test suite for Phase 7.1 synthetic generation and validation."""

    def setUp(self):
        self.rng = random.Random(404)
        self.temp_dir = tempfile.mkdtemp()

    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_generator_templates(self):
        """Verifies that all credential templates generate valid PIL images and metadata."""
        gen = SyntheticCredentialGenerator(self.rng)
        for t_type in TEMPLATE_TYPES:
            img, meta = gen.generate_pristine(1, t_type)
            self.assertIsInstance(img, Image.Image)
            self.assertEqual(meta["template_type"], t_type)
            self.assertIn("fields", meta)
            self.assertIn("photo", meta["fields"])
            self.assertEqual(len(meta["fields"]["photo"]["bbox"]), 4)
            self.assertGreater(img.width, 0)
            self.assertGreater(img.height, 0)

    def test_manipulation_engine_binary_masks(self):
        """Verifies that all manipulation types produce matching dimensions and binary masks (0 and 255 only)."""
        gen = SyntheticCredentialGenerator(self.rng)
        manipulator = ManipulationEngine(self.rng)
        img, meta = gen.generate_pristine(1, "ALPHA_CARD")

        for m_type in ManipulationEngine.MANIPULATION_TYPES:
            manip_img, mask, applied, bbox, altered_px, ratio = manipulator.apply_manipulation(
                img, meta, manip_type=m_type
            )
            self.assertEqual(applied, m_type)
            self.assertEqual(manip_img.size, img.size)
            self.assertEqual(mask.size, img.size)
            self.assertEqual(mask.mode, "L")
            self.assertGreater(altered_px, 0)
            self.assertGreater(ratio, 0.0)

            # Assert strict binary pixel values
            mask_bytes = mask.tobytes()
            non_binary = set(mask_bytes) - {0, 255}
            self.assertEqual(len(non_binary), 0, f"Mask for {m_type} contains non-binary values: {non_binary}")

    def test_end_to_end_pipeline_and_validation(self):
        """Runs a mini pipeline and verifies that validator passes with zero errors."""
        pipeline = SyntheticDatasetPipeline(
            output_dir=self.temp_dir,
            num_identities=6,
            seed=404,
            train_ratio=0.70,
            val_ratio=0.15,
            test_ratio=0.15
        )
        summary = pipeline.run()
        self.assertEqual(summary["total_samples"], 12)
        self.assertEqual(summary["class_distribution"]["pristine_synthetic"], 6)
        self.assertEqual(summary["class_distribution"]["manipulated_synthetic"], 6)

        validator = SyntheticDatasetValidator(data_dir=self.temp_dir)
        report = validator.validate()
        self.assertTrue(report["passed"])
        self.assertEqual(len(report["errors"]), 0)
        self.assertEqual(len(report["warnings"]), 0)


if __name__ == "__main__":
    unittest.main()
