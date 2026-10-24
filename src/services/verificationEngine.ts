/**
 * FALCON-404: Core Document Verification & Orchestration Engine
 * Lead Developer & System Architect: Harshad Mane
 * Milestone: Step 1 of 3 — Core Verification Workflow & Architecture
 *
 * This service implements:
 * 1. The future-ready identifier validation interface (Step 1 baseline)
 * 2. Multi-dimensional verification orchestration
 * 3. Transparent capability status enforcement (no fake PASS or ML claims)
 */

import type {
  SupportedDocumentType,
  ValidationCheckResult,
  ExtractedDocumentField,
  VerificationSummary,
  WorkflowScreeningDossier,
  DocumentTypeSelectionMode
} from '../types/verificationWorkflow.ts'
import type { ImageIntegrityResult, DocumentLayoutResult } from '../types/index.ts'
import { getRulesForDocumentType } from '../registry/ruleRegistry.ts'
import { getDocumentProfile } from '../constants/documentTypes.ts'
import { PROJECT_BRANDING } from '../constants/branding.ts'

/**
 * Validates an extracted or user-provided document identifier.
 *
 * STEP 1 ARCHITECTURAL GUARANTEE:
 * Deterministic checksum and format validation algorithms are scheduled for Step 2.
 * In Step 1, all checks return NOT_IMPLEMENTED (or UNREADABLE if value is missing/empty).
 * A check will NEVER return PASS in this milestone.
 */
export const validateIdentifier = (
  documentType: SupportedDocumentType,
  identifierValue: string,
  _options?: {
    isManuallyCorrected?: boolean
    ocrConfidence?: number
  }
): ValidationCheckResult[] => {
  const trimmed = (identifierValue || '').trim()
  const isUnreadable = !trimmed || trimmed === 'Not detected' || trimmed.toLowerCase().includes('not detected')

  // Normalize grouping whitespace and hyphens (e.g., "1234 5678 9012" -> "123456789012")
  // Prevents display spacing or grouping formatting from causing false structural failures
  const normalized = trimmed.replace(/[\s-]+/g, '')

  const applicableRules = getRulesForDocumentType(documentType).filter(
    (r) => r.ruleCategory === 'identifier-format' || r.ruleCategory === 'mathematical-checksum'
  )

  const timestamp = new Date().toISOString()

  return applicableRules.map((rule) => {
    // If the field could not be read by OCR and was not provided manually
    if (isUnreadable) {
      return {
        checkId: `CHK-${rule.ruleId}`,
        checkCategory: rule.ruleCategory,
        checkName: rule.ruleName,
        status: 'UNREADABLE',
        explanation: `Cannot perform ${rule.ruleName}: No identifier could be extracted from the document image.`,
        reasonCode: 'FIELD_UNREADABLE',
        ruleId: rule.ruleId,
        isComputed: true,
        executionTimestamp: timestamp,
        limitations: 'Requires legible alphanumeric text input or manual examiner transcription.'
      }
    }

    // Baseline Step 1 response: Honest NOT_IMPLEMENTED status
    return {
      checkId: `CHK-${rule.ruleId}`,
      checkCategory: rule.ruleCategory,
      checkName: rule.ruleName,
      status: 'NOT_IMPLEMENTED',
      explanation: `Deterministic algorithm (${rule.ruleName}) is scheduled for implementation in Phase 7 Milestone Step 2.`,
      reasonCode: 'RULE_SCHEDULED_STEP_2',
      evidenceReferences: [
        `Target Input Length: ${trimmed.length} characters (Normalized: ${normalized.length})`,
        `Authoritative Standard: ${rule.authoritativeSourceName}`
      ],
      ruleId: rule.ruleId,
      isComputed: true,
      executionTimestamp: timestamp,
      limitations: rule.limitations
    }
  })
}

/**
 * Evaluates document date logic across distinct, modular dimensions:
 * 1. Date-field chronological consistency (DOB precedes issue date when both exist)
 * 2. Document expiry & current validity status (expired does NOT equal forged/tampered)
 * 3. Chronological anomaly screening (future issue dates, post-issuance birth dates)
 */
