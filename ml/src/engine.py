"""
FALCON-404: Deep Learning Training Engine
Phase: 7.2A.3 — Training Pipeline Development
Author: Lead Developer & System Architect: Harshad Mane

Description:
    Provides robust, reproducible training and evaluation loops for the MobileNetV3
    binary document screening classifier.

Engineering Standards:
    - Optimizer: AdamW with weight decay.
    - Loss: CrossEntropyLoss with 2-class logits.
    - Scheduler: CosineAnnealingLR stepped once per epoch.
    - Hardware Acceleration: CUDA with optional Automatic Mixed Precision (AMP).
    - Memory Management: Efficient gradient clearing with set_to_none=True.
    - Validation Isolation: Validation split is used strictly for model selection.
      The test split is NEVER consumed during training.
"""

import time
import logging
from typing import Dict, Any, Tuple, Optional, List
import torch
import torch.nn as nn
from torch.utils.data import DataLoader

from .dataset import FalconDocumentDataset
from .model import create_mobilenet_v3_small, FalconMobileNetV3
from .device import get_device, get_device_info, is_cuda_available
from .transforms import (
    get_train_transforms,
    get_eval_transforms,
    get_aspect_ratio_preserving_train_transforms,
    get_aspect_ratio_preserving_eval_transforms
)
from .metrics import compute_binary_metrics, format_metrics_summary
from .checkpoint import CheckpointManager
from .early_stopping import EarlyStopping
from .logger import ExperimentLogger
from .reproducibility import seed_everything, seed_worker
from ..configs.baseline_config import BaselineConfig

logger = logging.getLogger("falcon404.engine")


def train_one_epoch(
    model: nn.Module,
    dataloader: DataLoader,
    criterion: nn.Module,
    optimizer: torch.optim.Optimizer,
    device: torch.device,
    scaler: Optional[torch.cuda.amp.GradScaler] = None
) -> float:
    """
    Executes one training epoch.

    Args:
        model: PyTorch model.
        dataloader: Training DataLoader.
        criterion: Loss function (e.g. CrossEntropyLoss).
        optimizer: Optimizer (e.g. AdamW).
        device: Target execution device.
        scaler: Optional GradScaler for mixed precision.

    Returns:
        Average training loss across all batches.
    """
    model.train()
    total_loss = 0.0
    total_batches = 0

    for batch_idx, (images, targets) in enumerate(dataloader):
        images = images.to(device, non_blocking=True)
        targets = targets.to(device, non_blocking=True)

        optimizer.zero_grad(set_to_none=True)

        try:
            if scaler is not None and device.type == "cuda":
                with torch.amp.autocast(device_type="cuda"):
                    outputs = model(images)
                    loss = criterion(outputs, targets)
                scaler.scale(loss).backward()
                scaler.step(optimizer)
                scaler.update()
            else:
                outputs = model(images)
                loss = criterion(outputs, targets)
                loss.backward()
                optimizer.step()

        except torch.cuda.OutOfMemoryError as oom:
            logger.error(
                f"CUDA OutOfMemoryError in batch {batch_idx}. "
                f"Batch size: {images.shape[0]}, Device: {device}. "
                "Reduce config.batch_size or enable config.mixed_precision."
            )
            raise oom

        total_loss += loss.item()
        total_batches += 1

    return total_loss / max(1, total_batches)


def validate_one_epoch(
    model: nn.Module,
    dataloader: DataLoader,
    criterion: nn.Module,
    device: torch.device
) -> Tuple[float, Dict[str, Any]]:
    """
    Evaluates model on validation split in inference mode.

    Args:
        model: PyTorch model.
        dataloader: Validation DataLoader.
        criterion: Loss function.
        device: Target execution device.

    Returns:
        Tuple of (average_validation_loss, metrics_dictionary).
    """
    model.eval()
    total_loss = 0.0
    total_batches = 0
    all_targets: List[int] = []
    all_preds: List[int] = []

    with torch.inference_mode():
        for images, targets in dataloader:
            images = images.to(device, non_blocking=True)
            targets = targets.to(device, non_blocking=True)

            outputs = model(images)
            loss = criterion(outputs, targets)

            total_loss += loss.item()
            total_batches += 1

            preds = torch.argmax(outputs, dim=-1)
            all_targets.extend(targets.cpu().tolist())
            all_preds.extend(preds.cpu().tolist())

    avg_loss = total_loss / max(1, total_batches)
    metrics = compute_binary_metrics(all_targets, all_preds)
    return avg_loss, metrics


