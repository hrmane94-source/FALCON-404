/**
 * Transparent candidate field parser for FALCON Phase 3.
 * Extracts heuristic candidate fields from raw OCR text without claiming database verification.
 */

import type { CandidateField, OCRTextRegion } from '../types'

export type { CandidateField }

// Prohibited keywords that cannot constitute a personal subject name
export const INSTITUTIONAL_AUTHORITY_KEYWORDS = [
  'GOVERNMENT', 'GOVT', 'INDIA', 'REPUBLIC', 'AUTHORITY', 'UNIQUE', 'IDENTIFICATION',
  'UIDAI', 'DEPARTMENT', 'MINISTRY', 'COMMISSION', 'ELECTION', 'STATE', 'UNION',
  'NATIONAL', 'CENTRAL', 'EMBLEM', 'TRANSPORT', 'HIGHWAY', 'REVENUE', 'INCOME TAX',
  'BHARAT', 'SARKAR', 'OFFICIAL', 'PRESIDENT', 'MINISTER'
]

export const DOCUMENT_TYPE_KEYWORDS = [
  'AADHAAR', 'PASSPORT', 'DRIVING', 'LICENCE', 'LICENSE', 'PAN', 'VOTER',
  'ELECTORAL', 'IDENTITY', 'DOCUMENT', 'CARD', 'SPECIMEN', 'SAMPLE', 'DEMO',
  'CITIZEN', 'RECORD', 'CERTIFICATE', 'NUMBER', 'PERMANENT', 'ACCOUNT'
]

export const ADDRESS_AND_GUARDIAN_KEYWORDS = [
  'ADDRESS', 'S/O', 'D/O', 'W/O', 'C/O', 'SON OF', 'DAUGHTER OF', 'WIFE OF', 'CARE OF',
  'FATHER', 'MOTHER', 'HUSBAND', 'GUARDIAN', 'HOUSE', 'SECTOR', 'ROAD', 'STREET',
  'LANE', 'NAGAR', 'COLONY', 'VILLAGE', 'DISTRICT', 'STATE', 'PINCODE', 'PIN',
  'POST', 'TEHSIL', 'TALUK', 'PO', 'PS', 'FLAT', 'BUILDING', 'APARTMENT', 'FLOOR',
  'BLOCK', 'NEAR', 'OPP', 'BEHIND', 'PLOT', 'POST OFFICE', 'WARD', 'AREA',
  'पता', 'पुत्र', 'पुत्री', 'पत्नी', 'मकान'
]

export const DATE_AND_GENDER_KEYWORDS = [
  'DOB', 'DATE', 'BIRTH', 'YEAR', 'YOB', 'ISSUE', 'EXPIRY', 'VALID',
  'MALE', 'FEMALE', 'TRANSGENDER', 'GENDER', 'SEX', 'MALE,', 'FEMALE,',
  'पुरुष', 'महिला', 'जन्म', 'तिथि'
]

export const SLOGAN_AND_FOOTER_KEYWORDS = [
  'MERA AADHAAR', 'MERI PEHCHAN', 'HELP@UIDAI', 'WWW.UIDAI', 'TOLL FREE',
  'SIGNATURE', 'HOLDER', 'PHOTO', 'THROUGHOUT', 'VID:', 'VID', 'ENROLLMENT',
  'DOWNLOAD', 'PORTAL', 'VERIFY'
]

