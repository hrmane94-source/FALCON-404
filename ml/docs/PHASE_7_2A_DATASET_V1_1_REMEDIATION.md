# FALCON-404 — Phase 7.2A.5: Dataset Format Leakage Remediation & Benchmark Preparation

**Document Version:** 1.0.0  
**Milestone:** Phase 7.2A.5 — Dataset Format Leakage Remediation  
**Dataset Artifact:** `ml_data/FALCON_404_DATASET_v1.1/`  
**Lead Developer & System Architect:** Harshad Mane  
**Date:** November 2026  
**Status:** **REMEDIATED, CERTIFIED & OPERATIONAL** (All 8/8 Forensic Leakage Audits Passed)

---

## 1. Executive Summary & Objective

In Phase 7.2A.4, Experiment 2 achieved $100\%$ validation accuracy within 9 epochs. However, a rigorous scientific forensic audit established that this outcome was not driven by document tampering detection, but by **$100\%$ format and compression leakage** between ground-truth classes in Dataset v1.0:
* Every genuine specimen was a lossless PNG ($600/600$).
* Every manipulated specimen was a lossy JPEG ($600/600$, Quality=88).
* File size distributions were completely disjoint with a $+30\text{ KB}$ margin.
* MobileNetV3 learned the presence vs. absence of JPEG $8 \times 8$ Discrete Cosine Transform (DCT) blocking rather than document forgery.

**Phase 7.2A.5 Objective:**  
Construct **FALCON_404_DATASET_v1.1** by eliminating all class-correlated file formats, compression quantization discrepancies, and file-size shortcuts while strictly preserving:
1. All 1,200 specimen identities and ground-truth annotations.
2. The exact paired-group $840 / 180 / 180$ train/validation/test split design with zero data leakage.
3. Complete immutability of Dataset v1.0 and prior experiment logs.

---

## 2. Technical Remediation Methodology

### 2.1 The Universal Encoding Pipeline (JPEG Quality=88)
To eliminate format leakage without introducing secondary artifacts (such as saving lossy JPEGs inside PNG wrappers, which preserves the DCT grid in only one class), we established a universal encoding standard:
* **Target Container:** Standard JPEG (`.jpg`)
* **Color Mode:** 24-bit Truecolor RGB (3 channels)
* **Dimensions:** Standardized $640 \times 403$ pixels
* **Quantization Standard:** JPEG Quality = 88 (`PIL.Image.save(..., format='JPEG', quality=88)`)

### 2.2 Encoding Process:
1. **Genuine Specimens (600 samples):**
   * Loaded original pristine PNG specimens from v1.0.
   * Converted to RGB and encoded into JPEG at Quality=88.
   * Generated single-pass JPEG quantization matching the exact luminance table `{0: [4, 3, 2, 4, 6, 10, 12, 15...]}`.
2. **Manipulated Specimens (600 samples):**
   * Copied original manipulated JPEGs directly from v1.0 (which were generated with Quality=88 during initial rendering).
   * Prevents double-compression degradation or re-quantization artifacts.
3. **Result:**
   Both genuine and manipulated classes now possess identical $8 \times 8$ DCT compression grids, identical color subsampling, and identical file containers.

---

## 3. Comprehensive Automated Leakage Audit (8/8 Checks Passed)

