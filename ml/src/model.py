"""
FALCON-404: Document Tampering Classifier Model Architecture
Phase: 7.2A.2 — Model Architecture & Image Preprocessing
Author: Lead Developer & System Architect: Harshad Mane

Description:
    Implements a lightweight binary image-classification architecture based on
    torchvision's MobileNetV3-Small for experimental document manipulation screening.

Model Specifications:
    - Backbone: MobileNetV3-Small (lightweight depthwise separable convolutional network).
    - Classification Head: Adapted to 2 raw output logits:
        * Index 0: Genuine (unaltered reference document)
        * Index 1: Manipulated (splicing, text, photo swap, copy-move, shadow anomaly)
    - Fine-Tuning Support: Configurable feature-layer freezing and upper-layer unfreezing.
    - Zero Pretrained Weight Downloads During Testing: Defaults to weights=None.
"""

from typing import Dict, Optional, Union
import torch
import torch.nn as nn
from torchvision.models import mobilenet_v3_small, MobileNet_V3_Small_Weights


class FalconMobileNetV3(nn.Module):
    """
    MobileNetV3-Small document manipulation classifier.

    Args:
        num_classes: Number of target classes, defaults to 2 (Genuine vs Manipulated).
        pretrained: If True, loads ImageNet pretrained weights. Defaults to False.
        weights: Optional explicit torchvision weights enum or string. If provided, overrides pretrained.
        dropout_rate: Dropout probability in the classification neck, defaults to 0.2.
        freeze_features: If True, freezes backbone feature extraction layers.
        unfreeze_upper_layers: If provided along with freeze_features=True, unfreezes the last N
                              inverted residual blocks in backbone.features for fine-tuning.
    """

    def __init__(
        self,
        num_classes: int = 2,
        pretrained: bool = False,
        weights: Optional[Union[MobileNet_V3_Small_Weights, str]] = None,
        dropout_rate: float = 0.2,
        freeze_features: bool = False,
        unfreeze_upper_layers: Optional[int] = None
    ):
        super().__init__()
        self.num_classes = num_classes

        # Resolve weights strictly without downloading unless explicitly requested
        resolved_weights = None
        if weights is not None:
            resolved_weights = weights
        elif pretrained:
            resolved_weights = MobileNet_V3_Small_Weights.DEFAULT

        # Initialize torchvision MobileNetV3-Small backbone
        self.backbone = mobilenet_v3_small(weights=resolved_weights)

        # Adapt final classification layer to produce exactly num_classes raw logits
        # Original: Sequential(Linear(576, 1024), Hardswish(), Dropout(0.2), Linear(1024, 1000))
        in_features = self.backbone.classifier[3].in_features
        if dropout_rate != 0.2:
            self.backbone.classifier[2] = nn.Dropout(p=dropout_rate, inplace=True)
        self.backbone.classifier[3] = nn.Linear(in_features, num_classes)

        # Configure layer freezing / fine-tuning
        if freeze_features:
            self.freeze_backbone(unfreeze_upper_layers=unfreeze_upper_layers)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Forward pass producing raw logits.

        Args:
            x: Input tensor of shape [batch_size, 3, 224, 224].

        Returns:
            Raw logit tensor of shape [batch_size, 2].
        """
        return self.backbone(x)

    def freeze_backbone(self, unfreeze_upper_layers: Optional[int] = None) -> None:
        """
        Freezes feature extractor layers, optionally leaving the last N layers trainable.

        Args:
            unfreeze_upper_layers: Number of final feature blocks (from features) to keep trainable.
        """
        # Freeze all parameters in features
        for param in self.backbone.features.parameters():
            param.requires_grad = False

        # Optionally unfreeze top N blocks in features
        if unfreeze_upper_layers is not None and unfreeze_upper_layers > 0:
            num_blocks = len(self.backbone.features)
            start_idx = max(0, num_blocks - unfreeze_upper_layers)
            for i in range(start_idx, num_blocks):
                for param in self.backbone.features[i].parameters():
                    param.requires_grad = True

        # Classifier head remains trainable
        for param in self.backbone.classifier.parameters():
            param.requires_grad = True

    def unfreeze_all(self) -> None:
        """Unfreezes all parameters across features and classifier for full end-to-end training."""
        for param in self.parameters():
            param.requires_grad = True

    def count_parameters(self) -> Dict[str, int]:
        """Returns counts of total, trainable, and frozen parameters."""
        total = sum(p.numel() for p in self.parameters())
        trainable = sum(p.numel() for p in self.parameters() if p.requires_grad)
        frozen = total - trainable
        return {
            "total_parameters": total,
            "trainable_parameters": trainable,
            "frozen_parameters": frozen
        }

    get_parameter_summary = count_parameters


def create_mobilenet_v3_small(
    num_classes: int = 2,
    pretrained: bool = False,
    weights: Optional[Union[MobileNet_V3_Small_Weights, str]] = None,
    dropout_rate: float = 0.2,
    freeze_features: bool = False,
    unfreeze_upper_layers: Optional[int] = None
) -> FalconMobileNetV3:
    """
    Factory function to instantiate and configure the FalconMobileNetV3 classifier.

    Args:
        num_classes: Target classes (2 for Genuine vs Manipulated).
        pretrained: If True, loads ImageNet pretrained weights. Defaults to False.
        weights: Optional explicit torchvision weights enum or string.
        dropout_rate: Dropout rate in classifier neck.
        freeze_features: If True, freezes feature backbone.
        unfreeze_upper_layers: Number of upper feature blocks to keep trainable for fine-tuning.

    Returns:
        Configured FalconMobileNetV3 nn.Module instance.
    """
    return FalconMobileNetV3(
        num_classes=num_classes,
        pretrained=pretrained,
        weights=weights,
        dropout_rate=dropout_rate,
        freeze_features=freeze_features,
        unfreeze_upper_layers=unfreeze_upper_layers
    )
