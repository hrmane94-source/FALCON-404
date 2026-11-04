"""
FALCON-404: FastAPI Inference Service Integration Tests
Milestone: Phase 7.3 — ML Model Integration
Author: Lead Developer & System Architect: Harshad Mane

Tests:
    - GET  /health (Service & Model status, Architecture, Device)
    - POST /predict (Genuine specimen, Manipulated specimen)
    - Error handling (Invalid mime type, Corrupt payload, Empty payload, Oversized payload)
    - CPU fallback verification
    - Schema conformity
"""

import os
import sys
import io
import unittest
from PIL import Image

from fastapi.testclient import TestClient

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from ml.api.main import app
from ml.api.config import settings
from ml.src.inference import FalconDocumentClassifier


class TestFastApiInferenceService(unittest.TestCase):
    """Test suite for the FastAPI MobileNetV3 document screening service."""

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.client.__enter__()

        # Find a genuine training specimen for smoke testing
        cls.genuine_img_path = os.path.join(
            PROJECT_ROOT, "ml_data", "FALCON_404_DATASET_v1.1",
            "images", "identity_documents", "train", "genuine", "F404_00003.jpg"
        )
        # Find a manipulated training specimen for smoke testing
        cls.manip_img_path = os.path.join(
            PROJECT_ROOT, "ml_data", "FALCON_404_DATASET_v1.1",
            "images", "identity_documents", "train", "manipulated", "F404_00004.jpg"
        )

    @classmethod
    def tearDownClass(cls):
        cls.client.__exit__(None, None, None)

    def test_health_endpoint(self):
        """Tests that GET /health returns 200 with complete model metadata."""
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertEqual(data["status"], "HEALTHY")
        self.assertTrue(data["model_loaded"])
        self.assertEqual(data["model_architecture"], "MobileNetV3-Small")
        self.assertIn("FALCON-404 MobileNetV3-Small", data["model_identifier"])
        self.assertEqual(data["checkpoint_identifier"], "best_model.pt")
        self.assertIsNotNone(data["device"])
        self.assertIsNotNone(data["timestamp"])

    def test_predict_genuine_image(self):
        """Tests POST /predict with a genuine document specimen."""
        if not os.path.isfile(self.genuine_img_path):
            self.skipTest(f"Sample image not found: {self.genuine_img_path}")

        with open(self.genuine_img_path, "rb") as f:
            response = self.client.post(
                "/predict",
                files={"file": ("sample_gen.jpg", f, "image/jpeg")}
            )

        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertIn(data["predicted_class"], {"GENUINE", "MANIPULATED", "NEEDS_REVIEW"})
        self.assertEqual(data["predicted_class"], "GENUINE")
        self.assertGreaterEqual(data["genuine_probability"], 0.0)
        self.assertLessEqual(data["genuine_probability"], 1.0)
        self.assertGreaterEqual(data["manipulated_probability"], 0.0)
        self.assertLessEqual(data["manipulated_probability"], 1.0)
        self.assertAlmostEqual(
            data["genuine_probability"] + data["manipulated_probability"], 1.0, places=2
        )
        self.assertGreaterEqual(data["confidence"], 0.5)
        self.assertGreaterEqual(data["processing_time_ms"], 0.0)
        self.assertIn("AI screening is an experimental assessment", data["screening_disclaimer"])
        self.assertEqual(data["decision_threshold"], 0.5)
        self.assertEqual(data["review_band"], [0.4, 0.6])

    def test_predict_manipulated_image(self):
        """Tests POST /predict with a manipulated document specimen."""
        if not os.path.isfile(self.manip_img_path):
            self.skipTest(f"Sample image not found: {self.manip_img_path}")

        with open(self.manip_img_path, "rb") as f:
            response = self.client.post(
                "/predict",
                files={"file": ("sample_man.jpg", f, "image/jpeg")}
            )

        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertEqual(data["predicted_class"], "MANIPULATED")
        self.assertGreaterEqual(data["manipulated_probability"], 0.60)
        self.assertEqual(data["confidence"], data["manipulated_probability"])

    def test_predict_in_memory_pil_jpeg(self):
        """Tests POST /predict with an in-memory dynamically generated image."""
        img = Image.new("RGB", (300, 200), color=(180, 210, 240))
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        buf.seek(0)

        response = self.client.post(
            "/predict",
            files={"file": ("test.jpg", buf, "image/jpeg")}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn(data["predicted_class"], {"GENUINE", "MANIPULATED", "NEEDS_REVIEW"})

    def test_invalid_mime_type_rejected(self):
        """Tests that non-image MIME types are rejected with 415."""
        fake_pdf = b"%PDF-1.4 header"
        response = self.client.post(
            "/predict",
            files={"file": ("document.pdf", fake_pdf, "application/pdf")}
        )
        self.assertEqual(response.status_code, 415)
        data = response.json()
        self.assertEqual(data["error"]["code"], "UNSUPPORTED_IMAGE_FORMAT")

    def test_corrupted_image_rejected(self):
        """Tests that corrupt image bytes with valid MIME header are rejected with 400."""
        corrupt_bytes = b"\xFF\xD8\xFF\xE0" + b"random corrupted garbage content"
        response = self.client.post(
            "/predict",
            files={"file": ("corrupt.jpg", corrupt_bytes, "image/jpeg")}
        )
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertEqual(data["error"]["code"], "CORRUPT_OR_INVALID_IMAGE")

    def test_empty_file_rejected(self):
        """Tests that 0-byte upload is rejected with 400."""
        response = self.client.post(
            "/predict",
            files={"file": ("empty.png", b"", "image/png")}
        )
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertEqual(data["error"]["code"], "EMPTY_PAYLOAD")

    def test_oversized_file_rejected(self):
        """Tests that payloads exceeding MAX_UPLOAD_BYTES are rejected with 413."""
        # Temporarily set max upload bytes to small size
        original_limit = settings.MAX_UPLOAD_BYTES
        try:
            settings.MAX_UPLOAD_BYTES = 1024  # 1 KB limit for testing
            big_payload = b"X" * 2048
            response = self.client.post(
                "/predict",
                files={"file": ("big.jpg", big_payload, "image/jpeg")}
            )
            self.assertEqual(response.status_code, 413)
            data = response.json()
            self.assertEqual(data["error"]["code"], "PAYLOAD_TOO_LARGE")
        finally:
            settings.MAX_UPLOAD_BYTES = original_limit

    def test_cpu_fallback_classifier(self):
        """Tests that FalconDocumentClassifier instantiates and runs cleanly on CPU."""
        ckpt_path = os.path.join(
            PROJECT_ROOT, "ml", "experiments", "exp_20261104_falcon404_final_model", "best_model.pt"
        )
        if not os.path.isfile(ckpt_path):
            self.skipTest("Checkpoint not found")

        cpu_classifier = FalconDocumentClassifier(checkpoint_path=ckpt_path, device="cpu")
        self.assertEqual(cpu_classifier.device.type, "cpu")

        test_img = Image.new("RGB", (224, 224), color=(255, 255, 255))
        res = cpu_classifier.predict_image(test_img)
        self.assertIn(res["status"], {"GENUINE", "MANIPULATED", "NEEDS_REVIEW"})
        self.assertEqual(res["device"], "cpu")
        self.assertGreater(res["inference_time_ms"], 0.0)


if __name__ == "__main__":
    unittest.main()
