/**
 * FALCON-404: Verification Workflow & API Contract Tests
 * Lead Developer & System Architect: Harshad Mane
 * Milestone: Step 1 of 3 — Core Verification Workflow & Architecture
 *
 * Execution:
 *   node --experimental-strip-types --test tests/verificationWorkflow.test.ts
 */

import { test, describe } from 'node:test'
import assert from 'node:assert'
import { EventEmitter } from 'node:events'
import {
  VERIFICATION_STATUS_REGISTRY,
  type VerificationStatus
} from '../src/types/verificationWorkflow.ts'
import {
  SUPPORTED_DOCUMENT_PROFILES,
  mapLegacyDocumentType,
  mapSupportedToLegacyDocumentType,
  getDocumentProfile
} from '../src/constants/documentTypes.ts'
import {
  VALIDATION_RULE_CATALOG,
  getRulesForDocumentType,
  getRuleById
} from '../src/registry/ruleRegistry.ts'
import {
  validateIdentifier,
  evaluateDateLogicality,
  evaluateDateChecks,
  orchestrateScreeningVerification
} from '../src/services/verificationEngine.ts'
import {
  maskCandidateFieldValue,
  maskCandidateName
} from '../src/utils/reportExport.ts'
import { buildSavedCaseRecord } from '../src/services/caseStorageService.ts'
import {
  handleApiHealth,
  handleApiCapabilities,
  handleApiScreenings
} from '../server/api.ts'

describe('FALCON-404 :: Verification Status Contract', () => {
  test('all 9 standard statuses are registered with valid metadata', () => {
    const requiredStatuses: VerificationStatus[] = [
      'PASS',
      'FAIL',
      'UNREADABLE',
      'NOT_APPLICABLE',
      'NOT_CHECKED',
      'NOT_IMPLEMENTED',
      'UNAVAILABLE',
      'NEEDS_REVIEW',
      'ERROR'
    ]

    for (const status of requiredStatuses) {
      const meta = VERIFICATION_STATUS_REGISTRY[status]
      assert.ok(meta, `Status ${status} must exist in registry`)
      assert.strictEqual(meta.code, status)
      assert.ok(meta.description.length > 0)
    }

    // Semantic assertions:
    assert.strictEqual(VERIFICATION_STATUS_REGISTRY.PASS.isPassing, true)
    assert.strictEqual(VERIFICATION_STATUS_REGISTRY.NOT_IMPLEMENTED.isPassing, false)
    assert.strictEqual(VERIFICATION_STATUS_REGISTRY.UNAVAILABLE.isPassing, false)
    assert.strictEqual(VERIFICATION_STATUS_REGISTRY.FAIL.isPassing, false)
  })
})

describe('FALCON-404 :: Document Type Registry', () => {
  test('defines profiles for all 5 core workflow categories', () => {
    const types = ['Aadhaar', 'PAN', 'Driving Licence', 'Passport', 'Other / Unknown']
    for (const t of types) {
      const profile = SUPPORTED_DOCUMENT_PROFILES[t as any]
      assert.ok(profile, `Profile for ${t} must exist`)
      assert.strictEqual(profile.declaredCapabilities.deterministicIdentifierValidation, 'planned')
      assert.strictEqual(profile.declaredCapabilities.issuerVerification, 'unavailable')
    }
  })

  test('correctly maps between legacy and supported document types', () => {
    assert.strictEqual(mapLegacyDocumentType('National ID'), 'Aadhaar')
    assert.strictEqual(mapLegacyDocumentType('PAN Card'), 'PAN')
    assert.strictEqual(mapLegacyDocumentType("Driver's License"), 'Driving Licence')
    assert.strictEqual(mapLegacyDocumentType('Passport'), 'Passport')
    assert.strictEqual(mapLegacyDocumentType('Unknown Voucher'), 'Other / Unknown')

    assert.strictEqual(mapSupportedToLegacyDocumentType('Aadhaar'), 'National ID')
    assert.strictEqual(mapSupportedToLegacyDocumentType('PAN'), 'PAN Card')
  })
})

