# FALCON-404 :: Phase 7.2A.2 — Model Architecture & Image Preprocessing

**Lead Developer & System Architect:** Harshad Mane  
**Project:** FALCON-404 Forensic Intelligence Platform  
**Target Milestone:** Phase 7.2A.2 — MobileNetV3-Small Classifier Architecture & Transforms  
**Target Dataset:** `ml_data/FALCON_404_DATASET_v1.0/` (v1.0.1 OCR Coordinate Corrected)

---

> [!IMPORTANT]
> **GOVERNANCE & EXPERIMENTAL SYNTHETIC-DATA DISCLAIMER**  
> The model architecture and preprocessing pipelines implemented here are designed for **controlled experimental baseline research** using the synthetic research dataset (`ml_data/FALCON_404_DATASET_v1.0/`).  
> **Synthetic dataset performance CANNOT establish real-world fraud detection accuracy, government credential authenticity, or operational identity verification.**  
> The resulting classifier is an explainable screening indicator intended to provide evidentiary anomaly signals to human examiners; it is **NOT** an automated, authoritative decider of document validity.

---

## 1. Why MobileNetV3-Small Was Selected

MobileNetV3-Small was selected as FALCON-404's primary baseline architecture based on the following engineering trade-offs:

1. **Parameter Efficiency Against Overfitting:**
   - Total parameters: **$\sim 1.52\text{M}$** (compared to $>5.3\text{M}$ in EfficientNet-B0 or $>25\text{M}$ in ResNet-50).
   - Given the dataset size of 840 training samples, large over-parameterized networks carry severe risks of memorizing synthetic rendering artifacts. MobileNetV3-Small's compact footprint minimizes this overfitting hazard.
2. **Inverted Residuals & Squeeze-and-Excitation:**
   - MobileNetV3-Small uses depthwise separable convolutions with hard-swish activation and squeeze-and-excitation attention blocks, effectively capturing localized edge anomalies without massive parameter inflation.
3. **Hardware Agnostic (Edge, CPU, & GPU):**
   - High-throughput execution on local workstations equipped with discrete GPUs (such as the NVIDIA RTX 4050 Laptop GPU) while remaining fast on standard CPUs.
4. **Client-Side Privacy Alignment:**
   - With an exported ONNX footprint under $10\text{ MB}$, MobileNetV3-Small enables future direct in-browser WebAssembly/WebGL inference via `onnxruntime-web`, ensuring zero raw document images leave the examiner's workstation.

---

## 2. Architecture Overview (`ml/src/model.py`)

The `FalconMobileNetV3` architecture adapts torchvision's `mobilenet_v3_small` backbone for binary document screening:

```
Input Image [B, 3, 224, 224]
        │
        ▼
Backbone: MobileNetV3-Small Features (13 Inverted Residual & Conv Blocks)
        │ Output: [B, 576, 7, 7]
        ▼
Adaptive Average Pooling: [B, 576, 1, 1]
        │
        ▼
Classification Head (Sequential):
  ├── [0] Linear(576 -> 1024)
  ├── [1] Hardswish()
  ├── [2] Dropout(p=0.2)
  └── [3] Linear(1024 -> 2)  <-- ADAPTED BINARY HEAD
        │
        ▼
Raw Logits Output [B, 2]
  ├── Logit 0: Genuine
  └── Logit 1: Manipulated
```

### Binary Label Contract
| Index | Class Name | Forensic Definition |
| :---: | :--- | :--- |
| **`0`** | **Genuine** | Pristine, unaltered document specimen. |
| **`1`** | **Manipulated** | Controlled image alteration (splicing, text replacement, photo swap, copy-move, shadow inconsistency). |

---

## 3. Transfer Learning & Layer-Freezing Strategy

To enable flexible experimentation from linear probing to full end-to-end training:

1. **Linear Probing (`freeze_features=True, unfreeze_upper_layers=None`):**
   - Freezes all 13 feature extraction blocks ($927,472$ parameters).
   - Only the classification neck ($592,434$ parameters) is updated.
   - Ideal for quick initial convergence on small sample sets.
