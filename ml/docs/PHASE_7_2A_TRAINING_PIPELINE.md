# FALCON-404 — Phase 7.2A.3: Reproducible Deep Learning Training Pipeline

**Milestone:** Phase 7.2A.3 — Training Pipeline Development  
**System:** FALCON-404 Document Screening & Forensic Verification Engine  
**Lead Developer & System Architect:** Harshad Mane  
**Date:** November 2026  
**Status:** VALIDATED & OPERATIONAL (Infrastructure Only — Zero Dataset Training Executed)

---

## 1. Executive Summary & Objective

Phase 7.2A.3 establishes the production-grade, reproducible deep learning training infrastructure for FALCON-404's binary document manipulation classifier (`FalconMobileNetV3`).

In strict accordance with project safety guidelines:
* **Infrastructure Validation Only:** All training loops, data loaders, metrics engines, early stopping monitors, checkpoint managers, and experiment loggers were developed and validated end-to-end.
* **Zero Model Training Executed:** Zero training epochs were executed on the active dataset specimens.
* **Test Split Strict Isolation:** The 180 test split samples remain 100% unconsumed and unexamined, reserved exclusively for Phase 7.2A.5 generalization benchmarking.
* **Zero Dataset Mutations:** The underlying dataset `ml_data/FALCON_404_DATASET_v1.0/` remains completely unmodified and verified against its checksums.

---

## 2. Hardware Environment & Runtime Specifications

The training pipeline is optimized for local GPU acceleration on Windows 11:

| Component | Specification | Notes |
| :--- | :--- | :--- |
| **Operating System** | Windows 11 Home (x86_64) | Fully supported |
| **Python Runtime** | Python 3.12.7 (`.venv`) | Isolated virtual environment |
| **Deep Learning Framework** | PyTorch 2.15.0+cu132 | CUDA 13.2 runtime |
| **Vision Library** | Torchvision 0.29.2+cu132 | Native CUDA ops |
| **Target GPU** | NVIDIA GeForce RTX 4050 Laptop GPU | Compute Capability 8.9 (Ada Lovelace) |
| **Dedicated VRAM** | 6.0 GB GDDR6 | Optimal for batch sizes 16–32 |
| **CUDA Acceleration** | Enabled (`cuda:0`) | Mixed Precision (`torch.amp`) supported |
| **Worker Threads** | `dataloader_workers=0` | Recommended for Windows process spawning |

---

## 3. Architecture & Modular Component Breakdown

```
ml/
├── configs/
│   ├── __init__.py
│   └── baseline_config.py          # Central typed dataclass configuration
├── src/
│   ├── __init__.py                 # Clean unified namespace exports
│   ├── dataset.py                  # PyTorch Dataset adapter & split validator
│   ├── device.py                   # Device discovery & VRAM introspection
│   ├── model.py                    # FalconMobileNetV3 architecture
│   ├── transforms.py               # Deterministic eval & conservative train transforms
│   ├── reproducibility.py          # Deterministic seeding harness
│   ├── metrics.py                  # Forensic binary classification metrics
│   ├── early_stopping.py           # Plateau detection & early stopping monitor
│   ├── checkpoint.py               # Checkpoint manager & state persistence
│   ├── logger.py                   # CSV metrics table & JSON experiment metadata
│   └── engine.py                   # train_one_epoch, validate_one_epoch, run_training
├── scripts/
│   ├── train.py                    # Training CLI with safe --dry-run validation
│   └── validate_training_pipeline.py # 13-point diagnostic integration suite
└── tests/
    ├── test_dataset_adapter.py     # Dataset adapter tests
    ├── test_model.py               # Architecture tests
    ├── test_transforms.py          # Preprocessing tests
    ├── test_metrics.py             # Binary metrics & confusion matrix tests
    ├── test_early_stopping.py      # Early stopping monitor tests
    ├── test_checkpoint.py          # Checkpoint serialization tests
    ├── test_logger.py              # Experiment logging tests
    └── test_engine.py              # Training engine loop tests
```

### 3.1 Central Configuration (`ml/configs/baseline_config.py`)
Encapsulates all hyperparameters, hardware toggles, paths, and training flags in a validated Python dataclass:
* `experiment_name`: Unique run identifier (e.g. `baseline_mobilenet_v3_small`).
* `random_seed`: Fixed seed `404` for end-to-end reproducibility.
* `batch_size`: 16 (optimized for 6GB VRAM on RTX 4050).
* `learning_rate`: `0.0001` with `AdamW` and `weight_decay=0.0001`.
* `scheduler`: `CosineAnnealingLR` with `T_max=num_epochs` and `eta_min=1e-6`.
* `early_stopping_patience`: 7 epochs, monitoring validation loss (`mode="min"`).
* `mixed_precision`: Automatic Mixed Precision (`torch.amp`) on CUDA.
* `aspect_ratio_preserve`: Toggle for proportional padding vs direct resize.

