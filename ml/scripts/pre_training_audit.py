"""
FALCON-404: Pre-Training Forensic Audit
Milestone: Phase 7.2A.4 — First Controlled Experimental Model Training
Author: Lead Developer & System Architect: Harshad Mane

Description:
    Performs mandatory 10-point verification prior to executing the baseline
    deep-learning training run.
"""

import sys
import os
import torch
import torch.nn as nn

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from ml.configs.baseline_config import BaselineConfig
from ml.src.dataset import (
    FalconDocumentDataset,
    validate_falcon_dataset,
    LABEL_MAP,
    CLASS_NAMES,
)
from ml.src.device import get_device, get_device_info, is_cuda_available
from ml.src.model import create_mobilenet_v3_small
from ml.src.transforms import get_train_transforms, get_eval_transforms


def run_pre_training_audit() -> bool:
    print("=" * 75)
    print("FALCON-404: PHASE 7.2A.4 PRE-TRAINING AUDIT")
    print("=" * 75)

    dataset_path = "ml_data/FALCON_404_DATASET_v1.0"
    config = BaselineConfig()
    all_passed = True

    # 1. Dataset Integrity
    print("\n[Audit 1/10] Verifying Dataset Integrity...")
    val_report = validate_falcon_dataset(dataset_path)
    status = val_report.get("status")
    print(f"  Validation Status: {status}")
    print(f"  Total Records:     {val_report.get('total_records')}")
    print(f"  Missing Images:    {val_report.get('missing_images')}")
    print(f"  Dim Mismatches:    {val_report.get('dimension_mismatches')}")
    if status != "PASSED" or val_report.get("missing_images", 1) != 0:
        print("  [FAIL] Dataset integrity check failed.")
        all_passed = False
    else:
        print("  [PASS] Dataset integrity confirmed.")

    # 2. Train and Validation Splits
    print("\n[Audit 2/10] Verifying Split Sizes (Train / Validation / Test)...")
    split_dist = val_report.get("split_distribution", {})
    train_count = split_dist.get("train", 0)
    val_count = split_dist.get("validation", 0)
    test_count = split_dist.get("test", 0)
    print(f"  Train:      {train_count} (Expected: 840)")
    print(f"  Validation: {val_count} (Expected: 180)")
    print(f"  Test:       {test_count} (Expected: 180 - STRICTLY PROTECTED)")
    if train_count != 840 or val_count != 180 or test_count != 180:
        print("  [FAIL] Split sample count mismatch.")
        all_passed = False
    else:
        print("  [PASS] Split partition sizes exactly match protocol.")

    # 3. Source Group Overlap Check
    print("\n[Audit 3/10] Verifying Group ID Isolation (Zero Data Leakage)...")
    leaking = val_report.get("leaking_groups", -1)
    unique_groups = val_report.get("unique_groups", 0)
    print(f"  Unique Specimen Groups: {unique_groups} (Expected: 600)")
    print(f"  Leaking Groups:         {leaking} (Expected: 0)")
    if leaking != 0 or unique_groups != 600:
        print("  [FAIL] Group leakage detected between dataset splits.")
        all_passed = False
    else:
        print("  [PASS] Perfect group isolation confirmed (0 leaking groups).")

    # 4. Class Label Mapping Check
    print("\n[Audit 4/10] Verifying Class Semantics & Label Indices...")
    print(f"  LABEL_MAP:   {LABEL_MAP}")
    print(f"  CLASS_NAMES: {CLASS_NAMES}")
    if LABEL_MAP.get("genuine") != 0 or LABEL_MAP.get("manipulated") != 1:
        print("  [FAIL] Class mapping error: Expected genuine=0, manipulated=1.")
        all_passed = False
    else:
        print("  [PASS] Class mapping verified: genuine=0, manipulated=1.")

    # 5 & 6. Model Parameter Count (Total, Trainable, Frozen)
    print("\n[Audit 5 & 6/10] Verifying Model Architecture & Parameter Counts...")
    model = create_mobilenet_v3_small(
        num_classes=config.num_classes,
        pretrained=config.pretrained,
        dropout_rate=config.dropout_rate,
        freeze_features=config.freeze_features,
    )
    param_summary = model.count_parameters()
    total_params = param_summary["total_parameters"]
    trainable_params = param_summary["trainable_parameters"]
    frozen_params = param_summary["frozen_parameters"]

    print(f"  Model:                {config.model_name}")
    print(f"  Total Parameters:     {total_params:,} (Expected: 1,519,906)")
    print(f"  Trainable Parameters: {trainable_params:,} (Expected: 592,898)")
    print(f"  Frozen Parameters:    {frozen_params:,} (Expected: 927,008)")

    if total_params != 1519906 or trainable_params != 592898 or frozen_params != 927008:
        print("  [FAIL] Model parameter counts deviate from baseline specification.")
        all_passed = False
    else:
        print("  [PASS] Parameter distribution matches frozen-backbone linear probing spec.")

    # 7. Preprocessing Configuration
    print("\n[Audit 7/10] Verifying Selected Preprocessing Configuration...")
    print(f"  Input Resolution:        {config.image_size} (Expected: (224, 224))")
    print(f"  Aspect Ratio Preserve:   {config.aspect_ratio_preserve} (Expected: False for Baseline)")
    print(f"  Brightness Jitter:       {config.brightness_jitter}")
    print(f"  Contrast Jitter:         {config.contrast_jitter}")
    print(f"  Rotation Degrees:        {config.rotation_degrees}")
    print(f"  Horizontal Flip:         {config.enable_horizontal_flip} (Preserving text orientation)")
    if config.aspect_ratio_preserve is not False or config.image_size != (224, 224):
        print("  [FAIL] Preprocessing does not match direct-resize baseline specification.")
        all_passed = False
    else:
        print("  [PASS] Preprocessing correctly configured for direct-resize baseline.")

    # 8. CUDA Availability
    print("\n[Audit 8/10] Verifying CUDA Availability...")
    cuda_avail = is_cuda_available()
    device = get_device(config.device)
    print(f"  CUDA Available: {cuda_avail}")
    print(f"  Active Device:  {device}")
    if not cuda_avail or device.type != "cuda":
        print("  [FAIL] CUDA acceleration is not active.")
        all_passed = False
    else:
        print("  [PASS] CUDA acceleration operational.")

    # 9. Available GPU Memory (VRAM)
    print("\n[Audit 9/10] Verifying Available GPU Memory...")
    dev_info = get_device_info()
    vram_total = dev_info.get("total_memory_gb", 0)
    device_name = dev_info.get("device_name", "Unknown")
    allocated = torch.cuda.memory_allocated() / (1024 ** 2) if cuda_avail else 0
    reserved = torch.cuda.memory_reserved() / (1024 ** 2) if cuda_avail else 0

    print(f"  GPU Hardware:       {device_name}")
    print(f"  Total VRAM:         {vram_total} GB (Target: 6.0 GB)")
    print(f"  Allocated VRAM:     {allocated:.2f} MB")
    print(f"  Reserved VRAM:      {reserved:.2f} MB")
    if vram_total < 4.0:
        print("  [FAIL] Insufficient VRAM detected.")
        all_passed = False
    else:
        print("  [PASS] GPU memory capacity verified for batch_size=16.")

    # 10. Optimizer and Scheduler Configuration
    print("\n[Audit 10/10] Verifying Optimizer and Scheduler Configuration...")
    print(f"  Optimizer:     {config.optimizer} (Expected: AdamW)")
    print(f"  Learning Rate: {config.learning_rate} (Expected: 0.0001)")
    print(f"  Weight Decay:  {config.weight_decay} (Expected: 0.0001)")
    print(f"  Scheduler:     {config.scheduler} (Expected: CosineAnnealingLR)")
    print(f"  Patience:      {config.early_stopping_patience} (Expected: 7)")
    print(f"  Max Epochs:    {config.num_epochs} (Expected: 30)")

    if (
        config.optimizer != "AdamW"
        or config.learning_rate != 0.0001
        or config.weight_decay != 0.0001
        or config.scheduler != "CosineAnnealingLR"
        or config.early_stopping_patience != 7
        or config.num_epochs != 30
    ):
        print("  [FAIL] Optimizer or scheduler hyperparameter mismatch.")
        all_passed = False
    else:
        print("  [PASS] Optimization hyperparameter specification verified.")

    print("\n" + "=" * 75)
    if all_passed:
        print("PRE-TRAINING AUDIT STATUS: [PASS] All 10/10 checks verified successfully.")
        print("AUTHORIZATION: Cleared to proceed with first controlled baseline training run.")
    else:
        print("PRE-TRAINING AUDIT STATUS: [FAIL] One or more audit checks failed. STOPPING.")
    print("=" * 75)
    return all_passed


if __name__ == "__main__":
    passed = run_pre_training_audit()
    sys.exit(0 if passed else 1)
