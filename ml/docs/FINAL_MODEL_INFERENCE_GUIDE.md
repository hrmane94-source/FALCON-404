# FALCON-404: Document Tampering Inference Guide & API Reference
**Milestone:** Final ML Model Development  
**Lead Developer & System Architect:** Harshad Mane  
**Module:** `ml.src.inference`  
**CLI Tool:** `ml/scripts/run_inference.py`

---

## 1. Overview & Operational Pipeline

The FALCON-404 Inference Engine provides production-ready document tampering screening. It takes a document image (file path, PIL Image, or tensor), performs pre-processing and aspect-ratio handling, and executes a forward pass through the trained MobileNetV3-Small classifier.

### Decision Taxonomy & Status Logic
The screening engine categorizes each specimen into one of four operational statuses based on the predicted manipulation probability ($P(\text{manipulated})$), decision threshold ($\tau = 0.50$), and review margin ($\delta = 0.10$):

```
       0.0                         0.40              0.60                         1.0
        |----------------------------|-----------------|----------------------------|
        |       [GENUINE]            | [NEEDS_REVIEW]  |       [MANIPULATED]        |
        | Document cleared           | Ambiguous zone  | Forgery detected           |
        | Low risk                   | Human audit     | High risk                  |
```

* **`GENUINE` ($P(\text{manipulated}) < 0.40$):**  
  Document exhibits unaltered characteristics consistent with reference templates. Cleared for automated processing.
* **`MANIPULATED` ($P(\text{manipulated}) > 0.60$):**  
  Document exhibits localized tampering traces (photo swap, shadow discrepancy, character kerning anomalies, or copy-move seams). Flagged for rejection or fraud investigation.
* **`NEEDS_REVIEW` ($0.40 \le P(\text{manipulated}) \le 0.60$):**  
  Document prediction falls within the uncertainty margin around the decision threshold. Routed to human compliance analysts for secondary verification.
* **`ERROR`:**  
  Input is missing, unreadable, or corrupted.

---

## 2. Python API Usage

### 2.1 Initializing the Classifier
```python
from ml.src.inference import FalconDocumentClassifier

# Initialize with the trained checkpoint (auto-detects CUDA / CPU)
classifier = FalconDocumentClassifier(
    checkpoint_path="ml/experiments/exp_20261104_falcon404_final_model/best_model.pt",
    decision_threshold=0.50,
    review_margin=0.10
)
```

### 2.2 Screening a Single Document
```python
# Pass image file path or PIL Image object
result = classifier.predict_image("path/to/identity_card.jpg")

print(f"Status:          {result['status']}")
print(f"Tampering Score: {result['tampering_score'] * 100:.2f}%")
print(f"Confidence:      {result['confidence'] * 100:.2f}%")
print(f"Latency:         {result['inference_time_ms']:.2f} ms")
```

### 2.3 Batched Inference
```python
image_paths = [
    "samples/doc_01.jpg",
    "samples/doc_02.png",
    "samples/doc_03.jpg"
]

results = classifier.predict_batch(image_paths)
for res in results:
    print(f"[{res['status']}] Score: {res['tampering_score']:.3f} | Latency: {res['inference_time_ms']:.1f}ms")
```

### 2.4 Output Payload Specification
Every inference call produces a standardized JSON-serializable dictionary:
```json
{
  "status": "MANIPULATED",
  "predicted_class": "manipulated",
  "predicted_label": 1,
  "probabilities": {
    "genuine": 0.0412,
    "manipulated": 0.9588
  },
  "confidence": 0.9588,
  "tampering_score": 0.9588,
  "decision_threshold": 0.5,
  "review_band": [0.4, 0.6],
  "device": "cuda:0",
  "inference_time_ms": 7.42,
  "error": null
}
```

---

## 3. Command-Line Interface (CLI)

The CLI tool `ml/scripts/run_inference.py` provides standalone screening from the terminal.

### 3.1 Screen a Single Document Image
```powershell
.\.venv\Scripts\python.exe ml/scripts/run_inference.py `
  --image ml_data/FALCON_404_DATASET_v1.1/images/ID_0001_GEN.jpg `
  --checkpoint ml/experiments/exp_20261104_falcon404_final_model/best_model.pt
```

### 3.2 Screen an Entire Directory of Documents
```powershell
.\.venv\Scripts\python.exe ml/scripts/run_inference.py `
  --dir path/to/incoming_documents/ `
  --checkpoint ml/experiments/exp_20261104_falcon404_final_model/best_model.pt
```

### 3.3 Output Machine-Readable JSON
```powershell
.\.venv\Scripts\python.exe ml/scripts/run_inference.py `
  --image path/to/sample.jpg `
  --checkpoint ml/experiments/exp_20261104_falcon404_final_model/best_model.pt `
  --json
```

---

## 4. Performance & Telemetry

* **Inference Latency (NVIDIA GeForce RTX 4050 Laptop GPU):**  
  $\sim 5\text{ ms} - 9\text{ ms}$ per document image ($>110\text{ FPS}$).
* **Inference Latency (CPU fallback, Intel Core i7 / AMD Ryzen):**  
  $\sim 25\text{ ms} - 45\text{ ms}$ per document image.
* **VRAM Footprint:**  
  $< 60\text{ MB}$ dedicated VRAM in `torch.inference_mode()`.
* **Throughput:**  
  Batched inference easily achieves $>200\text{ documents/second}$ on the laptop GPU.
