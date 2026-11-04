# FALCON-404 :: Phase 7.2A.1 — PyTorch Dataset Adapter & Environment Guide

**Lead Developer & System Architect:** Harshad Mane  
**Project:** FALCON-404 Forensic Intelligence Platform  
**Target Milestone:** Phase 7.2A.1 — Foundational PyTorch Dataset Adapter & Environment  
**Target Dataset:** `ml_data/FALCON_404_DATASET_v1.0/` (v1.0.1 OCR Coordinate Remediation)

---

> [!IMPORTANT]
> **GOVERNANCE & EXPERIMENTAL SYNTHETIC-DATA DISCLAIMER**  
> The synthetic prototype dataset (`ml_data/FALCON_404_DATASET_v1.0/`) is authorized **strictly for controlled algorithmic baseline proof-of-concept experimentation, pipeline debugging, and data loader development**.  
> It is **STRICTLY PROHIBITED** from being used to train final operational fraud screening models or to claim real-world detection accuracy. Real operational benchmarking is reserved for the physical, camera-captured Team Research Dataset (`ml_data/real_training_dataset/`). All artifacts and weights derived from this dataset must remain explicitly designated as *experimental synthetic-data artifacts*.

---

## 1. Environment Architecture & Isolation

FALCON-404 utilizes a local isolated virtual environment (`.venv/`), pre-configured to avoid polluting the global Python environment.

### Target Dependencies (`ml/requirements.txt`)
```text
torch>=2.0.0
torchvision>=0.15.0
pillow>=10.0.0
numpy>=1.24.0
scikit-learn>=1.3.0
matplotlib>=3.7.0
pandas>=2.0.0
```

### Installation Command
For standard CPU execution on Windows/Linux workstations:
```bash
# Create isolated environment
python -m venv .venv

# Activate environment (Windows PowerShell)
.\.venv\Scripts\Activate.ps1

# Install CPU-compatible PyTorch and requirements
pip install -r ml/requirements.txt --extra-index-url https://download.pytorch.org/whl/cpu
```

---

## 2. Dataset Adapter Architecture (`ml/src/dataset.py`)

The `FalconDocumentDataset` class implements a PyTorch `torch.utils.data.Dataset` interface designed for high-throughput image loading, robust error handling, and strict anti-leakage isolation.

### Key Classes and Functions
- **`FalconDocumentDataset`**: Core dataset class loading RGB images, mapping binary labels, and exposing sample metadata.
- **`validate_falcon_dataset`**: Pre-flight verification engine validating sample counts, class balance, category distribution, and group isolation on disk.
- **`DatasetIntegrityError`**: Specific exception raised when manifests or samples violate structural requirements (never silently skips errors).

### Label Mapping Contract
| Manifest Class String | Integer Label | Semantic Meaning |
| :--- | :---: | :--- |
| `"genuine"` | **`0`** | Untampered reference document specimen |
| `"manipulated"` | **`1`** | Controlled alteration (text, photo, copy-move, overlay, shadow) |

---

## 3. Dataset Adapter Usage Examples

### A. Basic PyTorch DataLoader Integration
```python
from torch.utils.data import DataLoader
from torchvision import transforms
from ml.src.dataset import FalconDocumentDataset

# 1. Define standard image transformations
train_transforms = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.RandomHorizontalFlip(p=0.5),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

# 2. Instantiate split-specific datasets
train_dataset = FalconDocumentDataset(
    dataset_root="ml_data/FALCON_404_DATASET_v1.0",
    split="train",
    transform=train_transforms
)

val_dataset = FalconDocumentDataset(
    dataset_root="ml_data/FALCON_404_DATASET_v1.0",
    split="validation",
    transform=transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
)

# 3. Create PyTorch DataLoaders
train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True, num_workers=0)
val_loader = DataLoader(val_dataset, batch_size=32, shuffle=False, num_workers=0)

print(f"Train batches: {len(train_loader)} | Validation batches: {len(val_loader)}")
```

### B. Sample & Metadata Inspection
```python
# Enable metadata return for forensic debugging
debug_dataset = FalconDocumentDataset(
    dataset_root="ml_data/FALCON_404_DATASET_v1.0",
    split="test",
    return_metadata=True
)

image, label, meta = debug_dataset[0]
print(f"Sample ID:   {meta['sample_id']}")
print(f"Category:    {meta['document_category']}")
print(f"Tampering:   {meta['tampering_type']}")
print(f"Group ID:    {meta['group_id']}")
print(f"Binary Label:{label}")
```

---

## 4. Dataset Partitioning & Anti-Leakage Split Policy

Dataset v1.0.1 consists of 600 paired identity groups (1,200 total images). To prevent optimistic performance bias, genuine and manipulated sibling pairs sharing a `group_id` are strictly partitioned into the same split:

```
Total Samples: 1,200 (600 Genuine / 600 Manipulated)
├── Train Split:      840 samples (420 groups — 70.0%)
├── Validation Split: 180 samples ( 90 groups — 15.0%)
└── Test Split:       180 samples ( 90 groups — 15.0%)
```

- **Cross-Split Leakage:** 0 groups cross splits.
- **Category Balance:** Each of the 6 document categories contains exactly 140 train, 30 validation, and 30 test samples.

---

## 5. Automated Pre-Flight Integrity Verification

Run the dataset validation suite programmatically:
```python
from ml.src.dataset import validate_falcon_dataset

report = validate_falcon_dataset("ml_data/FALCON_404_DATASET_v1.0")
print(f"Validation Status: {report['status']}")
print(f"Records Checked:   {report['total_records']}")
print(f"Group Leaks:       {report['leaking_groups']}")
```

---

## 6. Reproducibility & Testing

All dataset adapter functionality is validated by unit tests in `ml/tests/test_dataset_adapter.py`.

To run all unit and regression tests:
```bash
python -m unittest discover -s ml/tests
```