describe('FALCON-404 :: Rule Registry Governance', () => {
  test('all catalogued rules have status PLANNED in Step 1', () => {
    assert.ok(VALIDATION_RULE_CATALOG.length >= 7, 'Catalog must contain planned rules')
    for (const rule of VALIDATION_RULE_CATALOG) {
      assert.strictEqual(
        rule.implementationStatus,
        'PLANNED',
        `Rule ${rule.ruleId} must be PLANNED in Step 1`
      )
      assert.ok(rule.authoritativeSourceName.length > 0)
      assert.ok(rule.authoritativeSourceUrl.length > 0)
    }
  })

  test('getRulesForDocumentType returns applicable rules plus global rules', () => {
    const aadhaarRules = getRulesForDocumentType('Aadhaar')
    assert.ok(aadhaarRules.some((r) => r.ruleId === 'RULE-IN-UID-001'))
    assert.ok(aadhaarRules.some((r) => r.ruleId === 'RULE-DATE-CONSISTENCY-001'))

    const rule = getRuleById('RULE-IN-UID-002')
    assert.ok(rule)
    assert.strictEqual(rule?.ruleCategory, 'mathematical-checksum')
  })

  test('PAN rule correctly does not claim the tenth character is an authoritative check digit', () => {
    const panRule = getRuleById('RULE-IN-PAN-001')
    assert.ok(panRule)
    assert.strictEqual(panRule?.documentType, 'PAN')
    assert.ok(
      panRule?.limitations.includes('no public mathematical checksum algorithm is authoritatively published'),
      'PAN limitations must clarify that the 10th character is not an authoritatively published checksum'
    )
  })

  test('Driving Licence rule documents non-universality of legacy state formats', () => {
    const dlRule = getRuleById('RULE-IN-DL-001')
    assert.ok(dlRule)
    assert.ok(
      dlRule?.limitations.includes('legacy') && dlRule?.limitations.includes('SARATHI'),
      'DL rule must acknowledge legacy state variations'
    )
  })

  test('Expiry rule explicitly documents that expired credentials do NOT equal forgery', () => {
    const expiryRule = getRuleById('RULE-DOC-EXPIRY-STATUS-001')
    assert.ok(expiryRule)
    assert.ok(
      expiryRule?.limitations.includes('must NOT automatically be classified as forged'),
      'Expiry rule must decouple lapsed administrative validity from fraud/forgery'
    )
  })
})

