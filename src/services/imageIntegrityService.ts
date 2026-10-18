/**
 * FALCON-404 Phase 4: Image Integrity, Quality, Metadata, and Error Level Analysis (ELA) Service.
 *
 * Runs 100% locally in the browser runtime.
 * Evaluates real decoded raster metrics, binary metadata headers, and JPEG compression differentials.
 * All findings are explainable, evidence-backed, and neutral with explicit limitation disclaimers.
 */

import type {
  ImageQualityMetrics,
  MetadataReport,
  ELAMetrics,
  IntegrityFinding,
  PreliminaryAssessment,
  ImageIntegrityResult,
  IntegrityProgress
} from '../types'
import { formatFileSize } from '../utils/fileValidation'

// ==========================================
// Centralized, Documented Heuristic Thresholds
// ==========================================
export const INTEGRITY_THRESHOLDS = {
  MIN_WIDTH_PX: 500,
  MIN_HEIGHT_PX: 350,
  LOW_RES_CRITICAL_PX: 400,
  LUMINANCE_MIN_WARN: 50, // Below this: under-exposed / dark
  LUMINANCE_MAX_WARN: 215, // Above this: over-exposed / washed out
  CONTRAST_STDDEV_MIN: 28, // Below this: flat lighting or low dynamic range
  BLUR_LAPLACIAN_WARN: 60, // Below this: weak high-frequency edges indicate potential blur
  ELA_RECOMPRESSION_QUALITY: 0.85,
  ELA_HOTSPOT_DIFF_THRESHOLD: 30, // Pixel difference (scaled) to consider a significant difference
  ELA_HOTSPOT_RATIO_WARN: 0.15 // >15% anomalous localized variance suggests manual review
}

export interface PerformIntegrityOptions {
  file: File
  previewUrl: string
  onProgress?: (progress: IntegrityProgress) => void
}

/**
 * Parses binary metadata headers from JPEG (EXIF/JFIF/APP13), PNG (tEXt/iTXt), and WebP formats.
 * Separately identifies format, JFIF container, EXIF presence, camera, software, and timestamps.
 * Missing metadata is treated as neutral evidence.
 */
