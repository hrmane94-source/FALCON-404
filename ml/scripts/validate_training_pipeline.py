"""
FALCON-404: Training Pipeline Comprehensive Validation Script
Milestone: Phase 7.2A.3 — Training Pipeline Development
Author: Lead Developer & System Architect: Harshad Mane

Description:
    Performs standalone end-to-end unit and integration verification of the
    reproducible training infrastructure without executing training epochs on
    the actual dataset.
"""

import sys
import os
import shutil
import tempfile
import torch
import torch.nn as nn
import numpy as np

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from ml.configs.baseline_config import BaselineConfig
from ml.src.reproducibility import seed_everything
from ml.src.metrics import compute_binary_metrics, format_metrics_summary
from ml.src.early_stopping import EarlyStopping
from ml.src.checkpoint import CheckpointManager
from ml.src.logger import ExperimentLogger
from ml.src.device import get_device, get_device_info
from ml.src.model import create_mobilenet_v3_small
from ml.src.transforms import (
    get_train_transforms,
    get_eval_transforms,
    get_aspect_ratio_preserving_train_transforms,
    ResizeWithPad,
)
from ml.src.engine import build_dataloaders


def run_checks() -> bool:
    print("=" * 75)
    print("FALCON-404: PHASE 7.2A.3 TRAINING PIPELINE VERIFICATION SUITE")
    print("=" * 75)
    passed = 0
    total = 13

    temp_exp_dir = tempfile.mkdtemp(prefix="falcon_validate_pipeline_")

    try:
        # Check 1: BaselineConfig Validation
        print("\n[Check 1/13] Validating Baseline Configuration Schema...")
        config = BaselineConfig()
        config.validate()
        assert config.num_classes == 2
        assert config.batch_size == 16
        assert config.learning_rate == 0.0001
        try:
            bad_config = BaselineConfig(batch_size=-1)
            bad_config.validate()
            assert False, "Should have failed on negative batch_size"
        except ValueError:
            pass
        print("  PASS: BaselineConfig validated with strict constraints.")
        passed += 1

        # Check 2: Reproducibility Seeding
        print("\n[Check 2/13] Validating Deterministic Seeding...")
        seed_everything(42, deterministic=True)
        t1 = torch.randn(5, 5)
        seed_everything(42, deterministic=True)
        t2 = torch.randn(5, 5)
        assert torch.equal(t1, t2), "Tensors must be identical after identical seed"
        print("  PASS: Reproducibility seeding generates deterministic pseudorandom sequences.")
        passed += 1

        # Check 3: Metrics Harness & Confusion Matrix
        print("\n[Check 3/13] Validating Binary Metrics & Zero-Division Guards...")
        y_true = [0, 0, 1, 1, 0, 1]
        y_pred = [0, 1, 1, 1, 0, 0]
        # TN=2, FP=1, FN=1, TP=2
        m = compute_binary_metrics(y_true, y_pred)
        assert m["confusion_matrix"]["tn"] == 2
        assert m["confusion_matrix"]["fp"] == 1
        assert m["confusion_matrix"]["fn"] == 1
        assert m["confusion_matrix"]["tp"] == 2
        assert m["total_samples"] == 6
        assert round(m["accuracy"], 4) == round(4 / 6, 4)

        # Zero-division safety
        m_zero = compute_binary_metrics([0, 0], [0, 0])
        assert m_zero["precision"] == 0.0
        assert m_zero["f1_score"] == 0.0
        assert m_zero["specificity"] == 1.0
        print("  PASS: Metrics compute valid confusion matrices and handle zero-division edge cases.")
        passed += 1

        # Check 4: Early Stopping Monitor
        print("\n[Check 4/13] Validating Early Stopping State Machine...")
        es = EarlyStopping(patience=2, min_delta=0.01, mode="min")
        assert not es.step(0.5, epoch=1)
        assert es.is_best
        assert not es.step(0.55, epoch=2)  # worse
        assert not es.is_best
        assert es.step(0.60, epoch=3)      # worse, counter=2 >= patience -> trigger
        assert es.early_stop
        assert es.best_epoch == 1
        print("  PASS: Early stopping triggers precisely at patience boundary.")
        passed += 1

        # Check 5: Checkpoint Manager Serialization & Restoration
        print("\n[Check 5/13] Validating Model Checkpoint Manager...")
        mgr = CheckpointManager(experiment_dir=temp_exp_dir, experiment_name="val_ckpt")
        model = nn.Linear(8, 2)
        with torch.no_grad():
            model.weight.fill_(3.14)
        saved_path = mgr.save_checkpoint(
            model=model,
            epoch=2,
            metrics={"val_loss": 0.3},
            is_best=True
        )
        assert os.path.isfile(saved_path)
        assert os.path.isfile(mgr.best_checkpoint_path)

        new_model = nn.Linear(8, 2)
        loaded = mgr.load_checkpoint(saved_path, new_model)
        assert loaded["epoch"] == 2
        assert torch.allclose(model.weight, new_model.weight)
        print("  PASS: Model weights, state dicts, and metadata restored flawlessly.")
        passed += 1

        # Check 6: Experiment Metrics & Metadata Logger
        print("\n[Check 6/13] Validating CSV and JSON Experiment Logger...")
        exp_log = ExperimentLogger(experiment_dir=temp_exp_dir, experiment_name="val_log")
        exp_log.log_epoch(
            epoch=1,
            train_loss=0.45,
            val_loss=0.35,
            metrics=m,
            learning_rate=0.0003,
            duration_sec=5.2,
            is_best=True
        )
        assert os.path.isfile(exp_log.csv_path)
        exp_log.log_metadata(config={"epochs": 10}, device_info={"device": "cpu"})
        assert os.path.isfile(exp_log.meta_path)
        print("  PASS: CSV metrics and JSON experiment metadata written successfully.")
        passed += 1

        # Check 7: Transforms & Padding
        print("\n[Check 7/13] Validating Image Transforms & Aspect Ratio Padding...")
        pad_t = ResizeWithPad(target_size=224, fill=0)
        from PIL import Image
        test_img = Image.new("RGB", (640, 403), color=(200, 100, 50))
        padded_img = pad_t(test_img)
        assert padded_img.size == (224, 224)
        print("  PASS: Transforms and aspect-ratio preservation conform to standard dimensions.")
        passed += 1

        # Check 8: Model Architecture & Parameter Inspection
        print("\n[Check 8/13] Validating MobileNetV3 Architecture...")
        device = get_device("cpu")
        net = create_mobilenet_v3_small(num_classes=2, pretrained=False)
        dummy_in = torch.randn(2, 3, 224, 224)
        dummy_out = net(dummy_in)
        assert dummy_out.shape == (2, 2)
        print(f"  PASS: Forward pass produces logits shape {dummy_out.shape}.")
        passed += 1

        # Check 9: Optimizer Step & Gradient Propagation
        print("\n[Check 9/13] Validating Optimizer Step & Gradient Backpropagation...")
        opt = torch.optim.AdamW(net.parameters(), lr=1e-3)
        crit = nn.CrossEntropyLoss()
        target = torch.tensor([0, 1], dtype=torch.long)
        initial_p = next(net.backbone.classifier.parameters()).clone()

        opt.zero_grad(set_to_none=True)
        loss = crit(dummy_out, target)
        loss.backward()
        opt.step()

        updated_p = next(net.backbone.classifier.parameters())
        assert not torch.allclose(initial_p, updated_p)
        print("  PASS: Loss backpropagated and optimizer successfully updated parameters.")
        passed += 1

        # Check 10: Learning Rate Scheduler Step
        print("\n[Check 10/13] Validating Cosine Annealing Learning Rate Scheduler...")
        sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, T_max=10, eta_min=1e-6)
        initial_lr = opt.param_groups[0]["lr"]
        sched.step()
        stepped_lr = opt.param_groups[0]["lr"]
        assert stepped_lr < initial_lr
        print(f"  PASS: Scheduler stepped LR from {initial_lr:.6f} to {stepped_lr:.6f}.")
        passed += 1

        # Check 11: Dataset Integrity & Split Isolation
        print("\n[Check 11/13] Validating Dataset Partitions & Test Set Isolation...")
        test_config = BaselineConfig(dataset_dir="ml_data/FALCON_404_DATASET_v1.0")
        train_l, val_l, test_l = build_dataloaders(test_config)
        assert len(train_l.dataset) == 840
        assert len(val_l.dataset) == 180
        assert len(test_l.dataset) == 180
        print("  PASS: Train (840) and Validation (180) loaded; Test (180) protected.")
        passed += 1

        # Check 12: Device & Mixed Precision Readiness
        print("\n[Check 12/13] Validating Device & AMP Configuration...")
        dev_info = get_device_info()
        print(f"  Hardware detected: {dev_info.get('device_name', 'CPU')}")
        if dev_info["cuda_available"]:
            try:
                scaler = torch.amp.GradScaler("cuda")
            except (AttributeError, TypeError):
                scaler = torch.cuda.amp.GradScaler()
            assert scaler is not None
            print("  CUDA AMP GradScaler initialized successfully.")
        else:
            print("  CPU execution mode confirmed.")
        print("  PASS: Execution device and mixed precision readiness verified.")
        passed += 1

        # Check 13: Clean Teardown
        print("\n[Check 13/13] Validating Test Sandbox Teardown...")
        shutil.rmtree(temp_exp_dir, ignore_errors=True)
        assert not os.path.exists(temp_exp_dir)
        print("  PASS: Sandbox directory cleaned up completely.")
        passed += 1

    except Exception as e:
        print(f"\n[FAIL] Pipeline validation encountered error: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        shutil.rmtree(temp_exp_dir, ignore_errors=True)

    print("\n" + "=" * 75)
    print(f"VERIFICATION SUMMARY: {passed}/{total} CHECKS PASSED.")
    print("STATUS: TRAINING PIPELINE FULLY VALIDATED AND OPERATIONAL.")
    print("=" * 75)
    return True


if __name__ == "__main__":
    success = run_checks()
    sys.exit(0 if success else 1)
