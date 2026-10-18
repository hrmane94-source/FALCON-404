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

