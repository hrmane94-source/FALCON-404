"""
FALCON-404: Document Image Preprocessing & Augmentation Pipelines
Phase: 7.2A.2 — Model Architecture & Image Preprocessing
Author: Lead Developer & System Architect: Harshad Mane

Description:
    Provides deterministic evaluation transforms and evidence-preserving
    conservative training augmentations for the MobileNetV3 document screening model.

Forensic Preprocessing Principles:
    1. Input Resolution: Standardized to 224 x 224 pixels.
    2. ImageNet Normalization: Mean [0.485, 0.456, 0.406], Std [0.229, 0.224, 0.225].
    3. Evaluation Determinism: Evaluation transforms apply pure resize + tensor normalization.
    4. Conservative Training Augmentation:
       - Permits mild brightness and contrast perturbations (+/- 10%) to simulate illumination variation.
       - Permits mild rotation (+/- 5 degrees) to simulate hand placement during capture.
       - Disables horizontal flipping by default to preserve document reading order and alphanumeric geometry.
       - Strictly avoids aggressive cropping, heavy blurs, and non-affine distortions that could
         destroy or obscure subtle tampering artifacts (splicing edges, ELA boundaries).
"""

from typing import Tuple, Optional, Union
from PIL import Image

try:
    import torch
    from torchvision import transforms
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False


IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]
DEFAULT_INPUT_SIZE: Tuple[int, int] = (224, 224)


class EnsureRGB:
    """Ensures input PIL Image is converted to 3-channel RGB mode."""
    def __call__(self, img: Image.Image) -> Image.Image:
        if img.mode != "RGB":
            return img.convert("RGB")
        return img

    def __repr__(self) -> str:
        return "EnsureRGB()"


class ResizeWithPad:
    """
    Resizes a PIL image preserving its native aspect ratio and pads the remainder
    to reach target_size (width, height), preventing spatial glyph compression.

    Args:
        target_size: Desired (width, height) tuple (default: 224 x 224).
        fill: Fill color for padded borders (default: 128 neutral gray).
    """

    def __init__(self, target_size: Union[int, Tuple[int, int]] = DEFAULT_INPUT_SIZE, fill: int = 128):
        if isinstance(target_size, int):
            self.target_size = (target_size, target_size)
        else:
            self.target_size = tuple(target_size)
        self.fill = (fill, fill, fill) if isinstance(fill, int) else fill

    def __call__(self, img: Image.Image) -> Image.Image:
        target_w, target_h = self.target_size
        orig_w, orig_h = img.size

        # Compute scaling factor preserving aspect ratio
        scale = min(target_w / orig_w, target_h / orig_h)
        new_w = max(1, int(round(orig_w * scale)))
        new_h = max(1, int(round(orig_h * scale)))

        resized_img = img.resize((new_w, new_h), resample=Image.Resampling.BILINEAR)

        # Create padded background
        canvas = Image.new("RGB", (target_w, target_h), color=self.fill)
        pad_x = (target_w - new_w) // 2
        pad_y = (target_h - new_h) // 2
        canvas.paste(resized_img, (pad_x, pad_y))

        return canvas

    def __repr__(self) -> str:
        return f"ResizeWithPad(target_size={self.target_size}, fill={self.fill})"


def get_eval_transforms(
    input_size: Tuple[int, int] = DEFAULT_INPUT_SIZE
) -> "transforms.Compose":
    """
    Returns deterministic preprocessing pipeline for model validation, testing, and inference.

    Pipeline:
      1. EnsureRGB: Guaranteed 3-channel format.
      2. Resize: Deterministic bilinear interpolation to input_size (224 x 224).
      3. ToTensor: Converts PIL image [0, 255] to torch.FloatTensor in range [0.0, 1.0].
      4. Normalize: Standard ImageNet distribution shift.
    """
    if not TORCH_AVAILABLE:
        raise RuntimeError("torch and torchvision are required for image transforms.")

    return transforms.Compose([
        EnsureRGB(),
        transforms.Resize(input_size, interpolation=transforms.InterpolationMode.BILINEAR),
        transforms.ToTensor(),
        transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD)
    ])


