# FALCON-404: Final Model Evaluation Plan & Test Protocol
**Milestone:** Final ML Model Development  
**Lead Developer & System Architect:** Harshad Mane  
**Target Checkpoint:** `ml/experiments/exp_20261104_falcon404_final_model/best_model.pt`  
**Target Dataset:** `ml_data/FALCON_404_DATASET_v1.1` (Format-Harmonized, JPEG Quality=88)  
**Evaluation Split:** **Test Split Strictly** (180 specimens: 90 genuine, 90 manipulated)

---

## 1. Governance & Anti-Leakage Protocol

1. **Test Split Protection:**  
   The test split consists of 180 document specimens (90 genuine, 90 manipulated) across 6 categories. This partition has been strictly quarantined throughout all prior milestones (Phases 7.2A.1 through 7.2A.5) and during Experiment 1, 2, and 3. It must remain completely untouched until training of `exp_20261104_falcon404_final_model` is finished.
2. **One-Shot Evaluation:**  
   The evaluation script is designed to be executed strictly once training completes. No hyperparameter adjustments or architectural modifications may be conditioned on test split outcomes.
3. **Scientific Attribution:**  
   All metrics establish synthetic document screening efficacy under controlled research conditions. Results must never be cited as real-world identity fraud benchmark claims.

---

## 2. Evaluation Infrastructure: `evaluate_final_model.py`

Evaluation is automated through the dedicated script `ml/scripts/evaluate_final_model.py`.

### Execution Command
```powershell
.\.venv\Scripts\python.exe ml/scripts/evaluate_final_model.py --checkpoint ml/experiments/exp_20261104_falcon404_final_model/best_model.pt --dataset-dir ml_data/FALCON_404_DATASET_v1.1 --split test
```

### Script Safety Guarantees
* **Missing Checkpoint Trap:** If executed before model training completes, the script halts with a clear error:
  `[ERROR] Checkpoint file not found: ... Execute model training first before running evaluation.`
* **Inference Mode:** Executes entirely within `torch.inference_mode()`, disabling gradient calculations and reducing VRAM footprint.
* **Deterministic Transformation:** Uses standardized ImageNet evaluation transforms (bicubic resize to $224 \times 224$ and standard normalization).

---

## 3. Evaluation Metrics & Deliverables

The evaluation pipeline produces four structured outputs:

### 3.1 Primary Classification Metrics
* **Accuracy & Balanced Accuracy:** Percentage of total and class-balanced correct predictions.
* **Precision (Manipulated):** Proportion of flagged documents that are truly manipulated ($\frac{TP}{TP + FP}$).
* **Recall (Manipulated):** Proportion of manipulated documents detected ($\frac{TP}{TP + FN}$).
* **Specificity (Genuine):** Proportion of genuine documents correctly cleared ($\frac{TN}{TN + FP}$).
* **F1-Score & Macro F1:** Harmonic mean of precision and recall.
* **Binary Confusion Matrix:** Full count of True Negatives, False Positives, False Negatives, and True Positives.

### 3.2 Category-Level Granular Breakdown
Performance is reported independently across all 6 document categories:
1. `identity_documents` (National IDs, Passports)
2. `tax_id_documents` (Tax Cards, PAN)
3. `driving_credentials` (Driver's Licenses)
4. `exam_hall_tickets` (Admit Cards)
5. `kyc_documents` (Utility Bills, Proof of Address)
6. `student_id` (University IDs)

### 3.3 Tampering-Type Detection Analysis
Assesses detection sensitivity across all 5 forgery mechanisms:
1. `copy_move`: Cloned region duplication.
2. `overlay`: Digital stamp and seal watermarking.
3. `photo`: Portrait swap and headshot splicing.
4. `shadow`: Illicit lighting and shadow modification.
5. `text`: Alphanumeric font, string, and kerning alteration.

### 3.4 Confidence & Calibration Statistics
Mean, minimum, and maximum prediction probabilities are extracted across all outcomes (TN, FP, FN, TP) to quantify classification certainty and boundary margin.

---

## 4. Generated Artifacts

Results are saved directly alongside the model in `ml/experiments/exp_20261104_falcon404_final_model/`:

| Artifact | Format | Description |
| :--- | :---: | :--- |
| `test_evaluation_report.json` | JSON | Machine-readable comprehensive evaluation report containing all global, category, tampering, and confidence metrics. |
| `test_evaluation_per_category.csv` | CSV | Tabular summary of precision, recall, accuracy, and confusion counts per category. |
| `test_predictions.csv` | CSV | Row-by-row prediction audit for all 180 test samples (ground truth, prediction, probabilities, outcome). |
| `confusion_matrix_test.png` | PNG | 300 DPI annotated confusion matrix heatmap. |

---

## 5. Success Criteria & Baseline Comparison

The final model evaluation will be compared against Experiment 3 baseline:

| Metric | Experiment 3 (Frozen Backbone) | Final Target Model | Success Criterion |
| :--- | :---: | :---: | :--- |
| **Accuracy** | 66.67% | **Target: $\ge 80.0\%$** | Statistically significant gain over linear probe |
| **Recall (Manipulated)** | 33.33% | **Target: $\ge 75.0\%$** | Significant reduction of False Negatives |
| **F1-Score** | 50.00% | **Target: $\ge 75.0\%$** | Substantial overall screening balance |
| **Specificity** | 100.0% | **Target: $\ge 90.0\%$** | Low false alarm rate on genuine documents |
| **Text Tampering Recall** | 0.0% | **Target: $\ge 60.0\%$** | Resolves frozen backbone text blindness |
| **Copy-Move Recall** | 0.0% | **Target: $\ge 60.0\%$** | Resolves frozen backbone cloning blindness |
