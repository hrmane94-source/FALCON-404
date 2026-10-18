/**
 * Transparent candidate field parser for FALCON Phase 3.
 * Extracts heuristic candidate fields from raw OCR text without claiming database verification.
 */

import type { CandidateField } from '../types'

export type { CandidateField }


/**
 * Transparent heuristic extraction of candidate fields from raw OCR text.
 * Note: These are pattern-matched candidates only; they are not authenticated.
 */
export function extractCandidateFields(rawText: string, _selectedCategory?: string): CandidateField[] {
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

  // 4. Candidate Subject Name Detection
  for (const line of lines) {
    const nameLabelMatch = line.match(/(?:Name|Given\s*Name|Holder|Surname)[:\s]+([A-Za-z\s\.\(\)]+)/i)
    if (nameLabelMatch && nameLabelMatch[1] && nameLabelMatch[1].trim().length > 2) {
      const candidateName = nameLabelMatch[1].trim()
      if (!fields.some((f) => f.category === 'name')) {
        fields.push({
          id: 'name-labeled',
          label: 'Candidate Subject Name',
          value: candidateName,
          patternMatched: 'Extracted following "Name" label indicator',
          category: 'name'
        })
      }
    }
  }

  // If no labeled name found, check for ALL CAPS lines that look like a person's name (2-3 words, no numbers)
  if (!fields.some((f) => f.category === 'name')) {
    for (const line of lines) {
      if (
        /^[A-Z][A-Za-z\.\s\(\)]{3,30}$/.test(line) &&
        !line.includes('PASSPORT') &&
        !line.includes('REPUBLIC') &&
        !line.includes('GOVERNMENT') &&
        !line.includes('IDENTITY') &&
        !line.includes('DOCUMENT') &&
        !line.includes('AUTHORITY') &&
        !line.includes('SPECIMEN')
      ) {
        fields.push({
          id: 'name-heuristic',
          label: 'Candidate Subject Name',
          value: line.trim(),
          patternMatched: 'Heuristic title-cased name string without numbers',
          category: 'name'
        })
        break
      }
    }
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
