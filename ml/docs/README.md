# FALCON-404 :: Phase 7.1 Synthetic Dataset Generation Pipeline

**Lead Developer & System Architect:** Harshad Mane  
**Project:** FALCON-404 Forensic Intelligence Platform  
**Milestone:** Phase 7.1A — Synthetic Dataset Generation & Foundation

---

## 1. Overview & Purpose

The **Phase 7.1 Synthetic Dataset Pipeline** establishes the foundational data infrastructure for FALCON-404's machine-learning research. It provides a 100% reproducible, standalone Python pipeline to generate synthetic document-like images, apply controlled forensic alterations, produce exact pixel-level binary ground-truth masks, and compile anti-leakage train/validation/test manifests.

> [!IMPORTANT]
> **Synthetic Compliance & Ethical Boundaries:**
> All generated documents are artificial specimens explicitly rendered with the disclaimer:
> `SYNTHETIC — NOT A VALID ID / FOR RESEARCH USE ONLY`.
> No official government credential formats, emblems, seals, or real individual credentials (such as Aadhaar, PAN, or Passport) are replicated or mocked.

---

## 2. Directory Architecture

```
FALCON-MVP/
├── ml/
│   ├── scripts/
│   │   ├── generate_synthetic_dataset.py   # Dataset generation & partition engine
│   │   └── validate_synthetic_dataset.py   # Automated data & mask verification tool
│   ├── tests/
│   │   └── test_dataset_pipeline.py        # Automated unit test suite
│   └── docs/
│       └── README.md                       # Architecture & execution guide (this file)
└── ml_data/                                # Excluded in .gitignore
    └── phase7_synthetic/
        ├── images/                         # Generated RGB synthetic document images (.png)
        ├── masks/                          # Grayscale binary ground-truth masks (.png)
        ├── dataset_manifest.csv            # Master CSV manifest
        ├── train.jsonl                     # Training split partition
        ├── validation.jsonl                # Validation split partition
        ├── test.jsonl                      # Test split partition
        ├── generation.jsonl                # Append-only generation audit trail
        ├── generation_config.json          # Run metadata & class distribution
        └── validation_report.json          # Machine-readable validation audit report
```

---

## 3. Synthetic Templates & Layouts

The pipeline includes 3 distinct synthetic credential templates with mathematical anti-counterfeiting guilloche wave patterns, typography, and procedural geometric portrait silhouettes:

1. **`ALPHA_CARD`** ($960 \times 600$ px): Corporate / Institutional ID badge with header band, candidate metadata fields, synthetic silhouette photo frame, and machine-readable zone (MRZ) barcode simulation.
2. **`BETA_CERTIFICATE`** ($1000 \times 700$ px): Double-bordered accreditation certificate with centered classical typography, synthetic verification stamp / seal, and accreditation reference numbers.
3. **`GAMMA_PERMIT`** ($900 \times 640$ px): High-security access permit featuring dual-tone security header, right-aligned portrait photo, security classification badges, and checksum block.

---

## 4. Controlled Manipulation Categories

For every pristine identity created, the pipeline generates a paired altered counterpart applying one of five targeted document-tampering modalities:

| Manipulation Type | Description | Forensic Manifestation |
| :--- | :--- | :--- |
| `text_replacement` | Selected text field replaced with forged string over a tinted background patch | Color mismatch, boundary seams, font divergence |
| `copy_move` | Genuine patch (ID number or seal) duplicated and pasted elsewhere on document | Cloned textures, coordinate transposition |
| `portrait_swap` | Portrait frame replaced with an alternate silhouette portrait | Border seam, tone discrepancy, lighting inconsistency |
| `localized_resampling_blur` | Local field downsampled ($4\times$), bilinearly restored, and Gaussian blurred | Edge softness, interpolation artifacts, high-frequency loss |
| `localized_recompression` | Local field cropped, saved at low JPEG quality ($Q=15$), and re-inserted | $8\times 8$ JPEG blocking grid artifacts, ringing |

---

## 5. Ground-Truth Masks & Anti-Leakage Partitioning

### Pixel-Level Binary Masks
- **Format:** Grayscale PNG (`mode="L"`).
- **Dimensions:** Exactly matches the source document canvas ($W \times H$).
- **Values:** Strictly binary:
  - `0`: Untouched pristine pixel.
  - `255`: Altered / manipulated pixel.
- **Pristine Samples:** Mask is completely blank ($0$ altered pixels).
- **Manipulated Samples:** Mask has $>0$ altered pixels matching the modified region bounding box.

### Anti-Leakage Guarantee
Partitions are grouped strictly by `source_sample_id` (identity ID):
- If `ID_0001` is assigned to `train`, its pristine image and **all** its manipulated derivatives reside exclusively in `train`.
- $0\%$ identity overlap exists across `train`, `validation`, and `test`.

---

## 6. Execution Commands

### Prerequisites
Python 3.10+ with `Pillow`:
```bash
python -m pip install Pillow
```

### 1. Generate Smoke Test Dataset (40 samples: 20 pristine, 20 manipulated)
```bash
python ml/scripts/generate_synthetic_dataset.py --num-samples 20 --output-dir ml_data/phase7_synthetic --seed 404
```

### 2. Run Comprehensive Integrity Audit
```bash
python ml/scripts/validate_synthetic_dataset.py --data-dir ml_data/phase7_synthetic
```

### 3. Run Automated Unit Test Suite
```bash
python -m unittest discover -s ml/tests
```

---

## 7. Next Steps: Phase 7.1B

- Implementation of the offline visual **Dataset Explorer** (interactive inspection interface for visual examination of images, masks, and metadata diffs).
- Scaling generation to research volumes as required.
