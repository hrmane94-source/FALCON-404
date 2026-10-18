export type NavigationSection = 'overview' | 'new-verification' | 'case-history' | 'reports' | 'settings'

export interface PipelineStage {
  id: string
  stepNumber: string
  name: string
  subtitle: string
  description: string
  iconName: 'Camera' | 'FileSearch' | 'ShieldAlert' | 'UserCheck' | 'ClipboardCheck'
  status: 'implemented' | 'planned' | 'in-progress'
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
export type CandidateConfidenceTier = 'confident' | 'review' | 'not-detected'

export interface CandidateField {
  id: string
  label: string
  value: string
  patternMatched: string
  category: CandidateCategory
  confidenceTier?: CandidateConfidenceTier
  contextNote?: string
}

export type OCRStatus = 'idle' | 'initializing' | 'recognizing' | 'success' | 'error'

export interface OCRProgress {
  status: string
  progress: number // 0 to 1
  stage?: 'initializing' | 'recognizing' | 'complete'
}

export interface OCRTextRegion {
  text: string
  confidence: number
  bbox: {
    x0: number
    y0: number
    x1: number
    y1: number
  }
  lineIndex?: number
}

export interface OCRResult {
  rawText: string
  confidence: number // 0 to 100
  lines: string[]
  candidateFields: CandidateField[]
  extractedAt: string
  textRegions?: OCRTextRegion[]
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
  layoutResult?: DocumentLayoutResult
  privacySettings: ReportPrivacySettings
}

// ==========================================
// Phase 5: Document Boundary, Perspective & Layout Types
// ==========================================

export interface Point2D {
  x: number
  y: number
}

export type BoundaryDetectionStatus =
  | 'boundary-detected'
  | 'partial-boundary-detected'
  | 'boundary-uncertain'
  | 'boundary-not-detected'
  | 'unsupported'
  | 'error'

export interface DocumentCorners {
  topLeft: Point2D
  topRight: Point2D
  bottomRight: Point2D
  bottomLeft: Point2D
}

export interface DocumentGeometry {
  corners: DocumentCorners
  normalizedCorners: DocumentCorners // Normalized 0.0 to 1.0 relative to image width/height
  widthTop: number
  widthBottom: number
  heightLeft: number
  heightRight: number
  averageWidth: number
  averageHeight: number
  quadAspectRatio: number
  quadAreaPixels: number
  areaCoverageRatio: number // quad area / total image area (0 to 1)
}

export interface PerspectiveMetrics {
  rotationAngleDeg: number // in-plane rotation angle (-180 to 180)
  cornerAnglesDeg: {
    topLeft: number
    topRight: number
    bottomRight: number
    bottomLeft: number
  }
  horizontalSkewRatio: number // min(widthTop, widthBottom) / max(widthTop, widthBottom)
  verticalSkewRatio: number // min(heightLeft, heightRight) / max(heightLeft, heightRight)
  apparentKeystoneRatio: number // min of horizontal and vertical ratios
  isSeverePerspective: boolean
  isRotated: boolean
  observation: string
}

export type FramingStatus =
  | 'all-edges-visible'
  | 'tight-framing'
  | 'partially-cropped'
  | 'excessive-background'
  | 'inconclusive'

export interface FramingMetrics {
  status: FramingStatus
  statusLabel: string
  marginsPx: {
    top: number
    right: number
    bottom: number
    left: number
  }
  minMarginPx: number
  areaCoveragePercent: number
  assessmentNote: string
}

export type LayoutContainmentStatus =
  | 'assessable'
  | 'not-assessable'
  | 'no-text-regions'
  | 'missing-bboxes'
  | 'uncertain-boundary'

export interface LayoutQualityMetrics {
  performed: boolean
  status: LayoutContainmentStatus
  statusLabel: string
  totalTextRegions: number
  regionsInsideBoundary: number
  regionsOutsideBoundary: number
  containmentRatio: number | null // null when not assessable or 0 regions
  containmentFormatted: string // "N/A", "Not assessable", or "95%"
  isLayoutConsistent: boolean
  isBoundaryReliable: boolean
  layoutAssessmentNote: string
}

export type LayoutFindingCategory = 'boundary' | 'perspective' | 'framing' | 'layout' | 'limitations'

export interface LayoutFinding {
  id: string
  title: string
  category: LayoutFindingCategory
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

export interface DocumentLayoutResult {
  status: BoundaryDetectionStatus
  statusLabel: string
  detectorScore: number // 0-100 heuristic detector score
  scoreDefinition: string
  geometry?: DocumentGeometry
  perspective?: PerspectiveMetrics
  framing: FramingMetrics
  layoutQuality: LayoutQualityMetrics
  findings: LayoutFinding[]
  analyzedAt: string
}

export type LayoutAnalysisStatus = 'idle' | 'analyzing' | 'success' | 'error'

export interface LayoutProgress {
  status: string
  progress: number // 0 to 1
  stage?: 'decoding' | 'edges' | 'quadrilateral' | 'perspective' | 'layout' | 'complete'
}


