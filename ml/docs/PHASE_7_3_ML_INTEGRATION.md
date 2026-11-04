# FALCON-404: Phase 7.3 — AI Model Integration Architecture & Runbook
**Milestone:** Phase 7.3 — Integration of Trained AI Document Manipulation Classifier  
**Lead Developer & System Architect:** Harshad Mane  
**Model Architecture:** MobileNetV3-Small (`FalconMobileNetV3`)  
**Active Checkpoint:** `ml/experiments/exp_20261104_falcon404_final_model/best_model.pt`  
**Evaluation Baseline:** Held-out Test Split (Accuracy: 76.67%, Precision: 100%, Recall: 53.33%, F1: 69.57%)  
**Hardware Environment:** NVIDIA GeForce RTX 4050 Laptop GPU (6.0 GB VRAM), Windows 11, Python 3.12 (`.venv`), PyTorch 2.15.0+cu132, Node.js v24

---

## 1. System Architecture & Information Flow

The integration implements a three-tier decoupled architecture ensuring browser privacy, network isolation, and sub-10ms neural inference:

```
+-------------------------------------------------------------------------+
|                           CLIENT TIER (Browser)                         |
|   React 19 + TypeScript + Vite + Tailwind CSS                           |
|   - Document intake & raster rendering                                 |
|   - Client-side Tesseract.js OCR & heuristic Laplacian/ELA integrity    |
|   - Multi-dimensional forensic report with AI Neural Screening Card    |
+-------------------------------------------------------------------------+
                                    |
                  HTTP POST /api/v1/ml/predict (Multipart)
                  HTTP GET  /api/v1/ml/health
                                    v
+-------------------------------------------------------------------------+
|                         APPLICATION GATEWAY TIER                        |
|   Node.js HTTP API Server (server/server.ts, Port 4040)                 |
|   - Zero-dependency request router & payload validator                  |
|   - Stream forwarder to internal Python inference service               |
|   - 10MB payload size guard & CORS enforcement                          |
|   - Absolute isolation: browser never accesses internal ML ports/paths  |
+-------------------------------------------------------------------------+
                                    |
                  HTTP POST /predict (Multipart Stream)
                  HTTP GET  /health
                                    v
+-------------------------------------------------------------------------+
|                         AI INFERENCE SERVICE TIER                       |
|   Python FastAPI Service (ml/api/main.py, Port 8000)                    |
|   - Pre-warmed FalconMobileNetV3 loaded once in RAM/VRAM                |
|   - Bicubic resize (224x224), RGB standardization, ImageNet norm       |
|   - Volatile in-memory processing (io.BytesIO, zero disk persistence)   |
|   - Hardware acceleration: CUDA (RTX 4050) with automatic CPU fallback  |
+-------------------------------------------------------------------------+
```

---

## 2. API Contract & Endpoints

### 2.1 Python FastAPI Service (Internal Port 8000)

#### `GET /health`
Returns runtime service health and model metadata.
```json
{
  "status": "HEALTHY",
  "service": "FALCON-404 ML Inference Service",
  "version": "1.0.0",
  "timestamp": "2026-11-04T15:21:53.527Z",
  "model_loaded": true,
  "model_architecture": "MobileNetV3-Small",
  "model_identifier": "FALCON-404 MobileNetV3-Small (exp_20261104_falcon404_final_model)",
  "checkpoint_identifier": "best_model.pt",
  "checkpoint_epoch": 9,
  "device": "cuda:0"
}
```

#### `POST /predict`
Screens an uploaded document image for digital manipulation.
* **Request:** `multipart/form-data` with field `file` (JPEG, PNG, WebP, BMP, TIFF; max 10MB).
* **Response:**
```json
{
  "predicted_class": "GENUINE",
  "genuine_probability": 0.602,
  "manipulated_probability": 0.398,
  "confidence": 0.602,
  "tampering_score": 0.398,
  "decision_threshold": 0.5,
  "review_band": [0.4, 0.6],
  "processing_time_ms": 7.78,
  "device": "cuda:0",
  "model_identifier": "FALCON-404 MobileNetV3-Small (exp_20261104_falcon404_final_model)",
  "screening_disclaimer": "AI screening is an experimental assessment of visual document manipulation. It does not establish official document authenticity."
}
```

### 2.2 Node.js Gateway Endpoints (Public Port 4040 / Vite Dev Proxy)

| Endpoint | Method | Role | Upstream Target |
| :--- | :---: | :--- | :--- |
| `/api/v1/health` | `GET` | Core verification server health | Internal Node handler |
| `/api/v1/capabilities` | `GET` | System capability & milestone registry | Internal Node handler |
| `/api/v1/screenings` | `POST` | Deterministic verification request | Internal Node handler |
| `/api/v1/ml/health` | `GET` | Proxied ML service health | FastAPI `GET /health` |
| `/api/v1/ml/predict` | `POST` | Proxied multipart image screening | FastAPI `POST /predict` |

---

## 3. Configuration & Environment Variables

