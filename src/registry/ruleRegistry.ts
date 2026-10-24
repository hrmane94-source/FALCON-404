/**
 * FALCON-404: Validation Rule Registry & Source Governance
 * Lead Developer & System Architect: Harshad Mane
 * Milestone: Step 1 of 3 — Core Verification Workflow & Architecture
 *
 * This registry acts as the authoritative governance catalog for all deterministic
 * identifier checks, checksum algorithms, and format profiles.
 *
 * IMPORTANT GOVERNANCE REQUIREMENT:
 * In Milestone Step 1, all deterministic rules are registered in the PLANNED state.
 * No planned rule is marked IMPLEMENTED or TESTED until Step 2/3 implements and verifies it.
 */

import type { SupportedDocumentType, CheckCategory } from '../types/verificationWorkflow.ts'

export type RuleImplementationStatus =
  | 'PLANNED'
  | 'IMPLEMENTED'
  | 'TESTED'
  | 'DEPRECATED'
  | 'UNVERIFIED'

export interface RuleDefinition {
  ruleId: string
  ruleName: string
  documentType: SupportedDocumentType | 'ALL'
  ruleCategory: CheckCategory
  description: string
  authoritativeSourceName: string
  authoritativeSourceUrl: string
  sourceVersionOrDate?: string
  implementationStatus: RuleImplementationStatus
  applicableFormat: string
  limitations: string
  associatedTestReference?: string
}