export async function extractImageMetadata(file: File): Promise<MetadataReport> {
  const buffer = await file.slice(0, 128 * 1024).arrayBuffer() // read first 128KB for header metadata
  const bytes = new Uint8Array(buffer)
  const rawEntries: Record<string, string> = {}

  let hasExif = false
  let hasJfif = false
  let softwareDetected: string | undefined = undefined
  let cameraMakeModel: string | undefined = undefined
  let creationTimestamp: string | undefined = undefined

  // 1. JPEG Format Inspection (SOI = 0xFF, 0xD8)
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2
    while (offset < bytes.length - 4) {
      if (bytes[offset] !== 0xff) {
        offset++
        continue
      }
      const marker = bytes[offset + 1]

      // SOS (Start of Scan) or EOI (End of Image) reached
      if (marker === 0xda || marker === 0xd9) break

      // Marker segment length (big-endian 16-bit integer)
      const length = (bytes[offset + 2] << 8) | bytes[offset + 3]
      if (length < 2) break
      const segmentEnd = Math.min(bytes.length, offset + 2 + length)

      // APP0 - JFIF
      if (marker === 0xe0 && offset + 8 <= segmentEnd) {
        const id = String.fromCharCode(...bytes.slice(offset + 4, offset + 8))
        if (id.startsWith('JFIF')) {
          hasJfif = true
          rawEntries['Format Standard'] = 'JFIF (JPEG File Interchange Format)'
        }
      }

      // APP1 - Exif
      if (marker === 0xe1 && offset + 8 <= segmentEnd) {
        const id = String.fromCharCode(...bytes.slice(offset + 4, offset + 8))
        if (id.startsWith('Exif')) {
          hasExif = true
          rawEntries['Metadata Container'] = 'Exif APP1'

          // Heuristic ASCII search for common software and camera signatures within the Exif block
          const exifText = new TextDecoder('latin1').decode(bytes.slice(offset + 10, segmentEnd))
          const softwareMatch = exifText.match(/(Photoshop|GIMP|Canva|Lightroom|Paint\.NET|Snapseed|PicsArt|Photopea)/i)
          if (softwareMatch) {
            softwareDetected = softwareMatch[0]
            rawEntries['Editing Software Tag'] = softwareDetected
          }

          const modelMatch = exifText.match(/(Apple|iPhone|Samsung|Pixel|Canon|Nikon|Sony|Xiaomi|OnePlus)[A-Za-z0-9_\-\s]{2,20}/i)
          if (modelMatch) {
            cameraMakeModel = modelMatch[0].trim()
            rawEntries['Capture Hardware'] = cameraMakeModel
          }

          const dateMatch = exifText.match(/(\d{4}:\d{2}:\d{2}\s\d{2}:\d{2}:\d{2})/)
          if (dateMatch) {
            creationTimestamp = dateMatch[1]
            rawEntries['Exif Timestamp'] = creationTimestamp
          }
        }
      }

      // APP13 - Photoshop Image Resource Block (0xED)
      if (marker === 0xed) {
        softwareDetected = softwareDetected || 'Adobe Photoshop (IRB Container)'
        rawEntries['Photoshop IRB'] = 'Present (0xFFED marker detected)'
      }

      offset += 2 + length
    }

    const status = hasExif || hasJfif || softwareDetected ? 'present' : 'unavailable'
    return {
      status,
      format: 'JPEG Image',
      fileSizeFormatted: formatFileSize(file.size),
      hasExif,
      hasJfif,
      softwareDetected,
      creationTimestamp,
      cameraMakeModel,
      rawEntries,
      containerStatusLabel: hasJfif ? 'JFIF container detected' : 'Standard JPEG container (No JFIF marker)',
      exifStatusLabel: hasExif ? 'EXIF metadata detected' : 'EXIF metadata not detected',
      cameraStatusLabel: cameraMakeModel || 'Camera information unavailable',
      softwareStatusLabel: softwareDetected || 'Software signature not detected',
      timestampStatusLabel: creationTimestamp || 'Timestamp unavailable',
      note: hasExif
        ? 'EXIF APP1 metadata block detected and parsed from JPEG container.'
        : hasJfif
        ? 'JFIF APP0 container detected without EXIF block. This is standard for web uploads, screenshots, and privacy-stripped images.'
        : 'Standard JPEG raster without auxiliary EXIF or JFIF headers.'
    }
  }

  // 2. PNG Format Inspection
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    let offset = 8 // skip 8-byte signature
    let hasMetadataChunks = false
    let hasPngExif = false

    while (offset < bytes.length - 8) {
      const chunkLength = (bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]
      const chunkType = String.fromCharCode(...bytes.slice(offset + 4, offset + 8))

      if (chunkType === 'IEND') break

      if (chunkType === 'tEXt' || chunkType === 'iTXt' || chunkType === 'zTXt') {
        hasMetadataChunks = true
        const textData = new TextDecoder('latin1').decode(bytes.slice(offset + 8, Math.min(bytes.length, offset + 8 + chunkLength)))
        if (textData.toLowerCase().includes('software') || textData.toLowerCase().includes('adobe')) {
          softwareDetected = textData.slice(0, 60).trim()
          rawEntries['PNG Software Chunk'] = softwareDetected
        }
        rawEntries[`PNG Chunk [${chunkType}]`] = textData.slice(0, 40)
      } else if (chunkType === 'eXIf') {
        hasPngExif = true
        rawEntries['PNG Chunk [eXIf]'] = 'Present'
      }

      offset += 12 + chunkLength
    }

    return {
      status: (hasMetadataChunks || hasPngExif) ? 'present' : 'unavailable',
      format: 'PNG Image',
      fileSizeFormatted: formatFileSize(file.size),
      hasExif: hasPngExif,
      hasJfif: false,
      softwareDetected,
      rawEntries,
      containerStatusLabel: 'PNG container verified',
      exifStatusLabel: hasPngExif
        ? 'EXIF chunk (eXIf) detected in PNG container'
        : 'EXIF metadata not present in PNG chunks',
      cameraStatusLabel: 'Camera information unavailable',
      softwareStatusLabel: softwareDetected || 'Software signature not detected',
      timestampStatusLabel: 'Timestamp unavailable',
      note: hasMetadataChunks || hasPngExif
        ? 'PNG structural metadata chunks detected.'
        : 'Standard PNG without auxiliary text or EXIF chunks. Typical for modern screenshots or export filters.'
    }
  }

  // 3. WebP Format Inspection (RIFF....WEBP)
  const isWebp =
    (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
     bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) ||
    file.type === 'image/webp' ||
    file.name.toLowerCase().endsWith('.webp')

  if (isWebp) {
    let offset = 12
    let hasWebpExif = false
    let hasWebpXmp = false

    while (offset + 8 <= bytes.length) {
      const fourCC = String.fromCharCode(...bytes.slice(offset, offset + 4))
      const chunkSize = bytes[offset + 4] | (bytes[offset + 5] << 8) | (bytes[offset + 6] << 16) | (bytes[offset + 7] << 24)
      if (chunkSize < 0 || offset + 8 + chunkSize > bytes.length + 1000) break

      const chunkDataStart = offset + 8
      const chunkDataEnd = Math.min(bytes.length, chunkDataStart + chunkSize)

      if (fourCC === 'EXIF') {
        hasWebpExif = true
        rawEntries['WebP Chunk [EXIF]'] = 'Present'
        const chunkText = new TextDecoder('latin1').decode(bytes.slice(chunkDataStart, chunkDataEnd))
        const softwareMatch = chunkText.match(/(Photoshop|GIMP|Canva|Lightroom|Paint\.NET|Snapseed|PicsArt|Photopea)/i)
        if (softwareMatch) {
          softwareDetected = softwareMatch[0]
          rawEntries['Software Tag'] = softwareDetected
        }
        const modelMatch = chunkText.match(/(Apple|iPhone|Samsung|Pixel|Canon|Nikon|Sony|Xiaomi|OnePlus)[A-Za-z0-9_\-\s]{2,20}/i)
        if (modelMatch) {
          cameraMakeModel = modelMatch[0].trim()
          rawEntries['Capture Hardware'] = cameraMakeModel
        }
        const dateMatch = chunkText.match(/(\d{4}:\d{2}:\d{2}\s\d{2}:\d{2}:\d{2})/)
        if (dateMatch) {
          creationTimestamp = dateMatch[1]
          rawEntries['Timestamp'] = creationTimestamp
        }
      } else if (fourCC === 'XMP ') {
        hasWebpXmp = true
        rawEntries['WebP Chunk [XMP]'] = 'Present'
      }

      // In RIFF chunks, size is padded to 2-byte boundary
      const paddedSize = chunkSize + (chunkSize % 2)
      offset += 8 + paddedSize
    }

    const hasAnyMeta = hasWebpExif || hasWebpXmp || softwareDetected !== undefined
    return {
      status: hasAnyMeta ? 'present' : 'unavailable',
      format: 'WebP Image',
      fileSizeFormatted: formatFileSize(file.size),
      hasExif: hasWebpExif,
      hasJfif: false,
      softwareDetected,
      cameraMakeModel,
      creationTimestamp,
      rawEntries,
      containerStatusLabel: 'WebP (RIFF) container verified',
      exifStatusLabel: hasWebpExif
        ? 'EXIF chunk detected in WebP container'
        : 'EXIF metadata not present in WebP container',
      cameraStatusLabel: cameraMakeModel || 'Camera information unavailable',
      softwareStatusLabel: softwareDetected || 'Software signature not detected',
      timestampStatusLabel: creationTimestamp || 'Timestamp unavailable',
      note: hasAnyMeta
        ? 'WebP RIFF container with embedded metadata chunk(s) detected.'
        : 'Standard WebP container without auxiliary metadata chunks. Typical for modern web graphics, screenshots, or re-saved assets.'
    }
  }

  // 4. Other / Unsupported Formats
  return {
    status: 'unavailable',
    format: file.type || 'Standard Raster',
    fileSizeFormatted: formatFileSize(file.size),
    hasExif: false,
    hasJfif: false,
    rawEntries: { 'Container Type': file.type || 'Unknown' },
    containerStatusLabel: `${file.type || 'Raster'} container verified`,
    exifStatusLabel: 'EXIF metadata not present in container',
    cameraStatusLabel: 'Camera information unavailable',
    softwareStatusLabel: 'Software signature not detected',
    timestampStatusLabel: 'Timestamp unavailable',
    note: 'Metadata headers are absent or unrepresented in standard metadata chunks.'
  }
}