2. **Fine-Tuning (`freeze_features=True, unfreeze_upper_layers=N`):**
   - Keeps lower-level convolutional blocks frozen (retaining generic edge and texture filters).
   - Unfreezes the top $N$ feature blocks (e.g., $N=3$) plus the classifier to adapt higher-level document layout features.
3. **Full End-to-End Training (`freeze_features=False`):**
   - All $1,519,906$ parameters remain trainable.

---

## 4. Hardware & Device Management (`ml/src/device.py`)

The hardware management module automatically detects available acceleration without hardcoding hardware names:

```python
from ml.src.device import get_device, get_device_info, get_device_name

device = get_device()  # Automatically selects cuda:0 if available, else cpu
print(f"Active Device: {device} ({get_device_name(device)})")

info = get_device_info()
print(f"CUDA Available: {info['cuda_available']}")
print(f"Total VRAM:     {info.get('total_memory_gb', 'N/A')} GB")
```

On this development machine:
- **Device:** `cuda:0`
- **GPU:** `NVIDIA GeForce RTX 4050 Laptop GPU`
- **VRAM:** `6.0 GB`
- **Compute Capability:** `8.9` (Ada Lovelace)

---

## 5. Image Preprocessing & Transforms (`ml/src/transforms.py`)

All images are standardized to **$224 \times 224$ pixels** with ImageNet channel distribution:
- **Mean:** `[0.485, 0.456, 0.406]`
- **Standard Deviation:** `[0.229, 0.224, 0.225]`

### A. Evaluation Transforms (`get_eval_transforms()`)
- **Deterministic:** Pure bilinear resize followed by tensor normalization.
- Used for validation, testing, and production inference.

### B. Forensic-Safe Training Augmentation (`get_train_transforms()`)
Document screening requires conservative augmentation to avoid destroying tampering evidence:
- **Permitted:**
  - Subtle brightness and contrast variations ($\pm 10\%$) to simulate illumination drift.
  - Mild rotation ($\pm 5^\circ$) with bilinear edge interpolation to simulate scanner/camera skew.
- **Strictly Prohibited:**
  - `RandomResizedCrop`: Would crop out localized tampering regions, creating false-negative labels.
  - `GaussianBlur`: Destroys high-frequency edge discontinuities and resampling artifacts.
  - `RandomHorizontalFlip`: Disabled by default because text and logos have strict left-to-right reading orientation.

---

## 6. Code Examples

### Initializing the Model and Running Inference
```python
import torch
from ml.src.model import create_mobilenet_v3_small
from ml.src.device import get_device
from ml.src.transforms import get_eval_transforms
from ml.src.dataset import FalconDocumentDataset

# 1. Hardware setup
device = get_device()

# 2. Instantiate model (offline test mode)
model = create_mobilenet_v3_small(num_classes=2, pretrained=False).to(device)
model.eval()

# 3. Load dataset sample
eval_transforms = get_eval_transforms()
dataset = FalconDocumentDataset("ml_data/FALCON_404_DATASET_v1.0", split="test", transform=eval_transforms)
image_tensor, true_label = dataset[0]

# 4. Forward pass
batch = image_tensor.unsqueeze(0).to(device)  # shape [1, 3, 224, 224]
with torch.inference_mode():
    logits = model(batch)                     # shape [1, 2]
    probabilities = torch.softmax(logits, dim=-1)

genuine_prob = probabilities[0, 0].item()
manipulated_prob = probabilities[0, 1].item()
print(f"True Label: {true_label} | Manipulated Probability: {manipulated_prob:.4f}")
```

---

## 7. Automated Testing Suite

All model architecture and transform capabilities are covered by unit tests:
- **`ml/tests/test_model.py`:** Tests initialization, binary head dimensions, output shapes `[batch_size, 2]`, layer freezing, fine-tuning configurations, and CPU/CUDA compatibility.
- **`ml/tests/test_transforms.py`:** Tests image dimensions, RGB conversion, normalization, determinism, and augmentation safety.

Run test suite:
```bash
python -m unittest discover -s ml/tests
```
