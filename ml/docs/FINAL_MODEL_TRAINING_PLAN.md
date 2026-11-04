# FALCON-404: Final Model Training Plan & Execution Protocol
**Milestone:** Final ML Model Development  
**Lead Developer & System Architect:** Harshad Mane  
**Target Experiment ID:** `exp_20261104_falcon404_final_model`  
**Target Dataset:** `ml_data/FALCON_404_DATASET_v1.1` (Format-Harmonized, JPEG Quality=88)  
**Execution Environment:** Windows 11, Python 3.12 (`.venv`), NVIDIA GeForce RTX 4050 Laptop GPU (6 GB VRAM), CUDA 13.2, PyTorch 2.15.0

---

## 1. Context & Motivation

* **Experiment 1 (`exp_20261104_baseline_mobilenet_v3_small`):** Randomly initialized, frozen backbone. Produced 50.0% chance-level accuracy, confirming that random frozen features lack discriminative capability.
* **Experiment 2 (`exp_20261104_pretrained_mobilenet_v3_small`):** Pretrained ImageNet backbone on Dataset v1.0. Achieved 100% accuracy due to PNG vs JPEG container shortcut leakage.
* **Experiment 3 (`exp_20261104_pretrained_v1_1_harmonized`):** Pretrained ImageNet backbone on format-harmonized Dataset v1.1 with completely frozen features.
  - Achieved 66.67% validation accuracy (Precision: 100%, Specificity: 100%, Recall: 33.3%, F1: 50.0%).
  - Detected 100% of macroscopic anomalies (`photo` and `shadow`), but 0% of localized alterations (`text`, `copy_move`, `overlay`).
  - Proved that frozen natural-object ImageNet kernels cannot detect subtle document tampering without partial fine-tuning.

---

## 2. Final Architectural & Optimization Strategy

To resolve the 60 false negatives observed in Experiment 3 without causing catastrophic forgetting or overfitting on 840 training samples, the final model adopts **controlled partial backbone fine-tuning with two-speed learning rates**.

### 2.1 Model Specifications
* **Architecture:** MobileNetV3-Small (`FalconMobileNetV3`)
* **Pretrained Weights:** ImageNet-1K (`MobileNet_V3_Small_Weights.DEFAULT`)
* **Layer Freezing Configuration:**
  - Feature Blocks 0 through 9: **FROZEN** (282,368 parameters). Low-level edge/texture visual primitives are preserved.
  - Feature Blocks 10, 11, and 12 (Top 3 Inverted Residual Blocks): **UNFROZEN** (`unfreeze_upper_layers = 3`).
  - Classifier Neck & Head: **UNFROZEN**.
* **Parameter Breakdown:**
  - Total Parameters: 1,519,906
  - Trainable Parameters: **1,237,538** (81.4%)
  - Frozen Parameters: **282,368** (18.6%)
* **BatchNorm Governance:** Frozen layers enforce strict `.eval()` mode throughout training via `FalconMobileNetV3.train()` override, eliminating batch statistics drift.

### 2.2 Two-Speed Optimization Protocol
* **Optimizer:** AdamW with weight decay ($1\times 10^{-4}$)
* **Learning Rates:**
  - **Backbone Unfrozen Layers (Blocks 10–12):** $\eta_{\text{backbone}} = 2\times 10^{-5}$ ($0.00002$). Prevents destructive parameter updates to pretrained representations.
  - **Classifier Head:** $\eta_{\text{head}} = 1\times 10^{-4}$ ($0.00010$). Allows rapid adaptation of decision boundaries.
* **Learning Rate Scheduler:** `CosineAnnealingLR` ($T_{\max} = 30$, $\eta_{\min} = 1\times 10^{-6}$), stepped once per epoch. Scales both parameter groups smoothly.
* **Loss Function:** `nn.CrossEntropyLoss` on 2-class raw logits.
* **Batch Size:** 16
* **Maximum Epochs:** 30
* **Early Stopping:**
  - Monitored Metric: `val_loss` (Validation Loss)
  - Mode: `min`
  - Patience: 7 epochs
  - Minimum Delta: 0.0005
* **Hardware Acceleration:** Automatic Mixed Precision (AMP FP16) on CUDA:0. Memory cleared via `set_to_none=True`.

---

## 3. Configuration Dataclass Reference

The configuration is centrally declared in `ml/configs/final_model_config.py` and accessible via `ml.configs.get_final_model_experiment_config()`:

```python
BaselineConfig(
    experiment_name="exp_20261104_falcon404_final_model",
    dataset_dir="ml_data/FALCON_404_DATASET_v1.1",
    model_name="mobilenet_v3_small",
    num_classes=2,
    pretrained=True,
    weights="DEFAULT",
    freeze_features=True,
    unfreeze_upper_layers=3,
    batch_size=16,
    num_epochs=30,
    learning_rate=0.0001,
    backbone_lr=0.00002,
    weight_decay=0.0001,
    random_seed=404,
    deterministic=True,
    mixed_precision=True,
    image_size=(224, 224),
    aspect_ratio_preserve=False,
    early_stopping_patience=7,
    early_stopping_min_delta=0.0005,
    early_stopping_metric="val_loss",
    early_stopping_mode="min"
)
```

---

## 4. Execution Commands

### 4.1 Dry-Run Verification (Completed & Validated)
```powershell
.\.venv\Scripts\python.exe ml/scripts/train.py --experiment-name exp_20261104_falcon404_final_model --dry-run
```
*Result: [PASS] All components, datasets, and GPU tensors validated. Zero epochs executed.*

### 4.2 Production Training Launch Command
```powershell
.\.venv\Scripts\python.exe ml/scripts/train.py --experiment-name exp_20261104_falcon404_final_model
```
*(Alternatively: `.\.venv\Scripts\python.exe ml/scripts/train.py --preset final`)*

---

## 5. Expected Output Artifacts

Upon completion of training, artifacts are saved to:  
`ml/experiments/exp_20261104_falcon404_final_model/`

1. `best_model.pt`: Serialized PyTorch checkpoint of the best validation epoch (includes `model_state_dict`, `optimizer_state_dict`, `scheduler_state_dict`, `epoch`, `metrics`, and full `config`).
2. `latest_checkpoint.pt`: Checkpoint from the final epoch prior to termination.
3. `epoch_metrics.csv`: Per-epoch metrics history (loss, accuracy, precision, recall, F1, learning rates, duration).
4. `experiment_meta.json`: Hardware, platform, dataset, and reproducibility metadata.
5. `training_summary.json`: Detailed post-training summary including validation diagnostics (per-category metrics, per-tampering recall, prediction confidence distributions).
6. `training_curves.png`: High-resolution dual-axis loss and accuracy learning curves.
7. `confusion_matrix_validation.png`: Best validation epoch confusion matrix heatmap.