/**
 * Computes luminance, contrast, and Laplacian blur score on decoded canvas pixels.
 * Accurately measures uploaded raster dimensions and ratio without claiming physical document ratio.
 */
export function analyzeImageQuality(
  imageData: ImageData,
  width: number,
  height: number
): ImageQualityMetrics {
  const data = imageData.data
  const totalPixels = width * height

  let sumLuminance = 0
  let sumLuminanceSquared = 0

  // 1. Luminance & RMS Contrast
  for (let i = 0; i < data.length; i += 4) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    sumLuminance += lum
    sumLuminanceSquared += lum * lum
  }

  const meanLuminance = Math.round(sumLuminance / totalPixels)
  const varianceLuminance = Math.max(0, sumLuminanceSquared / totalPixels - meanLuminance * meanLuminance)
  const contrastStdDev = Math.round(Math.sqrt(varianceLuminance))

  // 2. High-Frequency Edge Transition / Laplacian Blur Estimation
  const sampleStep = Math.max(1, Math.floor(Math.sqrt(totalPixels / (350 * 350))))
  let laplacianSum = 0
  let laplacianSumSquared = 0
  let laplacianSamples = 0

  for (let y = sampleStep; y < height - sampleStep; y += sampleStep) {
    for (let x = sampleStep; x < width - sampleStep; x += sampleStep) {
      const idxCenter = (y * width + x) * 4
      const idxTop = ((y - sampleStep) * width + x) * 4
      const idxBottom = ((y + sampleStep) * width + x) * 4
      const idxLeft = (y * width + (x - sampleStep)) * 4
      const idxRight = (y * width + (x + sampleStep)) * 4

      const lumCenter = 0.299 * data[idxCenter] + 0.587 * data[idxCenter + 1] + 0.114 * data[idxCenter + 2]
      const lumTop = 0.299 * data[idxTop] + 0.587 * data[idxTop + 1] + 0.114 * data[idxTop + 2]
      const lumBottom = 0.299 * data[idxBottom] + 0.587 * data[idxBottom + 1] + 0.114 * data[idxBottom + 2]
      const lumLeft = 0.299 * data[idxLeft] + 0.587 * data[idxLeft + 1] + 0.114 * data[idxLeft + 2]
      const lumRight = 0.299 * data[idxRight] + 0.587 * data[idxRight + 1] + 0.114 * data[idxRight + 2]

      const lap = lumTop + lumBottom + lumLeft + lumRight - 4 * lumCenter
      laplacianSum += lap
      laplacianSumSquared += lap * lap
      laplacianSamples++
    }
  }

  const laplacianVariance =
    laplacianSamples > 0
      ? Math.round(laplacianSumSquared / laplacianSamples - Math.pow(laplacianSum / laplacianSamples, 2))
      : 100

  // 3. Uploaded Raster Aspect Ratio (Clearly labeled as uploaded raster, NOT physical document)
  const aspectRatio = parseFloat((width / height).toFixed(2))
  let aspectRatioLabel = `Uploaded Raster Ratio: ${aspectRatio}:1`
  if (aspectRatio > 1.25) {
    aspectRatioLabel += ' (Landscape Framing)'
  } else if (aspectRatio < 0.8) {
    aspectRatioLabel += ' (Portrait Framing)'
  } else {
    aspectRatioLabel += ' (Near-Square Framing)'
  }

  const physicalRatioMeasured = false
  const physicalRatioNote =
    'Physical document boundary detection is not implemented in this phase. The calculated ratio represents the full uploaded image raster (including any background, perspective, or margins), not the physical credential boundaries.'

  const isLowResolution = width < INTEGRITY_THRESHOLDS.MIN_WIDTH_PX || height < INTEGRITY_THRESHOLDS.MIN_HEIGHT_PX
  const isExtremeLuminance =
    meanLuminance < INTEGRITY_THRESHOLDS.LUMINANCE_MIN_WARN || meanLuminance > INTEGRITY_THRESHOLDS.LUMINANCE_MAX_WARN
  const isLowContrast = contrastStdDev < INTEGRITY_THRESHOLDS.CONTRAST_STDDEV_MIN
  const isPotentialBlur = laplacianVariance < INTEGRITY_THRESHOLDS.BLUR_LAPLACIAN_WARN

  return {
    width,
    height,
    aspectRatio,
    aspectRatioLabel,
    physicalRatioMeasured,
    physicalRatioNote,
    meanLuminance,
    contrastStdDev,
    blurScore: laplacianVariance,
    isLowResolution,
    isExtremeLuminance,
    isLowContrast,
    isPotentialBlur
  }
}

