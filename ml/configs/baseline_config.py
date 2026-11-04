"""
FALCON-404: Centralized Training & Experiment Configuration
Phase: 7.2A.3 — Training Pipeline Development
Author: Lead Developer & System Architect: Harshad Mane

Description:
    Provides a strongly-typed, validated dataclass configuration for
    reproducible deep-learning document classification experiments.
"""

from dataclasses import dataclass, field, asdict
from typing import Tuple, Optional, Dict, Any


@dataclass
class BaselineConfig:
    """
    Central configuration object for MobileNetV3-Small binary document screening.
    """

    # Experiment Metadata
    experiment_name: str = "baseline_mobilenet_v3_small"
    experiment_dir: str = "ml/experiments"
    dataset_dir: str = "ml_data/FALCON_404_DATASET_v1.0"
    manifest_name: str = "dataset_manifest.csv"

    # Hardware & Reproducibility
    random_seed: int = 404
    deterministic: bool = True
    device: Optional[str] = None  # None selects cuda if available, else cpu
    mixed_precision: bool = True  # AMP (FP16) on CUDA
    dataloader_workers: int = 0   # 0 recommended on Windows to avoid process spawn overhead
    pin_memory: bool = True

    # Image Resolution & Transforms
    image_size: Tuple[int, int] = (224, 224)
    aspect_ratio_preserve: bool = False
    brightness_jitter: float = 0.1
    contrast_jitter: float = 0.1
    rotation_degrees: float = 5.0
    enable_horizontal_flip: bool = False

    # Model Architecture
    model_name: str = "mobilenet_v3_small"
    num_classes: int = 2
    pretrained: bool = False
    weights: Optional[str] = None
    dropout_rate: float = 0.2
    freeze_features: bool = True  # Frozen backbone by default for initial linear probe
    unfreeze_upper_layers: Optional[int] = None  # Set to e.g. 3 for upper-layer fine-tuning

    # Optimization Hyperparameters
    batch_size: int = 16
    num_epochs: int = 30
    learning_rate: float = 0.0001
    weight_decay: float = 0.0001
    optimizer: str = "AdamW"
    scheduler: str = "CosineAnnealingLR"
    loss_function: str = "CrossEntropyLoss"

    # Early Stopping & Checkpointing
    early_stopping_patience: int = 7
    early_stopping_min_delta: float = 0.0005
    early_stopping_metric: str = "val_loss"
    early_stopping_mode: str = "min"
    save_best_only: bool = True

    def validate(self) -> None:
        """Validates configuration parameters and raises ValueError on invalid configurations."""
        if self.random_seed < 0:
            raise ValueError(f"random_seed must be >= 0, got {self.random_seed}")

        if self.num_epochs <= 0:
            raise ValueError(f"num_epochs must be > 0, got {self.num_epochs}")

        if self.batch_size <= 0:
            raise ValueError(f"batch_size must be > 0, got {self.batch_size}")

        if self.learning_rate <= 0:
            raise ValueError(f"learning_rate must be > 0, got {self.learning_rate}")

        if self.weight_decay < 0:
            raise ValueError(f"weight_decay must be >= 0, got {self.weight_decay}")

        if self.num_classes != 2:
            raise ValueError(f"num_classes must be exactly 2 for binary classification, got {self.num_classes}")

        if len(self.image_size) != 2 or self.image_size[0] <= 0 or self.image_size[1] <= 0:
            raise ValueError(f"image_size must be positive (width, height), got {self.image_size}")

        if self.early_stopping_patience <= 0:
            raise ValueError(f"early_stopping_patience must be > 0, got {self.early_stopping_patience}")

        if self.early_stopping_mode not in {"min", "max"}:
            raise ValueError(f"early_stopping_mode must be 'min' or 'max', got {self.early_stopping_mode}")

        valid_optimizers = {"AdamW", "Adam", "SGD"}
        if self.optimizer not in valid_optimizers:
            raise ValueError(f"optimizer '{self.optimizer}' not recognized. Must be one of: {valid_optimizers}")

        valid_schedulers = {"CosineAnnealingLR", "StepLR", "None", None}
        if self.scheduler not in valid_schedulers:
            raise ValueError(f"scheduler '{self.scheduler}' not recognized. Must be one of: {valid_schedulers}")

        valid_losses = {"CrossEntropyLoss", "BCEWithLogitsLoss"}
        if self.loss_function not in valid_losses:
            raise ValueError(f"loss_function '{self.loss_function}' not recognized. Must be one of: {valid_losses}")

        if self.unfreeze_upper_layers is not None and self.unfreeze_upper_layers < 0:
            raise ValueError(f"unfreeze_upper_layers must be >= 0 or None, got {self.unfreeze_upper_layers}")

    def to_dict(self) -> Dict[str, Any]:
        """Converts configuration to a plain serializable dictionary."""
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "BaselineConfig":
        """Instantiates and validates a BaselineConfig from a dictionary."""
        config = cls(**data)
        config.validate()
        return config


def get_default_baseline_config() -> BaselineConfig:
    """Returns a validated default BaselineConfig instance."""
    config = BaselineConfig()
    config.validate()
    return config
