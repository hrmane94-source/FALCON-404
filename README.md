# FALCON — AI-Based Fake Identity & Document Screening System

> **Event:** SEVA FIRST INNOVATION CHALLENGE 2026  
> **Development Phase:** Phase 2 — Functional Document Upload  
> **Status:** Client-Side Upload & Preview Active (Automated AI Analysis Not Integrated)

---

## 1. Overview & Problem Statement

Identity fraud, credential counterfeiting, and digital document manipulation pose severe threats to national security, public welfare distribution, immigration control, and financial integrity. Fraudulent actors increasingly leverage modern photo-editing suites, generative AI, and synthetic identity techniques to forge government-issued credentials (e.g., Aadhaar cards, passports, driving permits, voter IDs, and PAN cards).

Manual inspection is slow, subjective, and prone to human error, while traditional verification systems often rely strictly on external database lookups that fail when credentials are completely synthetic or stolen.

**FALCON** is designed as an institutional identity screening and document verification terminal that provides multi-layer inspection: combining high-resolution capture, OCR validation, digital forensics (Error Level Analysis and copy-move forgery detection), and 1:1 facial biometric matching with liveness verification.

---

## 2. Implemented Features

### Phase 1: Frontend Foundation
- **Application Shell & Institutional Identity:**
  - Modern, uncluttered interface using deep navy blue, white, and restrained orange highlights.
  - Collapsible, responsive sidebar navigation supporting desktop, tablet, and mobile viewports.
  - Top navigation bar featuring breadcrumbs, prototype status pill, and operator session tag.
  - Institutional footer with attribution to **SEVA FIRST INNOVATION CHALLENGE 2026**.
- **System Overview Dashboard:**
  - Hero introduction with clean typography and single prominent **Start Verification** call-to-action.
  - Bespoke **CSS-powered document scanning simulation** clearly labeled as a synthetic demo preview.
  - Interactive **5-Stage Verification Pipeline Visualizer** (`01 Document Capture` → `02 OCR & Validation` → `03 Forensic Analysis` → `04 Face Comparison` → `05 Human Review`) with hover feedback and specification inspection modal.
  - Compact **System Component Readiness** matrix showing live technical status.
  - Recent screening log with illustrative demonstration sample cases and a toggle to an empty state.
- **Institutional Reports & Settings Placeholders:**
  - Informative placeholders detailing roadmap milestones for Phase 3 (Forensic AI) and Phase 4 (PDF/CSV/SIEM export engine).

### Phase 2: Functional Document Upload (Current)
- **Functional Ingestion Workflow (`New Verification`):**
  - **Drag-and-Drop Uploader:** In-browser document intake supporting JPEG, PNG, and WebP images up to 10 MB.
  - **Multi-Layer Validation:** Enforces file-extension checks, MIME-type checks, empty-file detection, and **binary magic-number signatures** (JPEG `FF D8 FF`, PNG `89 50 4E 47`, WebP `RIFF....WEBP`) to reject disguised non-image files.
  - **Real-Time Document Preview:** Displays image preview, file name, detected format, formatted file size, dimensions, and ingestion timestamp.
  - **Replace & Remove Actions:** Allows removing or selecting a different document, automatically revoking temporary object URLs (`URL.revokeObjectURL()`) to prevent memory leaks.
  - **Ingestion Review Step:** Seamless two-step flow (`Upload Document` → `Review Ingestion`) displaying the uploaded document dossier with the transparent status notice:
    > *"Document uploaded successfully. Automated document analysis is not yet available in this prototype."*
  - **In-Browser Security & Privacy:** Document processing occurs entirely in local browser memory. Files are never transmitted over the network or saved to persistent storage.

---

## 3. Honest System Readiness Indicators

In accordance with competition guidelines, no synthetic test passes or artificial metrics are presented:

| Subsystem Component | Operational Status | Technical Implementation | Scheduled Phase |
| :--- | :--- | :--- | :--- |
| **Frontend UI / Shell** | <span style="color:green">Available &amp; Operational</span> | React 19 + TypeScript + Vite + Tailwind CSS | Phase 1 (Complete) |
| **Document Ingestion &amp; Preview** | <span style="color:green">Available &amp; Operational</span> | Client-side intake + binary header validation | Phase 2 (Complete) |
| **Backend API Gateway** | <span style="color:red">Not Connected</span> | Standalone frontend sandbox; no network calls | Phase 3 |
| **OCR &amp; Checksum Engine** | <span style="color:orange">Not Integrated</span> | Algorithmic MRZ &amp; OCR specifications defined | Phase 3 |
| **Forensic Analysis Engine** | <span style="color:orange">Not Integrated</span> | ELA &amp; Deep Learning forgery detection defined | Phase 3 |
| **Facial Biometric Matching** | <span style="color:orange">Not Integrated</span> | 1:1 Cosine &amp; Anti-spoofing pipeline defined | Phase 3 |

---

## 4. Technology Stack

- **Framework:** React 19 (TypeScript)
- **Build Tool:** Vite 8
- **Styling:** Tailwind CSS v4 (`@tailwindcss/vite`)
- **Iconography:** Lucide React
- **Code Quality:** Oxlint + TypeScript Strict Mode (`verbatimModuleSyntax`, `noUnusedLocals`)

No heavy component frameworks (such as Bootstrap, Material UI, or Ant Design) were used; all UI components are custom-engineered for minimal bundle size and maintainability.

---

## 5. Local Setup & Execution Instructions

### Prerequisites
- **Node.js:** v20.x or higher (Tested on Node.js v24.20.0)
- **npm:** v10.x or higher (Tested on npm 11.19.0)

### Installation
Clone or navigate to the project directory:
```bash
cd Documents/FALCON-MVP
```

Install dependencies:
```bash
npm install
```

### Development Server
Start the local Vite development server:
```bash
npm run dev
```
Open your browser at `http://localhost:5173` to explore the application.

### Production Build & Validation Checks
Run the TypeScript compiler check and Vite production bundle build:
```bash
npm run build
```

Run code quality linting:
```bash
npm run lint
```

Preview the production build locally:
```bash
npm run preview
```

---

## 6. Current Limitations (Phase 2)

1. **No Backend Services:** No live HTTP endpoints, databases, or Redis task queues are currently active.
2. **In-Browser Processing Only:** Uploaded files are validated and previewed in local browser memory only.
3. **No Automated Classification:** Documents are not classified as genuine or forged; no OCR text extraction or biometric facial recognition is performed.
4. **Mock Case History Data:** Cases displayed in the Case History table are illustrative mock samples for UI demonstration purposes.
5. **No Authentication:** The interface displays an institutional operator session tag without a fake login screen.

---

## 7. Development Roadmap

- **Phase 1 (Complete):** Frontend foundation, navigation, visual identity, workflow specification.
- **Phase 2 (Current):** Functional document upload, client-side validation (magic bytes, size, format), document preview, and review step.
- **Phase 3:** Backend API Gateway (FastAPI), document pre-processing, OCR extraction, and computer vision forensic analysis.
- **Phase 4:** Human-in-the-loop adjudication terminal, PDF audit dossier export, and regulatory logging.
- **Phase 5:** Production hardening, end-to-end performance benchmarks, and automated Vercel/cloud deployment.