/**
 * Performs Error Level Analysis (ELA) for JPEG images.
 * Re-compresses the image at 85% JPEG quality and evaluates localized compression differential variances.
 * Unsupported for non-JPEG formats.
 */
export async function performErrorLevelAnalysis(
  sourceCanvas: HTMLCanvasElement,
  fileType: string
): Promise<ELAMetrics> {
  const isJpeg = fileType.includes('jpeg') || fileType.includes('jpg')

  if (!isJpeg) {
    return {
      performed: false,
      supported: false,
      meanError: 0,
      maxError: 0,
      variance: 0,
      hotspotCount: 0,
      recompressionQuality: INTEGRITY_THRESHOLDS.ELA_RECOMPRESSION_QUALITY,
      assessmentNote:
        'Error Level Analysis is a JPEG-specific DCT compression artifact technique. It is not applicable to lossless PNG or WebP files.'
    }
  }

  try {
    const width = Math.min(1200, sourceCanvas.width)
    const height = Math.round((width / sourceCanvas.width) * sourceCanvas.height)

    // Scaled work canvas for responsive analysis
    const workCanvas = document.createElement('canvas')
    workCanvas.width = width
    workCanvas.height = height
    const workCtx = workCanvas.getContext('2d')
    if (!workCtx) throw new Error('Could not obtain canvas 2D context')

    workCtx.drawImage(sourceCanvas, 0, 0, width, height)
    const originalImageData = workCtx.getImageData(0, 0, width, height)
    const origData = originalImageData.data

    // Recompress to JPEG at standard 85% quality in memory
    const recompressedBlob = await new Promise<Blob | null>((resolve) => {
      workCanvas.toBlob((b) => resolve(b), 'image/jpeg', INTEGRITY_THRESHOLDS.ELA_RECOMPRESSION_QUALITY)
    })

    if (!recompressedBlob) throw new Error('Canvas toBlob conversion failed')

    // Decode recompressed blob back into a raster
    const recompressedUrl = URL.createObjectURL(recompressedBlob)
    const recompressedImg = new Image()
    await new Promise<void>((resolve, reject) => {
      recompressedImg.onload = () => resolve()
      recompressedImg.onerror = () => reject(new Error('Failed to decode recompressed JPEG image'))
      recompressedImg.src = recompressedUrl
    })

    workCtx.drawImage(recompressedImg, 0, 0, width, height)
    const recompImageData = workCtx.getImageData(0, 0, width, height)
    const recompData = recompImageData.data
    URL.revokeObjectURL(recompressedUrl)

    // Difference evaluation canvas
    const diffCanvas = document.createElement('canvas')
    diffCanvas.width = width
    diffCanvas.height = height
    const diffCtx = diffCanvas.getContext('2d')
    if (!diffCtx) throw new Error('Could not obtain diff canvas context')

    const diffImageData = diffCtx.createImageData(width, height)
    const diffData = diffImageData.data

    let totalError = 0
    let maxError = 0
    let hotspotCount = 0
    const totalPixels = width * height

    const SCALE = 12

    for (let i = 0; i < origData.length; i += 4) {
      const diffR = Math.abs(origData[i] - recompData[i])
      const diffG = Math.abs(origData[i + 1] - recompData[i + 1])
      const diffB = Math.abs(origData[i + 2] - recompData[i + 2])

      const pixelError = (diffR + diffG + diffB) / 3
      totalError += pixelError
      if (pixelError > maxError) maxError = pixelError

      if (pixelError > INTEGRITY_THRESHOLDS.ELA_HOTSPOT_DIFF_THRESHOLD) {
        hotspotCount++
      }

      diffData[i] = Math.min(255, diffR * SCALE)
      diffData[i + 1] = Math.min(255, diffG * SCALE)
      diffData[i + 2] = Math.min(255, diffB * SCALE)
      diffData[i + 3] = 255
    }

    diffCtx.putImageData(diffImageData, 0, 0)
    const elaVisualizationUrl = diffCanvas.toDataURL('image/png')

    const meanError = parseFloat((totalError / totalPixels).toFixed(2))
    const hotspotRatio = parseFloat((hotspotCount / totalPixels).toFixed(3))

    let assessmentNote = 'Error distribution is largely uniform, consistent with normal single-pass JPEG compression.'
    if (hotspotRatio > INTEGRITY_THRESHOLDS.ELA_HOTSPOT_RATIO_WARN) {
      assessmentNote =
        'Elevated localized error variations detected. This can occur with spliced elements, multiple resaves at differing qualities, or sharp text overlays.'
    }

    return {
      performed: true,
      supported: true,
      meanError,
      maxError: Math.round(maxError),
      variance: hotspotRatio,
      hotspotCount,
      recompressionQuality: INTEGRITY_THRESHOLDS.ELA_RECOMPRESSION_QUALITY,
      elaVisualizationUrl,
      assessmentNote
    }
  } catch (err) {
    console.warn('FALCON ELA Warning:', err)
    return {
      performed: false,
      supported: true,
      meanError: 0,
      maxError: 0,
      variance: 0,
      hotspotCount: 0,
      recompressionQuality: INTEGRITY_THRESHOLDS.ELA_RECOMPRESSION_QUALITY,
      assessmentNote: 'Error Level Analysis could not be completed on this image raster.'
    }
  }
}

