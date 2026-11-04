"""
FALCON-404: Final Model Experiment Configuration
Milestone: Phase 7.2A.6 / Final Model Preparation
Author: Lead Developer & System Architect: Harshad Mane

Description:
    Pre-configured configuration instance for the final model experiment:
    ImageNet-pretrained MobileNetV3-Small with partial backbone fine-tuning
    (top 3 inverted residual blocks unfrozen) and two-speed learning rates
    on format-harmonized Dataset v1.1.
"""

from .baseline_config import (
    BaselineConfig,
    get_final_model_experiment_config
)


def get_final_config() -> BaselineConfig:
    """Returns the validated BaselineConfig instance for the final production experiment."""
    return get_final_model_experiment_config()


__all__ = [
    "BaselineConfig",
    "get_final_model_experiment_config",
    "get_final_config"
]
