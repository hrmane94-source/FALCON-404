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
