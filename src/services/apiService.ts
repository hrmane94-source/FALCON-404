/**
 * FALCON-404: Frontend Client API Service (v1)
 * Lead Developer & System Architect: Harshad Mane
 * Milestone: Step 1 of 3 — Core Verification Workflow & Architecture
 *
 * Communicates with the /api/v1 backend endpoints.
 * Fallback guarantee: If the server is offline or unreachable,
 * verification is evaluated client-side in browser memory.
 */

import type {
  ApiHealthResponse,
  ApiCapabilitiesResponse,
  ScreeningRequestBody,
  ScreeningResponseBody
} from '../types/verificationWorkflow.ts'
import type { AIMLScreeningResult } from '../types/index.ts'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

export const checkApiHealth = async (): Promise<ApiHealthResponse | null> => {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' }
    })
    if (!res.ok) return null
    return (await res.json()) as ApiHealthResponse
  } catch {
    return null
  }
}

export const fetchApiCapabilities = async (): Promise<ApiCapabilitiesResponse | null> => {
  try {
    const res = await fetch(`${API_BASE_URL}/capabilities`, {
      method: 'GET',
      headers: { Accept: 'application/json' }
    })
    if (!res.ok) return null
    return (await res.json()) as ApiCapabilitiesResponse
  } catch {
    return null
  }
}

export const submitScreeningToApi = async (
  payload: ScreeningRequestBody
): Promise<ScreeningResponseBody | null> => {
  try {
    const res = await fetch(`${API_BASE_URL}/screenings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(payload)
    })
    if (!res.ok) return null
    return (await res.json()) as ScreeningResponseBody
  } catch {
    return null
  }
}

export interface MlServiceHealthInfo {
  status: string
  model_loaded: boolean
  model_architecture: string
  model_identifier: string
  checkpoint_identifier: string
  checkpoint_epoch?: number
  device: string
}

export const checkMlHealth = async (): Promise<MlServiceHealthInfo | null> => {
  try {
    const res = await fetch(`${API_BASE_URL}/ml/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' }
    })
    if (!res.ok) return null
    return (await res.json()) as MlServiceHealthInfo
  } catch {
    return null
  }
}

export const screenDocumentWithML = async (file: File): Promise<AIMLScreeningResult | null> => {
  try {
    const formData = new FormData()
    formData.append('file', file)

    const res = await fetch(`${API_BASE_URL}/ml/predict`, {
      method: 'POST',
      body: formData
    })

    if (!res.ok) {
      const errorJson = await res.json().catch(() => null)
      return {
        predictedClass: 'ERROR',
        genuineProbability: 0,
        manipulatedProbability: 0,
        confidence: 0,
        tamperingScore: 0,
        decisionThreshold: 0.5,
        reviewBand: [0.4, 0.6],
        processingTimeMs: 0,
        device: 'unknown',
        modelIdentifier: 'FALCON-404 MobileNetV3-Small',
        screeningDisclaimer: 'AI screening service returned an error.',
        error: errorJson?.error?.message || `Inference service responded with status ${res.status}`
      }
    }

    const data = await res.json()
    return {
      predictedClass: data.predicted_class,
      genuineProbability: data.genuine_probability,
      manipulatedProbability: data.manipulated_probability,
      confidence: data.confidence,
      tamperingScore: data.tampering_score,
      decisionThreshold: data.decision_threshold,
      reviewBand: data.review_band,
      processingTimeMs: data.processing_time_ms,
      device: data.device,
      modelIdentifier: data.model_identifier,
      screeningDisclaimer: data.screening_disclaimer
    }
  } catch (err: any) {
    return {
      predictedClass: 'ERROR',
      genuineProbability: 0,
      manipulatedProbability: 0,
      confidence: 0,
      tamperingScore: 0,
      decisionThreshold: 0.5,
      reviewBand: [0.4, 0.6],
      processingTimeMs: 0,
      device: 'offline',
      modelIdentifier: 'FALCON-404 MobileNetV3-Small',
      screeningDisclaimer: 'AI screening is currently unavailable in offline fallback mode.',
      error: 'ML inference service unreachable.'
    }
  }
}