export function isPlausibleNameString(str: string): { plausible: boolean; isInitialsOnly: boolean; reason?: string } {
  const trimmed = str.trim()
  if (!trimmed || trimmed.length < 3 || trimmed.length > 45) {
    return { plausible: false, isInitialsOnly: false, reason: 'Invalid length' }
  }

  // Must only contain latin letters, spaces, periods, apostrophes, hyphens
  if (!/^[A-Za-z\s\.\-']+$/.test(trimmed)) {
    return { plausible: false, isInitialsOnly: false, reason: 'Contains invalid characters' }
  }

  // Reject digits
  if (/\d/.test(trimmed)) {
    return { plausible: false, isInitialsOnly: false, reason: 'Contains digits' }
  }

  const upper = trimmed.toUpperCase()

  // Prohibited keyword checks
  const allProhibited = [
    ...INSTITUTIONAL_AUTHORITY_KEYWORDS,
    ...DOCUMENT_TYPE_KEYWORDS,
    ...ADDRESS_AND_GUARDIAN_KEYWORDS,
    ...DATE_AND_GENDER_KEYWORDS,
    ...SLOGAN_AND_FOOTER_KEYWORDS
  ]

  for (const kw of allProhibited) {
    const escaped = kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
    const regex = new RegExp(`(^|\\s|[:\\/\\-])${escaped}(\\s|[:\\/\\-]|$)`, 'i')
    if (regex.test(upper)) {
      return { plausible: false, isInitialsOnly: false, reason: `Matches prohibited keyword: ${kw}` }
    }
  }

  // Check word tokens
  const words = trimmed.split(/\s+/).filter((w) => w.length > 0)
  if (words.length === 0) {
    return { plausible: false, isInitialsOnly: false, reason: 'No words found' }
  }

  // Discard arbitrary initials or short fragments like "N L J", "A B C", "N"
  const isAllSingleLetters = words.every((w) => w.replace(/[^A-Za-z]/g, '').length <= 1)
  if (isAllSingleLetters) {
    return { plausible: false, isInitialsOnly: true, reason: 'Initials-only or short fragment without full name tokens' }
  }

  // Every word token in a personal name must begin with an uppercase letter [A-Z]
  const allCapitalized = words.every((w) => /^[A-Z]/.test(w))
  if (!allCapitalized) {
    return { plausible: false, isInitialsOnly: false, reason: 'Words must begin with uppercase letter' }
  }

  // A genuine personal name must have at least one token with length >= 3 (e.g. "Roy", "John", "Rohan", "Patil")
  const hasSubstantialToken = words.some((w) => w.replace(/[^A-Za-z]/g, '').length >= 3)
  if (!hasSubstantialToken) {
    return { plausible: false, isInitialsOnly: false, reason: 'Must contain at least one name token with >= 3 letters' }
  }

  return { plausible: true, isInitialsOnly: false }
}

export function parseCandidateSubjectName(
  lines: string[],
  _textRegions?: OCRTextRegion[]
): {
  value: string
  confidenceTier: 'confident' | 'review' | 'not-detected'
  patternMatched: string
  contextNote?: string
} {
  // 1. Explicit Label-Based Extraction
  // English & Multilingual labels
  const labelPrefixRegex = /^(?:Full\s*Name|Candidate\s*Name|Name\s*of\s*Candidate|Given\s*Name|Cardholder\s*Name|Holder\s*Name|Surname|Name|नाम|पूरा\s*नाम)[:\s\-\.\/]+([A-Za-z\s\.\-']{2,45})$/i
  const standaloneLabelRegex = /^(?:Full\s*Name|Candidate\s*Name|Name\s*of\s*Candidate|Given\s*Name|Cardholder\s*Name|Holder\s*Name|Surname|Name|नाम|पूरा\s*नाम)[:\s\-\.]*$/i

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // 1A. Same line match
    const sameMatch = line.match(labelPrefixRegex)
    if (sameMatch && sameMatch[1]) {
      const candidate = sameMatch[1].trim()
      const check = isPlausibleNameString(candidate)
      if (check.plausible) {
        return {
          value: candidate,
          confidenceTier: 'confident',
          patternMatched: 'Extracted following explicit Name label indicator'
        }
      }
    }

    // 1B. Adjacent next line match
    if (standaloneLabelRegex.test(line) && i + 1 < lines.length) {
      const nextLine = lines[i + 1].trim()
      const check = isPlausibleNameString(nextLine)
      if (check.plausible) {
        return {
          value: nextLine,
          confidenceTier: 'confident',
          patternMatched: 'Extracted from adjacent line following Name label'
        }
      }
    }
  }

  // 2. Positional / Anchored Credential Subject Extraction (e.g. National ID / Aadhaar)
  let dobIndex = -1
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].toUpperCase()
    if (l.includes('DOB') || l.includes('BIRTH') || lines[i].includes('जन्म') || lines[i].includes('तिथि')) {
      dobIndex = i
      break
    }
  }

  if (dobIndex > 0) {
    // Check lines preceding DOB (up to 3 lines prior, e.g. English name directly above DOB)
    for (let i = dobIndex - 1; i >= Math.max(0, dobIndex - 3); i--) {
      const line = lines[i].trim()

      // Skip lines with Devanagari characters (local script name header)
      if (/[\u0900-\u097F]/.test(line)) continue

      const check = isPlausibleNameString(line)
      if (check.plausible) {
        return {
          value: line,
          confidenceTier: 'confident',
          patternMatched: 'Extracted from credential subject header positioned directly above Date of Birth'
        }
      }
    }
  }

  // 3. Fallback Heuristic Review Tier
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (/[\u0900-\u097F]/.test(line)) continue

    const check = isPlausibleNameString(line)
    if (check.plausible) {
      const words = line.split(/\s+/).filter((w) => w.length > 0)
      if (words.length >= 2 && words.length <= 4) {
        return {
          value: line,
          confidenceTier: 'review',
          patternMatched: 'Heuristic candidate name detected without label confirmation; examiner review required',
          contextNote: 'Potential personal name string detected without explicit label anchor. Please verify against document capture.'
        }
      }
    }
  }

  // 4. Fallback Not Confidently Detected
  return {
    value: 'Name not confidently detected',
    confidenceTier: 'not-detected',
    patternMatched: 'No reliable name label or credential subject line detected in OCR text',
    contextNote: 'Optical text does not contain a verified name label or anchored credential subject name.'
  }
}

