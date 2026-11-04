"""
FALCON-404: Unit Tests for Image Preprocessing & Augmentation Transforms
Phase: 7.2A.2 — Image Preprocessing Testing
Author: Lead Developer & System Architect: Harshad Mane
"""

import os
import sys
import unittest
import torch
from PIL import Image

# Ensure ml/src is in Python path
SRC_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src"))
if SRC_DIR not in sys.path:
    sys.path.insert(0, SRC_DIR)

from transforms import (
    get_eval_transforms,
    get_train_transforms,
    denormalize_tensor,
    EnsureRGB,
    IMAGENET_MEAN,
    IMAGENET_STD,
    DEFAULT_INPUT_SIZE
)


class TestImageTransforms(unittest.TestCase):

    def setUp(self):
        # Create a synthetic PIL image simulating a document specimen
        self.pil_rgb = Image.new("RGB", (640, 403), color=(240, 240, 240))
        self.pil_gray = Image.new("L", (640, 403), color=128)
        self.pil_rgba = Image.new("RGBA", (640, 403), color=(200, 200, 200, 255))

    def test_eval_transforms_output_shape_and_type(self):
        """1. Verifies eval transforms output a FloatTensor of shape [3, 224, 224]."""
        transform = get_eval_transforms(input_size=(224, 224))
        tensor = transform(self.pil_rgb)

        self.assertIsInstance(tensor, torch.Tensor)
        self.assertEqual(tensor.shape, (3, 224, 224))
        self.assertEqual(tensor.dtype, torch.float32)

    def test_rgb_conversion_from_grayscale_and_rgba(self):
        """2. Verifies non-RGB images (L, RGBA) are cleanly converted to 3-channel RGB."""
        transform = get_eval_transforms()

        tensor_gray = transform(self.pil_gray)
        self.assertEqual(tensor_gray.shape, (3, 224, 224))

        tensor_rgba = transform(self.pil_rgba)
        self.assertEqual(tensor_rgba.shape, (3, 224, 224))

    def test_ensure_rgb_transform(self):
        """3. Verifies EnsureRGB correctly converts modes while leaving RGB untouched."""
        ensure_rgb = EnsureRGB()
        out_rgb = ensure_rgb(self.pil_rgb)
        self.assertEqual(out_rgb.mode, "RGB")

        out_gray = ensure_rgb(self.pil_gray)
        self.assertEqual(out_gray.mode, "RGB")

    def test_eval_transforms_determinism(self):
        """4. Verifies evaluation transform is completely deterministic across runs."""
        transform = get_eval_transforms()
        t1 = transform(self.pil_rgb)
        t2 = transform(self.pil_rgb)

        self.assertTrue(torch.equal(t1, t2), "Evaluation transforms must produce identical tensors.")

    def test_imagenet_normalization_effect(self):
        """5. Verifies pixel values reflect ImageNet standardization (approx zero mean)."""
        transform = get_eval_transforms()
        # White image: (1 - mean) / std > 0
        white_img = Image.new("RGB", (100, 100), (255, 255, 255))
        tensor_white = transform(white_img)
        for c in range(3):
            expected_val = (1.0 - IMAGENET_MEAN[c]) / IMAGENET_STD[c]
            actual_mean = tensor_white[c].mean().item()
            self.assertAlmostEqual(actual_mean, expected_val, places=2)

    def test_train_transforms_output_shape_and_validity(self):
        """6. Verifies train transforms produce correctly shaped [3, 224, 224] normalized tensors."""
        transform = get_train_transforms(
            input_size=(224, 224),
            brightness_jitter=0.1,
            contrast_jitter=0.1,
            rotation_degrees=5.0,
            enable_horizontal_flip=False
        )
        tensor = transform(self.pil_rgb)

        self.assertIsInstance(tensor, torch.Tensor)
        self.assertEqual(tensor.shape, (3, 224, 224))
        self.assertEqual(tensor.dtype, torch.float32)
        self.assertFalse(torch.isnan(tensor).any())

    def test_denormalize_tensor(self):
        """7. Verifies denormalize_tensor restores pixel distribution back to [0.0, 1.0]."""
        transform = get_eval_transforms()
        norm_tensor = transform(self.pil_rgb)  # normalized
        denorm_tensor = denormalize_tensor(norm_tensor)

        # Denormalized values must be within valid image range [0.0, 1.0]
        self.assertTrue((denorm_tensor >= -0.01).all())
        self.assertTrue((denorm_tensor <= 1.01).all())
        self.assertEqual(denorm_tensor.shape, (3, 224, 224))


if __name__ == "__main__":
    unittest.main()