def build_dataloaders(
    config: BaselineConfig,
    dataset_root: Optional[str] = None
) -> Tuple[DataLoader, DataLoader, Optional[DataLoader]]:
    """
    Constructs train and validation DataLoaders (and optional test loader).
    Ensures group isolation and reproducibility.

    NOTE: The test loader is constructed for interface completeness but MUST NOT
          be evaluated during training.
    """
    data_dir = dataset_root or config.dataset_dir

    # Select transforms
    if config.aspect_ratio_preserve:
        train_tf = get_aspect_ratio_preserving_train_transforms(
            input_size=config.image_size,
            brightness_jitter=config.brightness_jitter,
            contrast_jitter=config.contrast_jitter,
            rotation_degrees=config.rotation_degrees,
            enable_horizontal_flip=config.enable_horizontal_flip
        )
        eval_tf = get_aspect_ratio_preserving_eval_transforms(input_size=config.image_size)
    else:
        train_tf = get_train_transforms(
            input_size=config.image_size,
            brightness_jitter=config.brightness_jitter,
            contrast_jitter=config.contrast_jitter,
            rotation_degrees=config.rotation_degrees,
            enable_horizontal_flip=config.enable_horizontal_flip
        )
        eval_tf = get_eval_transforms(input_size=config.image_size)

    # Instantiate datasets
    train_ds = FalconDocumentDataset(data_dir, split="train", transform=train_tf)
    val_ds = FalconDocumentDataset(data_dir, split="validation", transform=eval_tf)
    test_ds = FalconDocumentDataset(data_dir, split="test", transform=eval_tf)

    # Pin memory when CUDA is used
    use_pin = config.pin_memory and is_cuda_available()

    # Generator for reproducible DataLoader shuffling
    g = torch.Generator()
    g.manual_seed(config.random_seed)

    train_loader = DataLoader(
        train_ds,
        batch_size=config.batch_size,
        shuffle=True,
        num_workers=config.dataloader_workers,
        pin_memory=use_pin,
        worker_init_fn=seed_worker,
        generator=g
    )

    val_loader = DataLoader(
        val_ds,
        batch_size=config.batch_size,
        shuffle=False,
        num_workers=config.dataloader_workers,
        pin_memory=use_pin
    )

    test_loader = DataLoader(
        test_ds,
        batch_size=config.batch_size,
        shuffle=False,
        num_workers=config.dataloader_workers,
        pin_memory=use_pin
    )

    return train_loader, val_loader, test_loader


