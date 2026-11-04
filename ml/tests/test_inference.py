"""
FALCON-404: Inference Module Unit Tests
Milestone: Phase 7.2A.6 / Final Model Preparation
Author: Lead Developer & System Architect: Harshad Mane
"""

import os
import sys
import unittest
from PIL import Image

import torch

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from ml.src.inference import FalconDocumentClassifier, get_classifier
from ml.src.model import create_mobilenet_v3_small


class TestFalconDocumentClassifier(unittest.TestCase):
    """Tests for FalconDocumentClassifier inference engine."""

    @classmethod
    def setUpClass(cls):
        cls.temp_dir = os.path.join(PROJECT_ROOT, "ml", "tests", "_temp_infer_test")
        os.makedirs(cls.temp_dir, exist_ok=True)

        # Create dummy checkpoint
        cls.dummy_ckpt_path = os.path.join(cls.temp_dir, "dummy_model.pt")
        model = create_mobilenet_v3_small(num_classes=2, pretrained=False)
        torch.save({
            "epoch": 1,
            "model_state_dict": model.state_dict(),
            "config": {"image_size": [224, 224], "unfreeze_upper_layers": 3}
        }, cls.dummy_ckpt_path)

        # Create dummy test image
        cls.dummy_img_path = os.path.join(cls.temp_dir, "dummy_doc.jpg")
        img = Image.new("RGB", (640, 403), color=(240, 240, 240))
        img.save(cls.dummy_img_path)

    @classmethod
    def tearDownClass(cls):
        if os.path.isfile(cls.dummy_ckpt_path):
            os.remove(cls.dummy_ckpt_path)
        if os.path.isfile(cls.dummy_img_path):
            os.remove(cls.dummy_img_path)
        if os.path.isdir(cls.temp_dir):
            os.rmdir(cls.temp_dir)

    def test_uninitialized_classifier_returns_error(self):
        classifier = FalconDocumentClassifier()
        res = classifier.predict_image(self.dummy_img_path)
        self.assertEqual(res["status"], "ERROR")
        self.assertEqual(res["predicted_label"], -1)
        self.assertIn("not been loaded", res["error"])

    def test_missing_checkpoint_raises_filenotfound(self):
        classifier = FalconDocumentClassifier()
        with self.assertRaises(FileNotFoundError):
            classifier.load_checkpoint("non_existent_model.pt")

    def test_load_valid_checkpoint(self):
        classifier = FalconDocumentClassifier(checkpoint_path=self.dummy_ckpt_path)
        self.assertIsNotNone(classifier.model)
        self.assertEqual(classifier.checkpoint_epoch, 1)

    def test_predict_image_path(self):
        classifier = FalconDocumentClassifier(checkpoint_path=self.dummy_ckpt_path)
        res = classifier.predict_image(self.dummy_img_path)

        self.assertIn(res["status"], {"GENUINE", "MANIPULATED", "NEEDS_REVIEW"})
        self.assertIn(res["predicted_class"], {"genuine", "manipulated"})
        self.assertIn(res["predicted_label"], {0, 1})
        self.assertIn("genuine", res["probabilities"])
        self.assertIn("manipulated", res["probabilities"])
        self.assertAlmostEqual(res["probabilities"]["genuine"] + res["probabilities"]["manipulated"], 1.0, places=2)
        self.assertGreaterEqual(res["confidence"], 0.0)
        self.assertLessEqual(res["confidence"], 1.0)
        self.assertGreaterEqual(res["tampering_score"], 0.0)
        self.assertLessEqual(res["tampering_score"], 1.0)
        self.assertGreater(res["inference_time_ms"], 0.0)
        self.assertIsNone(res["error"])

    def test_predict_pil_image(self):
        classifier = FalconDocumentClassifier(checkpoint_path=self.dummy_ckpt_path)
        pil_im = Image.new("RGB", (300, 200), color=(100, 150, 200))
        res = classifier.predict_image(pil_im)
        self.assertIn(res["status"], {"GENUINE", "MANIPULATED", "NEEDS_REVIEW"})
        self.assertIsNone(res["error"])

    def test_predict_missing_image_returns_error(self):
        classifier = FalconDocumentClassifier(checkpoint_path=self.dummy_ckpt_path)
        res = classifier.predict_image("path_does_not_exist.jpg")
        self.assertEqual(res["status"], "ERROR")
        self.assertIsNotNone(res["error"])

    def test_predict_batch(self):
        classifier = FalconDocumentClassifier(checkpoint_path=self.dummy_ckpt_path)
        imgs = [self.dummy_img_path, Image.new("RGB", (100, 100))]
        results = classifier.predict_batch(imgs)
        self.assertEqual(len(results), 2)
        self.assertIn(results[0]["status"], {"GENUINE", "MANIPULATED", "NEEDS_REVIEW"})
        self.assertIn(results[1]["status"], {"GENUINE", "MANIPULATED", "NEEDS_REVIEW"})

    def test_factory_function(self):
        classifier = get_classifier(self.dummy_ckpt_path)
        self.assertIsInstance(classifier, FalconDocumentClassifier)
        self.assertIsNotNone(classifier.model)

    def test_status_bands(self):
        classifier = FalconDocumentClassifier(
            checkpoint_path=self.dummy_ckpt_path,
            decision_threshold=0.50,
            review_margin=0.10
        )
        self.assertEqual(classifier.review_lower, 0.40)
        self.assertEqual(classifier.review_upper, 0.60)


if __name__ == "__main__":
    unittest.main()