export const evaluateDateChecks = (
  documentType: SupportedDocumentType,
  extractedFields: ExtractedDocumentField[]
): ValidationCheckResult[] => {
  const timestamp = new Date().toISOString()

  const dateFields = extractedFields.filter((f) => f.category === 'date' || f.fieldName.toLowerCase().includes('date'))
  const dobField = extractedFields.find((f) => f.fieldName === 'dateOfBirth' || f.label.toLowerCase().includes('birth') || f.label.toLowerCase().includes('dob'))
  const expiryField = extractedFields.find((f) => f.fieldName === 'expiryDate' || f.label.toLowerCase().includes('expir') || f.label.toLowerCase().includes('valid'))
  const issueField = extractedFields.find((f) => f.fieldName === 'issueDate' || f.label.toLowerCase().includes('issue'))

  const hasAnyDate = dateFields.some((f) => f.value && !f.value.toLowerCase().includes('not detected'))
  const hasDob = dobField && dobField.value && !dobField.value.toLowerCase().includes('not detected')
  const hasExpiry = expiryField && expiryField.value && !expiryField.value.toLowerCase().includes('not detected')

  const results: ValidationCheckResult[] = []

  // 1. Date-Field Chronological Consistency
  const hasMultipleDates = (hasDob && (hasExpiry || issueField)) || (issueField && hasExpiry)
  results.push({
    checkId: 'CHK-RULE-DATE-CONSISTENCY-001',
    checkCategory: 'date-logicality',
    checkName: 'Date-Field Chronological Consistency Check',
    status: hasMultipleDates ? 'NOT_IMPLEMENTED' : hasAnyDate ? 'NOT_APPLICABLE' : 'UNREADABLE',
    explanation: hasMultipleDates
      ? 'Deterministic chronological consistency comparison (e.g. DOB precedes Issue Date) is scheduled for Step 2.'
      : hasAnyDate
      ? 'Consistency check not applicable: Single date extracted. Documents with a single date do not require relative chronological comparison.'
      : 'Cannot evaluate date consistency: No legible candidate dates extracted from OCR transcription.',
    reasonCode: hasMultipleDates ? 'RULE_SCHEDULED_STEP_2' : hasAnyDate ? 'SINGLE_DATE_PRESENT' : 'DATES_UNREADABLE',
    ruleId: 'RULE-DATE-CONSISTENCY-001',
    isComputed: true,
    executionTimestamp: timestamp,
    limitations: 'Applies only when multiple relevant dates are present. Missing or single dates are not inconsistencies.'
  })

  // 2. Document Expiry & Current Validity Status (Decoupled from tampering/fraud)
  const isLifetimeDocument = documentType === 'Aadhaar' || documentType === 'PAN'
  if (isLifetimeDocument) {
    results.push({
      checkId: 'CHK-RULE-DOC-EXPIRY-001',
      checkCategory: 'date-logicality',
      checkName: 'Document Expiry & Current Validity Status Assessment',
      status: 'NOT_APPLICABLE',
      explanation: `${documentType} credentials do not feature an expiration date. Validity status check is not applicable to lifetime credentials.`,
      reasonCode: 'LIFETIME_CREDENTIAL_NO_EXPIRY',
      ruleId: 'RULE-DOC-EXPIRY-STATUS-001',
      isComputed: true,
      executionTimestamp: timestamp,
      limitations: 'Aadhaar and PAN cards are issued as continuous credentials without an administrative expiry date.'
    })
  } else {
    results.push({
      checkId: 'CHK-RULE-DOC-EXPIRY-001',
      checkCategory: 'date-logicality',
      checkName: 'Document Expiry & Current Validity Status Assessment',
      status: hasExpiry ? 'NOT_IMPLEMENTED' : 'UNREADABLE',
      explanation: hasExpiry
        ? 'Deterministic expiration status evaluation is scheduled for Step 2. Notice: An expired document indicates lapsed administrative validity only; it must NOT be classified as forged, tampered, or fraudulent.'
        : 'Expiry check unreadable: Candidate expiration date not detected in OCR transcription for this document.',
      reasonCode: hasExpiry ? 'RULE_SCHEDULED_STEP_2' : 'EXPIRY_DATE_UNREADABLE',
      ruleId: 'RULE-DOC-EXPIRY-STATUS-001',
      isComputed: true,
      executionTimestamp: timestamp,
      limitations: 'CRITICAL PRINCIPLE: Expiry is an administrative validity finding, completely decoupled from forgery or tampering assessments.'
    })
  }

  // 3. Chronological Anomaly & Suspicious Date Screening
  results.push({
    checkId: 'CHK-RULE-DATE-ANOMALY-001',
    checkCategory: 'date-logicality',
    checkName: 'Chronological Anomaly & Suspicious Date Screening',
    status: hasAnyDate ? 'NOT_IMPLEMENTED' : 'UNREADABLE',
    explanation: hasAnyDate
      ? 'Deterministic chronological anomaly screening (e.g. future issue dates relative to current time) is scheduled for Step 2.'
      : 'Cannot evaluate date anomalies: No legible candidate dates extracted from OCR transcription.',
    reasonCode: hasAnyDate ? 'RULE_SCHEDULED_STEP_2' : 'DATES_UNREADABLE',
    ruleId: 'RULE-DATE-ANOMALY-001',
    isComputed: true,
    executionTimestamp: timestamp,
    limitations: 'Optical recognition noise can produce spurious date strings. Misread characters must be flagged as UNREADABLE rather than presumed fraud.'
  })

  return results
}