describe('FALCON-404 :: Verification Engine Interface', () => {
  test('validateIdentifier returns NOT_IMPLEMENTED for valid input string (never false PASS)', () => {
    const results = validateIdentifier('Aadhaar', '9999 8888 7777')
    assert.ok(results.length >= 2, 'Aadhaar must have format and checksum checks')
    for (const res of results) {
      assert.strictEqual(
        res.status,
        'NOT_IMPLEMENTED',
        `Check ${res.checkId} must return NOT_IMPLEMENTED in Step 1`
      )
      assert.notStrictEqual(res.status, 'PASS', 'Unimplemented check must never return PASS')
      assert.strictEqual(res.reasonCode, 'RULE_SCHEDULED_STEP_2')
    }
  })

  test('validateIdentifier normalizes whitespace grouping so spaces do not cause false format failure', () => {
    const spaced = validateIdentifier('Aadhaar', '1234 5678 9012')
    const unspaced = validateIdentifier('Aadhaar', '123456789012')
    assert.strictEqual(spaced[0].status, 'NOT_IMPLEMENTED')
    assert.strictEqual(unspaced[0].status, 'NOT_IMPLEMENTED')
    assert.ok(spaced[0].evidenceReferences?.[0].includes('Normalized: 12'))
  })

  test('validateIdentifier returns UNREADABLE for empty or not detected input', () => {
    const results = validateIdentifier('Aadhaar', '')
    for (const res of results) {
      assert.strictEqual(res.status, 'UNREADABLE')
    }

    const resultsNotDetected = validateIdentifier('PAN', 'Not detected')
    for (const res of resultsNotDetected) {
      assert.strictEqual(res.status, 'UNREADABLE')
    }
  })

  test('evaluateDateChecks cleanly separates consistency, validity status, and anomalies', () => {
    // Aadhaar has no expiration date -> Expiry check is NOT_APPLICABLE
    const aadhaarDateChecks = evaluateDateChecks('Aadhaar', [
      {
        fieldName: 'dateOfBirth',
        label: 'Candidate Date of Birth',
        value: '15/08/1990',
        rawOcrValue: '15/08/1990',
        extractionStatus: 'extracted',
        isManuallyCorrected: false,
        category: 'date'
      }
    ])

    const expiryCheck = aadhaarDateChecks.find((c) => c.checkId === 'CHK-RULE-DOC-EXPIRY-001')
    assert.ok(expiryCheck)
    assert.strictEqual(expiryCheck?.status, 'NOT_APPLICABLE', 'Aadhaar must have NOT_APPLICABLE expiry check')

    // Passport with unreadable dates returns UNREADABLE
    const unreadableChecks = evaluateDateChecks('Passport', [])
    assert.strictEqual(unreadableChecks[0].status, 'UNREADABLE')
    assert.strictEqual(unreadableChecks[1].status, 'UNREADABLE')

    // Passport with detected expiry returns NOT_IMPLEMENTED with explicit status notice
    const passportDateChecks = evaluateDateChecks('Passport', [
      {
        fieldName: 'dateOfBirth',
        label: 'Candidate Date of Birth',
        value: '15/08/1990',
        rawOcrValue: '15/08/1990',
        extractionStatus: 'extracted',
        isManuallyCorrected: false,
        category: 'date'
      },
      {
        fieldName: 'expiryDate',
        label: 'Candidate Expiry Date',
        value: '15/08/2022',
        rawOcrValue: '15/08/2022',
        extractionStatus: 'extracted',
        isManuallyCorrected: false,
        category: 'date'
      }
    ])
    const passportExpiry = passportDateChecks.find((c) => c.checkId === 'CHK-RULE-DOC-EXPIRY-001')
    assert.strictEqual(passportExpiry?.status, 'NOT_IMPLEMENTED')
    assert.ok(
      passportExpiry?.explanation.includes('must NOT be classified as forged'),
      'Must explicitly state that expired != forged'
    )
  })

  test('orchestrateScreeningVerification produces multi-dimensional dossier without arbitrary scores', () => {
    const dossier = orchestrateScreeningVerification({
      sessionReference: 'FLC-TEST-001',
      documentName: 'specimen.png',
      selectedDocumentType: 'Aadhaar',
      documentTypeSelectionMode: 'manual',
      extractedFields: [
        {
          fieldName: 'identifier',
          label: 'Candidate 12-Digit Identifier',
          value: '9999 8888 7777',
          rawOcrValue: '9999 8888 7777',
          confidence: 88,
          extractionStatus: 'extracted',
          isManuallyCorrected: false,
          category: 'identifier'
        }
      ],
      ocrConfidence: 88
    })

    assert.strictEqual(dossier.sessionReference, 'FLC-TEST-001')
    assert.strictEqual(dossier.verificationSummary.externalVerificationPerformed, false)
    assert.strictEqual(dossier.issuerVerification.state, 'NOT_CHECKED')
    assert.strictEqual(dossier.mlTamperingResult.status, 'NOT_IMPLEMENTED')
    assert.ok(dossier.verificationSummary.unimplementedChecks > 0)
    assert.strictEqual(dossier.verificationSummary.passedChecks, 0)
  })
})

describe('FALCON-404 :: Privacy Safeguards & Data Masking', () => {
  test('maskCandidateFieldValue reliably masks identifiers, names, and dates by default', () => {
    // Aadhaar masking
    assert.strictEqual(
      maskCandidateFieldValue({ category: 'identifier', value: '1234 5678 9012' }),
      '•••• •••• 9012'
    )

    // PAN masking
    assert.strictEqual(
      maskCandidateFieldValue({ category: 'identifier', value: 'ABCDE1234F' }),
      '••••••234F'
    )

    // Date of Birth masking
    assert.strictEqual(
      maskCandidateFieldValue({ category: 'date', value: '15/08/1990' }),
      '••/••/••••'
    )

    // Name masking
    const maskedName = maskCandidateName('Harshad Mane')
    assert.ok(maskedName.includes('*'))
    assert.notStrictEqual(maskedName, 'Harshad Mane')

    // Document type is not PII -> preserved
    assert.strictEqual(
      maskCandidateFieldValue({ category: 'document-type', value: 'National ID' }),
      'National ID'
    )
  })

  test('buildSavedCaseRecord strips raw images and masks candidate fields in IndexedDB record', () => {
    const mockReportData: any = {
      reportId: 'FLC-PRIV-001',
      generatedAt: '2026-10-24 12:00:00',
      documentName: 'specimen.jpg',
      selectedDocumentType: 'Aadhaar',
      ocrStatus: 'success',
      ocrConfidence: 92,
      ocrResult: {
        rawText: 'RAW SENSITIVE UNPARSED BUFFER SHOULD NOT PERSIST',
        candidateFields: [
          {
            id: 'id-1',
            label: 'Candidate Identifier',
            value: '1234 5678 9012',
            category: 'identifier'
          },
          {
            id: 'name-1',
            label: 'Candidate Name',
            value: 'Harshad Mane',
            category: 'name'
          }
        ]
      },
      integrityResult: {
        fileProperties: {
          fileName: 'specimen.jpg',
          detectedFormat: 'JPEG',
          fileSizeBytes: 10240,
          fileSizeFormatted: '10 KB'
        },
        quality: { width: 800, height: 600, aspectRatio: 1.33 },
        metadata: { format: 'JPEG' },
        ela: {
          supported: true,
          variance: 0.05,
          elaVisualizationUrl: 'data:image/jpeg;base64,RAW_BITMAP_BUFFER_THAT_MUST_BE_EXCLUDED'
        },
        findings: [],
        assessment: { priority: 'standard', priorityLabel: 'Standard Triage' }
      },
      privacySettings: { includeFullOCR: false, includeIdentifiableFields: false }
    }

    const savedRecord = buildSavedCaseRecord(mockReportData, 'STATION-01')

    // Verify raw image visualization URL is excluded
    assert.strictEqual(
      savedRecord.ela.elaVisualizationUrl,
      undefined,
      'ELA bitmap data URL must not be persisted in IndexedDB'
    )

    // Verify candidate fields are masked
    const idField = savedRecord.candidateFields.find((f) => f.category === 'identifier')
    assert.strictEqual(idField?.value, '•••• •••• 9012')

    const nameField = savedRecord.candidateFields.find((f) => f.category === 'name')
    assert.notStrictEqual(nameField?.value, 'Harshad Mane')
    assert.ok(nameField?.value.includes('*'))
  })
})

