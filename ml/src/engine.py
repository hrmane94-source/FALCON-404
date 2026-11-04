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

import os
import shutil
import json
import time
import logging
from collections import defaultdict
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
from .visualization import plot_training_curves, plot_confusion_matrix_heatmap
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

    # 6. Loss & Optimizer (Supports two-speed learning rate for fine-tuning)
    criterion = nn.CrossEntropyLoss()
    if (
        hasattr(config, "backbone_lr")
        and config.backbone_lr is not None
        and config.unfreeze_upper_layers is not None
        and config.unfreeze_upper_layers > 0
    ):
        backbone_trainable = [p for p in model.backbone.features.parameters() if p.requires_grad]
        head_trainable = [p for p in model.backbone.classifier.parameters() if p.requires_grad]
        param_groups = [
            {"params": backbone_trainable, "lr": config.backbone_lr, "name": "backbone_features"},
            {"params": head_trainable, "lr": config.learning_rate, "name": "classifier_head"}
        ]
        optimizer = torch.optim.AdamW(
            param_groups,
            weight_decay=config.weight_decay
        )
        logger.info(
            f"Configured two-speed AdamW: {len(backbone_trainable)} backbone tensors (lr={config.backbone_lr}), "
            f"{len(head_trainable)} head tensors (lr={config.learning_rate})"
        )
    else:
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

    # Reset peak memory statistics before training starts
    if device.type == "cuda":
        torch.cuda.reset_peak_memory_stats(device)

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

    exp_dir = os.path.join(config.experiment_dir, config.experiment_name)
    os.makedirs(exp_dir, exist_ok=True)

    peak_allocated_mb = 0.0
    peak_reserved_mb = 0.0
    total_device_vram_gb = dev_info.get("total_memory_gb", 0.0)

    if device.type == "cuda":
        peak_allocated_mb = round(torch.cuda.max_memory_allocated(device) / (1024 ** 2), 2)
        peak_reserved_mb = round(torch.cuda.max_memory_reserved(device) / (1024 ** 2), 2)

    cuda_telemetry = {
        "device_target": str(device),
        "device_name": dev_info.get("device_name", "Unknown"),
        "pytorch_peak_allocated_mb": peak_allocated_mb,
        "pytorch_peak_reserved_mb": peak_reserved_mb,
        "total_hardware_vram_gb": total_device_vram_gb,
        "telemetry_semantics": (
            "pytorch_peak_allocated_mb tracks active tensor memory in PyTorch caching allocator; "
            "pytorch_peak_reserved_mb tracks memory reserved by PyTorch from OS; "
            "total_hardware_vram_gb represents physical GPU memory."
        )
    }

    # Compile validation diagnostics on the best model checkpoint (Validation only, never test)
    val_diagnostics = {}
    if os.path.isfile(checkpoint_mgr.best_checkpoint_path):
        try:
            best_ckpt = torch.load(checkpoint_mgr.best_checkpoint_path, map_location=device)
            model.load_state_dict(best_ckpt["model_state_dict"])
            model.eval()

            data_dir = dataset_root or config.dataset_dir
            eval_tf = val_loader.dataset.transform
            val_diag_ds = FalconDocumentDataset(data_dir, split="validation", transform=eval_tf, return_metadata=True)
            val_diag_loader = DataLoader(val_diag_ds, batch_size=config.batch_size, shuffle=False)

            cat_counts = defaultdict(lambda: {"tn": 0, "fp": 0, "fn": 0, "tp": 0})
            tamp_counts = defaultdict(lambda: {"total": 0, "detected": 0, "missed": 0})
            conf_stats = {"tn": [], "fp": [], "fn": [], "tp": []}

            with torch.inference_mode():
                for images, targets, metas in val_diag_loader:
                    images = images.to(device, non_blocking=True)
                    logits = model(images)
                    probs = torch.softmax(logits, dim=-1)
                    preds = torch.argmax(logits, dim=-1)

                    for i in range(len(targets)):
                        target = int(targets[i].item())
                        pred = int(preds[i].item())
                        p_manip = float(probs[i, 1].item())
                        p_gen = float(probs[i, 0].item())
                        cat = metas["document_category"][i]
                        tamp = metas["tampering_type"][i]

                        if target == 0 and pred == 0:
                            cat_counts[cat]["tn"] += 1
                            conf_stats["tn"].append(p_gen)
                        elif target == 0 and pred == 1:
                            cat_counts[cat]["fp"] += 1
                            conf_stats["fp"].append(p_manip)
                        elif target == 1 and pred == 0:
                            cat_counts[cat]["fn"] += 1
                            tamp_counts[tamp]["missed"] += 1
                            tamp_counts[tamp]["total"] += 1
                            conf_stats["fn"].append(p_gen)
                        elif target == 1 and pred == 1:
                            cat_counts[cat]["tp"] += 1
                            tamp_counts[tamp]["detected"] += 1
                            tamp_counts[tamp]["total"] += 1
                            conf_stats["tp"].append(p_manip)

            per_category = {}
            for cat, c in sorted(cat_counts.items()):
                tot = c["tp"] + c["tn"] + c["fp"] + c["fn"]
                acc = (c["tp"] + c["tn"]) / tot if tot > 0 else 0.0
                rec = c["tp"] / (c["tp"] + c["fn"]) if (c["tp"] + c["fn"]) > 0 else 0.0
                prec = c["tp"] / (c["tp"] + c["fp"]) if (c["tp"] + c["fp"]) > 0 else 0.0
                f1 = 2 * (prec * rec) / (prec + rec) if (prec + rec) > 0 else 0.0
                per_category[cat] = {
                    "accuracy": round(acc, 4),
                    "precision": round(prec, 4),
                    "recall": round(rec, 4),
                    "f1_score": round(f1, 4),
                    "confusion_matrix": c
                }

            per_tampering = {}
            for tamp, c in sorted(tamp_counts.items()):
                rec = c["detected"] / c["total"] if c["total"] > 0 else 0.0
                per_tampering[tamp] = {
                    "total": c["total"],
                    "detected": c["detected"],
                    "missed": c["missed"],
                    "recall": round(rec, 4)
                }

            conf_summary = {}
            for outcome in ["tn", "fp", "fn", "tp"]:
                vals = conf_stats[outcome]
                if vals:
                    conf_summary[outcome] = {
                        "count": len(vals),
                        "mean_confidence": round(sum(vals) / len(vals), 4),
                        "min_confidence": round(min(vals), 4),
                        "max_confidence": round(max(vals), 4),
                    }
                else:
                    conf_summary[outcome] = {"count": 0, "mean_confidence": None}

            val_diagnostics = {
                "per_category": per_category,
                "per_tampering_type": per_tampering,
                "confidence_summary": conf_summary
            }
        except Exception as diag_err:
            logger.warning(f"Failed to compile post-training validation diagnostics: {diag_err}")

    final_summary = {
        "status": "COMPLETED",
        "experiment_name": config.experiment_name,
        "best_epoch": best_epoch,
        "best_val_loss": round(float(best_val_loss), 6),
        "best_val_metrics": best_val_metrics,
        "validation_diagnostics": val_diagnostics,
        "early_stopped": bool(early_stopper.early_stop),
        "total_epochs_executed": epoch,
        "peak_vram_mb": peak_allocated_mb,
        "cuda_telemetry": cuda_telemetry,
        "checkpoints": {
            "best_checkpoint": os.path.join(exp_dir, "best_model.pt"),
            "latest_checkpoint": os.path.join(exp_dir, "latest_checkpoint.pt"),
        },
        "artifacts": {
            "epoch_metrics_csv": os.path.join(exp_dir, "epoch_metrics.csv"),
            "experiment_meta_json": os.path.join(exp_dir, "experiment_meta.json"),
            "training_summary_json": os.path.join(exp_dir, "training_summary.json"),
            "training_curves_png": os.path.join(exp_dir, "training_curves.png"),
            "confusion_matrix_png": os.path.join(exp_dir, "confusion_matrix_validation.png"),
        }
    }

    # Final metadata update
    exp_logger.log_metadata(
        config=config.to_dict(),
        device_info=dev_info,
        final_summary=final_summary
    )

    # 11. Copy/Expose root-level artifacts in ml/experiments/<experiment_id>/
    root_best_pt = os.path.join(exp_dir, "best_model.pt")
    root_latest_pt = os.path.join(exp_dir, "latest_checkpoint.pt")
    root_csv = os.path.join(exp_dir, "epoch_metrics.csv")
    root_meta = os.path.join(exp_dir, "experiment_meta.json")
    root_summary = os.path.join(exp_dir, "training_summary.json")

    if os.path.isfile(checkpoint_mgr.best_checkpoint_path):
        shutil.copyfile(checkpoint_mgr.best_checkpoint_path, root_best_pt)
    if os.path.isfile(checkpoint_mgr.latest_checkpoint_path):
        shutil.copyfile(checkpoint_mgr.latest_checkpoint_path, root_latest_pt)
    if os.path.isfile(exp_logger.csv_path):
        shutil.copyfile(exp_logger.csv_path, root_csv)
    if os.path.isfile(exp_logger.meta_path):
        shutil.copyfile(exp_logger.meta_path, root_meta)

    with open(root_summary, "w", encoding="utf-8") as f:
        json.dump(final_summary, f, indent=2)

    # 12. Render Visual Artifacts
    curves_path = os.path.join(exp_dir, "training_curves.png")
    cm_path = os.path.join(exp_dir, "confusion_matrix_validation.png")
    try:
        plot_training_curves(root_csv, curves_path, title=f"Experiment {config.experiment_name}")
        if best_val_metrics and "confusion_matrix" in best_val_metrics:
            plot_confusion_matrix_heatmap(
                best_val_metrics["confusion_matrix"],
                cm_path,
                title=f"Best Validation Epoch {best_epoch}"
            )
    except Exception as viz_err:
        logger.warning(f"Failed to generate plots: {viz_err}")

    print("\n" + "=" * 70)
    print("TRAINING RUN COMPLETE")
    print(f"Experiment ID:         {config.experiment_name}")
    print(f"Best Epoch:            {best_epoch} (Val Loss: {best_val_loss:.4f})")
    print(f"Best Val Accuracy:     {best_val_metrics.get('accuracy', 0.0)*100:.2f}%")
    print(f"Best Val F1-Score:     {best_val_metrics.get('f1_score', 0.0)*100:.2f}%")
    print(f"Peak VRAM (Active Tensors): {peak_allocated_mb:.2f} MB")
    print(f"Peak VRAM (PyTorch Cache):  {peak_reserved_mb:.2f} MB")
    print(f"Hardware VRAM Total:        {total_device_vram_gb} GB")
    print(f"Best Model:            {root_best_pt}")
    print(f"Training Curves:       {curves_path}")
    print(f"Confusion Matrix Plot: {cm_path}")
    print("=" * 70)

    return final_summary
