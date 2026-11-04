# FALCON-404: Experiment 3 Comprehensive Error & Forensic Analysis
**Milestone:** Phase 7.2A.6 — Empirical Error Analysis & Model Diagnostic  
**Lead Developer & System Architect:** Harshad Mane  
**Target Experiment:** `exp_20261104_pretrained_v1_1_harmonized`  
**Dataset:** `ml_data/FALCON_404_DATASET_v1.1` (Harmonized JPEG Quality=88)  
**Evaluation Target:** Validation Split strictly (180 samples: 90 genuine, 90 manipulated). The test split remained completely unconsumed.

---

## 1. Executive Summary & Core Results

Experiment 3 evaluated an ImageNet-pretrained MobileNetV3-Small classifier on the format-harmonized Dataset v1.1. In contrast to Experiment 2 (which exhibited an artificial 100% accuracy due to PNG vs JPEG format leakage), Experiment 3 operated in a sanitized forensic environment where all 1,200 specimens share identical compression standards.

### Overall Performance on Validation Split (Epoch 19 Checkpoint)
* **Total Validation Samples:** 180
* **Validation Accuracy:** 66.67% (120 / 180)
* **Balanced Accuracy:** 66.67%
* **Precision (Manipulated Class):** 100.0% (30 / 30)
* **Recall (Manipulated Class):** 33.33% (30 / 90)
* **Specificity (Genuine Class):** 100.0% (90 / 90)
* **F1-Score (Manipulated Class):** 50.00%
* **Macro F1:** 62.50%
* **Best Validation Loss:** 0.576502 (Epoch 19)
* **Early Stopping:** Triggered at Epoch 26 (patience = 7)

### Confusion Matrix
```
                  Predicted Genuine (0)    Predicted Manipulated (1)    Total
Actual Genuine (0)         90 (TN)                     0 (FP)            90
Actual Manipulated (1)     60 (FN)                    30 (TP)            90
Total                     150                         30                180
```

---

## 2. Category-Level Performance Breakdown

Validation specimens represent 6 distinct document categories (30 samples per category: 15 genuine, 15 manipulated):

| Document Category | Total | Accuracy | Precision | Recall | F1-Score | TN | FP | FN | TP |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **identity_documents** | 30 | 66.7% | 100.0% | 33.3% | 50.0% | 15 | 0 | 10 | 5 |
| **tax_id_documents** | 30 | 73.3% | 100.0% | 46.7% | 63.6% | 15 | 0 | 8 | 7 |
| **driving_credentials** | 30 | 60.0% | 100.0% | 20.0% | 33.3% | 15 | 0 | 12 | 3 |
| **exam_hall_tickets** | 30 | 66.7% | 100.0% | 33.3% | 50.0% | 15 | 0 | 10 | 5 |
| **kyc_documents** | 30 | 70.0% | 100.0% | 40.0% | 57.1% | 15 | 0 | 9 | 6 |
| **student_id** | 30 | 63.3% | 100.0% | 26.7% | 42.1% | 15 | 0 | 11 | 4 |

### Observations:
1. **Zero False Positives Across Every Category:** Across all 6 categories, not a single genuine document was falsely flagged as manipulated ($FP = 0$, Specificity = 100%).
2. **Evenly Distributed False Negatives:** Missed manipulated documents occurred consistently across all categories (8 to 12 false negatives per category).
3. **No Categorical Discrepancy:** The model did not overfit or specialize in any single document layout.

---

## 3. Tampering-Type Detection Analysis (Key Scientific Discovery)

Dissecting the 90 manipulated validation specimens by their underlying forgery mechanism revealed the root cause of the 60 false negatives:

| Tampering Type | Total Samples | Detected (TP) | Missed (FN) | Recall Rate |
| :--- | :---: | :---: | :---: | :---: |
| **photo (Photo Swap / Splicing)** | 17 | 17 | 0 | **100.0%** |
| **shadow (Shadow Inconsistency)** | 13 | 13 | 0 | **100.0%** |
| **text (Text Modification / Font Alteration)** | 21 | 0 | 21 | **0.0%** |
| **copy_move (Cloned Region Duplication)** | 21 | 0 | 21 | **0.0%** |
| **overlay (Stamp / Digital Graphic Overlay)** | 18 | 0 | 18 | **0.0%** |
| **Total Manipulated** | **90** | **30** | **60** | **33.3%** |

### Critical Technical Insight:
* **The Macroscopic vs Microscopic Divide:**
  * The frozen ImageNet backbone detected **100% of macroscopic visual perturbations**:
    * `photo` swaps introduce substantial portrait boundary discontinuities, skin tone mismatches, and facial scale variations. ImageNet weights are heavily populated with human, face, and natural object detectors.
    * `shadow` manipulations alter wide-area lighting gradients and luminosity distributions across the document canvas.
  * In stark contrast, the frozen backbone detected **0% of localized microscopic alterations**:
    * `text` forgery (small numerical/name string replacements within existing lines).
    * `copy_move` (cloning background patterns or seals from within the same document).
    * `overlay` (transparent seals and stamp watermarks).