describe('FALCON-404 :: Backend API Contract', () => {
  // Helper mock for ServerResponse
  class MockResponse extends EventEmitter {
    statusCode = 200
    headers: Record<string, string> = {}
    body = ''
    writeHead(statusCode: number, headers: Record<string, string>) {
      this.statusCode = statusCode
      this.headers = headers
      return this
    }
    end(data?: string) {
      if (data) this.body = data
      this.emit('finish')
      return this
    }
  }

  test('GET /api/v1/health returns healthy status and service version', () => {
    const req = {} as any
    const res = new MockResponse()
    handleApiHealth(req, res as any)

    assert.strictEqual(res.statusCode, 200)
    const json = JSON.parse(res.body)
    assert.strictEqual(json.status, 'HEALTHY')
    assert.strictEqual(json.service, 'FALCON-404 Forensic Verification API')
    assert.strictEqual(json.version, '1.0.0')
  })

  test('GET /api/v1/capabilities declares truthful capabilities without fake ML or issuer claims', () => {
    const req = {} as any
    const res = new MockResponse()
    handleApiCapabilities(req, res as any)

    assert.strictEqual(res.statusCode, 200)
    const json = JSON.parse(res.body)
    assert.strictEqual(json.capabilities.deterministicIdentifierValidation, 'NOT_IMPLEMENTED')
    assert.strictEqual(json.capabilities.trainedMlTamperingDetection, 'NOT_IMPLEMENTED')
    assert.strictEqual(json.capabilities.issuerVerification, 'UNAVAILABLE')
    assert.ok(json.supportedDocumentTypes.includes('Aadhaar'))
  })

  test('POST /api/v1/screenings rejects unsupported document types with 400', async () => {
    const req = (async function* () {
      yield JSON.stringify({ documentType: 'FakeCardType123', fields: [] })
    })() as any

    const res = new MockResponse()
    await handleApiScreenings(req, res as any)

    assert.strictEqual(res.statusCode, 400)
    const json = JSON.parse(res.body)
    assert.strictEqual(json.error.code, 'UNSUPPORTED_DOCUMENT_TYPE')
  })

  test('POST /api/v1/screenings returns structured verification response for valid request', async () => {
    const req = (async function* () {
      yield JSON.stringify({
        documentType: 'Aadhaar',
        fields: [{ fieldName: 'identifier', value: '123456789012' }]
      })
    })() as any

    const res = new MockResponse()
    await handleApiScreenings(req, res as any)

    assert.strictEqual(res.statusCode, 200)
    const json = JSON.parse(res.body)
    assert.strictEqual(json.documentType, 'Aadhaar')
    assert.strictEqual(json.verificationSummary.status, 'NEEDS_REVIEW')
    assert.ok(json.validationResults.length > 0)
    for (const r of json.validationResults) {
      assert.notStrictEqual(r.status, 'PASS', 'Step 1 must never return PASS')
    }
  })
})