/**
 * Builds structured, explainable findings from quality, metadata, and ELA metrics.
 * Correctly distinguishes JFIF from EXIF and avoids claiming camera metadata exists when absent.
 */
export function buildExplainableFindings(
  quality: ImageQualityMetrics,
  metadata: MetadataReport,
  ela: ELAMetrics,
  _fileName?: string
): IntegrityFinding[] {
  const findings: IntegrityFinding[] = []

  // 1. Image Quality Findings
  if (quality.isLowResolution) {
    findings.push({
      id: 'qual-low-res',
      title: 'Sub-Optimal Document Resolution',
      category: 'quality',
      severity: quality.width < INTEGRITY_THRESHOLDS.LOW_RES_CRITICAL_PX ? 'medium' : 'low',
      metricName: 'Image Dimensions',
      measuredValue: `${quality.width} × ${quality.height} px`,
      threshold: `≥ ${INTEGRITY_THRESHOLDS.MIN_WIDTH_PX} × ${INTEGRITY_THRESHOLDS.MIN_HEIGHT_PX} px`,
      observation: `Uploaded raster dimensions (${quality.width} × ${quality.height} px) are below recommended intake parameters.`,
      explanation: 'Small rasters reduce optical recognition legibility on fine microprint, security guilloche patterns, and text glyphs.',
      importance: 'Reduces automated text parsing accuracy and examiner confidence.',
      recommendation: 'Request or upload a high-resolution, uncropped document capture.',
      limitations: 'Low resolution alone does not indicate fraudulent origin.'
    })
  } else {
    findings.push({
      id: 'qual-res-ok',
      title: 'Adequate Document Resolution',
      category: 'quality',
      severity: 'info',
      metricName: 'Image Dimensions',
      measuredValue: `${quality.width} × ${quality.height} px (${quality.aspectRatioLabel})`,
      threshold: `≥ ${INTEGRITY_THRESHOLDS.MIN_WIDTH_PX} × ${INTEGRITY_THRESHOLDS.MIN_HEIGHT_PX} px`,
      observation: `Raster dimensions meet minimum resolution parameters for optical character parsing. Aspect ratio (${quality.aspectRatio}:1) reflects uploaded raster framing.`,
      explanation: 'Pixel density is adequate for character edge separation. Note: Physical document boundary ratio has not been measured.',
      importance: 'Supports reliable OCR transcription.',
      recommendation: 'Proceed with optical field review.'
    })
  }

  // Exposure / Luminance Finding
  if (quality.isExtremeLuminance) {
    const isDark = quality.meanLuminance < INTEGRITY_THRESHOLDS.LUMINANCE_MIN_WARN
    findings.push({
      id: 'qual-luminance',
      title: isDark ? 'Under-Exposed / Dark Image' : 'Over-Exposed / Washed Out Image',
      category: 'quality',
      severity: 'medium',
      metricName: 'Mean Perceived Luminance',
      measuredValue: `${quality.meanLuminance} / 255`,
      threshold: `${INTEGRITY_THRESHOLDS.LUMINANCE_MIN_WARN} - ${INTEGRITY_THRESHOLDS.LUMINANCE_MAX_WARN}`,
      observation: isDark
        ? 'Average image brightness is below readable contrast thresholds.'
        : 'Average image brightness is elevated, with potential highlight blowout.',
      explanation: 'Extreme lighting conditions reduce text edge definition and obscure holographic seals.',
      importance: 'Can cause OCR letter dropout or misread character shapes.',
      recommendation: 'Capture under balanced ambient lighting without harsh direct flash or deep shadows.',
      limitations: 'Lighting variations reflect physical capture environment, not document legitimacy.'
    })
  }

  // Contrast Finding
  if (quality.isLowContrast) {
    findings.push({
      id: 'qual-contrast',
      title: 'Low Dynamic Contrast Range',
      category: 'quality',
      severity: 'low',
      metricName: 'RMS Contrast (Std Dev)',
      measuredValue: `${quality.contrastStdDev}`,
      threshold: `≥ ${INTEGRITY_THRESHOLDS.CONTRAST_STDDEV_MIN}`,
      observation: 'Luminance spread between foreground text and credential background is compressed.',
      explanation: 'Low contrast can occur with faded original documents, scanned photocopies, or heavy lens glare.',
      importance: 'Foreground text glyphs are harder to separate from document background patterns.',
      recommendation: 'Adjust scanner or camera contrast settings or capture against a contrasting matte background.'
    })
  }

  // Blur Finding
  if (quality.isPotentialBlur) {
    findings.push({
      id: 'qual-blur',
      title: 'Potential Motion or Focus Blur Detected',
      category: 'quality',
      severity: 'medium',
      metricName: 'Laplacian Edge Variance',
      measuredValue: `${quality.blurScore}`,
      threshold: `≥ ${INTEGRITY_THRESHOLDS.BLUR_LAPLACIAN_WARN}`,
      observation: 'High-frequency edge transitions fall below sharpness reference benchmarks.',
      explanation: 'Camera movement, autofocus failure, or low-quality digital zoom soften sharp boundaries.',
      importance: 'Soft characters increase OCR substitution errors (e.g., misreading "8" as "B" or "0" as "O").',
      recommendation: 'Ensure camera lens is steady and in focus before capturing.',
      limitations: 'Blur indicates optical capture quality and does not prove deliberate tampering.'
    })
  }

  // 2. Metadata Findings (Accurate, distinct representation per Correction A)

  // A. Format & Container Finding
  findings.push({
    id: 'meta-container',
    title: metadata.hasJfif ? 'JFIF Standard Container Detected' : `${metadata.format} Container Verified`,
    category: 'metadata',
    severity: 'info',
    metricName: 'Container Structure',
    measuredValue: metadata.containerStatusLabel,
    observation: `File headers exhibit valid ${metadata.format} structure${metadata.hasJfif ? ' with standard JFIF markers' : ''}.`,
    explanation: 'Standard file encoding conforming to web interchange format specifications.',
    importance: 'Confirms file header decoding integrity.',
    recommendation: 'Proceed with optical raster analysis.'
  })

  // B. EXIF Presence / Absence Finding (Format-Aware: No JPEG APP1 markers on WebP or PNG)
  const isJpeg = metadata.format.includes('JPEG')
  const isWebp = metadata.format.includes('WebP')
  const isPng = metadata.format.includes('PNG')

  const exifMetricName = isJpeg
    ? 'EXIF Container (JPEG APP1)'
    : isWebp
    ? 'WebP Metadata (RIFF EXIF Chunk)'
    : isPng
    ? 'PNG Metadata (eXIf / Text Chunks)'
    : 'Container Metadata'

  if (metadata.hasExif) {
    findings.push({
      id: 'meta-exif-present',
      title: 'EXIF Metadata Detected',
      category: 'metadata',
      severity: 'info',
      metricName: exifMetricName,
      measuredValue: metadata.cameraMakeModel || 'EXIF Metadata Present',
      observation: isJpeg
        ? `EXIF (APP1) metadata block is present in JPEG headers${metadata.cameraMakeModel ? ` (Device: ${metadata.cameraMakeModel})` : ''}.`
        : isWebp
        ? `Embedded EXIF chunk is present in WebP container${metadata.cameraMakeModel ? ` (Device: ${metadata.cameraMakeModel})` : ''}.`
        : isPng
        ? `Embedded EXIF/text chunk is present in PNG container${metadata.cameraMakeModel ? ` (Device: ${metadata.cameraMakeModel})` : ''}.`
        : `Metadata headers are present in the image container${metadata.cameraMakeModel ? ` (Device: ${metadata.cameraMakeModel})` : ''}.`,
      explanation: 'File preserves device-level capture context.',
      importance: 'Contextual hardware information available for audit trail.',
      recommendation: 'Maintain metadata record in screening archive.'
    })
  } else {
    findings.push({
      id: 'meta-exif-absent',
      title: 'EXIF Metadata Not Detected (Neutral)',
      category: 'metadata',
      severity: 'info',
      metricName: exifMetricName,
      measuredValue: metadata.exifStatusLabel,
      observation: isJpeg
        ? 'No EXIF (APP1) metadata headers were detected in the JPEG container.'
        : isWebp
        ? 'No auxiliary EXIF metadata chunk was detected in the WebP container.'
        : isPng
        ? 'No auxiliary EXIF or descriptive metadata chunks were detected in the PNG container.'
        : 'No auxiliary EXIF metadata headers were detected in the image container.',
      explanation:
        'Metadata availability varies widely by image source. Most messaging applications, social media platforms, web upload portals, and privacy-preserving screenshot utilities strip EXIF metadata to protect personal data.',
      importance: 'Neutral evidence: absence of EXIF metadata is standard across web environments and does NOT indicate forgery, tampering, or illegitimacy.',
      recommendation: 'Rely on image quality, text legibility, and physical layout inspection rather than missing EXIF headers.',
      limitations: 'Absence of EXIF headers cannot be used to infer document fraud or manipulation.'
    })
  }

  // C. Software Signature Finding
  if (metadata.softwareDetected) {
    findings.push({
      id: 'meta-software',
      title: 'Image Editing Software Signature in Metadata',
      category: 'metadata',
      severity: 'medium',
      metricName: 'Metadata Software Tag',
      measuredValue: metadata.softwareDetected,
      observation: `File headers contain signatures associated with desktop editing suites (${metadata.softwareDetected}).`,
      explanation:
        'Camera captures and mobile scans rarely contain desktop image-editing signatures unless re-exported or modified in graphics software.',
      importance: 'Indicates the image was processed through an external editing or export workflow.',
      recommendation: 'Conduct visual inspection of text alignment and inspect Error Level Analysis for localized modifications.',
      limitations:
        'Software tags can also appear from benign cropping, format conversion, or legitimate document scanning suites.'
    })
  } else {
    findings.push({
      id: 'meta-software-absent',
      title: 'Software Signature Not Detected',
      category: 'metadata',
      severity: 'info',
      metricName: 'Metadata Software Tag',
      measuredValue: 'Software signature not detected',
      observation: 'No known desktop graphics editor tags (e.g., Photoshop, GIMP, Canva) were identified in file headers.',
      explanation:
        'Absence of software signatures does NOT establish that an image has not been edited, nor does it prove original camera capture.',
      importance: 'Neutral observation: editing tools can strip or omit software tags.',
      recommendation: 'Evaluate physical raster sharpness and localized ELA variance.',
      limitations: 'Absence of a software signature cannot prove lack of manipulation.'
    })
  }

  // 3. Potential Manipulation / ELA Findings
  if (ela.supported && ela.performed) {
    if (ela.variance > INTEGRITY_THRESHOLDS.ELA_HOTSPOT_RATIO_WARN) {
      findings.push({
        id: 'forensic-ela-anom',
        title: 'Elevated Compression Error Differential (ELA)',
        category: 'manipulation',
        severity: 'medium',
        metricName: 'ELA High-Variance Area',
        measuredValue: `${Math.round(ela.variance * 100)}% of raster`,
        threshold: `≤ ${Math.round(INTEGRITY_THRESHOLDS.ELA_HOTSPOT_RATIO_WARN * 100)}%`,
        observation: 'Recompression error differentials vary substantially across different regions of the document image.',
        explanation:
          'When elements from different images or graphics saved at different quality factors are spliced together, their recompression rates differ.',
        importance: 'Highlights candidate areas for human examiner review.',
        recommendation: 'Inspect the ELA difference heatmap to verify whether high-error areas align with sensitive text or portrait fields.',
        limitations:
          'High-contrast edges, sharp text on solid backgrounds, and multiple legitimate resaves naturally produce localized ELA variances.'
      })
    } else {
      findings.push({
        id: 'forensic-ela-ok',
        title: 'Uniform JPEG Compression Levels (ELA)',
        category: 'manipulation',
        severity: 'info',
        metricName: 'Mean Compression Error',
        measuredValue: `${ela.meanError} (Uniform)`,
        observation: 'Error levels across the image raster are relatively uniform without localized high-variance clusters.',
        explanation: 'Consistent with a document compressed uniformly in a single pass.',
        importance: 'No obvious compression level disparities detected by ELA.',
        recommendation: 'Proceed with standard document inspection.',
        limitations: 'Uniform compression does NOT prove authenticity. A complete re-export or clean screenshot can also show uniform ELA.'
      })
    }
  } else if (!ela.supported) {
    const formatDesc = isWebp
      ? 'WebP files utilize VP8/VP8L encoding structures rather than discrete cosine transform (DCT) JPEG compression.'
      : isPng
      ? 'PNG is a lossless raster format that does not exhibit DCT quantization artifacts.'
      : `${metadata.format} does not utilize standard JPEG DCT quantization tables.`

    findings.push({
      id: 'forensic-ela-unsupported',
      title: 'ELA Skipped for Non-JPEG Format',
      category: 'limitations',
      severity: 'info',
      metricName: 'Format Support',
      measuredValue: metadata.format,
      observation: 'Error Level Analysis is technically calibrated specifically for discrete cosine transform (DCT) JPEG compression.',
      explanation: `The uploaded image is formatted as ${metadata.format}. ${formatDesc} ELA cannot be reliably applied.`,
      importance: 'Forensic check was bypassed for technical validity.',
      recommendation: 'If recompression analysis is required, obtain the original JPEG capture directly from the device.',
      limitations: 'Format constraint only; no negative inference is drawn.'
    })
  }

  return findings
}

