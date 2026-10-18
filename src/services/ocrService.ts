import type { OCRProgress, OCRResult } from '../types'
import { extractCandidateFields } from '../utils/ocrFieldParser'

export interface PerformOCROptions {
  imageSource: File | string
  documentCategory?: string
  onProgress?: (progress: OCRProgress) => void
}

/**
 * Runs genuine client-side Optical Character Recognition (OCR) using Tesseract.js in a WebAssembly worker.
 * Lazy-loads the OCR engine on demand to preserve optimal initial load performance.
 */
export async function performOCR(options: PerformOCROptions): Promise<OCRResult> {
  const { imageSource, documentCategory, onProgress } = options

  if (!imageSource) {
    throw new Error('No document image provided for OCR analysis.')
  }

  // Dynamic import of Tesseract.js so it only loads when OCR is executed
  const { createWorker, OEM } = await import('tesseract.js')

  let worker: any = null

  try {
    onProgress?.({
      status: 'Initializing OCR WebAssembly engine...',
      progress: 0,
      stage: 'initializing'
    })

    worker = await createWorker('eng', OEM.LSTM_ONLY, {
      logger: (m) => {
        if (!m || typeof m.status !== 'string') return

        const progressVal = typeof m.progress === 'number' && !isNaN(m.progress) ? Math.max(0, Math.min(1, m.progress)) : 0
        const isRecognizing = m.status.includes('recognizing text')
        const stage: 'initializing' | 'recognizing' = isRecognizing ? 'recognizing' : 'initializing'

        let statusText = m.status
        if (m.status.includes('loading tesseract core')) {
          statusText = 'Loading OCR WebAssembly core...'
        } else if (m.status.includes('loading language traineddata') || m.status.includes('loaded language traineddata')) {
          statusText = 'Loading English trained dataset...'
        } else if (m.status.includes('initializing tesseract') || m.status.includes('initialized tesseract')) {
          statusText = 'Configuring recognition parameters...'
        } else if (isRecognizing) {
          statusText = `Recognizing document text (${Math.round(progressVal * 100)}%)...`
        }

        onProgress?.({
          status: statusText,
          progress: progressVal,
          stage
        })
      }
    })

    onProgress?.({
      status: 'Recognizing document text...',
      progress: 0,
      stage: 'recognizing'
    })

    const result = await worker.recognize(imageSource)
    const rawText = result?.data?.text || ''
    const confidence =
      typeof result?.data?.confidence === 'number' && !isNaN(result.data.confidence)
        ? Math.round(result.data.confidence)
        : 0

    const lines = rawText
      .split(/\r?\n/)
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0)

    // Parse candidate fields transparently
    const candidateFields = extractCandidateFields(rawText, documentCategory)

    onProgress?.({
      status: 'Text extraction complete',
      progress: 1.0,
      stage: 'complete'
    })

    return {
      rawText,
      confidence,
      lines,
      candidateFields,
      extractedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    }
  } catch (err: any) {
    console.error('FALCON OCR Engine Error:', err)
    const errorMsg =
      err?.message ||
      'Failed to execute Optical Character Recognition. Please verify network access for language data and try again.'
    throw new Error(errorMsg)
  } finally {
    if (worker) {
      try {
        await worker.terminate()
      } catch (terminateErr) {
        console.warn('FALCON OCR: Error terminating worker instance:', terminateErr)
      }
    }
  }
}
