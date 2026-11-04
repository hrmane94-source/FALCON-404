"""
FALCON-404: Real-Time Document Tampering Inference Engine
Milestone: Phase 7.2A.6 / Final Model Preparation
Author: Lead Developer & System Architect: Harshad Mane

Description:
    Provides production-grade inference capabilities for screening document images
    for digital forgery and tampering using the trained FalconMobileNetV3 classifier.

Statuses:
    - GENUINE: High-confidence genuine document specimen.
    - MANIPULATED: High-confidence manipulated/tampered specimen.
    - NEEDS_REVIEW: Ambiguous prediction falling within review confidence band.
    - ERROR: Unreadable file, invalid format, or execution exception.
"""

import os
import sys
import time
import logging
from typing import Dict, Any, List, Union, Optional, Tuple
from pathlib import Path
from PIL import Image

import torch
import torch.nn as nn

from .model import create_mobilenet_v3_small, FalconMobileNetV3
from .transforms import get_eval_transforms
from .device import get_device

logger = logging.getLogger("falcon404.inference")


class FalconDocumentClassifier:
    """
    Inference wrapper for FALCON-404 Document Tampering Screening.

    Args:
        checkpoint_path: Path to trained PyTorch checkpoint (.pt).
        device: Target execution device ('cuda', 'cpu', or None for auto).
        decision_threshold: Probability threshold above which manipulated class is triggered (default 0.50).
        review_margin: Half-width around decision_threshold for NEEDS_REVIEW status (default 0.10, i.e. [0.40, 0.60]).
        image_size: Target resolution tuple for evaluation transforms (width, height), default (224, 224).
    """

    def __init__(
        self,
        checkpoint_path: Optional[str] = None,
        device: Optional[str] = None,
        decision_threshold: float = 0.50,
        review_margin: float = 0.10,
        image_size: Tuple[int, int] = (224, 224),
    ):
        self.device = get_device(device)
        self.decision_threshold = float(decision_threshold)
        self.review_margin = float(review_margin)
        self.review_lower = max(0.0, self.decision_threshold - self.review_margin)
        self.review_upper = min(1.0, self.decision_threshold + self.review_margin)
        self.image_size = image_size
        self.transform = get_eval_transforms(input_size=self.image_size)

        self.checkpoint_path = checkpoint_path
        self.model: Optional[FalconMobileNetV3] = None
        self.checkpoint_epoch: Optional[int] = None
        self.checkpoint_metrics: Optional[Dict[str, Any]] = None

        if checkpoint_path is not None:
            self.load_checkpoint(checkpoint_path)

    def load_checkpoint(self, checkpoint_path: str) -> None:
        """Loads and initializes model weights from a serialized checkpoint."""
        if not os.path.isfile(checkpoint_path):
            raise FileNotFoundError(f"Model checkpoint not found at: {checkpoint_path}")

        logger.info(f"Loading FalconMobileNetV3 checkpoint from: {checkpoint_path} on {self.device}")
        ckpt = torch.load(checkpoint_path, map_location=self.device)

        config_dict = ckpt.get("config", {})
        unfreeze_layers = config_dict.get("unfreeze_upper_layers", 3)

        self.model = create_mobilenet_v3_small(
            num_classes=2,
            pretrained=False,
            freeze_features=True,
            unfreeze_upper_layers=unfreeze_layers
        ).to(self.device)

        self.model.load_state_dict(ckpt["model_state_dict"])
        self.model.eval()

        self.checkpoint_path = os.path.abspath(checkpoint_path)
        self.checkpoint_epoch = ckpt.get("epoch")
        self.checkpoint_metrics = ckpt.get("metrics")
        logger.info(f"Checkpoint successfully loaded (Epoch {self.checkpoint_epoch})")

    def _preprocess(self, image_input: Union[str, Path, Image.Image]) -> torch.Tensor:
        """Validates and preprocesses an image into a normalized PyTorch tensor."""
        if isinstance(image_input, (str, Path)):
            img_path = str(image_input)
            if not os.path.isfile(img_path):
                raise FileNotFoundError(f"Image file does not exist: {img_path}")
            with Image.open(img_path) as im:
                rgb_im = im.convert("RGB")
                tensor = self.transform(rgb_im)
        elif isinstance(image_input, Image.Image):
            rgb_im = image_input.convert("RGB")
            tensor = self.transform(rgb_im)
        else:
            raise TypeError(f"Unsupported image input type: {type(image_input)}")

        return tensor

    def predict_image(self, image_input: Union[str, Path, Image.Image]) -> Dict[str, Any]:
        """
        Runs single-image document tampering screening.

        Returns:
            Structured dictionary with screening outcome, probabilities, confidence, and telemetry.
        """
        if self.model is None:
            return {
                "status": "ERROR",
                "predicted_class": "unknown",
                "predicted_label": -1,
                "probabilities": {"genuine": 0.0, "manipulated": 0.0},
                "confidence": 0.0,
                "tampering_score": 0.0,
                "decision_threshold": self.decision_threshold,
                "review_band": [self.review_lower, self.review_upper],
                "device": str(self.device),
                "inference_time_ms": 0.0,
                "error": "Model checkpoint has not been loaded. Call load_checkpoint() first."
            }

        start_time = time.perf_counter()
        try:
            tensor = self._preprocess(image_input)
            tensor_batch = tensor.unsqueeze(0).to(self.device)

            with torch.inference_mode():
                logits = self.model(tensor_batch)
                probs = torch.softmax(logits, dim=-1)[0]
                prob_gen = float(probs[0].item())
                prob_manip = float(probs[1].item())

            duration_ms = (time.perf_counter() - start_time) * 1000.0

            # Determine screening status
            tampering_score = prob_manip
            if self.review_lower <= tampering_score <= self.review_upper:
                status = "NEEDS_REVIEW"
                pred_class = "manipulated" if tampering_score >= self.decision_threshold else "genuine"
                pred_label = 1 if pred_class == "manipulated" else 0
                confidence = max(prob_gen, prob_manip)
            elif tampering_score > self.review_upper:
                status = "MANIPULATED"
                pred_class = "manipulated"
                pred_label = 1
                confidence = prob_manip
            else:
                status = "GENUINE"
                pred_class = "genuine"
                pred_label = 0
                confidence = prob_gen

            return {
                "status": status,
                "predicted_class": pred_class,
                "predicted_label": pred_label,
                "probabilities": {
                    "genuine": round(prob_gen, 4),
                    "manipulated": round(prob_manip, 4)
                },
                "confidence": round(confidence, 4),
                "tampering_score": round(tampering_score, 4),
                "decision_threshold": self.decision_threshold,
                "review_band": [round(self.review_lower, 2), round(self.review_upper, 2)],
                "device": str(self.device),
                "inference_time_ms": round(duration_ms, 2),
                "error": None
            }

        except Exception as exc:
            duration_ms = (time.perf_counter() - start_time) * 1000.0
            logger.error(f"Inference error on input: {exc}", exc_info=True)
            return {
                "status": "ERROR",
                "predicted_class": "unknown",
                "predicted_label": -1,
                "probabilities": {"genuine": 0.0, "manipulated": 0.0},
                "confidence": 0.0,
                "tampering_score": 0.0,
                "decision_threshold": self.decision_threshold,
                "review_band": [self.review_lower, self.review_upper],
                "device": str(self.device),
                "inference_time_ms": round(duration_ms, 2),
                "error": str(exc)
            }

    def predict_batch(self, image_inputs: List[Union[str, Path, Image.Image]]) -> List[Dict[str, Any]]:
        """Runs batched inference across a list of image paths or PIL images."""
        return [self.predict_image(item) for item in image_inputs]


def get_classifier(checkpoint_path: Optional[str] = None, device: Optional[str] = None) -> FalconDocumentClassifier:
    """Convenience factory returning an initialized FalconDocumentClassifier."""
    return FalconDocumentClassifier(checkpoint_path=checkpoint_path, device=device)
