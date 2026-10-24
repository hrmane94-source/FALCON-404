/**
 * FALCON-404: Document Screening & Verification Workflow Shared Contracts
 * Lead Developer & System Architect: Harshad Mane
 * Milestone: Step 1 of 3 — Core Verification Workflow & Architecture
 *
 * This module establishes the single source of truth for:
 * 1. Standard verification statuses and semantic definitions
 * 2. Supported document categories and profiles
 * 3. Structured extracted document fields with manual override tracking
 * 4. Validation check results and rule references
 * 5. Multi-dimensional verification summary and reporting structures
 */

import type { CandidateCategory } from './index.ts'

// ============================================================================
// 1. STANDARD VERIFICATION STATUSES
// ============================================================================

/**
 * Standardized status contract across all verification checks and stages.
 * Semantic definitions:
 * - PASS: The specific implemented check executed and passed.
 * - FAIL: The specific implemented check executed and failed.
 * - UNREADABLE: The required value could not be extracted or read reliably.
 * - NOT_APPLICABLE: The check does not apply to the selected document or field.
 * - NOT_CHECKED: The check has not been run.
 * - NOT_IMPLEMENTED: The required validation algorithm/capability is not yet implemented (Step 1 baseline).
 * - UNAVAILABLE: The check requires an external capability or service that is currently offline/unavailable.
 * - NEEDS_REVIEW: The result contains unresolved ambiguity or requires human assessment.
 * - ERROR: The check encountered an unhandled execution error.
 */
export type VerificationStatus =
  | 'PASS'
  | 'FAIL'
  | 'UNREADABLE'
  | 'NOT_APPLICABLE'
  | 'NOT_CHECKED'
  | 'NOT_IMPLEMENTED'
  | 'UNAVAILABLE'
  | 'NEEDS_REVIEW'
  | 'ERROR'

export interface VerificationStatusMeta {
  code: VerificationStatus
  label: string
  description: string
  badgeVariant: 'success' | 'danger' | 'warning' | 'neutral' | 'info'
  isPassing: boolean
  requiresAttention: boolean
}

export const VERIFICATION_STATUS_REGISTRY: Record<VerificationStatus, VerificationStatusMeta> = {
  PASS: {
    code: 'PASS',
    label: 'CHECK PASSED',
    description: 'The specific implemented check ran and satisfied all validation criteria.',
    badgeVariant: 'success',
    isPassing: true,
    requiresAttention: false
  },
  FAIL: {
    code: 'FAIL',
    label: 'CHECK FAILED',
    description: 'The specific implemented check ran and failed one or more validation criteria.',
    badgeVariant: 'danger',
    isPassing: false,
    requiresAttention: true
  },
  UNREADABLE: {
    code: 'UNREADABLE',
    label: 'FIELD UNREADABLE',
    description: 'The target value could not be extracted or recognized with sufficient certainty.',
    badgeVariant: 'warning',
    isPassing: false,
    requiresAttention: true
  },
  NOT_APPLICABLE: {
    code: 'NOT_APPLICABLE',
    label: 'NOT APPLICABLE',
    description: 'This verification check is not applicable to the selected document type or field.',
    badgeVariant: 'neutral',
    isPassing: false,
    requiresAttention: false
  },
  NOT_CHECKED: {
    code: 'NOT_CHECKED',
    label: 'NOT EXECUTED',
    description: 'This verification check has not been executed for this session.',
    badgeVariant: 'neutral',
    isPassing: false,
    requiresAttention: false
  },
  NOT_IMPLEMENTED: {
    code: 'NOT_IMPLEMENTED',
    label: 'PLANNED // NOT IMPLEMENTED',
    description: 'The deterministic rule or algorithm is scheduled for a future development milestone.',
    badgeVariant: 'neutral',
    isPassing: false,
    requiresAttention: false
  },
  UNAVAILABLE: {
    code: 'UNAVAILABLE',
    label: 'SERVICE UNAVAILABLE',
    description: 'The required external authority service or integration is unavailable.',
    badgeVariant: 'warning',
    isPassing: false,
    requiresAttention: true
  },
  NEEDS_REVIEW: {
    code: 'NEEDS_REVIEW',
    label: 'MANUAL REVIEW REQUIRED',
    description: 'The automated check identified potential anomalies or ambiguous characteristics.',
    badgeVariant: 'warning',
    isPassing: false,
    requiresAttention: true
  },
  ERROR: {
    code: 'ERROR',
    label: 'EXECUTION ERROR',
    description: 'An internal runtime exception occurred while executing this verification check.',
    badgeVariant: 'danger',
    isPassing: false,
    requiresAttention: true
  }
}

// ============================================================================
// 2. SUPPORTED DOCUMENT TYPES
// ============================================================================

export type SupportedDocumentType =
  | 'Aadhaar'
  | 'PAN'
  | 'Driving Licence'
  | 'Passport'
  | 'Other / Unknown'

export type DocumentTypeSelectionMode = 'manual' | 'ocr-inferred' | 'fallback'

export interface DocumentTypeProfile {
  id: SupportedDocumentType
  code: string
  displayName: string
  description: string
  isSelectable: boolean
  jurisdiction: string
  expectedIdentifierFormat: string
  declaredCapabilities: {
    clientSideOcr: 'implemented'
    imageIntegrityAnalysis: 'implemented'
    boundaryAndLayoutAnalysis: 'implemented'
    deterministicIdentifierValidation: 'planned'
    documentSpecificProfiles: 'planned'
    trainedMlTamperingDetection: 'not_implemented'
    issuerVerification: 'unavailable'
  }
}