/**
 * Transparent heuristic extraction of candidate fields from raw OCR text.
 * Note: These are pattern-matched candidates only; they are not authenticated.
 */
export function extractCandidateFields(
  rawText: string,
  _selectedCategory?: string,
  textRegions?: OCRTextRegion[]
): CandidateField[] {
  if (!rawText || rawText.trim().length === 0) {
    return []
  }

  const fields: CandidateField[] = []
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  // 1. Candidate Document Type Detection
  const upperText = rawText.toUpperCase()
  if (upperText.includes('PASSPORT')) {
    fields.push({
      id: 'doc-type-passport',
      label: 'Candidate Document Type',
      value: 'Passport / Travel Document',
      patternMatched: 'Detected keyword "PASSPORT"',
      category: 'document-type'
    })
  } else if (upperText.includes('AADHAAR') || upperText.includes('UNIQUE IDENTIFICATION') || upperText.includes('UIDAI')) {
    fields.push({
      id: 'doc-type-aadhaar',
      label: 'Candidate Document Type',
      value: 'National ID / Aadhaar Format',
      patternMatched: 'Detected keyword "AADHAAR" / "UIDAI" / "UNIQUE IDENTIFICATION"',
      category: 'document-type'
    })
  } else if (upperText.includes('DRIVING') || upperText.includes('DRIVE') || upperText.includes('LICENCE')) {
    fields.push({
      id: 'doc-type-dl',
      label: 'Candidate Document Type',
      value: "Driver's License Format",
      patternMatched: 'Detected keyword "DRIVING" / "LICENCE"',
      category: 'document-type'
    })
  } else if (upperText.includes('VOTER') || upperText.includes('ELECTION') || upperText.includes('ELECTORAL')) {
    fields.push({
      id: 'doc-type-voter',
      label: 'Candidate Document Type',
      value: 'Voter ID / Electoral Card',
      patternMatched: 'Detected keyword "VOTER" / "ELECTION"',
      category: 'document-type'
    })
  } else if (upperText.includes('INCOME TAX') || upperText.includes('PERMANENT ACCOUNT') || upperText.includes('PAN')) {
    fields.push({
      id: 'doc-type-pan',
      label: 'Candidate Document Type',
      value: 'PAN Card Format',
      patternMatched: 'Detected keyword "INCOME TAX" / "PAN"',
      category: 'document-type'
    })
  } else if (upperText.includes('SYNTHETIC') || upperText.includes('SPECIMEN') || upperText.includes('DEMO')) {
    fields.push({
      id: 'doc-type-demo',
      label: 'Candidate Document Type',
      value: 'Synthetic Demo Specimen',
      patternMatched: 'Detected keyword "SYNTHETIC" / "SPECIMEN" / "DEMO"',
      category: 'document-type'
    })
  }

  // 2. Candidate Document / ID Number (regex heuristic)
  // Demo format: DEMO-XXXX-XX or FLC-XXXX-XXXX
  const demoIdMatch = rawText.match(/\b(DEMO|FLC)[-\s]?[0-9]{4}[-\s]?[0-9]{2,4}\b/i)
  if (demoIdMatch) {
    fields.push({
      id: 'id-demo',
      label: 'Candidate Document ID',
      value: demoIdMatch[0].trim(),
      patternMatched: 'Heuristic demo identifier format (DEMO/FLC)',
      category: 'identifier'
    })
  }

  // Indian PAN format: 5 letters, 4 numbers, 1 letter
  const panMatch = rawText.match(/\b[A-Z]{5}[0-9]{4}[A-Z]\b/)
  if (panMatch) {
    fields.push({
      id: 'id-pan',
      label: 'Candidate PAN / Tax ID',
      value: panMatch[0],
      patternMatched: 'Regex standard: 5 letters + 4 digits + 1 letter',
      category: 'identifier'
    })
  }

  // Aadhaar 12-digit number (e.g. 1234 5678 9012)
  const aadhaarMatch = rawText.match(/\b\d{4}\s\d{4}\s\d{4}\b/)
  if (aadhaarMatch) {
    fields.push({
      id: 'id-aadhaar',
      label: 'Candidate 12-Digit Identifier',
      value: aadhaarMatch[0],
      patternMatched: 'Regex standard: 4-4-4 digit group',
      category: 'identifier'
    })
  }

  // Passport Number: 1 letter + 7 digits (e.g. A1234567 or J1234567)
  const passportMatch = rawText.match(/\b[A-Z][0-9]{7,8}\b/)
  if (passportMatch && !panMatch) {
    fields.push({
      id: 'id-passport',
      label: 'Candidate Passport ID',
      value: passportMatch[0],
      patternMatched: 'Regex standard: 1 letter + 7–8 digits',
      category: 'identifier'
    })
  }

  // Generic Alphanumeric identifier if none of the above matched
  if (!demoIdMatch && !panMatch && !aadhaarMatch && !passportMatch) {
    const genericIdMatch = rawText.match(/\b(ID|NO|NUMBER|DOCUMENT|SPECIMEN)[:\s-]*([A-Z0-9-]{6,16})\b/i)
    if (genericIdMatch && genericIdMatch[2]) {
      fields.push({
        id: 'id-generic',
        label: 'Candidate Document Number',
        value: genericIdMatch[2].trim(),
        patternMatched: 'Label prefix match (ID / NO / DOCUMENT)',
        category: 'identifier'
      })
    }
  }

  // 3. Candidate Date Detection (DOB, Expiry, Issue)
  const dateRegex = /\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}|\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})\b/i
  for (const line of lines) {
    const match = line.match(dateRegex)
    if (match) {
      let label = 'Candidate Date'
      const lowerLine = line.toLowerCase()
      if (lowerLine.includes('birth') || lowerLine.includes('dob')) {
        label = 'Candidate Date of Birth'
      } else if (lowerLine.includes('exp') || lowerLine.includes('valid')) {
        label = 'Candidate Expiry Date'
      } else if (lowerLine.includes('issue')) {
        label = 'Candidate Issue Date'
      }

      // Avoid duplicate dates
      if (!fields.some((f) => f.value === match[0])) {
        fields.push({
          id: `date-${fields.length}`,
          label,
          value: match[0],
          patternMatched: 'Standard date calendar format',
          category: 'date'
        })
      }
    }
  }

  // 4. Candidate Subject Name Detection (Context-Aware Multi-Stage Extraction)
  const candidateNameResult = parseCandidateSubjectName(lines, textRegions)
  if (candidateNameResult) {
    fields.push({
      id: 'name-candidate',
      label: candidateNameResult.confidenceTier === 'review'
        ? 'Candidate Subject Name (Needs Review)'
        : 'Candidate Subject Name',
      value: candidateNameResult.value,
      patternMatched: candidateNameResult.patternMatched,
      category: 'name',
      confidenceTier: candidateNameResult.confidenceTier,
      contextNote: candidateNameResult.contextNote
    })
  }

  // 5. Machine Readable Zone (MRZ) Detection
  const mrzLines = lines.filter((l) => l.includes('<<') || (l.startsWith('P<') && l.length > 10))
  if (mrzLines.length > 0) {
    fields.push({
      id: 'mrz-detected',
      label: 'Candidate Machine Readable Zone (MRZ)',
      value: mrzLines.join(' | '),
      patternMatched: 'Detected ICAO 9303 chevron sequence (<<)',
      category: 'mrz'
    })
  }

  return fields
}
