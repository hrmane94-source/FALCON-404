import type { OCRProgress, OCRResult, OCRTextRegion } from '../types'
import { extractCandidateFields } from '../utils/ocrFieldParser'

export interface PerformOCROptions {
  imageSource: File | string
  documentCategory?: string
  onProgress?: (progress: OCRProgress) => void
}

/**
 * In browser runtime, prepares an image source optimized for Tesseract glyph recognition.
 * If the image has small dimensions (< 1200px), upscales it cleanly on an offscreen canvas
 * with high quality interpolation to bring small credential fonts closer to ~300 DPI / 30px glyph height.
 */
async function prepareOptimizedImageSource(source: File | string): Promise<any> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return source
  }

  try {
    const url = typeof source === 'string' ? source : URL.createObjectURL(source)
    const img = new Image()
    img.crossOrigin = 'anonymous'

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Image decode error for OCR preprocessing.'))
      img.src = url
    })

    if (typeof source !== 'string') {
      URL.revokeObjectURL(url)
    }

    const { naturalWidth: w, naturalHeight: h } = img
    // If image is already high resolution (>= 1200px), use original to preserve sharpness
    if (w >= 1200 || h >= 1200 || w <= 0 || h <= 0) {
      return source
    }

    // Scale up small images (e.g. 554x554) by up to 2.5x to improve OCR legibility
    const scale = Math.min(2.5, Math.max(1.5, 1400 / Math.max(w, h)))
    const targetW = Math.round(w * scale)
    const targetH = Math.round(h * scale)

    const canvas = document.createElement('canvas')
    canvas.width = targetW
    canvas.height = targetH
    const ctx = canvas.getContext('2d')
    if (!ctx) return source

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, 0, 0, targetW, targetH)

    return canvas
  } catch {
    return source
  }
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

    // Configure Tesseract parameters for sparse ID credential layout and standard 300 DPI resolution
    await worker.setParameters({
      tessedit_pageseg_mode: '3',
      user_defined_dpi: '300'
    })

    onProgress?.({
      status: 'Recognizing document text...',
      progress: 0,
      stage: 'recognizing'
    })

    const effectiveSource = await prepareOptimizedImageSource(imageSource)
    const result = await worker.recognize(effectiveSource)
    const rawText = result?.data?.text || ''
    const confidence =
      typeof result?.data?.confidence === 'number' && !isNaN(result.data.confidence)
        ? Math.round(result.data.confidence)
        : 0

    const lines = rawText
      .split(/\r?\n/)
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0)

    // Extract actual text bounding boxes from Tesseract.js for layout analysis
    const textRegions: OCRTextRegion[] = []
    if (Array.isArray(result?.data?.lines)) {
      result.data.lines.forEach((lineItem: any, idx: number) => {
        const text = lineItem?.text?.trim()
        if (text && lineItem?.bbox) {
          textRegions.push({
            text,
            confidence: Math.round(lineItem.confidence || 0),
            bbox: {
              x0: Math.round(lineItem.bbox.x0 || 0),
              y0: Math.round(lineItem.bbox.y0 || 0),
              x1: Math.round(lineItem.bbox.x1 || 0),
              y1: Math.round(lineItem.bbox.y1 || 0)
            },
            lineIndex: idx
          })
        }
      })
    } else if (Array.isArray(result?.data?.words)) {
      result.data.words.forEach((wordItem: any, idx: number) => {
        const text = wordItem?.text?.trim()
        if (text && wordItem?.bbox) {
          textRegions.push({
            text,
            confidence: Math.round(wordItem.confidence || 0),
            bbox: {
              x0: Math.round(wordItem.bbox.x0 || 0),
              y0: Math.round(wordItem.bbox.y0 || 0),
              x1: Math.round(wordItem.bbox.x1 || 0),
              y1: Math.round(wordItem.bbox.y1 || 0)
            },
            lineIndex: idx
          })
        }
      })
    }

    // Parse candidate fields transparently with context and text region data
    const candidateFields = extractCandidateFields(rawText, documentCategory, textRegions)

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
      textRegions: textRegions.length > 0 ? textRegions : undefined,
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