// ============================================================================
// 3. STRUCTURED EXTRACTED DOCUMENT FIELDS
// ============================================================================

export type FieldExtractionStatus = 'extracted' | 'low-confidence' | 'unreadable' | 'not-present'

export interface ExtractedDocumentField {
  fieldName: string
  label: string
  value: string
  rawOcrValue: string
  confidence?: number // 0-100
  extractionStatus: FieldExtractionStatus
  isManuallyCorrected: boolean
  originalExtractedValue?: string
  category: CandidateCategory
  contextNote?: string
  boundingBox?: {
    x0: number
    y0: number
    x1: number
    y1: number
  }
}

// ============================================================================
// 4. VALIDATION RESULT INTERFACES
// ============================================================================

export type CheckCategory =
  | 'identifier-format'
  | 'mathematical-checksum'
  | 'date-logicality'
  | 'security-feature'
  | 'mrz-structure'
  | 'issuer-records'
  | 'image-forensics'
  | 'machine-learning'

export interface ValidationCheckResult {
  checkId: string
  checkCategory: CheckCategory
  checkName: string
  status: VerificationStatus
  explanation: string
  reasonCode?: string
  evidenceReferences?: string[]
  ruleId?: string
  isComputed: boolean
  executionTimestamp?: string
  limitations?: string
}

// ============================================================================
// 5. ISSUER VERIFICATION & ML RESULTS (FUTURE CAPABILITIES)
// ============================================================================

export type IssuerVerificationState =
  | 'NOT_CHECKED'
  | 'VERIFIED'
  | 'NOT_VERIFIED'
  | 'UNAVAILABLE'
  | 'ERROR'

export interface IssuerVerificationResult {
  state: IssuerVerificationState
  authorityName?: string
  queryTimestamp?: string
  notes: string
  disclaimer: string
}

export interface MLTamperingResult {
  status: VerificationStatus // In Step 1: strictly NOT_IMPLEMENTED
  modelIdentifier?: string
  modelVersion?: string
  predictionScore?: number
  suspiciousRegionsCount?: number
  explanation: string
  limitations: string
}

// ============================================================================
// 6. VERIFICATION SUMMARY & DOSSIER CONTRACTS
// ============================================================================

export interface VerificationSummary {
  completedStages: string[]
  totalChecks: number
  passedChecks: number
  failedChecks: number
  unimplementedChecks: number
  unreadableChecks: number
  needsReviewChecks: number
  unavailableChecks: number
  checksRequiringManualReview: ValidationCheckResult[]
  externalVerificationPerformed: boolean
  evaluationTimestamp: string
  limitations: string[]
}

export interface WorkflowScreeningDossier {
  sessionReference: string
  documentName: string
  selectedDocumentType: SupportedDocumentType
  documentTypeSelectionMode: DocumentTypeSelectionMode
  detectedDocumentType?: string
  isDocumentTypeSupported: boolean

  // Core Stages
  extractedFields: ExtractedDocumentField[]
  identifierValidationResults: ValidationCheckResult[]
  verificationSummary: VerificationSummary
  issuerVerification: IssuerVerificationResult
  mlTamperingResult: MLTamperingResult

  // Transparency & Governance
  disclaimer: string
  developerAttribution: string
}

// ============================================================================
// 7. API REQUEST & RESPONSE CONTRACTS (v1)
// ============================================================================

export interface ApiHealthResponse {
  status: 'HEALTHY'
  service: string
  version: string
  timestamp: string
  environment: string
  uptimeSeconds: number
}

export interface ApiCapabilitiesResponse {
  system: string
  version: string
  supportedDocumentTypes: string[]
  capabilities: {
    clientSideOcr: 'IMPLEMENTED'
    imageIntegrityAnalysis: 'IMPLEMENTED'
    boundaryAndLayoutAnalysis: 'IMPLEMENTED'
    deterministicIdentifierValidation: 'NOT_IMPLEMENTED'
    documentSpecificProfiles: 'NOT_IMPLEMENTED'
    trainedMlTamperingDetection: 'NOT_IMPLEMENTED'
    issuerVerification: 'UNAVAILABLE'
  }
  plannedMilestones: {
    step1: string
    step2: string
    step3: string
  }
  securityNotes: string[]
}

export interface ScreeningRequestBody {
  sessionReference?: string
  documentType: string
  fields?: Array<{
    fieldName: string
    value: string
    confidence?: number
    isManuallyCorrected?: boolean
  }>
  integritySummary?: {
    qualityAssessment?: string
    elaPerformed?: boolean
    boundaryDetected?: boolean
  }
}

export interface ScreeningResponseBody {
  screeningId: string
  documentType: string
  isDocumentTypeSupported: boolean
  processedAt: string
  validationResults: Array<{
    checkId: string
    checkName: string
    category: string
    status: string
    explanation: string
    reasonCode: string
    limitations?: string
  }>
  verificationSummary: {
    status: 'NEEDS_REVIEW' | 'UNVERIFIED'
    completedStages: string[]
    totalChecksCount: number
    passedCount: number
    unimplementedCount: number
    issuerVerificationPerformed: boolean
    limitations: string[]
  }
  disclaimer: string
}

export interface ApiErrorResponse {
  error: {
    code: string
    message: string
    timestamp: string
  }
}

