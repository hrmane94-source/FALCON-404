import type { MockCaseRecord } from '../types'

/**
 * Illustrative demonstration records for layout preview only.
 * No actual personal data or live screening results are associated with these rows.
 */
export const DEMO_CASE_RECORDS: MockCaseRecord[] = [
  {
    id: 'case-demo-001',
    caseNumber: 'FLC-2026-0891',
    documentType: 'National ID',
    issuerCountry: 'India (UIDAI Format)',
    submissionDate: '17 Oct 2026, 14:22',
    holderNameSample: 'A. Sharma',
    inspectionType: 'Standard Check',
    plannedOutcomeLabel: 'Approved',
    discrepancyNote: 'Sample scenario: Standard document image with expected format alignment and clean borders.'
  },
  {
    id: 'case-demo-002',
    caseNumber: 'FLC-2026-0892',
    documentType: 'Passport',
    issuerCountry: 'India (MEA Format)',
    submissionDate: '17 Oct 2026, 15:05',
    holderNameSample: 'R. Patel',
    inspectionType: 'Standard Check',
    plannedOutcomeLabel: 'Flagged',
    discrepancyNote: 'Sample scenario: Noticeable font weight difference detected in the Date of Birth text area.'
  },
  {
    id: 'case-demo-003',
    caseNumber: 'FLC-2026-0893',
    documentType: "Driver's License",
    issuerCountry: 'State Transport (Demo)',
    submissionDate: '17 Oct 2026, 16:40',
    holderNameSample: 'S. Khan',
    inspectionType: 'Standard Check',
    plannedOutcomeLabel: 'Under Review',
    discrepancyNote: 'Sample scenario: Low resolution capture requiring examiner inspection.'
  },
  {
    id: 'case-demo-004',
    caseNumber: 'FLC-2026-0894',
    documentType: 'Voter ID',
    issuerCountry: 'Election Authority (Demo)',
    submissionDate: '17 Oct 2026, 18:15',
    holderNameSample: 'M. Verma',
    inspectionType: 'Standard Check',
    plannedOutcomeLabel: 'Flagged',
    discrepancyNote: 'Sample scenario: Simulated image inconsistency flagged in the photo boundary region.'
  }
]
