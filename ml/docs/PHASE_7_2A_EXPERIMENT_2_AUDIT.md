# FALCON-404 — Phase 7.2A.4: Scientific Forensic Audit of Experiment 2
## Investigation of 100% Validation Performance, Dataset Shortcuts, and Pipeline Telemetry

**Document Version:** 1.0.0  
**Milestone:** Phase 7.2A.4 — Experiment 2 Post-Mortem Audit  
**Target Run:** `exp_20261104_pretrained_mobilenet_v3_small`  
**Lead Developer & System Architect:** Harshad Mane  
**Date:** November 2026  
**Audit Classification:** CRITICAL SCIENTIFIC AUDIT (Data-Centric AI & Model Telemetry)

---

## Executive Summary

Experiment 2 evaluated transfer learning using torchvision's ImageNet-pretrained `MobileNetV3-Small` (`MobileNet_V3_Small_Weights.DEFAULT`) with a frozen feature backbone and trainable linear classifier head. The run terminated at Epoch 27 via early stopping, reporting:
* **Best Validation Loss:** `0.009125` at **Epoch 20**
* **Validation Accuracy:** **100.00%** (180 / 180 correct)
* **Validation F1-Score:** **100.00%** (Precision: 100%, Recall: 100%, Specificity: 100%)
* **Confusion Matrix:** $\text{TN} = 90$, $\text{FP} = 0$, $\text{FN} = 0$, $\text{TP} = 90$
* **Reported Peak VRAM:** `53.63 MB`

A superficial reading would interpret this as a breakthrough. However, rigorous forensic analysis reveals that **the 100% validation accuracy is a synthetic dataset artifact caused by a 100% format and compression shortcut, NOT document forgery detection.**

Specifically:
1. **100% File Format Shortcut:** Every single genuine specimen ($600/600$) is stored in lossless **PNG** format, while every single manipulated specimen ($600/600$) is stored in lossy **JPEG** format.
2. **100% Disjoint File Size Distribution:** Genuine file sizes range from 69,527 to 75,525 bytes (mean: 72,268 B), while manipulated file sizes range from 35,711 to 39,147 bytes (mean: 36,862 B). There is a ~30,000-byte gap between the two classes.
3. **High-Frequency Compression Artifacts:** ImageNet-pretrained early convolutional filters easily detect global JPEG $8 \times 8$ Discrete Cosine Transform (DCT) blocking and chroma subsampling grids, rendering localized document fraud detection completely bypassed.
4. **Metric & Early Stopping Validation:** The selection of Epoch 20 over Epoch 21 (which had a slightly lower loss of $0.009043$) was mathematically correct: the difference ($\Delta = 0.000082$) fell below the configured `min_delta = 0.0005`, strictly following the early-stopping specification.
5. **GPU VRAM Telemetry Clarification:** The reported `53.63 MB` reflects active PyTorch tensor allocations in the caching allocator (dominated by batch tensors, optimizer states, and classifier head gradients under a frozen backbone), but omits CUDA driver context (~400 MB) and caching allocator reserved blocks.

---

## 1. Dataset Shortcut Forensic Audit

### 1.1 Mutual Information & File Format Correlation
An exhaustive inspection across all 1,200 specimens in `ml_data/FALCON_404_DATASET_v1.0/` revealed a catastrophic format leakage between classes:

| Class | Ground-Truth Count | File Extension | PIL Image Format | Format Leakage Correlation ($r$) |
| :--- | :---: | :---: | :---: | :---: |
| **Genuine** | 600 | `.png` (600 / 600) | `PNG` (600 / 600) | **$1.000$ (100% PNG)** |
| **Manipulated** | 600 | `.jpg` (600 / 600) | `JPEG` (600 / 600) | **$1.000$ (100% JPEG)** |

This configuration is codified in `ml_data/FALCON_404_DATASET_v1.0/dataset_config.json`:
```json
"formats": [
  "PNG",
  "JPEG"
]
```
During dataset generation in `generate_synthetic_dataset.py`, pristine baseline images were exported as PNGs, whereas manipulated variants were exported as JPEGs.

### 1.2 File Size Disparity Analysis
Because PNG employs lossless DEFLATE compression while JPEG uses lossy discrete cosine transform quantization, the file size distributions across splits are completely disjoint:

| Split & Class | Specimen Count | Mean Size (Bytes) | Std Dev (Bytes) | Min Size (Bytes) | Max Size (Bytes) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Train — Genuine** | 420 | 72,268.6 B | 1,347.6 B | 69,527 B | 75,420 B |
| **Train — Manipulated** | 420 | 36,862.5 B | 717.2 B | 35,711 B | 39,147 B |
| **Val — Genuine** | 90 | 72,301.0 B | 1,338.4 B | 69,547 B | 75,459 B |
| **Val — Manipulated** | 90 | 36,853.7 B | 727.6 B | 35,808 B | 38,912 B |
| **Test — Genuine** | 90 | 72,193.6 B | 1,367.8 B | 69,657 B | 75,525 B |
| **Test — Manipulated** | 90 | 36,930.9 B | 736.3 B | 35,872 B | 38,780 B |

**Statistical Separation:**
* **Minimum Genuine File Size:** 69,527 Bytes (~67.9 KB)
* **Maximum Manipulated File Size:** 39,147 Bytes (~38.2 KB)
* **Inter-Class Margin:** $+30,380$ Bytes (Zero overlap)

### 1.3 High-Frequency Compression & Spectral Energy
Even when images are decoded into raw RGB tensors ($640 \times 403 \times 3$) and normalized for model input, the decompression signatures of JPEG persist:
1. **$8 \times 8$ Pixel Block Artifacts:** Discrete Cosine Transform quantization introduces periodic discontinuities every 8 pixels across the canvas.
2. **Chroma Subsampling:** JPEG compression subsamples the color channels (typically $4:2:0$ or $4:2:2$), attenuating high-frequency color transitions.
3. **Laplacian High-Frequency Energy:**
   Measuring spatial gradient energy via Laplacian filtering across the validation set confirms a structural shift:
   * **Validation Genuine (PNG):** Mean Laplacian energy = **11.8856** ($\sigma = 0.2994$, range: $[11.32, 12.62]$)
   * **Validation Manipulated (JPEG):** Mean Laplacian energy = **12.7341** ($\sigma = 0.3905$, range: $[12.07, 13.68]$)

### 1.4 Group-Level Isolation Verification
We verified independently whether the 600 paired identity groups leaked across splits:
* **Total Unique Specimen Groups:** 600
* **Groups with Samples in Multiple Splits:** **0 (Zero group leakage)**
* **Train:** 420 groups (840 samples)
* **Validation:** 90 groups (180 samples)
* **Test:** 90 groups (180 samples)

**Finding:** Group isolation was enforced correctly. The 100% accuracy was **not** caused by group leakage. Instead, the network exploited the format/compression shortcut present globally across all groups.

---

## 2. Model Architecture & Checkpoint Audit

We loaded and audited the optimal checkpoint:
`ml/experiments/exp_20261104_pretrained_mobilenet_v3_small/best_model.pt`.

### 2.1 Checkpoint Integrity & Parameters
* **Saved Epoch:** 20
* **System Framework Version:** `7.2A.3`
* **Total Parameters:** `1,519,906`
* **Trainable Parameters:** `592,898` (Classifier head)
* **Frozen Parameters:** `927,008` (Backbone features)

### 2.2 Feature Backbone Weights vs Official ImageNet
We compared all 240 state tensors in `model.backbone.features` against torchvision's official `MobileNet_V3_Small_Weights.DEFAULT`:
* **Trainable Weight & Bias Parameters:** **138 / 138 tensors match bit-for-bit ($0$ parameter mismatches).**
  This conclusively proves that the convolutional feature extractor was initialized with ImageNet weights and remained 100% frozen during training.
* **BatchNorm Running Buffers:** **102 tensors** (`running_mean`, `running_var`, `num_batches_tracked`) exhibited tracking updates.
  * *Root Cause:* In PyTorch, calling `model.train()` places all `nn.BatchNorm2d` submodules in training mode, causing them to update their exponential moving averages of batch statistics even when `requires_grad=False`.
  * *Impact:* Minor batch-statistic drift; did not unfreeze convolution kernels.

---

## 3. Training Metrics & Early Stopping Audit

### 3.1 Loss & Accuracy Trajectory (Epochs 1 to 27)