### 3.2 Reproducibility Harness (`ml/src/reproducibility.py`)
Ensures bit-for-bit repeatability across identical seeds:
* Sets random seed across Python `random`, `numpy.random`, PyTorch CPU (`torch.manual_seed`), and CUDA devices (`torch.cuda.manual_seed_all`).
* Configures cuDNN determinism (`torch.backends.cudnn.deterministic = True`, `torch.backends.cudnn.benchmark = False`).
* Sets environment variable `PYTHONHASHSEED`.
* Provides `seed_worker` for multi-process PyTorch DataLoader workers.

### 3.3 Forensic Metrics Harness (`ml/src/metrics.py`)
Maintains strict binary classification semantics:
* **Class 0: Genuine** (Reference negative class).
* **Class 1: Manipulated** (Forensic positive class).
* **Metrics Calculated:**
  * Accuracy: `(TP + TN) / Total`
  * Precision: `TP / (TP + FP)` (Zero-division safe fallback to `0.0`)
  * Recall / Sensitivity: `TP / (TP + FN)`
  * Specificity / Genuine Recall: `TN / (TN + FP)`
  * Balanced Accuracy: `(Recall + Specificity) / 2.0`
  * F1-Score: Harmonic mean of precision and recall.
  * Macro F1-Score: `(F1_Manipulated + F1_Genuine) / 2.0`
  * Confusion Matrix: Explicit `{tn, fp, fn, tp}` breakdown.

### 3.4 Early Stopping Monitor (`ml/src/early_stopping.py`)
Guards against overfitting and unnecessary GPU computation:
* Tracks `best_score` and `best_epoch`.
* Supports `min` mode (loss) and `max` mode (F1/accuracy).
* Enforces `min_delta` threshold to qualify improvements.
* Automatically halts training when `patience` epochs elapse without progress.

### 3.5 Checkpoint Manager (`ml/src/checkpoint.py`)
Safely manages experiment artifacts under `ml/experiments/` (gitignored):
* Saves full training state: `epoch`, `model_state_dict`, `optimizer_state_dict`, `scheduler_state_dict`, `metrics`, `config`, `falcon_version`.
* Persists `latest_checkpoint.pt` every epoch.
* Automatically mirrors the optimal checkpoint to `best_model.pt`.
* Safe deserialization using `weights_only=False` to handle structured dictionary metadata.

### 3.6 Experiment Logger (`ml/src/logger.py`)
Generates comprehensive experiment records:
* **`epoch_metrics.csv`:** Tabular log with 18 columns including train loss, val loss, accuracy, precision, recall, specificity, F1, TN, FP, FN, TP, LR, epoch duration, is_best, and early_stopped.
* **`experiment_meta.json`:** Structured metadata snapshot storing complete hyperparameter config, hardware execution profile, dataset partitions, and final summary.

### 3.7 Training Engine (`ml/src/engine.py`)
High-performance execution loop:
* `train_one_epoch`: Model training with gradient zeroing (`set_to_none=True`), optional AMP (`torch.amp.autocast`), and CUDA OOM diagnostic logging.
* `validate_one_epoch`: Inference evaluation using `torch.inference_mode()` on validation DataLoader only.
* `run_training`: Orchestrates full lifecycle: reproducibility seeding, hardware setup, model factory, loss, optimizer, scheduler, early stopping, and artifact logging.
* `build_dataloaders`: Constructs isolated DataLoaders with deterministic generator seeds.

---

## 4. Aspect Ratio Preservation vs Direct Resizing Investigation

### 4.1 Geometric Deformation Analysis
* Native Synthetic Specimen Resolution: **640 × 403 pixels** (Aspect Ratio ≈ **1.588:1**, ~16:10).
* Target Model Input Size: **224 × 224 pixels** (Aspect Ratio **1.0:1**, square).

When applying direct bilinear resizing:
$$\text{scale}_x = \frac{224}{640} = 0.3500$$
$$\text{scale}_y = \frac{224}{403} \approx 0.5558$$
$$\text{Anisotropic Distortion Ratio} = \frac{\text{scale}_y}{\text{scale}_x} \approx 1.588$$

**Impact:** Direct resizing vertically stretches or horizontally compresses the document by ~37%. Characters, numerals, and microprint are squeezed horizontally, altering the native aspect ratio of fonts and spacing.

### 4.2 Proportional Scaling with Neutral Padding (`ResizeWithPad`)
To mitigate glyph deformation, we designed and implemented `ResizeWithPad`:
* Calculates uniform scaling factor:
  $$\text{scale} = \min\left(\frac{224}{640}, \frac{224}{403}\right) = \frac{224}{640} = 0.3500$$
* Resizes document to **224 × 141 pixels** preserving native geometry.
* Centers image on a 224 × 224 canvas with 41 pixels of top padding and 42 pixels of bottom padding filled with neutral gray (`RGB(128, 128, 128)`).

### 4.3 Engineering Trade-Offs

