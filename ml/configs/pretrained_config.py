"""
FALCON-404: Pretrained Transfer Learning Experiment Configuration
Milestone: Phase 7.2A.4 — Controlled Experiment 2
Author: Lead Developer & System Architect: Harshad Mane

Description:
    Pre-configured configuration instance for Experiment 2: ImageNet-pretrained
    MobileNetV3-Small transfer learning with frozen feature backbone.
"""

from .baseline_config import BaselineConfig, get_pretrained_experiment_config


def get_experiment_2_config() -> BaselineConfig:
    """Returns the exact configuration for Experiment 2."""
    return get_pretrained_experiment_config()


__all__ = ["BaselineConfig", "get_pretrained_experiment_config", "get_experiment_2_config"]