```
Epoch  1: Train Loss 0.5838 | Val Loss 0.8706 | Val Acc  50.0% | Val F1   0.0% (*BEST*)
Epoch  5: Train Loss 0.1863 | Val Loss 1.0169 | Val Acc  55.0% | Val F1  18.2%
Epoch  6: Train Loss 0.1835 | Val Loss 0.6154 | Val Acc  59.4% | Val F1  31.8% (*BEST*)
Epoch  7: Train Loss 0.1443 | Val Loss 0.3508 | Val Acc  71.1% | Val F1  59.4% (*BEST*)
Epoch  8: Train Loss 0.1517 | Val Loss 0.1569 | Val Acc  99.4% | Val F1  99.4% (*BEST*)
Epoch  9: Train Loss 0.1270 | Val Loss 0.0970 | Val Acc 100.0% | Val F1 100.0% (*BEST*)
Epoch 10: Train Loss 0.1114 | Val Loss 0.0283 | Val Acc 100.0% | Val F1 100.0% (*BEST*)
Epoch 14: Train Loss 0.0894 | Val Loss 0.0128 | Val Acc 100.0% | Val F1 100.0% (*BEST*)
Epoch 17: Train Loss 0.1007 | Val Loss 0.0111 | Val Acc 100.0% | Val F1 100.0% (*BEST*)
Epoch 18: Train Loss 0.1112 | Val Loss 0.0097 | Val Acc 100.0% | Val F1 100.0% (*BEST*)
Epoch 20: Train Loss 0.1228 | Val Loss 0.009125 | Val Acc 100.0% | Val F1 100.0% (*BEST*)
Epoch 21: Train Loss 0.0983 | Val Loss 0.009043 | Val Acc 100.0% | Val F1 100.0% (Counter=1)
Epoch 22: Train Loss 0.0788 | Val Loss 0.009153 | Val Acc 100.0% | Val F1 100.0% (Counter=2)
Epoch 23: Train Loss 0.0822 | Val Loss 0.009977 | Val Acc 100.0% | Val F1 100.0% (Counter=3)
Epoch 24: Train Loss 0.0662 | Val Loss 0.009343 | Val Acc 100.0% | Val F1 100.0% (Counter=4)
Epoch 25: Train Loss 0.0681 | Val Loss 0.009512 | Val Acc 100.0% | Val F1 100.0% (Counter=5)
Epoch 26: Train Loss 0.0825 | Val Loss 0.009362 | Val Acc 100.0% | Val F1 100.0% (Counter=6)
Epoch 27: Train Loss 0.0908 | Val Loss 0.009553 | Val Acc 100.0% | Val F1 100.0% (Counter=7 -> HALTED)
```

### 3.2 Audit of Epoch 20 vs Epoch 21 Selection
An audit inquiry asked: **Why was Epoch 20 selected as best when Epoch 21 had a lower validation loss ($0.009043 < 0.009125$)?**

**Mathematical Proof:**
In `BaselineConfig`, early stopping is parameterized by:
* `early_stopping_metric = "val_loss"`
* `early_stopping_mode = "min"`
* `early_stopping_min_delta = 0.0005` ($5 \times 10^{-4}$)
* `early_stopping_patience = 7`

In `ml/src/early_stopping.py:EarlyStopping.step()`:
```python
if self.mode == "min":
    if score < (self.best_score - self.min_delta):
        improvement = True
```
* Best validation loss at Epoch 20: $S_{\text{best}} = 0.009125$
* Required loss threshold for improvement:
  $$\tau = S_{\text{best}} - \text{min\_delta} = 0.009125 - 0.000500 = 0.008625$$
* Validation loss at Epoch 21: $S_{21} = 0.009043$
* Observed Delta:
  $$\Delta = S_{\text{best}} - S_{21} = 0.009125 - 0.009043 = 0.000082$$
* Condition Check:
  $$0.000082 < 0.000500 \implies \text{improvement} = \text{False}$$

**Conclusion:** Epoch 21's improvement was only $82 \times 10^{-6}$, which is smaller than the required minimum margin ($500 \times 10^{-6}$). Therefore, Epoch 20 was correctly preserved as the optimal checkpoint, and `self.counter` incremented from 0 to 1 at Epoch 21. Because loss never broke below $0.008625$, the counter reached 7 at Epoch 27, correctly triggering the early-stop halt.

---

## 4. GPU Memory Measurement Audit

### 4.1 Telemetry Inspection
The summary reported:
`peak_vram_mb: 53.63`

We inspected the measurement code in `ml/src/engine.py:403-405`:
```python
peak_vram_mb = 0.0
if device.type == "cuda":
    peak_vram_mb = round(torch.cuda.max_memory_allocated(device) / (1024 ** 2), 2)
```

