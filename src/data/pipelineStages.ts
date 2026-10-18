import type { PipelineStage } from '../types'

export const PIPELINE_STAGES: PipelineStage[] = [
  {
    id: 'stage-1',
    stepNumber: '01',
    name: 'Specimen Intake',
    subtitle: 'Validation & Ingestion',
    description: 'In-memory client ingestion, file signature validation, format detection (JPEG, PNG, WebP), and raster dimensional checks.',
    iconName: 'Camera',
    status: 'implemented',
    details: [
      'Client-side file magic byte signature validation',
      'Format-aware intake supporting JPEG, PNG, and WebP',
      'Pixel resolution check and in-memory Object URL creation',
      'Zero remote network transmission of document pixels'
    ]
  },
  {
    id: 'stage-2',
    stepNumber: '02',
    name: 'OCR Glyph Parser',
    subtitle: 'Text Extraction & Parsing',
    description: 'Client-side WebAssembly optical recognition via Tesseract.js v7, character transcription, candidate field regex parsing, and quality scoring.',
    iconName: 'FileSearch',
    status: 'implemented',
    details: [
      'In-browser WebAssembly worker thread execution',
      'Candidate identifier, candidate name, date of birth extraction',
      'Tesseract glyph transcription clarity score (0-100%)',
      'Raw OCR output stream viewing and copying'
    ]
  },
  {
    id: 'stage-3',
    stepNumber: '03',
    name: 'Forensics & ELA',
    subtitle: 'Raster & Compression Audit',
    description: 'Physical raster quality metrics, EXIF/JFIF metadata container inspection, and JPEG canvas Error Level Analysis (ELA).',
    iconName: 'ShieldAlert',
    status: 'implemented',
    details: [
      'Luminance exposure, RMS contrast, and Laplacian blur metrics',
      'Binary metadata container inspection (EXIF tags, software markers)',
      '12× canvas Error Level Analysis for JPEG compression variance',
      'Format-aware handling (WebP/PNG safely excluded from ELA)'
    ]
  },
  {
    id: 'stage-4',
    stepNumber: '04',
    name: 'Boundary & Layout',
    subtitle: 'Quad Locator & Geometry',
    description: 'Sobel gradient edge detection, 4-corner coordinate localization, perspective keystone ratios, framing compliance, and text containment.',
    iconName: 'UserCheck',
    status: 'implemented',
    details: [
      'Sobel gradient matrix convolution for edge detection',
      'Quadrilateral corner localization (TL, TR, BR, BL)',
      'In-plane rotation angle and keystone convergence ratios',
      'Spatial containment audit of OCR text within detected perimeter'
    ]
  },
  {
    id: 'stage-5',
    stepNumber: '05',
    name: 'Screening Dossier',
    subtitle: 'Audit Report & Export',
    description: 'Consolidated preliminary assessment report, privacy masking toggles (anonymized names, masked IDs), and JSON/Text export.',
    iconName: 'ClipboardCheck',
    status: 'implemented',
    details: [
      'Deterministic preliminary triage rating (Standard / Manual Review)',
      'Explainable findings catalogue with technical impact notes',
      'Privacy controls: candidate fields and raw OCR redacted by default',
      'One-click client-side RFC-8259 JSON and Plain-Text dossier export'
    ]
  }
]