/**
 * Determines preliminary review priority based on explainable evidence.
 * Missing EXIF is explicitly neutral and never triggers a warning.
 * Dynamically synthesizes the summary based on which checks actually ran and their real outcomes.
 */
export function evaluateReviewPriority(
  findings: IntegrityFinding[],
  ela?: ELAMetrics,
  metadata?: MetadataReport
): PreliminaryAssessment {
  const qualityIssues = findings.filter((f) => f.category === 'quality' && f.severity !== 'info')
  const manipulationIssues = findings.filter((f) => f.category === 'manipulation' && f.severity !== 'info')
  const metadataIssues = findings.filter((f) => f.category === 'metadata' && f.severity === 'medium')

  // Rule 1: Inconclusive if critical quality issues prevent dependable reading
  const hasCriticalLowRes = qualityIssues.some(
    (f) => f.id === 'qual-low-res' && f.severity === 'medium'
  )
  const hasSevereBlur = qualityIssues.some((f) => f.id === 'qual-blur')

  if (hasCriticalLowRes && hasSevereBlur) {
    return {
      priority: 'inconclusive',
      priorityLabel: 'Analysis Inconclusive',
      summary: 'Low raster resolution combined with image blur prevents reliable automated screening.',
      contributingFindings: qualityIssues,
      recommendedAction: 'Obtain a clearer, properly focused document image before proceeding.',
      disclaimer: 'Inconclusive status reflects capture conditions and does not classify the credential as fraudulent.'
    }
  }

  // Rule 2: Manual Review Recommended if manipulation indicators or software tags are flagged
  if (manipulationIssues.length > 0 || metadataIssues.length > 0) {
    const contributors = [...manipulationIssues, ...metadataIssues]
    return {
      priority: 'manual-review',
      priorityLabel: 'Manual Review Recommended',
      summary: 'Notable indicators detected by automated checks require human examiner inspection.',
      contributingFindings: contributors,
      recommendedAction: 'Review highlighted ELA zones, verify text alignment, and inspect physical security features.',
      disclaimer: 'Manual review recommendation is an operational triage signal, not proof of document forgery.'
    }
  }

  // Rule 3: Standard Review — Dynamically formulate summary based on executed checks
  const rawFormat = metadata?.format || String(findings.find((f) => f.id === 'forensic-ela-unsupported')?.measuredValue ?? '')
  const formatName = rawFormat.includes('WebP') ? 'WebP' : rawFormat.includes('PNG') ? 'PNG' : rawFormat || 'the uploaded format'

  const isElaPerformed = ela ? ela.performed : findings.some((f) => f.id === 'forensic-ela-ok' || f.id === 'forensic-ela-anom')
  const isElaUnsupported = ela ? !ela.supported : findings.some((f) => f.id === 'forensic-ela-unsupported')

  let summary = ''
  if (qualityIssues.length > 0) {
    const issueLabels = qualityIssues.map((q) => q.title).join(', ')
    if (isElaPerformed) {
      summary = `Minor image-quality observations were noted (${issueLabels}). Compression analysis detected uniform JPEG compression levels.`
    } else if (isElaUnsupported) {
      summary = `Minor image-quality observations were noted (${issueLabels}). Compression-forensics analysis was not performed because the uploaded format is ${formatName}.`
    } else {
      summary = `Minor image-quality observations were noted (${issueLabels}). Compression-forensics analysis was not performed on this raster.`
    }
  } else {
    if (isElaPerformed) {
      summary = 'No notable quality anomalies or compression irregularities were detected by the implemented checks.'
    } else if (isElaUnsupported) {
      summary = `No notable image-quality anomalies were detected by the implemented quality metrics. Compression-forensics analysis was not performed because the uploaded format is ${formatName}.`
    } else {
      summary = 'No notable image-quality anomalies were detected by the implemented quality metrics. Compression-forensics analysis was not performed on this raster.'
    }
  }

  return {
    priority: 'standard',
    priorityLabel: 'Standard Review',
    summary,
    contributingFindings: qualityIssues,
    recommendedAction: 'Proceed with standard operational verification flow.',
    disclaimer:
      'Standard Review indicates that no notable anomalies were detected under the current set of automated heuristics. It does NOT certify that the document is authentic or legally genuine. Physical credential examination, biometric verification, and institutional registry validation are required for conclusive verification.'
  }
}

