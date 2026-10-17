import type { SystemComponentStatus } from '../types'

export const SYSTEM_STATUS_COMPONENTS: SystemComponentStatus[] = [
  {
    id: 'frontend-core',
    name: 'Frontend',
    category: 'core',
    status: 'available',
    description: 'User interface and navigation shell are operating locally.',
    phase: 'Phase 1',
    techDetails: 'React / Vite'
  },
  {
    id: 'backend-gateway',
    name: 'Backend API',
    category: 'service',
    status: 'disconnected',
    description: 'API services and server processing will be connected in Phase 2.',
    phase: 'Phase 2',
    techDetails: 'FastAPI / Node.js'
  },
  {
    id: 'ocr-engine',
    name: 'OCR Engine',
    category: 'ai-engine',
    status: 'not-integrated',
    description: 'Text parsing and format validation scheduled for Phase 2.',
    phase: 'Phase 2',
    techDetails: 'OCR / MRZ Parser'
  },
  {
    id: 'forensic-engine',
    name: 'Forensic Analysis',
    category: 'ai-engine',
    status: 'not-integrated',
    description: 'Image alteration and tamper analysis scheduled for Phase 3.',
    phase: 'Phase 3',
    techDetails: 'Forensics Pipeline'
  },
  {
    id: 'face-verification',
    name: 'Face Verification',
    category: 'ai-engine',
    status: 'not-integrated',
    description: 'Facial comparison models scheduled for Phase 3.',
    phase: 'Phase 3',
    techDetails: 'Biometric Matching'
  }
]
