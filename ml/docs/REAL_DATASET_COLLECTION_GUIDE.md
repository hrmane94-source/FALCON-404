# FALCON-404: Real Dataset Collection & Curation Guide
**Target Audience:** FALCON-404 Research Team Members  
**Lead Architect:** Harshad Mane  
**Milestone:** Phase 7.1B — Manual Dataset Preparation & Governance  

---

## 1. Objective & Ethical Principles

This document defines the standard operating procedures for manually collecting, altering, annotating, and cataloguing physical document specimens for the FALCON-404 machine-learning pipeline.

### Ethical Boundaries & Mandatory Rules
1. **NO REAL IDENTITY DOCUMENTS:**  
   Under no circumstances should any team member upload, photograph, or manipulate a real individual's identity card (such as an actual Aadhaar card, PAN card, passport, driving licence, voter ID, or institutional badge).
2. **FICTIONAL RESEARCH SPECIMENS ONLY:**  
   All specimens must be explicitly designed and fabricated research mockups. Every physical specimen must visibly feature the clear disclaimer:  
   `SYNTHETIC — NOT A VALID ID / RESEARCH SPECIMEN ONLY`.
3. **NO CLAIMS OF OFFICIAL STATUS:**  
   Do not claim or classify any specimen as a "genuine" or "fraudulent" government document. The dataset serves strictly to model localized image-level tampering artifacts (e.g. edge seams, double-compression grids, font inconsistencies, cloning).
4. **STRICT SEPARATION FROM SYNTHETIC TEST DATA:**  
   The synthetic test images residing in `ml_data/phase7_synthetic/` are reserved exclusively for pipeline testing and smoke tests. Never copy synthetic test images into the real research dataset.

---

## 2. Directory Structure

All team-collected data belongs in `ml_data/real_training_dataset/`:

```
ml_data/real_training_dataset/
├── README_START_HERE.txt          # Quick onboarding instructions
├── images/
│   ├── unaltered/                 # Original camera captures (never edited)
│   └── altered/                   # Controlled tamperings of source photos
├── masks/                         # Grayscale binary ground-truth masks (0 & 255)
├── manifests/
│   └── dataset_manifest.csv       # Master CSV catalog (copy from ml/templates/)
├── metadata/
│   └── collection_log.csv         # Capture device, environment, and member notes
└── reports/                       # Generated offline Explorer HTML reports
```

---

## 3. Step-by-Step Collection Workflow

### Phase A: Capturing Unaltered Physical Specimens
1. **Prepare Physical Mockups:**  
   Print or assemble artificial research cards using custom fictional layouts. Ensure clear typography, synthetic headshots, and the disclaimer `SYNTHETIC — NOT A VALID ID`.
2. **Camera Photography:**  
   Photograph the mockup under varied real-world conditions (natural sunlight, indoor fluorescent light, varied angles, distances of 20–50 cm). Use everyday smartphone cameras.
3. **Preserve Pristine Originals:**  
   Transfer the photograph directly to `images/unaltered/`. Do NOT apply post-processing, cropping, or compression.
4. **Assign Unique Identifiers:**  
   Name the file following the naming convention (see Section 4).
5. **Catalog in Manifest:**  
   Add a record in `manifests/dataset_manifest.csv` with `label="unaltered_mock"` and `manipulation_type="none"`.

### Phase B: Producing Controlled Alterations
1. **Duplicate Source Photo:**  
   Make a copy of the unaltered photo from `images/unaltered/`. Never modify the original file in-place.
2. **Apply Controlled Tampering:**  
   Using digital editing tools (GIMP, Photoshop, ImageMagick, Python script), apply a specific, realistic modification:
   - **Text Replacement:** Overwrite a name, registration number, or date with a different font, size, or slight background patch mismatch.
   - **Copy-Move (Cloning):** Copy an emblem, stamp, or digit sequence from one region of the card and paste it onto another region.
   - **Portrait Swap:** Replace the face photograph box with another synthetic avatar photo.
   - **Localized Blur / Resampling:** Apply localized bilinear scaling or blur to obscure a field.
   - **Localized Recompression:** Save a small cropped patch at low JPEG quality ($Q=15$) and paste it back into the image.
   - **Splice:** Insert a foreign seal or watermark from another fictional specimen.
3. **Save to Altered Directory:**  
   Save the modified image to `images/altered/`.
4. **Link to Original Source:**  
   Record `source_doc_id` and `original_image_path` in the manifest pointing directly to the source photograph. Set `label="altered_mock"` and specify `manipulation_type`.

### Phase C: Generating Ground-Truth Binary Masks
1. **Canvas Size Parity:**  
   The mask must have the **exact same width and height** in pixels as the altered image ($W_{mask} == W_{img}$ and $H_{mask} == H_{img}$).
2. **Grayscale Format & Values:**  
   Save as single-channel grayscale PNG (`mode="L"`).
   - Value `0` (Black): Pristine, untouched background pixels.
   - Value `255` (White): Manipulated / altered pixels.
   - Strictly binary: No intermediate shades of gray (e.g. 128, 64) are permitted.
3. **Boundary Precision:**  
   Draw masks tightly around the actual modified pixels. Do not draw a generic huge rectangle covering an entire card section if only a 4-digit number was altered.
4. **Masks for Unaltered Samples:**  
   When the training pipeline requires a mask for unaltered images, generate an **all-black mask** (all pixels = `0`) of matching dimensions in `masks/`.

---

## 4. Standard Naming Conventions

Each team member is assigned a unique Member ID (`M1`, `M2`, `M3`, `M4`).

### File Name Pattern
```
<MEMBER_ID>_<DOC_ID>_<CAPTURE_ID>_<MODIFIER>.<ext>
```

