"""
FALCON-404: Unit Tests for MobileNetV3 Document Classifier Architecture
Phase: 7.2A.2 — Model Architecture Testing
Author: Lead Developer & System Architect: Harshad Mane
"""

import os
import sys
import unittest
import torch

# Ensure ml/src is in Python path
SRC_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src"))
if SRC_DIR not in sys.path:
    sys.path.insert(0, SRC_DIR)

from model import FalconMobileNetV3, create_mobilenet_v3_small
from device import get_device, is_cuda_available


class TestMobileNetV3Model(unittest.TestCase):

    def test_model_initialization_defaults(self):
        """1. Verifies model initializes without errors using weights=None (offline)."""
        model = create_mobilenet_v3_small(num_classes=2, pretrained=False)
        self.assertIsInstance(model, FalconMobileNetV3)
        self.assertEqual(model.num_classes, 2)

    def test_binary_classification_head(self):
        """2. Verifies final layer is replaced with binary Linear(in_features, 2)."""
        model = create_mobilenet_v3_small(num_classes=2, pretrained=False)
        final_layer = model.backbone.classifier[3]
        self.assertIsInstance(final_layer, torch.nn.Linear)
        self.assertEqual(final_layer.out_features, 2)
        self.assertEqual(final_layer.in_features, 1024)

    def test_forward_pass_output_shape(self):
        """3. Verifies forward pass produces [batch_size, 2] raw logits."""
        model = create_mobilenet_v3_small(num_classes=2, pretrained=False)
        model.eval()

        batch_sizes = [1, 4, 8]
        for b in batch_sizes:
            dummy_input = torch.randn(b, 3, 224, 224)
            with torch.no_grad():
                output = model(dummy_input)
            self.assertEqual(output.shape, (b, 2))
            self.assertFalse(torch.isnan(output).any())
            self.assertFalse(torch.isinf(output).any())

    def test_feature_freezing_functionality(self):
        """4. Verifies freeze_features=True freezes all backbone.features parameters."""
        model = create_mobilenet_v3_small(num_classes=2, pretrained=False, freeze_features=True)

        # All feature parameters must be frozen
        for name, param in model.backbone.features.named_parameters():
            self.assertFalse(param.requires_grad, f"Parameter {name} should be frozen.")

        # Classifier parameters must remain trainable
        for name, param in model.backbone.classifier.named_parameters():
            self.assertTrue(param.requires_grad, f"Classifier parameter {name} should be trainable.")

        counts = model.count_parameters()
        self.assertEqual(counts["trainable_parameters"] + counts["frozen_parameters"], counts["total_parameters"])
        self.assertTrue(counts["frozen_parameters"] > 0)

    def test_fine_tuning_upper_layers_configuration(self):
        """5. Verifies unfreeze_upper_layers keeps only the last N feature blocks trainable."""
        unfreeze_n = 3
        model = create_mobilenet_v3_small(
            num_classes=2,
            pretrained=False,
            freeze_features=True,
            unfreeze_upper_layers=unfreeze_n
        )

        num_blocks = len(model.backbone.features)
        # Lower blocks must be frozen
        for i in range(num_blocks - unfreeze_n):
            for param in model.backbone.features[i].parameters():
                self.assertFalse(param.requires_grad)

        # Upper blocks must be trainable
        for i in range(num_blocks - unfreeze_n, num_blocks):
            for param in model.backbone.features[i].parameters():
                self.assertTrue(param.requires_grad)

        # Classifier must be trainable
        for param in model.backbone.classifier.parameters():
            self.assertTrue(param.requires_grad)

    def test_unfreeze_all_method(self):
        """6. Verifies unfreeze_all() restores gradients across the entire network."""
        model = create_mobilenet_v3_small(num_classes=2, pretrained=False, freeze_features=True)
        model.unfreeze_all()
        for name, param in model.named_parameters():
            self.assertTrue(param.requires_grad, f"Parameter {name} was not unfrozen.")

    def test_cpu_compatibility(self):
        """7. Verifies forward pass on explicit CPU device."""
        model = create_mobilenet_v3_small(num_classes=2, pretrained=False).to("cpu")
        model.eval()
        dummy_input = torch.randn(2, 3, 224, 224, device="cpu")
        with torch.no_grad():
            output = model(dummy_input)
        self.assertEqual(output.device.type, "cpu")
        self.assertEqual(output.shape, (2, 2))

    def test_cuda_compatibility_when_available(self):
        """8. Verifies forward pass on CUDA when available."""
        if not is_cuda_available():
            self.skipTest("CUDA is not available on this environment.")

        cuda_dev = get_device("cuda:0")
        model = create_mobilenet_v3_small(num_classes=2, pretrained=False).to(cuda_dev)
        model.eval()
        dummy_input = torch.randn(2, 3, 224, 224, device=cuda_dev)
        with torch.no_grad():
            output = model(dummy_input)
        self.assertEqual(output.device.type, "cuda")
        self.assertEqual(output.shape, (2, 2))

    def test_pretrained_model_initialization(self):
        """9. Verifies pretrained ImageNet model initialization with frozen backbone."""
        model = create_mobilenet_v3_small(num_classes=2, pretrained=True, freeze_features=True)
        self.assertEqual(model.num_classes, 2)

        # Feature extractor layers must be frozen
        for name, param in model.backbone.features.named_parameters():
            self.assertFalse(param.requires_grad, f"Pretrained feature {name} should be frozen.")

        # Classifier head must be trainable
        for name, param in model.backbone.classifier.named_parameters():
            self.assertTrue(param.requires_grad, f"Classifier parameter {name} should be trainable.")

        counts = model.count_parameters()
        self.assertEqual(counts["total_parameters"], 1519906)
        self.assertEqual(counts["trainable_parameters"], 592898)
        self.assertEqual(counts["frozen_parameters"], 927008)

    def test_pretrained_forward_pass_no_nan_or_inf(self):
        """10. Verifies pretrained model produces [B, 2] logits without NaN or Inf values."""
        model = create_mobilenet_v3_small(num_classes=2, pretrained=True, freeze_features=True)
        model.eval()

        batch_sizes = [1, 2, 4]
        for b in batch_sizes:
            dummy_input = torch.randn(b, 3, 224, 224)
            with torch.no_grad():
                output = model(dummy_input)
            self.assertEqual(output.shape, (b, 2))
            self.assertFalse(torch.isnan(output).any(), "Pretrained logits contained NaN.")
            self.assertFalse(torch.isinf(output).any(), "Pretrained logits contained Inf.")

    def test_frozen_backbone_batchnorm_remains_in_eval_mode(self):
        """11. Verifies BatchNorm running stats remain frozen when backbone is frozen in train mode."""
        model = create_mobilenet_v3_small(num_classes=2, pretrained=True, freeze_features=True)
        model.train()

        # Feature BatchNorm modules must be in eval mode
        for name, module in model.backbone.features.named_modules():
            if isinstance(module, torch.nn.BatchNorm2d):
                self.assertFalse(module.training, f"BatchNorm {name} should be in eval mode.")

        # Classifier modules must be in train mode
        self.assertTrue(model.backbone.classifier.training)

        # Forward pass in train mode should NOT alter running_mean or running_var
        first_bn = None
        for m in model.backbone.features.modules():
            if isinstance(m, torch.nn.BatchNorm2d):
                first_bn = m
                break

        self.assertIsNotNone(first_bn)
        orig_mean = first_bn.running_mean.clone()
        orig_var = first_bn.running_var.clone()

        dummy_batch = torch.randn(4, 3, 224, 224)
        _ = model(dummy_batch)

        self.assertTrue(torch.equal(orig_mean, first_bn.running_mean))
        self.assertTrue(torch.equal(orig_var, first_bn.running_var))


if __name__ == "__main__":
    unittest.main()