def run_training(
    config: BaselineConfig,
    dataset_root: Optional[str] = None
) -> Dict[str, Any]:
    """
    Executes full reproducible training workflow governed by config.

    Args:
        config: Validated BaselineConfig instance.
        dataset_root: Optional path override for dataset directory.

    Returns:
        Summary dictionary containing training results, best epoch, and final metrics.
    """
    config.validate()

    # 1. Reproducibility
    seed_info = seed_everything(seed=config.random_seed, deterministic=config.deterministic)

    # 2. Hardware Device
    device = get_device(config.device)
    dev_info = get_device_info()

    # 3. Checkpointing & Logging
    checkpoint_mgr = CheckpointManager(
        experiment_dir=config.experiment_dir,
        experiment_name=config.experiment_name
    )
    exp_logger = ExperimentLogger(
        experiment_dir=config.experiment_dir,
        experiment_name=config.experiment_name
    )
    early_stopper = EarlyStopping(
        patience=config.early_stopping_patience,
        min_delta=config.early_stopping_min_delta,
        mode=config.early_stopping_mode
    )

    # 4. DataLoaders (Train and Validation only; Test is preserved untouched)
    train_loader, val_loader, _ = build_dataloaders(config, dataset_root=dataset_root)

    # 5. Model Factory
    model = create_mobilenet_v3_small(
        num_classes=config.num_classes,
        pretrained=config.pretrained,
        weights=config.weights,
        dropout_rate=config.dropout_rate,
        freeze_features=config.freeze_features,
        unfreeze_upper_layers=config.unfreeze_upper_layers
    ).to(device)

    # 6. Loss & Optimizer
    criterion = nn.CrossEntropyLoss()
    trainable_params = [p for p in model.parameters() if p.requires_grad]
    optimizer = torch.optim.AdamW(
        trainable_params,
        lr=config.learning_rate,
        weight_decay=config.weight_decay
    )

    # 7. Learning Rate Scheduler
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
        optimizer,
        T_max=config.num_epochs,
        eta_min=1e-6
    )

    # 8. Mixed Precision Scaler
    scaler = None
    if config.mixed_precision and device.type == "cuda":
        try:
            scaler = torch.amp.GradScaler("cuda")
        except (AttributeError, TypeError):
            scaler = torch.cuda.amp.GradScaler()

    # 9. Log Initial Experiment Metadata
    exp_logger.log_metadata(
        config=config.to_dict(),
        device_info=dev_info,
        dataset_info={
            "train_samples": len(train_loader.dataset),
            "val_samples": len(val_loader.dataset),
            "random_seed": seed_info
        }
    )

    best_val_loss = float("inf")
    best_val_metrics: Dict[str, Any] = {}
    best_epoch = 0

    print("=" * 70)
    print("FALCON-404 :: EXPERIMENTAL DEEP LEARNING TRAINING RUN")
    print(f"Experiment: {config.experiment_name}")
    print(f"Device:     {device} ({dev_info.get('device_name', 'Unknown')})")
    print(f"Epochs:     {config.num_epochs} | Batch Size: {config.batch_size} | Seed: {config.random_seed}")
    print(f"Backbone:   MobileNetV3-Small (freeze_features={config.freeze_features})")
    print(f"AMP:        {bool(scaler is not None)}")
    print("=" * 70)

    # 10. Training Loop
    for epoch in range(1, config.num_epochs + 1):
        epoch_start = time.time()

        # Train one epoch
        train_loss = train_one_epoch(
            model=model,
            dataloader=train_loader,
            criterion=criterion,
            optimizer=optimizer,
            device=device,
            scaler=scaler
        )

        # Validate one epoch
        val_loss, val_metrics = validate_one_epoch(
            model=model,
            dataloader=val_loader,
            criterion=criterion,
            device=device
        )

        # Step scheduler
        current_lr = optimizer.param_groups[0]["lr"]
        scheduler.step()

        epoch_duration = time.time() - epoch_start

        # Early stopping check
        monitor_val = val_loss if config.early_stopping_metric == "val_loss" else val_metrics.get(config.early_stopping_metric, val_loss)
        should_stop = early_stopper.step(monitor_val, epoch)
        is_best = early_stopper.is_best

        if is_best:
            best_val_loss = val_loss
            best_val_metrics = val_metrics
            best_epoch = epoch

        # Checkpointing
        checkpoint_mgr.save_checkpoint(
            model=model,
            optimizer=optimizer,
            scheduler=scheduler,
            epoch=epoch,
            metrics=val_metrics,
            config=config.to_dict(),
            is_best=is_best
        )

        # Logging
        exp_logger.log_epoch(
            epoch=epoch,
            train_loss=train_loss,
            val_loss=val_loss,
            metrics=val_metrics,
            learning_rate=current_lr,
            duration_sec=epoch_duration,
            is_best=is_best,
            early_stopped=should_stop
        )

        print(
            f"Epoch {epoch:2d}/{config.num_epochs:2d} [{epoch_duration:.1f}s] | "
            f"Train Loss: {train_loss:.4f} | Val Loss: {val_loss:.4f} | "
            f"Val Acc: {val_metrics['accuracy']*100:.1f}% | "
            f"Val F1: {val_metrics['f1_score']*100:.1f}% | "
            f"{'(*BEST*)' if is_best else ''}"
        )

        if should_stop:
            print(f"\n[EARLY STOPPING TRIGGERED] Validation metric failed to improve for {config.early_stopping_patience} epochs.")
            break

    final_summary = {
        "status": "COMPLETED",
        "best_epoch": best_epoch,
        "best_val_loss": best_val_loss,
        "best_val_metrics": best_val_metrics,
        "best_checkpoint_path": checkpoint_mgr.best_checkpoint_path,
        "latest_checkpoint_path": checkpoint_mgr.latest_checkpoint_path,
        "log_csv_path": exp_logger.csv_path,
        "metadata_json_path": exp_logger.meta_path
    }

    # Final metadata update
    exp_logger.log_metadata(
        config=config.to_dict(),
        device_info=dev_info,
        final_summary=final_summary
    )

    print("\n" + "=" * 70)
    print("TRAINING RUN COMPLETE")
    print(f"Best Epoch: {best_epoch} (Val Loss: {best_val_loss:.4f})")
    print(f"Best Model Checkpoint: {checkpoint_mgr.best_checkpoint_path}")
    print(f"Metrics CSV:           {exp_logger.csv_path}")
    print("=" * 70)

    return final_summary