| Criterion | Direct Resizing (`aspect_ratio_preserve=False`) | Proportional Padding (`aspect_ratio_preserve=True`) |
| :--- | :--- | :--- |
| **Effective Information Density** | 100% of tensor area contains document pixels. | ~63% document pixels, ~37% neutral padding. |
| **Character & Font Geometry** | Horizontally squeezed by ~37%. | 100% preserved native aspect ratio. |
| **Edge Artifacts** | Clean document boundary at image borders. | Artificial contrast boundary at pad margins. |
| **Pretrained Weights Alignment** | Standard ImageNet models expect full image content. | Gray padding may shift early convolutional activations. |

**Architectural Decision:** Both modes are fully implemented and supported. The baseline default is `aspect_ratio_preserve=False` (standard transfer learning practice), with full toggleability via `--aspect-ratio-preserve` for ablation studies in Phase 7.2A.4.

---

## 5. Test Split Strict Isolation Protocol

The dataset partition established in Phase 7.2A.1 contains:
* **Train split:** 840 specimens (420 genuine, 420 manipulated)
* **Validation split:** 180 specimens (90 genuine, 90 manipulated)
* **Test split:** 180 specimens (90 genuine, 90 manipulated)

**Isolation Safeguards:**
1. In `engine.py:run_training()`, only `train_loader` and `val_loader` are supplied to the training and model selection loops.
2. The `test_loader` is NEVER called, iterated over, or evaluated during training epochs.
3. Test split performance will only be measured once in **Phase 7.2A.5 (Independent Evaluation & Generalization Benchmarking)** to prevent hyperparameter over-tuning and data snooping.

---

## 6. Verification and Diagnostic Test Results

### 6.1 Diagnostic Pipeline Verification Suite (`ml/scripts/validate_training_pipeline.py`)
Executed a comprehensive 13-stage synthetic diagnostic suite:

```
===========================================================================
FALCON-404: PHASE 7.2A.3 TRAINING PIPELINE VERIFICATION SUITE
===========================================================================
[Check 1/13] Validating Baseline Configuration Schema...           PASS
[Check 2/13] Validating Deterministic Seeding...                   PASS
[Check 3/13] Validating Binary Metrics & Zero-Division Guards...    PASS
[Check 4/13] Validating Early Stopping State Machine...            PASS
[Check 5/13] Validating Model Checkpoint Manager...                PASS
[Check 6/13] Validating CSV and JSON Experiment Logger...          PASS
[Check 7/13] Validating Image Transforms & Aspect Ratio Padding...  PASS
[Check 8/13] Validating MobileNetV3 Architecture...                PASS
[Check 9/13] Validating Optimizer Step & Gradient Propagation...   PASS
[Check 10/13] Validating Cosine Annealing LR Scheduler...          PASS
[Check 11/13] Validating Dataset Partitions & Test Isolation...     PASS
[Check 12/13] Validating Device & AMP Configuration...             PASS
[Check 13/13] Validating Test Sandbox Teardown...                  PASS
===========================================================================
VERIFICATION SUMMARY: 13/13 CHECKS PASSED.
STATUS: TRAINING PIPELINE FULLY VALIDATED AND OPERATIONAL.
===========================================================================
```

### 6.2 CLI Dry-Run Verification (`ml/scripts/train.py --dry-run`)
Executed non-destructive end-to-end CLI dry-run:
* Device: NVIDIA GeForce RTX 4050 Laptop GPU (6.0 GB VRAM, CC 8.9).
* Dataset: Verified valid (1,200 records, 840 train / 180 val / 180 test).
* Model: MobileNetV3-Small (1,519,906 total parameters; 592,898 trainable; 927,008 frozen).
* DataLoaders: 53 train batches, 12 val batches (batch_size=16). Test split protected.
* Result: `DRY-RUN STATUS: [PASS] All components validated successfully. ZERO training epochs executed.`

### 6.3 Test Suite Pass Rate
* **ML Python Unit Tests:** 68/68 passed (`python -m unittest discover -s ml/tests`).
* **Frontend Verification Tests:** 19/19 passed (`npm test`).
* **Dataset Integrity Audit:** 1,200 images, 0 missing files, 0 group leaks (`Result: PASS`).

---

## 7. Research Governance & Synthetic Limitations Disclaimer

> [!WARNING]
> **EXPERIMENTAL SYNTHETIC BENCHMARK DISCLAIMER**
> 1. All models and configurations developed in Phase 7.2A are constructed and validated using synthetic identity document specimens generated for baseline pipeline feasibility.
> 2. Synthetic specimens exhibit uniform canvas sizing (640 × 403), algorithmic font rendering, and synthetic splicing artifacts that do not reflect the full complexity, sensor noise, optical distortions, and wear-and-tear of authentic physical documents in high-volume screening operations.
> 3. These models are experimental proof-of-concept artifacts and MUST NOT be deployed into real-world identity verification systems or cited as commercial fraud detection benchmarks without fine-tuning and validation against authenticated physical document distributions.
