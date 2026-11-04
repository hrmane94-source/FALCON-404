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
    get_eval_transforms_padded,
    get_train_transforms_padded,
    get_aspect_ratio_preserving_eval_transforms,
    get_aspect_ratio_preserving_train_transforms,
    denormalize_tensor,
    EnsureRGB,
    ResizeWithPad,
    IMAGENET_MEAN,
    IMAGENET_STD,
    DEFAULT_INPUT_SIZE,
)

from .reproducibility import (
    seed_everything,
    seed_worker,
)

from .metrics import (
    compute_binary_metrics,
    compute_classification_metrics,
    format_metrics_summary,
)

from .early_stopping import (
    EarlyStopping,
)

from .checkpoint import (
    CheckpointManager,
    save_checkpoint,
    load_checkpoint,
    find_best_checkpoint,
)

from .logger import (
    ExperimentLogger,
    TrainingLogger,
)

from .engine import (
    train_one_epoch,
    validate_one_epoch,
    run_training,
    build_dataloaders,
)

from .visualization import (
    plot_training_curves,
    plot_confusion_matrix_heatmap,
)

from .inference import (
    FalconDocumentClassifier,
    get_classifier,
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
    "get_eval_transforms_padded",
    "get_train_transforms_padded",
    "get_aspect_ratio_preserving_eval_transforms",
    "get_aspect_ratio_preserving_train_transforms",
    "denormalize_tensor",
    "EnsureRGB",
    "ResizeWithPad",
    "IMAGENET_MEAN",
    "IMAGENET_STD",
    "DEFAULT_INPUT_SIZE",
    # Reproducibility
    "seed_everything",
    "seed_worker",
    # Metrics
    "compute_binary_metrics",
    "compute_classification_metrics",
    "format_metrics_summary",
    # Early Stopping
    "EarlyStopping",
    # Checkpointing
    "CheckpointManager",
    "save_checkpoint",
    "load_checkpoint",
    "find_best_checkpoint",
    # Logging
    "ExperimentLogger",
    "TrainingLogger",
    # Training Engine
    "train_one_epoch",
    "validate_one_epoch",
    "run_training",
    "build_dataloaders",
    # Visualization
    "plot_training_curves",
    "plot_confusion_matrix_heatmap",
    # Inference
    "FalconDocumentClassifier",
    "get_classifier",
]
