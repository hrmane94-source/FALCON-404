"""
FALCON-404: Machine Learning Source Package
Milestone: Phase 7.2A — AI/ML Document Manipulation Detection
Author: Lead Developer & System Architect: Harshad Mane
"""

from .dataset import (
    FalconDocumentDataset,
    validate_falcon_dataset,
    DatasetIntegrityError,
    LABEL_MAP,
    CLASS_NAMES,
    VALID_SPLITS,
    EXPECTED_IMAGE_SIZE,
    EXPECTED_TOTAL_RECORDS,
)

from .device import (
    get_device,
    is_cuda_available,
    get_device_name,
    get_device_info,
)

from .model import (
    FalconMobileNetV3,
    create_mobilenet_v3_small,
)

from .transforms import (
    get_eval_transforms,
    get_train_transforms,
    denormalize_tensor,
    EnsureRGB,
    IMAGENET_MEAN,
    IMAGENET_STD,
    DEFAULT_INPUT_SIZE,
)

__all__ = [
    # Dataset & Validation
    "FalconDocumentDataset",
    "validate_falcon_dataset",
    "DatasetIntegrityError",
    "LABEL_MAP",
    "CLASS_NAMES",
    "VALID_SPLITS",
    "EXPECTED_IMAGE_SIZE",
    "EXPECTED_TOTAL_RECORDS",
    # Hardware & Device
    "get_device",
    "is_cuda_available",
    "get_device_name",
    "get_device_info",
    # Model
    "FalconMobileNetV3",
    "create_mobilenet_v3_small",
    # Transforms & Normalization
    "get_eval_transforms",
    "get_train_transforms",
    "denormalize_tensor",
    "EnsureRGB",
    "IMAGENET_MEAN",
    "IMAGENET_STD",
    "DEFAULT_INPUT_SIZE",
]
