/**
 * FALCON-404: Supported Document Type Registry & Capabilities
 * Lead Developer & System Architect: Harshad Mane
 * Milestone: Step 1 of 3 — Core Verification Workflow & Architecture
 */

import type { SupportedDocumentType, DocumentTypeProfile } from '../types/verificationWorkflow.ts'
import type { DocumentType } from '../types/index.ts'

export const SUPPORTED_DOCUMENT_PROFILES: Record<SupportedDocumentType, DocumentTypeProfile> = {
  Aadhaar: {
    id: 'Aadhaar',
    code: 'IN // UIDAI',
    displayName: 'Aadhaar (National ID)',
    description: '12-digit unique identity credential issued by UIDAI, featuring QR code and biometric demographics.',
    isSelectable: true,
    jurisdiction: 'India (UIDAI)',
    expectedIdentifierFormat: '12-digit numeric sequence (XXXX XXXX XXXX) with Verhoeff check digit.',
    declaredCapabilities: {
      clientSideOcr: 'implemented',
      imageIntegrityAnalysis: 'implemented',
      boundaryAndLayoutAnalysis: 'implemented',
      deterministicIdentifierValidation: 'planned', // Step 2
      documentSpecificProfiles: 'planned', // Step 3
      trainedMlTamperingDetection: 'not_implemented',
      issuerVerification: 'unavailable'
    }
  },
  PAN: {
    id: 'PAN',
    code: 'IN // NSDL-ITD',
    displayName: 'PAN Card (Taxpayer ID)',
    description: '10-character alphanumeric tax identifier card issued by the Income Tax Department.',
    isSelectable: true,
    jurisdiction: 'India (Income Tax Department)',
    expectedIdentifierFormat: '10-character alphanumeric (5 letters, 4 digits, 1 letter) e.g. ABCDE1234F.',
    declaredCapabilities: {
      clientSideOcr: 'implemented',
      imageIntegrityAnalysis: 'implemented',
      boundaryAndLayoutAnalysis: 'implemented',
      deterministicIdentifierValidation: 'planned', // Step 2
      documentSpecificProfiles: 'planned', // Step 3
      trainedMlTamperingDetection: 'not_implemented',
      issuerVerification: 'unavailable'
    }
  },
  'Driving Licence': {
    id: 'Driving Licence',
    code: 'IN // MORTH',
    displayName: "Driver's License (DL)",
    description: 'Motor vehicle operating authority credential issued by State Road Transport Authorities / MoRTH.',
    isSelectable: true,
    jurisdiction: 'India (MoRTH / Parivahan)',
    expectedIdentifierFormat: '15 to 16 alphanumeric characters (2-letter state code + 2-digit RTO/year + numeric sequence).',
    declaredCapabilities: {
      clientSideOcr: 'implemented',
      imageIntegrityAnalysis: 'implemented',
      boundaryAndLayoutAnalysis: 'implemented',
      deterministicIdentifierValidation: 'planned', // Step 2
      documentSpecificProfiles: 'planned', // Step 3
      trainedMlTamperingDetection: 'not_implemented',
      issuerVerification: 'unavailable'
    }
  },
  Passport: {
    id: 'Passport',
    code: 'ICAO // DOC-9303',
    displayName: 'Passport (Travel Document)',
    description: 'Standard international biometric/machine-readable travel document adhering to ICAO Doc 9303.',
    isSelectable: true,
    jurisdiction: 'International (ICAO TD3)',
    expectedIdentifierFormat: '8 to 9 alphanumeric booklet identifier with 2-line MRZ checksum check digits.',
    declaredCapabilities: {
      clientSideOcr: 'implemented',
      imageIntegrityAnalysis: 'implemented',
      boundaryAndLayoutAnalysis: 'implemented',
      deterministicIdentifierValidation: 'planned', // Step 2
      documentSpecificProfiles: 'planned', // Step 3
      trainedMlTamperingDetection: 'not_implemented',
      issuerVerification: 'unavailable'
    }
  },
  'Other / Unknown': {
    id: 'Other / Unknown',
    code: 'GEN // SPECIMEN',
    displayName: 'Other / Unknown Document',
    description: 'General credential or unspecified document raster. Generic OCR transcription and raster forensics applied.',
    isSelectable: true,
    jurisdiction: 'General / Unspecified',
    expectedIdentifierFormat: 'Unrestricted alphanumeric text sequence.',
    declaredCapabilities: {
      clientSideOcr: 'implemented',
      imageIntegrityAnalysis: 'implemented',
      boundaryAndLayoutAnalysis: 'implemented',
      deterministicIdentifierValidation: 'planned', // Step 2
      documentSpecificProfiles: 'planned', // Step 3
      trainedMlTamperingDetection: 'not_implemented',
      issuerVerification: 'unavailable'
    }
  }
}

export const getAllDocumentProfiles = (): DocumentTypeProfile[] => {
  return Object.values(SUPPORTED_DOCUMENT_PROFILES)
}

export const getDocumentProfile = (type: SupportedDocumentType): DocumentTypeProfile => {
  return SUPPORTED_DOCUMENT_PROFILES[type] || SUPPORTED_DOCUMENT_PROFILES['Other / Unknown']
}

export const isDocumentTypeSupported = (type: string): type is SupportedDocumentType => {
  return type in SUPPORTED_DOCUMENT_PROFILES
}

/**
 * Maps between existing Phase 1-6 legacy DocumentType strings and Phase 7 SupportedDocumentType.
 */
export const mapLegacyDocumentType = (legacyType: string): SupportedDocumentType => {
  const norm = legacyType.trim().toLowerCase()
  if (norm.includes('aadhaar') || norm.includes('national id')) return 'Aadhaar'
  if (norm.includes('pan')) return 'PAN'
  if (norm.includes('driver') || norm.includes('licence') || norm.includes('license')) return 'Driving Licence'
  if (norm.includes('passport')) return 'Passport'
  return 'Other / Unknown'
}

/**
 * Maps a SupportedDocumentType back to legacy DocumentType for backward compatibility.
 */
export const mapSupportedToLegacyDocumentType = (supported: SupportedDocumentType): DocumentType => {
  switch (supported) {
    case 'Aadhaar':
      return 'National ID'
    case 'PAN':
      return 'PAN Card'
    case 'Driving Licence':
      return "Driver's License"
    case 'Passport':
      return 'Passport'
    default:
      return 'National ID'
  }
}
