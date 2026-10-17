# FALCON — AI-Based Fake Identity & Document Screening System

> **Event:** SEVA FIRST INNOVATION CHALLENGE 2026  
> **Development Phase:** Phase 1 — Frontend Foundation  
> **Status:** Prototype Interface Active (Backend & AI Engines Not Integrated)

---

## 1. Overview & Problem Statement

Identity fraud, credential counterfeiting, and digital document manipulation pose severe threats to national security, public welfare distribution, immigration control, and financial integrity. Fraudulent actors increasingly leverage modern photo-editing suites, generative AI, and synthetic identity techniques to forge government-issued credentials (e.g., Aadhaar cards, passports, driving permits, voter IDs, and PAN cards).

Manual inspection is slow, subjective, and prone to human error, while traditional verification systems often rely strictly on external database lookups that fail when credentials are completely synthetic or stolen.

**FALCON** is designed as an institutional identity screening and document verification terminal that provides multi-layer inspection: combining high-resolution capture, OCR validation, digital forensics (Error Level Analysis and copy-move forgery detection), and 1:1 facial biometric matching with liveness verification.

---

## 2. Phase 1 Scope & Features

This repository represents **Phase 1: Frontend Foundation**. This phase establishes the institutional design identity, visual hierarchy, responsive layout, navigation structure, and verification workflow specifications.

### Implemented Features (Phase 1)
- **Application Shell & Branding:**
  - Official FALCON identity with institutional deep navy blue palette, crisp light surfaces, and restrained orange highlights.
  - Collapsible, responsive sidebar navigation supporting desktop, tablet, and mobile viewport widths.
  - Top navigation bar featuring breadcrumbs, station indicators (`FLC-LOC-01`), and quick actions.
  - Institutional footer with attribution to **SEVA FIRST INNOVATION CHALLENGE 2026**.
- **System Overview Dashboard:**
  - Mission briefing and multi-layer defense overview.
  - Prominent "Initiate Verification" call-to-action.
  - Interactive **5-Stage Verification Pipeline Visualizer** (Document Capture &rarr; OCR &amp; Validation &rarr; Forensic Analysis &rarr; Face Comparison &rarr; Human Review) with modal inspection of planned algorithmic parameters.
  - **Honest System Readiness Card** displaying exact operational status for all components.
  - Recent screening log with illustrative demonstration sample cases and an instant toggle to a baseline clean empty state.
- **New Verification Terminal (Intake UI):**
  - Document categorization and issuer selection (Aadhaar, Passport, Driver's License, Voter ID, PAN).
  - Multi-zone capture staging (Front Face, Reverse Side, Live Subject Selfie).
  - Configurable screening parameters (Standard Intake vs. Enhanced Forensic).
  - Explicitly disabled execution triggers with informative modal dialogs preventing false assertions of backend execution.
- **Case History & Audit Ledger:**
  - Tabular inspection ledger with real-time text search and multi-parameter filters (Document Type, Disposition Status).
  - Detailed case dossier inspection modal displaying mock forensic notes and cryptographic reference identifiers.
  - Interactive "Clear to Empty State" / "Reload Demo Data" demonstration toggle.
- **Institutional Reports & Settings Placeholders:**
  - Informative placeholders clearly explaining roadmap milestones for Phase 2 (Gateway/DB), Phase 3 (Forensic AI), and Phase 4 (PDF/CSV/SIEM export engine).
  - Security policy and statutory privacy preview (India DPDP Act zero-permanent-storage architecture).

---

## 3. Honest System Readiness Indicators

In accordance with Phase 1 project rules, no synthetic test passes or artificial metrics are presented:

| Subsystem Component | Operational Status | Technical Implementation | Scheduled Phase |
| :--- | :--- | :--- | :--- |
| **Frontend UI / Shell** | <span style="color:green">Available &amp; Operational</span> | React 19 + TypeScript + Vite + Tailwind CSS | Phase 1 (Complete) |
| **Backend API Gateway** | <span style="color:red">Not Connected</span> | Standalone frontend sandbox; no network calls | Phase 2 |
| **OCR &amp; Checksum Engine** | <span style="color:orange">Not Integrated</span> | Algorithmic MRZ &amp; OCR specifications defined | Phase 2 |
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

## 6. Current Limitations (Phase 1)

1. **No Backend Services:** No live HTTP endpoints, databases, or Redis task queues are currently active.
2. **No Real Document Processing:** Document upload inputs do not ingest or process actual image files; execution triggers are intentionally disabled with explanatory modals.
3. **Mock Data Fixtures:** All cases displayed in the Case History table are illustrative mock samples for UI demonstration purposes.
4. **No Real Authentication:** The interface displays an institutional operator session tag without a fake login screen, ensuring no false assertions of security.

---

## 7. Development Roadmap

- **Phase 1 (Current):** Frontend foundation, navigation, visual identity, workflow specification.
- **Phase 2:** Backend API Gateway (FastAPI), document pre-processing, Tesseract/PaddleOCR extraction, and ICAO 9303 checksum verification.
- **Phase 3:** AI forensic models (Error Level Analysis, copy-move detection, font anomaly screening) and 1:1 facial biometric matching with anti-spoofing.
- **Phase 4:** Human-in-the-loop adjudication terminal, PDF audit dossier export, and regulatory logging.
- **Phase 5:** Production hardening, end-to-end performance benchmarks, and automated Vercel/cloud deployment.