/**
 * Executes complete client-side Image Integrity Analysis pipeline.
 */
export async function performImageIntegrityAnalysis(
  options: PerformIntegrityOptions
): Promise<ImageIntegrityResult> {
  const { file, previewUrl, onProgress } = options

  onProgress?.({
    status: 'Inspecting file header and container properties...',
    progress: 0.15,
    stage: 'reading'
  })

  // 1. Extract Metadata
  const metadata = await extractImageMetadata(file)

  onProgress?.({
    status: 'Decoding raster and evaluating image quality...',
    progress: 0.45,
    stage: 'quality'
  })

  // 2. Decode Image to Canvas
  const img = new Image()
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('Failed to render document image on client canvas.'))
    img.src = previewUrl
  })

  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not initialize browser canvas context.')
  ctx.drawImage(img, 0, 0)

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

  // 3. Image Quality Analysis
  const quality = analyzeImageQuality(imageData, canvas.width, canvas.height)

  onProgress?.({
    status: 'Executing Error Level Analysis (ELA) and compression inspection...',
    progress: 0.75,
    stage: 'forensics'
  })

  // 4. Error Level Analysis (JPEG)
  const ela = await performErrorLevelAnalysis(canvas, file.type)

  onProgress?.({
    status: 'Synthesizing explainable screening findings...',
    progress: 0.95,
    stage: 'complete'
  })

  // 5. Build Explainable Findings
  const findings = buildExplainableFindings(quality, metadata, ela, file.name)

  // 6. Preliminary Review Priority Assessment (Dynamic synthesis based on real executed checks)
  const assessment = evaluateReviewPriority(findings, ela, metadata)

  onProgress?.({
    status: 'Image integrity analysis complete.',
    progress: 1.0,
    stage: 'complete'
  })

  return {
    fileProperties: {
      fileName: file.name,
      fileSizeBytes: file.size,
      fileSizeFormatted: formatFileSize(file.size),
      detectedFormat: metadata.format,
      mimeType: file.type || 'image/jpeg',
      dimensions: { width: canvas.width, height: canvas.height },
      aspectRatio: quality.aspectRatio
    },
    quality,
    metadata,
    ela,
    findings,
    assessment,
    analyzedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }
}