### 4.2 Why `max_memory_allocated` Reports 53.63 MB
`torch.cuda.max_memory_allocated()` measures **only the active PyTorch tensor memory managed by `c10::cuda::CUDACachingAllocator`**. It does not measure:
1. PyTorch CUDA context, driver handles, and runtime overhead (~350–500 MB on Windows).
2. CUDA caching allocator reserved pages (`torch.cuda.memory_reserved()`).
3. cuDNN convolution workspace memory buffers.

**Analytical Breakdown of the 53.63 MB Active Tensors:**
* **Model Parameters:** $1,519,906 \times 4 \text{ bytes} \approx 6.08 \text{ MB}$ (FP32)
* **Backbone Gradients:** **0 MB** (Backbone is frozen; `requires_grad=False`)
* **Classifier Parameters & Gradients:** $592,898 \times 4 \times 2 \approx 4.74 \text{ MB}$
* **AdamW Optimizer States:** $592,898 \times 4 \times 2 \text{ (first and second moments)} \approx 4.74 \text{ MB}$
* **Input Batch Tensor:** $16 \times 3 \times 224 \times 224 \times 4 \approx 9.63 \text{ MB}$ (FP32) / $4.82 \text{ MB}$ (FP16 AMP)
* **Classifier Activation Buffers:** $16 \times 1024 \times 4 + 16 \times 2 \times 4 \approx 0.07 \text{ MB}$
* **Loss & Intermediate Reductions:** $< 1 \text{ MB}$
* **Peak Accumulation during Autocast Forward/Backward:** $\approx 35 \text{ to } 55 \text{ MB}$

**Finding:** The reported 53.63 MB is an accurate measurement of active PyTorch tensor allocations. However, reporting `max_memory_allocated()` without also reporting `torch.cuda.max_memory_reserved()` or total device VRAM creates a misleading impression that the system as a whole only used 53 MB.
Furthermore, `torch.cuda.reset_peak_memory_stats(device)` was not invoked prior to the first epoch, meaning any peak allocations during model initialization were retained in the statistic.

---

## 5. Governance & Test Set Protection

1. **Test Set Strict Protection:**
   The test split ($180$ specimens: $90$ genuine, $90$ manipulated) was verified to have remained completely unconsumed. In `engine.py`, `test_loader` was instantiated but never iterated over during training or model selection.
2. **Artifact Preservation:**
   Both `exp_20261104_baseline_mobilenet_v3_small` and `exp_20261104_pretrained_mobilenet_v3_small` are preserved in `ml/experiments/`.
3. **No False Claims:**
   The 100% validation accuracy reflects format shortcut classification (PNG vs JPEG), **NOT authentic identity document manipulation detection.**

---

## 6. Audit Findings & Severity Matrix

| Finding ID | Area | Observation | Severity | Corrective Action |
| :--- | :--- | :--- | :--- | :--- |
| **AUD-01** | Dataset | 100% Genuine is PNG; 100% Manipulated is JPEG. | **CRITICAL** | Normalize entire dataset to a single format (e.g. all PNG or all JPEG with uniform quality). |
| **AUD-02** | Dataset | File sizes are 100% disjoint (Genuine >69KB, Manipulated <39KB). | **CRITICAL** | Re-encode images so file size does not correlate with manipulation label. |
| **AUD-03** | Model | BatchNorm running statistics updated during training mode despite frozen features. | **LOW** | Optionally freeze BatchNorm layers using `.eval()` when backbone is frozen. |
| **AUD-04** | Telemetry | `max_memory_allocated` omits reserved memory and context overhead; missing pre-loop reset. | **MEDIUM** | Add `torch.cuda.reset_peak_memory_stats()` and log both `max_memory_allocated` and `max_memory_reserved`. |
| **AUD-05** | Pipeline | Early stopping correctly preferred Epoch 20 over Epoch 21 due to `min_delta`. | **INFO** | Behavior verified mathematically correct as designed. |

---

## 7. Recommended Action Plan for Phase 7.2A.5

1. **Dataset Normalization (Fixing the Root Cause):**
   * Create an audited dataset migration script that harmonizes all image files to a single container and compression standard (e.g., all 24-bit PNG, or all re-encoded JPEG with identical quality $Q=90$).
   * Re-verify that spatial high-frequency energy and file size distributions overlap naturally between classes.
2. **Telemetry Refinement:**
   * Update `ml/src/engine.py` to call `torch.cuda.reset_peak_memory_stats()` immediately before the training loop starts.
   * Log both `peak_vram_allocated_mb` and `peak_vram_reserved_mb`.
3. **Evaluation Protocol:**
   * Do not evaluate the test split until the dataset format shortcut is eliminated and the model is re-trained on normalized data.
