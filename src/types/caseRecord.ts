import type {
  DocumentType,
  OCRStatus,
  CandidateField,
  ImageQualityMetrics,
  MetadataReport,
  ELAMetrics,
  ReviewPriorityCategory,
  IntegrityFinding,
  DocumentGeometry,
  PerspectiveMetrics,
  FramingMetrics,
  LayoutQualityMetrics,
  LayoutFinding
} from './index'

/**
 * Phase 6: Persistent Saved Case Record Schema.
 * Schema version 1.
 *
 * Stored strictly client-side in browser IndexedDB.
 * Zero document images, zero full raw OCR text streams, and zero unmasked PII.
 */
export interface SavedCaseRecord {
  schemaVersion: 1
  id: string // e.g. "FLC-XXXXXX-XXXX"
  savedAt: string // ISO timestamp or localized formatted date
  timestamp: number // epoch ms for sorting

  // Intake metadata (No sensitive original filepath)
  documentCategory: DocumentType
  detectedDocumentType?: string
  fileFormat: string // "JPEG", "PNG", "WEBP", etc.
  fileSizeBytes: number
  fileSizeFormatted: string
  dimensions: { width: number; height: number }
  aspectRatio: number

  // OCR Summary (Masked)
  ocrStatus: OCRStatus
  ocrConfidence?: number // 0-100
  candidateFields: CandidateField[] // Masked values only

  // Image Quality & Forensic Metrics
  quality: ImageQualityMetrics
  metadata: MetadataReport
  ela: ELAMetrics

  // Document Boundary & Layout Metrics
  boundaryStatus: string
  detectorScore: number
  geometry?: DocumentGeometry
  perspective?: PerspectiveMetrics
  framing: FramingMetrics
  layoutQuality: LayoutQualityMetrics

  // Consolidated Preliminary Triage & Findings
  assessment: {
    priority: ReviewPriorityCategory
    priorityLabel: string
    summary: string
    recommendedAction: string
    contributingFindings: IntegrityFinding[]
  }
  integrityFindings: IntegrityFinding[]
  layoutFindings: LayoutFinding[]

  // Custom examiner metadata & attribution
  stationId?: string
  developerAttribution: string
}

export interface CaseFilterOptions {
  searchTerm?: string
  documentType?: DocumentType | 'all'
  priority?: ReviewPriorityCategory | 'all'
}

export interface CaseStorageStats {
  recordCount: number
  estimatedStorageBytes: number
  estimatedStorageFormatted: string
  storageAvailable: boolean
  oldestRecordDate?: string
  newestRecordDate?: string
}