/**
 * Backward compatibility wrapper for evaluateDateLogicality.
 */
export const evaluateDateLogicality = (
  extractedFields: ExtractedDocumentField[]
): ValidationCheckResult => {
  const checks = evaluateDateChecks('Other / Unknown', extractedFields)
  return checks[0]
}

/**
 * Orchestrates multi-stage screening verification into a consolidated dossier.
 */
export const orchestrateScreeningVerification = (params: {
  sessionReference: string
  documentName: string
  selectedDocumentType: SupportedDocumentType
  documentTypeSelectionMode: DocumentTypeSelectionMode
  detectedDocumentType?: string
  extractedFields: ExtractedDocumentField[]
  integrityResult?: ImageIntegrityResult | null
  layoutResult?: DocumentLayoutResult | null
  ocrConfidence?: number
}): WorkflowScreeningDossier => {
  const {
    sessionReference,
    documentName,
    selectedDocumentType,
    documentTypeSelectionMode,
    detectedDocumentType,
    extractedFields,
    integrityResult,
    layoutResult,
    ocrConfidence
  } = params

  const profile = getDocumentProfile(selectedDocumentType)
  const idField = extractedFields.find((f) => f.fieldName === 'identifier' || f.category === 'identifier')
  const identifierValue = idField?.value || ''

  // 1. Run Identifier Validation (Step 1 baseline: NOT_IMPLEMENTED / UNREADABLE)
  const identifierResults = validateIdentifier(selectedDocumentType, identifierValue, {
    isManuallyCorrected: idField?.isManuallyCorrected,
    ocrConfidence
  })

  // 2. Modular Date & Validity Checks (Decoupled from fraud / tampering)
  const dateResults = evaluateDateChecks(selectedDocumentType, extractedFields)

  // 3. Collect all validation check results
  const allChecks: ValidationCheckResult[] = [...identifierResults, ...dateResults]

  // Add ML tampering check (strictly NOT_IMPLEMENTED)
  allChecks.push({
    checkId: 'CHK-RULE-ML-TAMPER-001',
    checkCategory: 'machine-learning',
    checkName: 'Deep Neural Patch Tampering Analysis',
    status: 'NOT_IMPLEMENTED',
    explanation: 'No trained machine-learning model is integrated in this milestone. Dataset generation and explorer foundation established in Phase 7.1.',
    reasonCode: 'ML_MODEL_NOT_INTEGRATED',
    ruleId: 'RULE-ML-TAMPER-001',
    isComputed: true,
    executionTimestamp: new Date().toISOString(),
    limitations: 'Heuristic ELA and boundary analysis must not be conflated with trained machine learning model inference.'
  })

  // Add Issuer verification check (UNAVAILABLE)
  allChecks.push({
    checkId: 'CHK-RULE-EXT-ISSUER-001',
    checkCategory: 'issuer-records',
    checkName: 'Statutory Authority Gateway Record Verification',
    status: 'UNAVAILABLE',
    explanation: 'External government database verification gateways are not integrated into this demonstration environment.',
    reasonCode: 'GATEWAY_UNAVAILABLE',
    ruleId: 'RULE-EXT-ISSUER-001',
    isComputed: true,
    executionTimestamp: new Date().toISOString(),
    limitations: 'FALCON-404 conducts client-side forensic document screening only and does not query official government registries.'
  })

  // 4. Build completed stages list
  const completedStages: string[] = ['Specimen Intake']
  if (ocrConfidence !== undefined) completedStages.push('OCR Transcription')
  if (integrityResult) completedStages.push('Raster Forensics & ELA')
  if (layoutResult) completedStages.push('Boundary & Layout Localization')

  // 5. Compute summary metrics
  const totalChecks = allChecks.length
  const passedChecks = allChecks.filter((c) => c.status === 'PASS').length
  const failedChecks = allChecks.filter((c) => c.status === 'FAIL').length
  const unimplementedChecks = allChecks.filter((c) => c.status === 'NOT_IMPLEMENTED').length
  const unreadableChecks = allChecks.filter((c) => c.status === 'UNREADABLE').length
  const needsReviewChecks = allChecks.filter((c) => c.status === 'NEEDS_REVIEW').length
  const unavailableChecks = allChecks.filter((c) => c.status === 'UNAVAILABLE').length

  const checksRequiringManualReview = allChecks.filter(
    (c) => c.status === 'FAIL' || c.status === 'UNREADABLE' || c.status === 'NEEDS_REVIEW'
  )

  const verificationSummary: VerificationSummary = {
    completedStages,
    totalChecks,
    passedChecks,
    failedChecks,
    unimplementedChecks,
    unreadableChecks,
    needsReviewChecks,
    unavailableChecks,
    checksRequiringManualReview,
    externalVerificationPerformed: false,
    evaluationTimestamp: new Date().toISOString(),
    limitations: [
      'Deterministic checksum and format algorithms belong to Phase 7 Milestone Step 2 and are currently NOT_IMPLEMENTED.',
      'Document expiration indicates credential validity status only and must NOT be classified as forgery, tampering, or fraudulent manipulation.',
      'Image forensics (ELA, contrast, Laplacian blur) provide signal observations only and do not constitute legal proof of forgery.',
      'No trained machine-learning model is deployed; existing analysis relies strictly on deterministic heuristics and image processing.',
      'No statutory authority gateway or government registry was queried; document validity remains unverified with the issuer.'
    ]
  }

  return {
    sessionReference,
    documentName,
    selectedDocumentType,
    documentTypeSelectionMode,
    detectedDocumentType,
    isDocumentTypeSupported: profile.isSelectable,
    extractedFields,
    identifierValidationResults: allChecks,
    verificationSummary,
    issuerVerification: {
      state: 'NOT_CHECKED',
      notes: 'No external identity issuer verification was performed.',
      disclaimer: 'FALCON-404 does not issue or certify official government credentials.'
    },
    mlTamperingResult: {
      status: 'NOT_IMPLEMENTED',
      explanation: 'Machine learning tampering segmentation model is not integrated in Step 1.',
      limitations: 'Do not present heuristic ELA or Laplacian variance as neural network prediction.'
    },
    disclaimer: 'This document screening report is generated for technical demonstration and forensic triage assistance. It does not establish legal authenticity or replace institutional verification.',
    developerAttribution: PROJECT_BRANDING.developerAttribution
  }
}
