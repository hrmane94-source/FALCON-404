export type NavigationSection = 'overview' | 'new-verification' | 'case-history' | 'reports' | 'settings'

export interface PipelineStage {
  id: string
  stepNumber: string
  name: string
  subtitle: string
  description: string
  iconName: 'Camera' | 'FileSearch' | 'ShieldAlert' | 'UserCheck' | 'ClipboardCheck'
  status: 'planned'
  details: string[]
}

export type ReadinessStatus = 'available' | 'disconnected' | 'not-integrated'

export interface SystemComponentStatus {
  id: string
  name: string
  category: 'core' | 'service' | 'ai-engine'
  status: ReadinessStatus
  description: string
  phase: string
  techDetails: string
}

export type DocumentType = 'National ID' | 'Passport' | "Driver's License" | 'Voter ID' | 'PAN Card'

export interface MockCaseRecord {
  id: string
  caseNumber: string
  documentType: DocumentType
  issuerCountry: string
  submissionDate: string
  holderNameSample: string
  inspectionType: string
  plannedOutcomeLabel: 'Approved' | 'Flagged' | 'Under Review'
  discrepancyNote?: string
}

export interface UploadedDocument {
  file: File
  previewUrl: string
  name: string
  sizeFormatted: string
  sizeBytes: number
  mimeType: string
  detectedFormat: string
  dimensions?: { width: number; height: number }
  uploadedAt: string
}

export type CandidateCategory = 'document-type' | 'identifier' | 'date' | 'name' | 'mrz'

export interface CandidateField {
  id: string
  label: string
  value: string
  patternMatched: string
  category: CandidateCategory
}

export type OCRStatus = 'idle' | 'initializing' | 'recognizing' | 'success' | 'error'

export interface OCRProgress {
  status: string
  progress: number // 0 to 1
  stage?: 'initializing' | 'recognizing' | 'complete'
}

export interface OCRResult {
  rawText: string
  confidence: number // 0 to 100
  lines: string[]
  candidateFields: CandidateField[]
  extractedAt: string
}

// ==========================================
// Phase 4: Image Integrity & Screening Types
// ==========================================

export type FindingCategory = 'quality' | 'metadata' | 'manipulation' | 'limitations'
export type FindingSeverity = 'info' | 'low' | 'medium' | 'high'

export interface IntegrityFinding {
  id: string
  title: string
  category: FindingCategory
  severity: FindingSeverity
  metricName: string
  measuredValue: string | number
  threshold?: string | number
  observation: string
  explanation: string
  importance: string
  recommendation: string
  limitations?: string
}

export interface ImageQualityMetrics {
  width: number
  height: number
  aspectRatio: number
  aspectRatioLabel: string
  physicalRatioMeasured: boolean
  physicalRatioNote: string
  meanLuminance: number // 0 - 255
  contrastStdDev: number // RMS contrast
  blurScore: number // Laplacian variance
  isLowResolution: boolean
  isExtremeLuminance: boolean
  isLowContrast: boolean
  isPotentialBlur: boolean
}

export type MetadataStatus = 'present' | 'unavailable' | 'error'

export interface MetadataReport {
  status: MetadataStatus
  format: string
  fileSizeFormatted: string
  hasExif: boolean
  hasJfif: boolean
  softwareDetected?: string
  creationTimestamp?: string
  cameraMakeModel?: string
  colorProfile?: string
  rawEntries: Record<string, string>
  note: string
  containerStatusLabel: string
  exifStatusLabel: string
  cameraStatusLabel: string
  softwareStatusLabel: string
  timestampStatusLabel: string
}

export interface ELAMetrics {
  performed: boolean
  supported: boolean
  meanError: number
  maxError: number
  variance: number
  hotspotCount: number
  recompressionQuality: number
  elaVisualizationUrl?: string
  assessmentNote: string
}

export type ReviewPriorityCategory = 'standard' | 'manual-review' | 'inconclusive'

export interface PreliminaryAssessment {
  priority: ReviewPriorityCategory
  priorityLabel: string
  summary: string
  contributingFindings: IntegrityFinding[]
  recommendedAction: string
  disclaimer: string
}

export type IntegrityAnalysisStatus = 'idle' | 'analyzing' | 'success' | 'error'

export interface IntegrityProgress {
  status: string
  progress: number // 0 to 1
  stage?: 'reading' | 'quality' | 'metadata' | 'forensics' | 'complete'
}

export interface ImageIntegrityResult {
  fileProperties: {
    fileName: string
    fileSizeBytes: number
    fileSizeFormatted: string
    detectedFormat: string
    mimeType: string
    dimensions: { width: number; height: number }
    aspectRatio: number
  }
  quality: ImageQualityMetrics
  metadata: MetadataReport
  ela: ELAMetrics
  findings: IntegrityFinding[]
  assessment: PreliminaryAssessment
  analyzedAt: string
}

export interface ReportPrivacySettings {
  includeFullOCR: boolean
  includeIdentifiableFields: boolean
}

export interface ScreeningReportData {
  reportId: string
  generatedAt: string
  documentName: string
  selectedDocumentType: string
  detectedDocumentType?: string
  ocrStatus: OCRStatus
  ocrConfidence?: number
  ocrResult?: OCRResult
  integrityResult: ImageIntegrityResult
  privacySettings: ReportPrivacySettings
}