def get_train_transforms(
    input_size: Tuple[int, int] = DEFAULT_INPUT_SIZE,
    brightness_jitter: float = 0.1,
    contrast_jitter: float = 0.1,
    rotation_degrees: float = 5.0,
    enable_horizontal_flip: bool = False
) -> "transforms.Compose":
    """
    Returns conservative, forensic-evidence-preserving training augmentations.

    Args:
        input_size: Target (width, height) tuple, defaults to (224, 224).
        brightness_jitter: Maximum brightness variation (+/- 10% by default).
        contrast_jitter: Maximum contrast variation (+/- 10% by default).
        rotation_degrees: Maximum subtle rotational deviation (+/- 5 deg by default).
        enable_horizontal_flip: If True, randomly flips horizontally (default: False to
                                preserve orientation of text fields and document logos).

    Forbidden in Document Screening:
        - RandomResizedCrop: Conceals manipulated regions outside cropped crops.
        - GaussianBlur: Destroys high-frequency forensic artifacts (splicing boundaries, resampling).
        - RandomPerspective / ElasticTransform: Heavily distorts layout and geometry.
    """
    if not TORCH_AVAILABLE:
        raise RuntimeError("torch and torchvision are required for image transforms.")

    transform_list = [
        EnsureRGB(),
        transforms.Resize(input_size, interpolation=transforms.InterpolationMode.BILINEAR),
    ]

    # Subtle rotation (+/- 5 degrees) with border reflection to prevent dark edge voids
    if rotation_degrees > 0.0:
        transform_list.append(
            transforms.RandomRotation(
                degrees=(-rotation_degrees, rotation_degrees),
                interpolation=transforms.InterpolationMode.BILINEAR
            )
        )

    # Photometric variation (simulating capture lighting)
    if brightness_jitter > 0.0 or contrast_jitter > 0.0:
        transform_list.append(
            transforms.ColorJitter(
                brightness=brightness_jitter,
                contrast=contrast_jitter,
                saturation=0.0,
                hue=0.0
            )
        )

    # Optional horizontal flip (disabled by default)
    if enable_horizontal_flip:
        transform_list.append(transforms.RandomHorizontalFlip(p=0.5))

    transform_list.extend([
        transforms.ToTensor(),
        transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD)
    ])

    return transforms.Compose(transform_list)


def get_aspect_ratio_preserving_eval_transforms(
    input_size: Tuple[int, int] = DEFAULT_INPUT_SIZE,
    pad_fill: int = 128
) -> "transforms.Compose":
    """
    Returns deterministic evaluation transform preserving native document aspect ratio
    with neutral gray padding.
    """
    if not TORCH_AVAILABLE:
        raise RuntimeError("torch and torchvision are required for image transforms.")

    return transforms.Compose([
        EnsureRGB(),
        ResizeWithPad(target_size=input_size, fill=pad_fill),
        transforms.ToTensor(),
        transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD)
    ])


def get_aspect_ratio_preserving_train_transforms(
    input_size: Tuple[int, int] = DEFAULT_INPUT_SIZE,
    pad_fill: int = 128,
    brightness_jitter: float = 0.1,
    contrast_jitter: float = 0.1,
    rotation_degrees: float = 5.0,
    enable_horizontal_flip: bool = False
) -> "transforms.Compose":
    """
    Returns conservative training transforms with aspect ratio preservation and neutral padding.
    """
    if not TORCH_AVAILABLE:
        raise RuntimeError("torch and torchvision are required for image transforms.")

    transform_list = [
        EnsureRGB(),
        ResizeWithPad(target_size=input_size, fill=pad_fill),
    ]

    if rotation_degrees > 0.0:
        transform_list.append(
            transforms.RandomRotation(
                degrees=(-rotation_degrees, rotation_degrees),
                interpolation=transforms.InterpolationMode.BILINEAR
            )
        )

    if brightness_jitter > 0.0 or contrast_jitter > 0.0:
        transform_list.append(
            transforms.ColorJitter(
                brightness=brightness_jitter,
                contrast=contrast_jitter,
                saturation=0.0,
                hue=0.0
            )
        )

    if enable_horizontal_flip:
        transform_list.append(transforms.RandomHorizontalFlip(p=0.5))

    transform_list.extend([
        transforms.ToTensor(),
        transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD)
    ])

    return transforms.Compose(transform_list)


def denormalize_tensor(tensor: "torch.Tensor") -> "torch.Tensor":
    """
    Inverts ImageNet normalization on a [C, H, W] or [B, C, H, W] tensor for visual inspection.
    """
    if not TORCH_AVAILABLE:
        raise RuntimeError("torch is required for denormalize_tensor.")

    mean = torch.as_tensor(IMAGENET_MEAN, dtype=tensor.dtype, device=tensor.device)
    std = torch.as_tensor(IMAGENET_STD, dtype=tensor.dtype, device=tensor.device)

    if tensor.ndim == 4:
        mean = mean.view(1, -1, 1, 1)
        std = std.view(1, -1, 1, 1)
    elif tensor.ndim == 3:
        mean = mean.view(-1, 1, 1)
        std = std.view(-1, 1, 1)

    return (tensor * std) + mean


# Convenience aliases for padded transforms
get_eval_transforms_padded = get_aspect_ratio_preserving_eval_transforms
get_train_transforms_padded = get_aspect_ratio_preserving_train_transforms