| Variable | Scope | Default | Description |
| :--- | :---: | :---: | :--- |
| `ML_API_HOST` | FastAPI | `127.0.0.1` | Network interface binding for Python service. |
| `ML_API_PORT` | FastAPI | `8000` | Port for Python inference service. |
| `ML_CHECKPOINT_PATH` | FastAPI | `ml/experiments/exp_20261104_falcon404_final_model/best_model.pt` | Path to trained model checkpoint weights. |
| `ML_DEVICE` | FastAPI | `None` (Auto) | Hardware device (`cuda`, `cuda:0`, `cpu`). Defaults to CUDA if available. |
| `ML_DECISION_THRESHOLD` | FastAPI | `0.50` | Probability threshold separating Genuine from Manipulated. |
| `ML_REVIEW_MARGIN` | FastAPI | `0.10` | Margin around threshold defining `NEEDS_REVIEW` band ($[0.40, 0.60]$). |
| `ML_MAX_UPLOAD_BYTES` | FastAPI | `10485760` (10MB) | Maximum payload byte size before 413 rejection. |
| `ML_CORS_ORIGINS` | FastAPI | `http://localhost:5173,...` | Allowed CORS origins. |
| `ML_SERVICE_URL` | Node API | `http://127.0.0.1:8000` | Internal URL where Node reaches FastAPI. |
| `VITE_API_URL` | React | `/api/v1` | Base API URL for frontend fetch calls. |

---

## 4. Security & Privacy Safeguards

1. **Zero Permanent Storage:**  
   Uploaded document files are processed entirely in volatile system memory (`io.BytesIO`). No document raster pixels are written to disk.
2. **Strict MIME & Bitmap Verification:**  
   Uploads are validated through a two-stage filter: first against allowable MIME types, followed by Pillow header decoding (`im.verify()`) to trap malformed payloads or exploit attempts.
3. **Information Disclosure Prevention:**  
   Internal server paths, stack traces, and local directory structures are never exposed in JSON responses. Uniform error envelopes (`ErrorResponse`) are emitted on exceptions.
4. **No Sensitive PII Logging:**  
   Application logs record only timestamp, HTTP status, and inference latency. Raw document text, extracted identity numbers, and candidate names are strictly excluded from server logs.
5. **Network Topology Isolation:**  
   The React frontend communicates exclusively with `/api/v1/*`. Internal FastAPI service ports are never exposed to external browser clients.

---

## 5. Frontend Visual Integration

The React UI integrates ML screening into the primary screening dossier in `ScreeningReportSection`:

* **Visual Status Indicators:**
  * `GENUINE`: Green badge (`● GENUINE // NO TAMPERING DETECTED`) — $P(\text{manipulated}) < 0.40$.
  * `MANIPULATED`: Red badge (`▲ MANIPULATED // FORGERY DETECTED`) — $P(\text{manipulated}) > 0.60$.
  * `NEEDS_REVIEW`: Amber badge (`◆ NEEDS REVIEW // AMBIGUOUS CONFIDENCE`) — $0.40 \le P(\text{manipulated}) \le 0.60$.
  * `ERROR`: Neutral badge (`✕ SCREENING ERROR / UNAVAILABLE`) — network timeout or service offline.
* **Probability Gauge:**  
  Interactive dual-color progress bar showing relative genuine vs manipulated likelihood, with explicit indicators for the 50% decision boundary and the 40%–60% human review interval.
* **Mandatory Governance Notice:**  
  Prominently states:  
  > *"AI screening is an experimental assessment of visual document manipulation. It does not establish official document authenticity."*
* **Independent Evidence Isolation:**  
  AI classification does not override statutory issuer verification, deterministic checksums, or OCR analysis. It operates as an independent forensic data point.

---

## 6. Known Model Limitations

1. **Synthetic Training Domain:**  
   Trained on synthetic document specimens (FALCON-404 Dataset v1.1). Real-world fraud documents may exhibit edge conditions not represented in synthetic training data.
2. **Selective Forgery Sensitivity:**  
   * **High Sensitivity:** Photo replacement / splicing (100% test recall) and shadow anomalies (100% test recall).
   * **Low Sensitivity:** Microscopic text alteration (0% test recall), cloned copy-move regions (0% test recall), and subtle graphic overlays (0% test recall).
3. **Non-Attestation:**  
   A `GENUINE` prediction signifies absence of detected visual image manipulation; it does NOT verify that the document was issued by a legitimate statutory authority.

---

## 7. Verification & Test Execution Results

### 7.1 Python ML & API Test Suite
```powershell
.\.venv\Scripts\python.exe -m unittest discover -s ml/tests
```
* **Result:** **89 tests executed, 89 passed in 8.53s.**
* Covers: FastAPI health endpoint, model loading, genuine/manipulated sample inference, corrupted upload handling, MIME validation, 10MB payload limit, and CPU fallback.

### 7.2 Node.js Backend Contract Tests
```powershell
npm test
```
* **Result:** **22 tests executed, 22 passed in 157ms.**
* Covers: Status contracts, capabilities registry, screening validation, and proxy resilience during ML service downtime.

### 7.3 Frontend Production Build
```powershell
npm run build
```
* **Result:** **`tsc -b && vite build` succeeded in 739ms with zero errors.**

---

## 8. Exact Local Startup Commands (PowerShell)

To launch the complete FALCON-404 screening platform locally across all tiers, open three PowerShell terminals:

### Terminal 1: Python FastAPI ML Inference Service
```powershell
cd C:\Users\Harshad\Documents\FALCON-MVP
.\.venv\Scripts\python.exe -m uvicorn ml.api.main:app --host 127.0.0.1 --port 8000 --log-level info
```
*Listens on: `http://127.0.0.1:8000` (Endpoints: `/health`, `/predict`)*

### Terminal 2: Node.js API Gateway Server
```powershell
cd C:\Users\Harshad\Documents\FALCON-MVP
npm run server
```
*Listens on: `http://localhost:4040` (Endpoints: `/api/v1/health`, `/api/v1/ml/health`, `/api/v1/ml/predict`)*

### Terminal 3: React Frontend Vite Dev Server
```powershell
cd C:\Users\Harshad\Documents\FALCON-MVP
npm run dev
```
*Access in browser at: `http://localhost:5173`*
