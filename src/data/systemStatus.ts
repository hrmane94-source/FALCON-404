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
    status: 'available',
    description: 'Client-side WebAssembly optical recognition active for synthetic document review.',
    phase: 'Phase 3',
    techDetails: 'Tesseract.js v7'
  },
  {
    id: 'forensic-engine',
    name: 'Forensic Analysis',
    category: 'ai-engine',
    status: 'available',
    description: 'Client-side image quality metrics, metadata audit, and Error Level Analysis (ELA) active.',
    phase: 'Phase 4',
    techDetails: 'Canvas ELA & Metadata'
  },
  {
    id: 'document-layout',
    name: 'Boundary & Layout',
    category: 'ai-engine',
    status: 'available',
    description: 'Client-side Sobel edge detection, perspective distortion, framing, and OCR layout containment active.',
    phase: 'Phase 5',
    techDetails: 'CV Edge & Geometry'
  },
  {
    id: 'face-verification',
    name: 'Face Verification',
    category: 'ai-engine',
    status: 'not-integrated',
    description: 'Facial comparison and 1:1 biometric matching scheduled for Phase 6.',
    phase: 'Phase 6',
    techDetails: 'Biometric Matching'
  }
]