### Examples
- **Unaltered original photo 1 (Member 1, Document 001):**  
  `images/unaltered/M1_DOC001_C01_NORMAL.jpg`
- **Unaltered photo 2 of same physical document (angled / tilted capture):**  
  `images/unaltered/M1_DOC001_C02_TILTED.jpg`
- **Altered version of photo 1 (forged ID number):**  
  `images/altered/M1_DOC001_C01_TEXTFORGE01.jpg`
- **Matching ground-truth mask:**  
  `masks/M1_DOC001_C01_TEXTFORGE01_MASK.png`
- **Altered version of photo 1 (portrait swap):**  
  `images/altered/M1_DOC001_C01_FACESWAP01.jpg`
- **Matching ground-truth mask:**  
  `masks/M1_DOC001_C01_FACESWAP01_MASK.png`

---

## 5. CSV Manifest Schema

Use `ml/templates/real_dataset_manifest_template.csv` as your template.

| Field | Type | Required? | Description & Allowed Values |
| :--- | :--- | :--- | :--- |
| `sample_id` | String | Required | Unique identifier (e.g. `M1_DOC001_C01_TEXTFORGE01`) |
| `source_doc_id` | String | Required | Physical document ID (e.g. `M1_DOC001`). Used for anti-leakage grouping |
| `member_id` | String | Required | Collector ID: `M1`, `M2`, `M3`, or `M4` |
| `label` | String | Required | `unaltered_mock` or `altered_mock` |
| `manipulation_type` | String | Required | `none` (for unaltered), `text_replacement`, `copy_move`, `portrait_swap`, `localized_resampling_blur`, `localized_recompression`, `splice`, `removal` |
| `image_path` | String | Required | Relative path from dataset root (e.g. `images/altered/M1_DOC001_C01_TEXTFORGE01.jpg`) |
| `original_image_path` | String | Required for altered | Relative path to source photo. Leave blank or self-reference for unaltered |
| `mask_path` | String | Conditional | Relative path to mask in `masks/`. Required for altered samples; all-black mask for unaltered |
| `template_family` | String | Optional | Layout family (e.g. `CARD_A`, `PERMIT_B`, `CERTIFICATE_C`) |
| `capture_device` | String | Optional | e.g. `iPhone 13`, `Pixel 7`, `Samsung S22` |
| `capture_condition` | String | Optional | e.g. `daylight_flat`, `warm_indoor_tilted`, `low_light` |
| `provenance` | String | Required | Origin: `team_physical_capture`, `team_digital_alteration`, or external source name |
| `license_or_permission` | String | Required | Legal basis: `team_created_cc0`, `team_internal_research`, or verified external license |
| `review_status` | String | Required | Curation status: `pending_review`, `approved`, `flagged` |
| `image_width` | Integer | Optional | Width in pixels (e.g. `1920`) |
| `image_height` | Integer | Optional | Height in pixels (e.g. `1080`) |
| `notes` | String | Optional | Freeform notes or alteration description |

---

## 6. External Datasets Policy

If our team incorporates external research datasets (e.g. public academic forensic benchmarks):
1. **Explicit Permission & License Check:** Confirm the dataset licence explicitly permits academic / research use and redistribution if committed.
2. **Record Provenance:** Set `provenance="<DATASET_NAME>_v<VERSION>"` and `license_or_permission="<EXACT_LICENSE>"`.
3. **Preserve Isolation:** Store external datasets in a distinct subfolder or keep them clearly tagged so they are never conflated with our physical laboratory captures.

---

## 7. Central Splitting & Anti-Leakage Policy

> [!CAUTION]
> **DO NOT ASSIGN TRAIN/VAL/TEST SPLITS MANUALLY!**
> Splits will be assigned centrally using an automated script before model training.

### Anti-Leakage Rule
- **Grouping by `source_doc_id`:** Every capture (different angles, lighting) and every altered derivative derived from physical specimen `M1_DOC001` **must reside in the same split** (100% in train, or 100% in val, or 100% in test).
- If an unaltered photo is in the training split while its altered version is in the test split, the model will recognize the background document and produce falsely inflated performance metrics (data leakage).

---

## 8. Quality Assurance Checklist

Before submitting a batch of images to the team repository, run this quality checklist:

| Check Item | Failure Symptoms | Remedy |
| :--- | :--- | :--- |
| **Missing Image File** | File listed in manifest not found on disk | Check typos, case-sensitivity, or path separators |
| **Missing Mask File** | Altered image has no mask or invalid path | Create the binary mask and place it in `masks/` |
| **Dimension Mismatch** | Mask width/height does not match image | Resize or re-export mask to exact image dimensions |
| **Non-Binary Mask** | Mask contains anti-aliased gray pixels ($0 < px < 255$) | Apply threshold: `px = 255 if px > 128 else 0` |
| **Empty Altered Mask** | Altered image mask has 0 white pixels | Re-annotate the manipulated bounding region |
| **Broken Source Link** | `original_image_path` does not exist | Point to the correct source file in `images/unaltered/` |
| **Duplicate Sample ID** | Two rows share the same `sample_id` | Ensure every capture and edit has a distinct ID |
| **Missing Source Doc ID** | `source_doc_id` is blank | Assign the parent document ID |
| **Path Traversal** | Manifest path starts with `../` or `/` | Use relative paths starting from dataset root |
| **Real ID Detected** | Real identity card uploaded | **IMMEDIATELY DELETE FILE**. Notify team lead |

---

## 9. Viewing Your Dataset with the Offline Explorer

Generate and view your dataset report locally at any time:
```bash
python ml/scripts/build_dataset_explorer.py --dataset-dir ml_data/real_training_dataset
```
Then open `ml_data/real_training_dataset/reports/dataset_report.html` in any web browser.
