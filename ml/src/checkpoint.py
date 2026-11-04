"""
FALCON-404: Model & Training Checkpoint Manager
Phase: 7.2A.3 — Training Pipeline Development
Author: Lead Developer & System Architect: Harshad Mane

Description:
    Safely serializes and resumes PyTorch model states, optimizer states,
    learning rate schedulers, and experiment training metadata.
"""

import os
import logging
from typing import Dict, Any, Optional

try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False

logger = logging.getLogger("falcon404.checkpoint")


class CheckpointManager:
    """
    Manages saving and loading of model checkpoints under an experiment directory.

    Args:
        experiment_dir: Base directory where checkpoints and logs are stored.
        experiment_name: Identifier for the current training experiment.
    """

    def __init__(self, experiment_dir: str = "ml/experiments", experiment_name: str = "baseline"):
        self.experiment_dir = os.path.abspath(experiment_dir)
        self.experiment_name = experiment_name
        self.save_dir = os.path.join(self.experiment_dir, self.experiment_name, "checkpoints")
        os.makedirs(self.save_dir, exist_ok=True)

        self.best_checkpoint_path = os.path.join(self.save_dir, "best_model.pt")
        self.latest_checkpoint_path = os.path.join(self.save_dir, "latest_checkpoint.pt")

    def save_checkpoint(
        self,
        model: "torch.nn.Module",
        optimizer: Optional["torch.optim.Optimizer"] = None,
        scheduler: Optional[Any] = None,
        epoch: int = 1,
        metrics: Optional[Dict[str, Any]] = None,
        config: Optional[Dict[str, Any]] = None,
        is_best: bool = False,
        filename: Optional[str] = None
    ) -> str:
        """
        Saves a training checkpoint.

        Args:
            model: PyTorch model to save.
            optimizer: Optional optimizer state.
            scheduler: Optional LR scheduler state.
            epoch: Current epoch integer.
            metrics: Dictionary of current epoch validation metrics.
            config: Serialized experiment configuration dictionary.
            is_best: If True, also updates best_model.pt.
            filename: Optional custom filename under save_dir.

        Returns:
            Absolute path to the saved checkpoint file.
        """
        if not TORCH_AVAILABLE:
            raise RuntimeError("PyTorch is required for CheckpointManager.")

        # Extract model state dict (unwrapping DataParallel/DDP if necessary)
        raw_model = model.module if hasattr(model, "module") else model
        state_dict = raw_model.state_dict()

        checkpoint: Dict[str, Any] = {
            "epoch": epoch,
            "model_state_dict": state_dict,
            "metrics": metrics or {},
            "config": config or {},
            "falcon_version": "7.2A.3"
        }

        if optimizer is not None:
            checkpoint["optimizer_state_dict"] = optimizer.state_dict()

        if scheduler is not None and hasattr(scheduler, "state_dict"):
            checkpoint["scheduler_state_dict"] = scheduler.state_dict()

        # Target save path
        target_path = os.path.join(self.save_dir, filename) if filename else self.latest_checkpoint_path
        torch.save(checkpoint, target_path)

        if is_best:
            torch.save(checkpoint, self.best_checkpoint_path)

        return target_path

    def load_checkpoint(
        self,
        checkpoint_path: str,
        model: "torch.nn.Module",
        optimizer: Optional["torch.optim.Optimizer"] = None,
        scheduler: Optional[Any] = None,
        device: Optional["torch.device"] = None
    ) -> Dict[str, Any]:
        """
        Restores model weights and optional optimizer/scheduler state from a checkpoint file.

        Args:
            checkpoint_path: Path to .pt checkpoint.
            model: Model into which weights are loaded.
            optimizer: Optional optimizer to restore.
            scheduler: Optional scheduler to restore.
            device: Optional torch.device target.

        Returns:
            Dictionary containing the loaded checkpoint metadata.
        """
        if not TORCH_AVAILABLE:
            raise RuntimeError("PyTorch is required for CheckpointManager.")

        if not os.path.isfile(checkpoint_path):
            raise FileNotFoundError(f"Checkpoint not found at: {checkpoint_path}")

        map_location = device or "cpu"
        # PyTorch 2.6+ defaults weights_only=True; weights_only=False needed for dict metadata
        checkpoint = torch.load(checkpoint_path, map_location=map_location, weights_only=False)

        raw_model = model.module if hasattr(model, "module") else model
        raw_model.load_state_dict(checkpoint["model_state_dict"])

        if optimizer is not None and "optimizer_state_dict" in checkpoint:
            optimizer.load_state_dict(checkpoint["optimizer_state_dict"])

        if scheduler is not None and "scheduler_state_dict" in checkpoint:
            scheduler.load_state_dict(checkpoint["scheduler_state_dict"])

        return checkpoint


def save_checkpoint(
    model: "torch.nn.Module",
    checkpoint_path: str,
    optimizer: Optional["torch.optim.Optimizer"] = None,
    scheduler: Optional[Any] = None,
    epoch: int = 1,
    metrics: Optional[Dict[str, Any]] = None,
    config: Optional[Dict[str, Any]] = None,
) -> str:
    """Convenience functional interface to save a checkpoint to a specific path."""
    os.makedirs(os.path.dirname(os.path.abspath(checkpoint_path)), exist_ok=True)
    raw_model = model.module if hasattr(model, "module") else model
    checkpoint: Dict[str, Any] = {
        "epoch": epoch,
        "model_state_dict": raw_model.state_dict(),
        "metrics": metrics or {},
        "config": config or {},
        "falcon_version": "7.2A.3",
    }
    if optimizer is not None:
        checkpoint["optimizer_state_dict"] = optimizer.state_dict()
    if scheduler is not None and hasattr(scheduler, "state_dict"):
        checkpoint["scheduler_state_dict"] = scheduler.state_dict()

    torch.save(checkpoint, checkpoint_path)
    return checkpoint_path


def load_checkpoint(
    checkpoint_path: str,
    model: "torch.nn.Module",
    optimizer: Optional["torch.optim.Optimizer"] = None,
    scheduler: Optional[Any] = None,
    device: Optional["torch.device"] = None,
) -> Dict[str, Any]:
    """Convenience functional interface to restore a checkpoint from a specific path."""
    if not os.path.isfile(checkpoint_path):
        raise FileNotFoundError(f"Checkpoint not found at: {checkpoint_path}")
    map_location = device or "cpu"
    checkpoint = torch.load(checkpoint_path, map_location=map_location, weights_only=False)
    raw_model = model.module if hasattr(model, "module") else model
    raw_model.load_state_dict(checkpoint["model_state_dict"])
    if optimizer is not None and "optimizer_state_dict" in checkpoint:
        optimizer.load_state_dict(checkpoint["optimizer_state_dict"])
    if scheduler is not None and "scheduler_state_dict" in checkpoint:
        scheduler.load_state_dict(checkpoint["scheduler_state_dict"])
    return checkpoint


def find_best_checkpoint(experiment_dir: str = "ml/experiments", experiment_name: str = "baseline") -> Optional[str]:
    """Finds the best_model.pt checkpoint path if it exists."""
    candidate = os.path.join(os.path.abspath(experiment_dir), experiment_name, "checkpoints", "best_model.pt")
    return candidate if os.path.isfile(candidate) else None

