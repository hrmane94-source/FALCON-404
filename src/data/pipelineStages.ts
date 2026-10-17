import type { PipelineStage } from '../types'

export const PIPELINE_STAGES: PipelineStage[] = [
  {
    id: 'stage-1',
    stepNumber: '01',
    name: 'Document Capture',
    subtitle: 'Image Intake & Pre-processing',
    description: 'Document ingestion via file upload or camera capture, image orientation adjustment, and resolution checks.',
    iconName: 'Camera',
    status: 'planned',
    details: [
      'Automatic edge detection and perspective correction',
      'Image sharpness and minimum resolution validation',
      'Support for standard document image formats (JPEG, PNG)',
      'Dual-side capture staging for front and back surfaces'
    ]
  },
  {
    id: 'stage-2',
    stepNumber: '02',
    name: 'OCR & Validation',
    subtitle: 'Text Extraction & Field Checks',
    description: 'Extracting credential text fields, checking Machine Readable Zones (MRZ), and validating format checksums.',
    iconName: 'FileSearch',
    status: 'planned',
    details: [
      'Multi-field Optical Character Recognition (OCR)',
      'Standard ICAO 9303 MRZ parsing and checksum verification',
      'Format and regex validation for national IDs and passports',
      'Cross-validation between textual fields and machine-readable data'
    ]
  },
  {
    id: 'stage-3',
    stepNumber: '03',
    name: 'Forensic Analysis',
    subtitle: 'Tamper & Inconsistency Detection',
    description: 'Examining document images for signs of digital alteration, font inconsistencies, and copy-paste modifications.',
    iconName: 'ShieldAlert',
    status: 'planned',
    details: [
      'Error Level Analysis (ELA) to identify compression anomalies',
      'Font and alignment anomaly screening across textual fields',
      'Detection of localized editing and spliced image regions',
      'Visual discrepancy highlighting for examiner review'
    ]
  },
  {
    id: 'stage-4',
    stepNumber: '04',
    name: 'Face Comparison',
    subtitle: 'Biometric Photo Comparison',
    description: 'Comparing the photo extracted from the credential against a live reference photo or selfie to confirm subject identity.',
    iconName: 'UserCheck',
    status: 'planned',
    details: [
      'Facial detection and portrait normalization',
      'Feature comparison between credential photo and live image',
      'Basic presentation check to discourage replay attempts',
      'Similarity scoring to support decision thresholds'
    ]
  },
  {
    id: 'stage-5',
    stepNumber: '05',
    name: 'Human Review',
    subtitle: 'Examiner Decision & Summary',
    description: 'A clear adjudication view for authorized personnel to inspect flagged findings and record an official determination.',
    iconName: 'ClipboardCheck',
    status: 'planned',
    details: [
      'Side-by-side display of original document and inspection findings',
      'Highlighted areas of concern requiring manual examination',
      'Options to approve, flag, or request re-capture',
      'Exportable case summary report for institutional recordkeeping'
    ]
  }
]