The automated forensic audit suite [`ml/scripts/audit_dataset_v1_1.py`](file:///c:/Users/Harshad/Documents/FALCON-MVP/ml/scripts/audit_dataset_v1_1.py) was executed across all 1,200 samples in Dataset v1.1.

| Audit Check | Forensic Property Inspected | Dataset v1.0 (Leaked) | Dataset v1.1 (Remediated) | Status |
| :--- | :--- | :--- | :--- | :---: |
| **Check 1: File Formats** | Extension and container distribution | Genuine: 100% PNG<br>Manipulated: 100% JPG | Genuine: 100% JPG<br>Manipulated: 100% JPG | **PASS** |
| **Check 2: File Sizes** | Distribution overlap across classes | Genuine: $[69.5\text{KB}, 75.5\text{KB}]$<br>Manip: $[35.7\text{KB}, 39.1\text{KB}]$<br>*(Disjoint margin: $+30.4\text{KB}$)* | Genuine: $[35.7\text{KB}, 38.1\text{KB}]$<br>Manip: $[35.7\text{KB}, 39.1\text{KB}]$<br>*(Substantial overlap)* | **PASS** |
| **Check 3: Dimensions & Modes** | Canvas resolution and color channels | $640 \times 403$, RGB | $640 \times 403$, RGB (All 1,200) | **PASS** |
| **Check 4: Quantization Tables** | First 8 DCT luminance coefficients | Genuine: None (PNG)<br>Manip: `[4, 3, 2, 4, 6, 10, 12, 15]` | Genuine: `[4, 3, 2, 4, 6, 10, 12, 15]`<br>Manip: `[4, 3, 2, 4, 6, 10, 12, 15]` | **PASS** |
| **Check 5: Frequency Energy** | Validation Laplacian gradient mean | Genuine: $11.8856$ ($\sigma=0.299$)<br>Manip: $12.7341$ ($\sigma=0.390$)<br>*(Shift: $0.8485$)* | Genuine: $12.6428$ ($\sigma=0.316$)<br>Manip: $12.7341$ ($\sigma=0.393$)<br>*(Shift: $0.0913$)* | **PASS** |
| **Check 6: Watermark Semantics** | Visible markings and annotations | `SYNTHETIC_NOT_VALID` | `SYNTHETIC_NOT_VALID` (All 1,200) | **PASS** |
| **Check 7: Group Isolation** | Paired group leakage across splits | 600 groups, 0 leaking | 600 groups, 0 leaking | **PASS** |
| **Check 8: Filesystem Integrity** | Missing images, masks, or JSONs | 0 missing | 0 missing (100% files present) | **PASS** |

### Statistical Overlap Comparison

```
Dataset v1.0 File Size Gap:
Genuine (PNG):       [====================] (69.5 KB - 75.5 KB)
                                            <-- 30.4 KB GAP -->
Manipulated (JPG):   [=========] (35.7 KB - 39.1 KB)

Dataset v1.1 File Size Harmonization:
Genuine (JPEG Q=88):     [===================] (35.7 KB - 38.1 KB)
Manipulated (JPEG Q=88): [======================] (35.7 KB - 39.1 KB)
                         <-- FULLY OVERLAPPING -->
```

---

## 4. Dataset Directory Structure & Inventory

Location: [`ml_data/FALCON_404_DATASET_v1.1/`](file:///c:/Users/Harshad/Documents/FALCON-MVP/ml_data/FALCON_404_DATASET_v1.1/)

```
ml_data/FALCON_404_DATASET_v1.1/
├── annotations/
│   ├── ocr/                     # 1,200 coordinate-corrected OCR ground-truth JSONs
│   ├── shadow_analysis/         # 1,200 synthetic shadow analysis JSONs
│   └── tampering/               # 1,200 manipulation metadata JSONs
├── docs/
│   ├── DATASET_AUDIT.md         # Audit summary
│   └── TRAINING_PROTOCOL.md     # Protocol documentation
├── images/                      # 1,200 JPEG images (Quality=88)
│   ├── driving_credentials/
│   ├── exam_hall_tickets/
│   ├── identity_documents/
│   ├── kyc_documents/
│   ├── student_id/
│   └── tax_id_documents/
├── masks/                       # 1,200 8-bit grayscale PNG ground-truth masks
├── metadata/
│   ├── test_index.csv           # 180 test sample index
│   ├── train_index.csv          # 840 train sample index
│   └── validation_index.csv     # 180 validation sample index
├── scripts/
│   ├── dataset_stats.py         # Statistical inspection script
│   └── verify_dataset.py        # Independent filesystem verification script
├── DATASET_AUDIT.json           # Machine-readable audit certificate
├── dataset_config.json          # Dataset v1.1 configuration
├── dataset_manifest.csv         # Master manifest linking all 1,200 samples
└── README.md                    # Dataset v1.1 overview
```

---

## 5. Training Pipeline Enhancements (Phase D)

To prepare for scientifically valid experimentation in Experiment 3, two critical improvements were implemented in the core ML codebase:

### 5.1 Strict BatchNorm Freezing in `FalconMobileNetV3`
* **Identified Vulnerability:** In PyTorch, calling `model.train()` places all submodules (including `nn.BatchNorm2d`) into training mode, causing running statistics (`running_mean`, `running_var`) to drift even when parameter weights are frozen (`requires_grad = False`).
* **Correction:** Overrode `train(mode: bool = True)` in [`ml/src/model.py`](file:///c:/Users/Harshad/Documents/FALCON-MVP/ml/src/model.py):
  When `freeze_features = True`, all `BatchNorm2d` layers in frozen feature blocks are explicitly forced into `.eval()` mode during training:
  ```python
  def train(self, mode: bool = True):
      super().train(mode)
      if mode and self.freeze_features:
          num_blocks = len(self.backbone.features)
          frozen_limit = (
              num_blocks - self.unfreeze_upper_layers
              if self.unfreeze_upper_layers is not None and self.unfreeze_upper_layers > 0
              else num_blocks
          )
          for i in range(frozen_limit):
              for m in self.backbone.features[i].modules():
                  if isinstance(m, (nn.BatchNorm2d, nn.SyncBatchNorm)):
                      m.eval()
      return self
  ```
* **Verification:** Unit test `test_frozen_backbone_batchnorm_remains_in_eval_mode` in [`ml/tests/test_model.py`](file:///c:/Users/Harshad/Documents/FALCON-MVP/ml/tests/test_model.py) verifies that running statistics do not change across forward passes in training mode.

### 5.2 Granular CUDA Memory Telemetry in `ml/src/engine.py`
* **Identified Vulnerability:** Previous runs measured `torch.cuda.max_memory_allocated()` without pre-loop reset and without distinguishing active tensor memory from reserved caching allocator memory.
* **Correction:** Updated [`ml/src/engine.py`](file:///c:/Users/Harshad/Documents/FALCON-MVP/ml/src/engine.py):
  1. Invokes `torch.cuda.reset_peak_memory_stats(device)` immediately before the training loop starts.
  2. Telemetry now reports three distinct metrics:
     * `pytorch_peak_allocated_mb`: Peak memory of active tensors (parameters, gradients, activations).
     * `pytorch_peak_reserved_mb`: Memory cached by PyTorch from the operating system.
     * `total_hardware_vram_gb`: Physical GPU memory capacity (6.0 GB on RTX 4050).

---

## 6. Test Suite Pass Rates & Validation

1. **Python ML Test Suite:** **71 / 71 Passed** (`python -m unittest discover -s ml/tests` in 3.24s).
   * Verified model architecture, dataset adapter, transforms, metrics, checkpointing, early stopping, and BatchNorm freeze.
2. **Dataset v1.1 Filesystem Audit:** **PASS** (`python ml_data/FALCON_404_DATASET_v1.1/scripts/verify_dataset.py ml_data/FALCON_404_DATASET_v1.1`).
   * 1,200 images present, 0 missing files, 0 group leaks.
3. **Dataset v1.0 Immutability Verification:** **PASS** (`python ml_data/FALCON_404_DATASET_v1.0/scripts/verify_dataset.py ml_data/FALCON_404_DATASET_v1.0`).
   * Dataset v1.0 remains 100% unmodified.
4. **Frontend Test Suite:** **19 / 19 Passed** (`npm test`).

---

## 7. Readiness for Experiment 3

Dataset v1.1 is certified, validated, and ready for **Experiment 3**. 

When authorized, Experiment 3 can be launched pointing to Dataset v1.1 via:
```powershell
.\.venv\Scripts\python.exe ml/scripts/train.py --dataset-dir ml_data/FALCON_404_DATASET_v1.1 --experiment-name exp_20261104_pretrained_v1_1_harmonized --pretrained --epochs 30 --batch-size 16 --lr 0.0001
```

*(No training epochs have been executed; no Git commits or pushes have been made.)*
