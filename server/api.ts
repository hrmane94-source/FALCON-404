/**
 * FALCON-404: Backend API Handlers & Schemas (v1)
 * Lead Developer & System Architect: Harshad Mane
 * Milestone: Step 1 of 3 — Core Verification Workflow & Architecture
 *
 * Provides standalone, zero-external-dependency request handling for:
 * - GET  /api/v1/health
 * - GET  /api/v1/capabilities
 * - POST /api/v1/screenings
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import type {
  ApiHealthResponse,
  ApiCapabilitiesResponse,
  ScreeningRequestBody,
  ScreeningResponseBody,
  ApiErrorResponse
} from '../src/types/verificationWorkflow.ts'

export type {
  ApiHealthResponse,
  ApiCapabilitiesResponse,
  ScreeningRequestBody,
  ScreeningResponseBody,
  ApiErrorResponse
}

const SUPPORTED_TYPES = new Set(['Aadhaar', 'PAN', 'Driving Licence', 'Passport', 'Other / Unknown'])
const SERVER_START_TIME = Date.now()

export const sendJson = (res: ServerResponse, statusCode: number, data: unknown) => {
  const payload = JSON.stringify(data, null, 2)
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY'
  })
  res.end(payload)
}

export const sendError = (res: ServerResponse, statusCode: number, code: string, message: string) => {
  sendJson(res, statusCode, {
    error: {
      code,
      message,
      timestamp: new Date().toISOString()
    }
  })
}

export const handleApiHealth = (_req: IncomingMessage, res: ServerResponse) => {
  const healthData: ApiHealthResponse = {
    status: 'HEALTHY',
    service: 'FALCON-404 Forensic Verification API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptimeSeconds: Math.floor((Date.now() - SERVER_START_TIME) / 1000)
  }
  sendJson(res, 200, healthData)
}

export const handleApiCapabilities = (_req: IncomingMessage, res: ServerResponse) => {
  const capabilitiesData: ApiCapabilitiesResponse = {
    system: 'FALCON-404 Document Screening Platform',
    version: '1.0.0',
    supportedDocumentTypes: Array.from(SUPPORTED_TYPES),
    capabilities: {
      clientSideOcr: 'IMPLEMENTED',
      imageIntegrityAnalysis: 'IMPLEMENTED',
      boundaryAndLayoutAnalysis: 'IMPLEMENTED',
      deterministicIdentifierValidation: 'NOT_IMPLEMENTED',
      documentSpecificProfiles: 'NOT_IMPLEMENTED',
      trainedMlTamperingDetection: 'NOT_IMPLEMENTED',
      issuerVerification: 'UNAVAILABLE'
    },
    plannedMilestones: {
      step1: 'Core Workflow, Frontend & API Architecture (CURRENT MILESTONE)',
      step2: 'Deterministic Identifier Validation Algorithms & Checksums (PLANNED)',
      step3: 'Document Profiles, Structured Parsing & Issuer Verification (PLANNED)'
    },
    securityNotes: [
      'Document pixel processing is performed on client devices to maximize privacy.',
      'API does not retain or log raw document images or unmasked PII.',
      'Statutory verification gateways are not connected in this demonstration release.'
    ]
  }
  sendJson(res, 200, capabilitiesData)
}

export const handleApiScreenings = async (req: IncomingMessage, res: ServerResponse) => {
  // Read body with 2MB payload guard
  const MAX_PAYLOAD_BYTES = 2 * 1024 * 1024
  let bodyBuffer = ''

  try {
    for await (const chunk of req) {
      bodyBuffer += chunk
      if (bodyBuffer.length > MAX_PAYLOAD_BYTES) {
        sendError(res, 413, 'PAYLOAD_TOO_LARGE', 'Screening request payload exceeds 2MB limit.')
        return
      }
    }

    if (!bodyBuffer.trim()) {
      sendError(res, 400, 'EMPTY_REQUEST_BODY', 'Request body must contain valid JSON screening data.')
      return
    }

    let parsed: any
    try {
      parsed = JSON.parse(bodyBuffer)
    } catch {
      sendError(res, 400, 'MALFORMED_JSON', 'Request payload could not be parsed as valid JSON.')
      return
    }

    const { documentType, fields = [], sessionReference } = parsed as ScreeningRequestBody

    if (!documentType || typeof documentType !== 'string') {
      sendError(res, 400, 'MISSING_DOCUMENT_TYPE', 'Field "documentType" is required.')
      return
    }

    if (!SUPPORTED_TYPES.has(documentType)) {
      sendError(
        res,
        400,
        'UNSUPPORTED_DOCUMENT_TYPE',
        `Document type "${documentType}" is not supported. Supported types: ${Array.from(SUPPORTED_TYPES).join(', ')}.`
      )
      return
    }

    if (!Array.isArray(fields)) {
      sendError(res, 400, 'INVALID_FIELDS_FORMAT', 'Field "fields" must be an array of extracted document fields.')
      return
    }

    // Step 1: Honest checks baseline (all identifier rules return NOT_IMPLEMENTED)
    const screeningId = sessionReference || `FLC-SRV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
    const timestamp = new Date().toISOString()

    const validationResults = [
      {
        checkId: 'CHK-FORMAT-001',
        checkName: `${documentType} Structural Format Check`,
        category: 'identifier-format',
        status: 'NOT_IMPLEMENTED',
        explanation: `Deterministic structural format rules for ${documentType} are scheduled for Phase 7 Milestone Step 2.`,
        reasonCode: 'RULE_SCHEDULED_STEP_2',
        limitations: 'Format rule implementation planned in Step 2.'
      },
      {
        checkId: 'CHK-CHECKSUM-001',
        checkName: `${documentType} Mathematical Checksum`,
        category: 'mathematical-checksum',
        status: 'NOT_IMPLEMENTED',
        explanation: `Deterministic checksum algorithms (Verhoeff/Modulo-10) are scheduled for Phase 7 Milestone Step 2.`,
        reasonCode: 'RULE_SCHEDULED_STEP_2',
        limitations: 'Checksum rule implementation planned in Step 2.'
      },
      {
        checkId: 'CHK-DATE-001',
        checkName: 'Temporal Sequence & Chronological Check',
        category: 'date-logicality',
        status: 'NOT_IMPLEMENTED',
        explanation: 'Chronological ordering checks are scheduled for Phase 7 Milestone Step 2.',
        reasonCode: 'RULE_SCHEDULED_STEP_2',
        limitations: 'Requires extracted date tokens.'
      },
      {
        checkId: 'CHK-ML-001',
        checkName: 'Machine Learning Tampering Detection',
        category: 'machine-learning',
        status: 'NOT_IMPLEMENTED',
        explanation: 'Trained neural tampering detection model is not integrated in Step 1.',
        reasonCode: 'ML_MODEL_NOT_INTEGRATED',
        limitations: 'Signal processing heuristics (ELA) must not be presented as ML inference.'
      },
      {
        checkId: 'CHK-ISSUER-001',
        checkName: 'Authorised Statutory Gateway Verification',
        category: 'issuer-records',
        status: 'UNAVAILABLE',
        explanation: 'Government gateway integrations are unavailable in this screening sandbox.',
        reasonCode: 'GATEWAY_UNAVAILABLE',
        limitations: 'No official government databases are queried.'
      }
    ]

    const responseData: ScreeningResponseBody = {
      screeningId,
      documentType,
      isDocumentTypeSupported: true,
      processedAt: timestamp,
      validationResults,
      verificationSummary: {
        status: 'NEEDS_REVIEW',
        completedStages: ['Intake Parsing', 'API Validation Protocol'],
        totalChecksCount: validationResults.length,
        passedCount: 0,
        unimplementedCount: 4,
        issuerVerificationPerformed: false,
        limitations: [
          'Deterministic identifier validation rules are NOT_IMPLEMENTED in Step 1.',
          'No external authority record verification was performed.'
        ]
      },
      disclaimer: 'This screening response is provided for technical development and evaluation purposes only.'
    }

    sendJson(res, 200, responseData)
  } catch (err: any) {
    sendError(res, 500, 'INTERNAL_SERVER_ERROR', 'An unexpected error occurred while processing the screening request.')
  }
}