* **Why ImageNet Weights Fail on Text and Copy-Move Without Fine-Tuning:**
  * Standard ImageNet weights are optimized for large-scale natural object recognition (e.g., golden retriever, airliner, sports car).
  * Natural object classifiers do not inherently possess high-frequency document forensic kernels (such as resampling artifacts, localized edge discontinuities, and pixel-level kerning anomalies).
  * When the convolutional feature extractor (`backbone.features`) is completely frozen, the classifier head can only linearly combine fixed object-level representations. Micro-tampering is invisible to these macroscopic feature maps.

---

## 4. Prediction Confidence Distribution

Analyzing the predicted class probabilities ($\hat{y}$) across validation outcomes explains the model's decision behavior:

| Prediction Outcome | Sample Count ($N$) | Mean Predicted Probability | Minimum Confidence | Maximum Confidence |
| :--- | :---: | :---: | :---: | :---: |
| **True Negatives (TN)** | 90 | $P(\text{genuine}) = 0.5910$ | 0.5407 | 0.6399 |
| **False Positives (FP)** | 0 | N/A | N/A | N/A |
| **False Negatives (FN)** | 60 | $P(\text{genuine}) = 0.5917$ | 0.5407 | 0.6392 |
| **True Positives (TP)** | 30 | $P(\text{manipulated}) = 0.9695$ | 0.9554 | 0.9843 |

### Forensic Implications:
1. **Bimodal Certainty:**
   - When a macroscopic forgery (`photo`, `shadow`) was present, the model fired with extreme confidence ($96.95\%$ mean probability of manipulation).
   - When macroscopic forgeries were absent, the model's feature vectors for genuine documents and micro-tampered documents (`text`, `copy_move`, `overlay`) were essentially identical in the frozen latent space.
2. **Default Bias toward Genuine:**
   - Because the feature vectors for subtle alterations showed no macroscopic anomalies, the model fell back to predicting genuine with a modest margin ($59.1\%$ probability).
   - The probability range for True Negatives ($[0.5407, 0.6399]$) and False Negatives ($[0.5407, 0.6392]$) is virtually indistinguishable, proving that a frozen backbone cannot separate subtle forgery from genuine documents by simply tuning the decision threshold.

---

## 5. Training Loss Progression & Convergence

Examining `epoch_metrics.csv` reveals:
* **Epoch 1:** Training Loss: 0.7045, Validation Loss: 0.6606 (Acc: 53.3%, F1: 63.5%).
* **Epoch 2–6:** Rapid learning of `photo` and `shadow` features. Validation loss drops from 0.6337 to 0.5948.
* **Epoch 12–19:** Gradual plateauing. Training loss drops from 0.5646 to 0.5605; validation loss reaches global minimum at Epoch 19 ($0.576502$).
* **Epoch 20–26:** Validation loss stagnates ($0.5864 \to 0.5832$). The linear head has exhausted the discriminative capacity of the frozen backbone.
* **Epoch 26:** Early stopping halts execution after 7 epochs of non-improvement.

---

## 6. Verification of Leakage Remediation

1. **Format Homogeneity:** All 1,200 specimens in Dataset v1.1 are standardized to JPEG Quality=88. The 100% artificial accuracy from Experiment 2 did not recur.
2. **Healthy Learning Curve:** Validation loss decreased steadily and plateaued at 0.5765, reflecting genuine feature optimization rather than metadata memorization.
3. **Forensic Ground Truth:** The model accurately identified genuine documents (100% specificity) and macroscopic manipulations (100% recall on photo and shadow), while cleanly revealing its architectural bottleneck on localized document text.

---

## 7. Conclusions for Final Model Development

1. **A frozen backbone is fundamentally inadequate for document forensic screening.**
2. **Fine-tuning the upper convolutional layers is strictly necessary:**
   - The top 3 inverted residual blocks of MobileNetV3-Small must be unfrozen (`unfreeze_upper_layers = 3`).
   - This allows the network's higher-level receptive fields to adapt from natural objects to localized document structures, character edges, and patch boundaries.
3. **Two-Speed Learning Rates are required:**
   - Backbone layers must use a gentle learning rate ($2\times 10^{-5}$) to prevent catastrophic forgetting and overfitting on 840 training samples.
   - Classification head should use standard learning rate ($1\times 10^{-4}$).
4. **Early Stopping & Regularization:**
   - AdamW with weight decay ($1\times 10^{-4}$), CosineAnnealingLR, and dropout ($0.2$) must be retained.
