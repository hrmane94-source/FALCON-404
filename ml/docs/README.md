# FALCON-404 :: Machine Learning Dataset Pipeline & Tooling

**Lead Developer & System Architect:** Harshad Mane  
**Project:** FALCON-404 Forensic Intelligence Platform  
**Milestones Covered:**  
- Phase 7.1A — Synthetic Dataset Generation & Foundation  
- Phase 7.1B — Dataset Organization, Offline Explorer, and Manual Import Preparation  

---

## 1. Overview & Dataset Separation Principle

FALCON-404 employs strict operational separation between two datasets:

1. **Synthetic Test Dataset (`ml_data/phase7_synthetic/`)**:
   - Created programmatically to stress-test dataset generation, ground-truth mask alignment, schema validation, and offline explorer tooling.
   - **NOT used** for training, validating, selecting, or evaluating the final FALCON-404 machine learning models.
2. **Team Research Dataset (`ml_data/real_training_dataset/`)**:
   - Manually curated repository of camera photographs of physical, clearly fictional document specimens and controlled alterations.
   - Reserved for genuine model training and scientific benchmarking.
   - Starts empty until team members conduct physical capture sessions.

> [!IMPORTANT]
> **Ethical Credential Guardrails:**
> All specimens must feature prominent disclaimers: `SYNTHETIC — NOT A VALID ID / FOR RESEARCH USE ONLY`.
> No official government documents (e.g. real Aadhaar cards, PAN cards, driving licences, passports) are ever replicated, photographed, or manipulated.

---

## 2. Directory Architecture

```
FALCON-MVP/
├── ml/
│   ├── scripts/
│   │   ├── generate_synthetic_dataset.py       # Programmatic synthetic generator
│   │   ├── validate_synthetic_dataset.py       # Manifest & mask validator
│   │   └── build_dataset_explorer.py           # Offline visual Dataset Explorer
│   ├── templates/
│   │   └── real_dataset_manifest_template.csv  # Standard CSV template for team data
│   ├── tests/
│   │   ├── test_dataset_pipeline.py            # Generator & validator unit tests
│   │   └── test_dataset_explorer.py            # Dataset Explorer unit tests
│   └── docs/
│       ├── README.md                           # System overview & CLI guide (this file)
│       ├── REAL_DATASET_COLLECTION_GUIDE.md    # Step-by-step guide for team collectors
│       └── DATASET_FORMAT.md                   # Technical schema specifications
│
└── ml_data/                                    # Excluded in .gitignore
    ├── phase7_synthetic/                       # Synthetic test dataset
    │   ├── images/
    │   ├── masks/
    │   ├── dataset_manifest.csv
    │   └── reports/                            # Generated HTML explorer reports
    │       ├── dataset_report.html
    │       ├── dataset_summary.json
    │       └── assets/
    └── real_training_dataset/                  # Curated team research dataset
        ├── README_START_HERE.txt               # Onboarding instructions
        ├── images/
        │   ├── unaltered/
        │   └── altered/
        ├── masks/
        ├── manifests/
        │   └── dataset_manifest.csv
        ├── metadata/
        └── reports/
```

---

## 3. Core CLI Commands

### A. Synthetic Dataset Generation & Validation (Testing Only)
```bash
# Generate synthetic smoke-test dataset (40 samples: 20 pristine, 20 manipulated)
python ml/scripts/generate_synthetic_dataset.py --num-samples 20 --output-dir ml_data/phase7_synthetic --seed 404

# Run automated integrity audit on synthetic dataset
python ml/scripts/validate_synthetic_dataset.py --data-dir ml_data/phase7_synthetic
```

### B. Offline Dataset Explorer (HTML Report & Gallery)
```bash
# Inspect the synthetic test dataset
python ml/scripts/build_dataset_explorer.py --dataset-dir ml_data/phase7_synthetic

# Inspect the team research dataset (reports status honestly if empty)
python ml/scripts/build_dataset_explorer.py --dataset-dir ml_data/real_training_dataset
```

Open the generated report offline directly in any browser:
- `file:///.../FALCON-MVP/ml_data/phase7_synthetic/reports/dataset_report.html`
- `file:///.../FALCON-MVP/ml_data/real_training_dataset/reports/dataset_report.html`

### C. Run All Unit Tests
```bash
python -m unittest discover -s ml/tests
```

---

## 4. Documentation References

- **[REAL_DATASET_COLLECTION_GUIDE.md](file:///c:/Users/Harshad/Documents/FALCON-MVP/ml/docs/REAL_DATASET_COLLECTION_GUIDE.md)**: Full team guide for physical mockup creation, camera photography, manipulation modalities, ground-truth masks, and quality assurance.
- **[DATASET_FORMAT.md](file:///c:/Users/Harshad/Documents/FALCON-MVP/ml/docs/DATASET_FORMAT.md)**: Schema specifications, field requirements, relative path resolution, and security policies.
- **[real_dataset_manifest_template.csv](file:///c:/Users/Harshad/Documents/FALCON-MVP/ml/templates/real_dataset_manifest_template.csv)**: Canonical CSV manifest header template.