export const VALIDATION_RULE_CATALOG: RuleDefinition[] = [
  // --------------------------------------------------------------------------
  // Aadhaar Rules (Planned for Step 2)
  // --------------------------------------------------------------------------
  {
    ruleId: 'RULE-IN-UID-001',
    ruleName: 'Aadhaar 12-Digit Structural Format Check',
    documentType: 'Aadhaar',
    ruleCategory: 'identifier-format',
    description: 'Validates that the Aadhaar number consists of exactly 12 numeric digits with leading digit not 0 or 1. Whitespace and hyphen display grouping (e.g. XXXX XXXX XXXX or XXXXXXXXXXXX) are normalized prior to evaluation.',
    authoritativeSourceName: 'UIDAI Technical Specifications & Aadhaar Act 2016',
    authoritativeSourceUrl: 'https://uidai.gov.in',
    sourceVersionOrDate: 'Aadhaar Act 2016 (Amended 2019)',
    implementationStatus: 'PLANNED',
    applicableFormat: '12 numeric digits with optional 4-4-4 spacing/hyphens',
    limitations: 'Normalization handles display spacing to prevent false format failures. Format pattern matching does not confirm active presence in the Central Identities Data Repository (CIDR) or verify genuine issuance.'
  },
  {
    ruleId: 'RULE-IN-UID-002',
    ruleName: 'Aadhaar Verhoeff Dihedral Checksum Algorithm',
    documentType: 'Aadhaar',
    ruleCategory: 'mathematical-checksum',
    description: 'Calculates the Verhoeff dihedral group D5 permutation checksum over the 12-digit sequence to detect all single-digit substitution errors and adjacent transposition errors.',
    authoritativeSourceName: 'Jacobus Verhoeff (1969) / UIDAI Technical Guidelines',
    authoritativeSourceUrl: 'https://uidai.gov.in',
    sourceVersionOrDate: 'UIDAI Aadhaar Technical Guidelines',
    implementationStatus: 'PLANNED',
    applicableFormat: '12-digit numeric with trailing Verhoeff check digit',
    limitations: 'Verhoeff checksum confirms transcription integrity only. It does not provide biometric, cryptographic, or statutory proof of card genuineness.'
  },

  // --------------------------------------------------------------------------
  // PAN Rules (Planned for Step 2)
  // --------------------------------------------------------------------------
  {
    ruleId: 'RULE-IN-PAN-001',
    ruleName: 'PAN 10-Character Alphanumeric Structure Check',
    documentType: 'PAN',
    ruleCategory: 'identifier-format',
    description: 'Validates that the Permanent Account Number conforms to the 10-character alphanumeric structure (5 uppercase letters, followed by 4 numeric digits, and 1 trailing letter: [A-Z]{5}[0-9]{4}[A-Z]{1}).',
    authoritativeSourceName: 'Income Tax Department of India, Rule 114, Income-tax Rules, 1962',
    authoritativeSourceUrl: 'https://www.incometax.gov.in',
    sourceVersionOrDate: 'Rule 114 (Format of PAN)',
    implementationStatus: 'PLANNED',
    applicableFormat: 'AAAAA9999A',
    limitations: 'The 10th character is an alphabetic letter allotted by ITD; no public mathematical checksum algorithm is authoritatively published under Rule 114. Structural compliance confirms syntactic format only and must not be presented as proof that the PAN exists or is active in ITD records.'
  },
  {
    ruleId: 'RULE-IN-PAN-002',
    ruleName: 'PAN 4th Character Taxpayer Entity Code Validation',
    documentType: 'PAN',
    ruleCategory: 'identifier-format',
    description: 'Verifies that the 4th character represents a recognized taxpayer entity category (P: Individual, C: Company, H: HUF, F: Firm/LLP, A: AOP, T: Trust, B: BOI, L: Local Authority, J: Artificial Juridical Person, G: Government).',
    authoritativeSourceName: 'Income Tax Department PAN Allotment Scheme Guidelines',
    authoritativeSourceUrl: 'https://www.incometax.gov.in',
    sourceVersionOrDate: 'ITD Guidelines',
    implementationStatus: 'PLANNED',
    applicableFormat: '4th character of 10-character PAN string',
    limitations: 'Validates entity code syntax only; does not verify whether the specific entity or taxpayer is registered under that entity classification.'
  },

  // --------------------------------------------------------------------------
  // Driving Licence Rules (Planned for Step 2)
  // --------------------------------------------------------------------------
  {
    ruleId: 'RULE-IN-DL-001',
    ruleName: 'Driving Licence Standard Parivahan Format Check',
    documentType: 'Driving Licence',
    ruleCategory: 'identifier-format',
    description: 'Validates modern unified MoRTH SARATHI DL structure: 2-character State code, 2-digit RTO code, 4-digit issue year, and 7-digit sequential number (with optional separator spaces/hyphens).',
    authoritativeSourceName: 'Ministry of Road Transport and Highways (MoRTH) / SARATHI Parivahan System',
    authoritativeSourceUrl: 'https://parivahan.gov.in',
    sourceVersionOrDate: 'MoRTH Standard DL Specification 2019',
    implementationStatus: 'PLANNED',
    applicableFormat: 'SS-RR-YYYY-NNNNNNN (15 or 16 alphanumeric characters, spacing normalized)',
    limitations: 'Indian driving licences issued prior to the SARATHI nationwide standardization follow diverse state-specific legacy formats with varied character counts and delimiters. A document must NOT be classified as invalid or suspicious merely because it follows a legacy state structure rather than the 2019 unified standard.'
  },

  // --------------------------------------------------------------------------
  // Voter ID (EPIC) Rules (Planned for Step 2)
  // --------------------------------------------------------------------------
  {
    ruleId: 'RULE-IN-EPIC-001',
    ruleName: 'Voter ID (EPIC) Standard Alphanumeric Format Check',
    documentType: 'Other / Unknown',
    ruleCategory: 'identifier-format',
    description: 'Validates standardized Election Commission of India (ECI) Electors Photo Identity Card (EPIC) alphanumeric format (3-letter functional state/functional series prefix followed by 7 numeric digits).',
    authoritativeSourceName: 'Election Commission of India (ECI) Registration of Electors Rules',
    authoritativeSourceUrl: 'https://eci.gov.in',
    sourceVersionOrDate: 'ECI Standard EPIC Guidelines',
    implementationStatus: 'PLANNED',
    applicableFormat: 'AAA9999999 (10 alphanumeric characters)',
    limitations: 'Legacy voter identity cards issued prior to unified EPIC prefix standardization use state-specific alphanumeric series with varying digit lengths. Pattern matching confirms syntax only and does not verify active status on the electoral roll.'
  },

  // --------------------------------------------------------------------------
  // Passport Rules (Planned for Step 2)
  // --------------------------------------------------------------------------
  {
    ruleId: 'RULE-ICAO-9303-001',
    ruleName: 'ICAO Doc 9303 Machine Readable Zone (MRZ) Checksum Algorithm',
    documentType: 'Passport',
    ruleCategory: 'mathematical-checksum',
    description: 'Computes modulo 10 with cyclical weights 7-3-1 over document number, date of birth, expiration date, and optional composite data fields on established ICAO Doc 9303 travel documents.',
    authoritativeSourceName: 'International Civil Aviation Organization (ICAO) Doc 9303 Part 4: Specifications for Machine Readable Passports',
    authoritativeSourceUrl: 'https://www.icao.int/publications/pages/publication.aspx?docnum=9303',
    sourceVersionOrDate: 'ICAO Doc 9303 8th Edition (2021)',
    implementationStatus: 'PLANNED',
    applicableFormat: '44-character 2-line TD3 MRZ lines (or TD1/TD2 where established)',
    limitations: 'Must NOT be applied unless the specific document MRZ format (e.g. TD3 for passports) has been definitively identified from the specimen. Optical OCR misrecognitions (e.g. O vs 0, I vs 1) must not be conflated with fraudulent manipulation.'
  },

  // --------------------------------------------------------------------------
  // Date Logicality & Credential Validity Rules (Planned for Step 2)
  // --------------------------------------------------------------------------
  {
    ruleId: 'RULE-DATE-CONSISTENCY-001',
    ruleName: 'Date-Field Chronological Consistency Check',
    documentType: 'ALL',
    ruleCategory: 'date-logicality',
    description: 'Validates chronological ordering between extracted date fields when multiple relevant dates are present (e.g. Date of Birth precedes Date of Issue). Does not mandate the presence of fields not applicable to the document type.',
    authoritativeSourceName: 'FALCON-404 System Specification (Milestone Step 1)',
    authoritativeSourceUrl: 'https://github.com/Harshad-Mane/FALCON-MVP',
    sourceVersionOrDate: 'FALCON-404 Architecture v1.0',
    implementationStatus: 'PLANNED',
    applicableFormat: 'ISO-8601 YYYY-MM-DD or calendar DD/MM/YYYY dates',
    limitations: 'Applies only when two or more relevant dates are extracted. Missing dates on documents that do not feature them (e.g. PAN or Aadhaar) must not be treated as inconsistencies.'
  },
  {
    ruleId: 'RULE-DOC-EXPIRY-STATUS-001',
    ruleName: 'Document Expiry & Current Validity Status Assessment',
    documentType: 'ALL',
    ruleCategory: 'date-logicality',
    description: 'Evaluates whether an extracted document expiration date is in the past relative to the active screening session timestamp. Reports lapsed credential validity as a status finding.',
    authoritativeSourceName: 'FALCON-404 System Specification (Milestone Step 1)',
    authoritativeSourceUrl: 'https://github.com/Harshad-Mane/FALCON-MVP',
    sourceVersionOrDate: 'FALCON-404 Architecture v1.0',
    implementationStatus: 'PLANNED',
    applicableFormat: 'Standard expiration date string',
    limitations: 'CRITICAL PRINCIPLE: An expired document indicates lapsed administrative validity only; it must NOT automatically be classified as forged, tampered, or fraudulent. Not applicable to documents without an expiry concept (e.g. Aadhaar, PAN).'
  },
  {
    ruleId: 'RULE-DATE-ANOMALY-001',
    ruleName: 'Chronological Anomaly & Suspicious Date Screening',
    documentType: 'ALL',
    ruleCategory: 'date-logicality',
    description: 'Screens for physically or chronologically impossible date combinations (e.g. document issue date occurring in the future relative to current time, or holder birth date occurring after document issue date).',
    authoritativeSourceName: 'FALCON-404 System Specification (Milestone Step 1)',
    authoritativeSourceUrl: 'https://github.com/Harshad-Mane/FALCON-MVP',
    sourceVersionOrDate: 'FALCON-404 Architecture v1.0',
    implementationStatus: 'PLANNED',
    applicableFormat: 'Calendar date strings',
    limitations: 'OCR transcription noise (e.g. 1988 read as 1908 or 2088) can produce spurious anomalies. Optical misrecognitions must be classified as UNREADABLE or low-confidence rather than definitive fraud.'
  },

  // --------------------------------------------------------------------------
  // Machine Learning Tampering Detection (Planned for Phase 8)
  // --------------------------------------------------------------------------
  {
    ruleId: 'RULE-ML-TAMPER-001',
    ruleName: 'Neural Localized Inconsistency & Patch Tampering Detector',
    documentType: 'ALL',
    ruleCategory: 'machine-learning',
    description: 'Deep neural network trained on localized document manipulation artifacts to segment potential splicing, copy-move, and recompression anomalies.',
    authoritativeSourceName: 'FALCON-404 Machine Learning Research Pipeline (Phase 7.1/Phase 8)',
    authoritativeSourceUrl: 'https://github.com/Harshad-Mane/FALCON-MVP',
    sourceVersionOrDate: 'Research Milestone (Dataset Preparation Phase 7.1)',
    implementationStatus: 'PLANNED',
    applicableFormat: 'High-resolution document raster',
    limitations: 'NO TRAINED MACHINE LEARNING MODEL IS INTEGRATED IN MILESTONE STEP 1. Heuristic image integrity checks (ELA, contrast, Laplacian blur) must not be labeled as machine learning inference.'
  },

  // --------------------------------------------------------------------------
  // Authorised Issuer Verification (Planned for Future External Gateways)
  // --------------------------------------------------------------------------
  {
    ruleId: 'RULE-EXT-ISSUER-001',
    ruleName: 'Direct Statutory Authority Gateway Record Verification',
    documentType: 'ALL',
    ruleCategory: 'issuer-records',
    description: 'Cryptographic query or authorized verification against statutory registry databases (e.g., DigiLocker, Parivahan, UIDAI verification portal).',
    authoritativeSourceName: 'Applicable Statutory Agency API Protocols',
    authoritativeSourceUrl: 'https://github.com/Harshad-Mane/FALCON-MVP',
    sourceVersionOrDate: 'External Integration Framework',
    implementationStatus: 'PLANNED',
    applicableFormat: 'Document identifier and authorized consent token',
    limitations: 'UNAVAILABLE in Step 1. FALCON-404 does not connect to live government identity databases.'
  }
]

export const getAllRules = (): RuleDefinition[] => {
  return VALIDATION_RULE_CATALOG
}

export const getRulesForDocumentType = (type: SupportedDocumentType): RuleDefinition[] => {
  return VALIDATION_RULE_CATALOG.filter(
    (rule) => rule.documentType === 'ALL' || rule.documentType === type
  )
}

export const getRuleById = (ruleId: string): RuleDefinition | undefined => {
  return VALIDATION_RULE_CATALOG.find((rule) => rule.ruleId === ruleId)
}
