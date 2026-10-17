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
