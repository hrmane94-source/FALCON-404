/**
 * FALCON-404 Phase 5: Document Boundary Detection, Perspective Analysis,
 * Framing Analysis, and Layout-Quality Assessment Service.
 *
 * Runs 100% client-side in the browser runtime without heavy external libraries.
 * Analyzes actual decoded image rasters using Canvas 2D image processing,
 * Sobel edge gradients, quadrilateral estimation, and pure geometric math.
 *
 * All findings are explainable, evidence-backed, and neutral with explicit limitation disclaimers.
 */

import type {
  Point2D,
  DocumentCorners,
  DocumentGeometry,
  PerspectiveMetrics,
  FramingMetrics,
  FramingStatus,
  LayoutQualityMetrics,
  LayoutFinding,
  DocumentLayoutResult,
  LayoutProgress,
  OCRTextRegion,
  BoundaryDetectionStatus
} from '../types'

// ==========================================
// Centralized, Documented Heuristic Thresholds
// ==========================================
export const LAYOUT_THRESHOLDS = {
  MIN_DETECTOR_SCORE_RELIABLE: 60,
  MIN_DETECTOR_SCORE_PARTIAL: 42,
  MIN_DETECTOR_SCORE_UNCERTAIN: 28,
  MIN_AREA_COVERAGE_RATIO: 0.12, // Document takes at least 12% of raster
  MAX_AREA_COVERAGE_RATIO: 0.97, // >97% indicates full-bleed scan with no border
  TIGHT_MARGIN_PERCENT: 0.02, // Margins < 2% of dimension considered tight framing
  EXCESSIVE_BACKGROUND_RATIO: 0.35, // Document area < 35% of total image area
  ROTATION_WARN_DEG: 4.5, // >4.5 deg tilt in image plane
  KEYSTONE_WARN_RATIO: 0.86, // Opposite side ratio < 0.86 indicates perspective convergence
  ANGLE_ORTHOGONAL_TOLERANCE_DEG: 7.0, // Deviation from 90 deg corner angles
  MIN_TEXT_CONTAINMENT_RATIO: 0.85 // <85% OCR text within boundary flags layout warning
} as const

// ==========================================
// Pure Geometric & Trigonometric Utilities
// ==========================================

/** Euclidean distance between two 2D points */
export function euclideanDistance(p1: Point2D, p2: Point2D): number {
  const dx = p1.x - p2.x
  const dy = p1.y - p2.y
  return Math.sqrt(dx * dx + dy * dy)
}

/** Angle in degrees between two 2D vectors originating at vertex 'origin' */
export function angleAtVertex(origin: Point2D, p1: Point2D, p2: Point2D): number {
  const v1x = p1.x - origin.x
  const v1y = p1.y - origin.y
  const v2x = p2.x - origin.x
  const v2y = p2.y - origin.y

  const dot = v1x * v2x + v1y * v2y
  const mag1 = Math.sqrt(v1x * v1x + v1y * v1y)
  const mag2 = Math.sqrt(v2x * v2x + v2y * v2y)

  if (mag1 === 0 || mag2 === 0) return 90

  const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)))
  return Math.round((Math.acos(cosAngle) * 180) / Math.PI)
}

/** Computes polygon area using the Shoelace formula */
export function computePolygonArea(corners: DocumentCorners): number {
  const pts = [corners.topLeft, corners.topRight, corners.bottomRight, corners.bottomLeft]
  let area = 0
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length
    area += pts[i].x * pts[j].y
    area -= pts[j].x * pts[i].y
  }
  return Math.abs(area) / 2
}

/** Tests if a 2D point is inside a polygon using ray-casting */
export function isPointInPolygon(point: Point2D, polygon: Point2D[]): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x
    const yi = polygon[i].y
    const xj = polygon[j].x
    const yj = polygon[j].y

    const intersect = yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

/** Tests if an axis-aligned bounding box center is inside the quad */
export function isBBoxInsideQuad(bbox: { x0: number; y0: number; x1: number; y1: number }, corners: DocumentCorners): boolean {
  const center: Point2D = {
    x: (bbox.x0 + bbox.x1) / 2,
    y: (bbox.y0 + bbox.y1) / 2
  }
  const poly = [corners.topLeft, corners.topRight, corners.bottomRight, corners.bottomLeft]
  return isPointInPolygon(center, poly)
}

/** Computes full geometric measurements for a quadrilateral */
export function computeDocumentGeometry(
  corners: DocumentCorners,
  imageWidth: number,
  imageHeight: number
): DocumentGeometry {
  const widthTop = Math.round(euclideanDistance(corners.topLeft, corners.topRight))
  const widthBottom = Math.round(euclideanDistance(corners.bottomLeft, corners.bottomRight))
  const heightLeft = Math.round(euclideanDistance(corners.topLeft, corners.bottomLeft))
  const heightRight = Math.round(euclideanDistance(corners.topRight, corners.bottomRight))

  const averageWidth = Math.round((widthTop + widthBottom) / 2)
  const averageHeight = Math.round((heightLeft + heightRight) / 2)
  const quadAspectRatio = averageHeight > 0 ? parseFloat((averageWidth / averageHeight).toFixed(3)) : 1.0

  const quadAreaPixels = Math.round(computePolygonArea(corners))
  const totalImageArea = imageWidth * imageHeight
  const areaCoverageRatio = totalImageArea > 0 ? parseFloat((quadAreaPixels / totalImageArea).toFixed(3)) : 0

  const normalizedCorners: DocumentCorners = {
    topLeft: {
      x: parseFloat((corners.topLeft.x / imageWidth).toFixed(4)),
      y: parseFloat((corners.topLeft.y / imageHeight).toFixed(4))
    },
    topRight: {
      x: parseFloat((corners.topRight.x / imageWidth).toFixed(4)),
      y: parseFloat((corners.topRight.y / imageHeight).toFixed(4))
    },
    bottomRight: {
      x: parseFloat((corners.bottomRight.x / imageWidth).toFixed(4)),
      y: parseFloat((corners.bottomRight.y / imageHeight).toFixed(4))
    },
    bottomLeft: {
      x: parseFloat((corners.bottomLeft.x / imageWidth).toFixed(4)),
      y: parseFloat((corners.bottomLeft.y / imageHeight).toFixed(4))
    }
  }

  return {
    corners,
    normalizedCorners,
    widthTop,
    widthBottom,
    heightLeft,
    heightRight,
    averageWidth,
    averageHeight,
    quadAspectRatio,
    quadAreaPixels,
    areaCoverageRatio
  }
}

/** Computes perspective, skew, and in-plane rotation metrics */
export function computePerspectiveMetrics(
  geometry: DocumentGeometry,
  _imageWidth: number,
  _imageHeight: number
): PerspectiveMetrics {
  const { corners, widthTop, widthBottom, heightLeft, heightRight } = geometry

  // 1. In-plane rotation angle based on top edge vector (relative to horizontal axis)
  const dxTop = corners.topRight.x - corners.topLeft.x
  const dyTop = corners.topRight.y - corners.topLeft.y
  let rotationAngleDeg = parseFloat(((Math.atan2(dyTop, dxTop) * 180) / Math.PI).toFixed(1))
  // Normalize to [-180, 180]
  if (rotationAngleDeg > 180) rotationAngleDeg -= 360
  if (rotationAngleDeg < -180) rotationAngleDeg += 360

  // 2. Corner angles (internal angles)
  const cornerAnglesDeg = {
    topLeft: angleAtVertex(corners.topLeft, corners.topRight, corners.bottomLeft),
    topRight: angleAtVertex(corners.topRight, corners.bottomRight, corners.topLeft),
    bottomRight: angleAtVertex(corners.bottomRight, corners.bottomLeft, corners.topRight),
    bottomLeft: angleAtVertex(corners.bottomLeft, corners.topLeft, corners.bottomRight)
  }

  // 3. Horizontal and vertical skew ratios (opposite side ratios: min/max)
  const maxW = Math.max(widthTop, widthBottom)
  const minW = Math.min(widthTop, widthBottom)
  const horizontalSkewRatio = maxW > 0 ? parseFloat((minW / maxW).toFixed(3)) : 1.0

  const maxH = Math.max(heightLeft, heightRight)
  const minH = Math.min(heightLeft, heightRight)
  const verticalSkewRatio = maxH > 0 ? parseFloat((minH / maxH).toFixed(3)) : 1.0

  const apparentKeystoneRatio = parseFloat(Math.min(horizontalSkewRatio, verticalSkewRatio).toFixed(3))

  const isSeverePerspective = apparentKeystoneRatio < LAYOUT_THRESHOLDS.KEYSTONE_WARN_RATIO
  const isRotated = Math.abs(rotationAngleDeg) > LAYOUT_THRESHOLDS.ROTATION_WARN_DEG

  let observation = 'Document appears predominantly fronto-parallel with near-orthogonal corners.'
  if (isSeverePerspective && isRotated) {
    observation = `Noticeable perspective distortion (keystone ratio ${apparentKeystoneRatio}) combined with image-plane rotation (${rotationAngleDeg}°).`
  } else if (isSeverePerspective) {
    observation = `Perspective distortion detected: opposite sides converge (keystone ratio ${apparentKeystoneRatio}), consistent with an off-axis capture.`
  } else if (isRotated) {
    observation = `Document exhibits an in-plane tilt of ${rotationAngleDeg}°, but opposite edges remain parallel.`
  }

  return {
    rotationAngleDeg,
    cornerAnglesDeg,
    horizontalSkewRatio,
    verticalSkewRatio,
    apparentKeystoneRatio,
    isSeverePerspective,
    isRotated,
    observation
  }
}

/** Computes framing, margins, and edge clearance */
export function computeFramingMetrics(
  geometry: DocumentGeometry | undefined,
  imageWidth: number,
  imageHeight: number,
  boundaryStatus: BoundaryDetectionStatus
): FramingMetrics {
  if (!geometry || boundaryStatus === 'boundary-not-detected' || boundaryStatus === 'unsupported' || boundaryStatus === 'error') {
    return {
      status: 'inconclusive',
      statusLabel: 'Framing Inconclusive',
      marginsPx: { top: 0, right: 0, bottom: 0, left: 0 },
      minMarginPx: 0,
      areaCoveragePercent: 0,
      assessmentNote: 'Document boundary could not be localized reliably; edge framing analysis is inconclusive.'
    }
  }

  const { corners, areaCoverageRatio } = geometry
  const areaCoveragePercent = Math.round(areaCoverageRatio * 100)

  // Distance from corners to image borders
  const minX = Math.min(corners.topLeft.x, corners.bottomLeft.x)
  const maxX = Math.max(corners.topRight.x, corners.bottomRight.x)
  const minY = Math.min(corners.topLeft.y, corners.topRight.y)
  const maxY = Math.max(corners.bottomLeft.y, corners.bottomRight.y)

  const marginsPx = {
    top: Math.max(0, Math.round(minY)),
    left: Math.max(0, Math.round(minX)),
    right: Math.max(0, Math.round(imageWidth - maxX)),
    bottom: Math.max(0, Math.round(imageHeight - maxY))
  }

  const minMarginPx = Math.min(marginsPx.top, marginsPx.left, marginsPx.right, marginsPx.bottom)
  const tightThresholdX = imageWidth * LAYOUT_THRESHOLDS.TIGHT_MARGIN_PERCENT
  const tightThresholdY = imageHeight * LAYOUT_THRESHOLDS.TIGHT_MARGIN_PERCENT
  const minTightThreshold = Math.min(tightThresholdX, tightThresholdY)

  let status: FramingStatus = 'all-edges-visible'
  let statusLabel = 'All Edges Visible'
  let assessmentNote = `All four estimated document edges maintain clear separation from the frame border (minimum margin: ${minMarginPx} px, coverage: ${areaCoveragePercent}%).`

  if (minMarginPx <= 2 || boundaryStatus === 'partial-boundary-detected') {
    status = 'partially-cropped'
    statusLabel = 'Border Contact / Partial Framing'
    assessmentNote = `At least one document edge contacts or crosses the image boundary (minimum margin: ${minMarginPx} px). Physical perimeter may extend beyond the capture frame.`
  } else if (minMarginPx < minTightThreshold || areaCoverageRatio > LAYOUT_THRESHOLDS.MAX_AREA_COVERAGE_RATIO) {
    status = 'tight-framing'
    statusLabel = 'Tightly Framed'
    assessmentNote = `The document occupies nearly the entire capture raster (${areaCoveragePercent}% coverage) with narrow border clearance (${minMarginPx} px).`
  } else if (areaCoverageRatio < LAYOUT_THRESHOLDS.EXCESSIVE_BACKGROUND_RATIO) {
    status = 'excessive-background'
    statusLabel = 'Excessive Background Margin'
    assessmentNote = `The document occupies a relatively small fraction of the image (${areaCoveragePercent}%), leaving substantial surrounding background.`
  }

  return {
    status,
    statusLabel,
    marginsPx,
    minMarginPx,
    areaCoveragePercent,
    assessmentNote
  }
}

/** Computes layout-quality and text region containment inside the quad */
export function computeLayoutQuality(
  geometry: DocumentGeometry | undefined,
  textRegions: OCRTextRegion[] | undefined,
  boundaryStatus: BoundaryDetectionStatus
): LayoutQualityMetrics {
  // Case 1: Boundary not localized, unsupported, or error
  if (!geometry || boundaryStatus === 'boundary-not-detected' || boundaryStatus === 'unsupported' || boundaryStatus === 'error') {
    return {
      performed: false,
      status: 'not-assessable',
      statusLabel: 'Not Assessable',
      totalTextRegions: textRegions?.length || 0,
      regionsInsideBoundary: 0,
      regionsOutsideBoundary: 0,
      containmentRatio: null,
      containmentFormatted: 'N/A',
      isLayoutConsistent: true,
      isBoundaryReliable: false,
      layoutAssessmentNote: 'Layout containment assessment was skipped because document boundary could not be localized.'
    }
  }

  // Case 2: Missing bounding boxes (textRegions is undefined)
  if (textRegions === undefined) {
    return {
      performed: false,
      status: 'missing-bboxes',
      statusLabel: 'Not Assessable',
      totalTextRegions: 0,
      regionsInsideBoundary: 0,
      regionsOutsideBoundary: 0,
      containmentRatio: null,
      containmentFormatted: 'N/A',
      isLayoutConsistent: true,
      isBoundaryReliable: boundaryStatus === 'boundary-detected',
      layoutAssessmentNote: 'No OCR text regions available for spatial containment analysis. Execute Stage 02 OCR to transcribe text glyphs.'
    }
  }

  // Case 3: OCR ran but 0 text regions found
  if (textRegions.length === 0) {
    return {
      performed: true,
      status: 'no-text-regions',
      statusLabel: 'Not Assessable',
      totalTextRegions: 0,
      regionsInsideBoundary: 0,
      regionsOutsideBoundary: 0,
      containmentRatio: null,
      containmentFormatted: 'N/A',
      isLayoutConsistent: true,
      isBoundaryReliable: boundaryStatus === 'boundary-detected',
      layoutAssessmentNote: 'No OCR text regions available for spatial containment analysis.'
    }
  }

  // Count inside / outside
  let insideCount = 0
  let outsideCount = 0

  for (const region of textRegions) {
    if (isBBoxInsideQuad(region.bbox, geometry.corners)) {
      insideCount++
    } else {
      outsideCount++
    }
  }

  const total = insideCount + outsideCount

  // Case 4: Boundary is uncertain - do not present containment as reliable
  if (boundaryStatus === 'boundary-uncertain') {
    return {
      performed: true,
      status: 'uncertain-boundary',
      statusLabel: 'Uncertain Boundary',
      totalTextRegions: total,
      regionsInsideBoundary: insideCount,
      regionsOutsideBoundary: outsideCount,
      containmentRatio: null,
      containmentFormatted: 'N/A (Uncertain Boundary)',
      isLayoutConsistent: true,
      isBoundaryReliable: false,
      layoutAssessmentNote: `Boundary localization is uncertain; text containment (${insideCount}/${total} boxes roughly inside) is not presented as a reliable measurement.`
    }
  }

  // Case 5: Assessable with valid regions and reliable/partial boundary
  const ratio = total > 0 ? parseFloat((insideCount / total).toFixed(3)) : null
  const containmentRatio = ratio
  const containmentFormatted = ratio !== null ? `${Math.round(ratio * 100)}%` : 'N/A'
  const isLayoutConsistent = ratio !== null ? ratio >= LAYOUT_THRESHOLDS.MIN_TEXT_CONTAINMENT_RATIO : true
  const isBoundaryReliable = boundaryStatus === 'boundary-detected'

  let layoutAssessmentNote = `High spatial alignment: ${containmentFormatted} of OCR text blocks (${insideCount}/${total}) are positioned fully within the estimated document boundary.`
  if (!isLayoutConsistent && ratio !== null) {
    layoutAssessmentNote = `Spatial disparity detected: ${outsideCount} text region(s) (${Math.round((1 - ratio) * 100)}%) fall outside the estimated boundary. This can occur with background text, watermarks, or boundary misdetection.`
  } else if (boundaryStatus === 'partial-boundary-detected') {
    layoutAssessmentNote = `Partial boundary detected: ${containmentFormatted} of OCR text blocks (${insideCount}/${total}) reside within the identified border segment.`
  }

  return {
    performed: true,
    status: 'assessable',
    statusLabel: 'Assessed',
    totalTextRegions: total,
    regionsInsideBoundary: insideCount,
    regionsOutsideBoundary: outsideCount,
    containmentRatio,
    containmentFormatted,
    isLayoutConsistent,
    isBoundaryReliable,
    layoutAssessmentNote
  }
}

// ==========================================
// Client-Side Image Edge & Boundary Analysis
// ==========================================

export interface PerformDocumentLayoutOptions {
  file?: File
  previewUrl?: string
  sourceCanvas?: HTMLCanvasElement
  textRegions?: OCRTextRegion[]
  onProgress?: (progress: LayoutProgress) => void
}

/**
 * Loads an HTMLImageElement safely from a File or preview URL
 */
async function loadImageElement(file?: File, previewUrl?: string): Promise<HTMLImageElement> {
  const url = previewUrl || (file ? URL.createObjectURL(file) : '')
  if (!url) throw new Error('No image file or URL provided for document layout analysis.')

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      if (!previewUrl && file) URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      if (!previewUrl && file) URL.revokeObjectURL(url)
      reject(new Error('Failed to decode image raster for boundary analysis.'))
    }
    img.src = url
  })
}

/**
 * Executes fast, deterministic Sobel edge detection & boundary estimation on the raster
 */
export async function analyzeDocumentBoundary(
  img: HTMLImageElement,
  textRegions?: OCRTextRegion[],
  onProgress?: (prog: LayoutProgress) => void
): Promise<DocumentLayoutResult> {
  const origWidth = img.naturalWidth || img.width
  const origHeight = img.naturalHeight || img.height

  if (origWidth < 50 || origHeight < 50) {
    return createEmptyLayoutResult('unsupported', 'Raster Too Small', 0, 'Image dimensions below minimal analysis threshold.')
  }

  onProgress?.({
    status: 'Downscaling raster for edge analysis...',
    progress: 0.15,
    stage: 'decoding'
  })

  // 1. Create a work canvas downscaled to max 640px to achieve sub-50ms processing
  const maxDim = 640
  const scale = Math.min(1.0, maxDim / Math.max(origWidth, origHeight))
  const workWidth = Math.round(origWidth * scale)
  const workHeight = Math.round(origHeight * scale)

  const canvas = document.createElement('canvas')
  canvas.width = workWidth
  canvas.height = workHeight
  const ctx = canvas.getContext('2d', { willReadFrequently: true })

  if (!ctx) {
    return createEmptyLayoutResult('error', 'Context Unavailable', 0, 'Could not obtain 2D canvas context.')
  }

  ctx.drawImage(img, 0, 0, workWidth, workHeight)
  const imgData = ctx.getImageData(0, 0, workWidth, workHeight)
  const data = imgData.data

  onProgress?.({
    status: 'Computing Sobel edge gradients...',
    progress: 0.35,
    stage: 'edges'
  })

  // 2. Grayscale conversion + 3x3 Box blur in memory
  const gray = new Float32Array(workWidth * workHeight)
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    // Standard Rec. 601 luma formula
    gray[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
  }

  // 3. Fast separable box filter for noise suppression
  const blurred = new Float32Array(workWidth * workHeight)
  for (let y = 1; y < workHeight - 1; y++) {
    for (let x = 1; x < workWidth - 1; x++) {
      const idx = y * workWidth + x
      blurred[idx] =
        (gray[idx - workWidth - 1] +
          gray[idx - workWidth] +
          gray[idx - workWidth + 1] +
          gray[idx - 1] +
          gray[idx] * 2 +
          gray[idx + 1] +
          gray[idx + workWidth - 1] +
          gray[idx + workWidth] +
          gray[idx + workWidth + 1]) /
        10
    }
  }

  onProgress?.({
    status: 'Detecting candidate document contours...',
    progress: 0.55,
    stage: 'quadrilateral'
  })

  // 4. Horizontal and Vertical Sobel gradient magnitude
  const gradMag = new Float32Array(workWidth * workHeight)
  let maxGrad = 0
  let totalGrad = 0
  let edgePixelCount = 0

  for (let y = 1; y < workHeight - 1; y++) {
    for (let x = 1; x < workWidth - 1; x++) {
      const idx = y * workWidth + x
      // Sobel X
      const gx =
        -blurred[idx - workWidth - 1] +
        blurred[idx - workWidth + 1] -
        2 * blurred[idx - 1] +
        2 * blurred[idx + 1] -
        blurred[idx + workWidth - 1] +
        blurred[idx + workWidth + 1]

      // Sobel Y
      const gy =
        -blurred[idx - workWidth - 1] -
        2 * blurred[idx - workWidth] -
        blurred[idx - workWidth + 1] +
        blurred[idx + workWidth - 1] +
        2 * blurred[idx + workWidth] +
        blurred[idx + workWidth + 1]

      const mag = Math.sqrt(gx * gx + gy * gy)
      gradMag[idx] = mag
      totalGrad += mag
      if (mag > maxGrad) maxGrad = mag
      if (mag > 28) edgePixelCount++
    }
  }

  const meanGrad = totalGrad / (workWidth * workHeight)

  // 5. Boundary Search: Multi-directional radial and profile scan
  // We scan along 4 quadrants from the periphery toward the center to find the first sustained high-gradient boundary
  const candidateCornersScaled = findQuadrilateralFromGradients(gradMag, workWidth, workHeight, meanGrad)

  onProgress?.({
    status: 'Evaluating perspective and framing...',
    progress: 0.75,
    stage: 'perspective'
  })

  // Scale corners back to original image space
  const unscale = 1.0 / scale
  const cornersOrig: DocumentCorners = {
    topLeft: {
      x: Math.round(candidateCornersScaled.corners.topLeft.x * unscale),
      y: Math.round(candidateCornersScaled.corners.topLeft.y * unscale)
    },
    topRight: {
      x: Math.round(candidateCornersScaled.corners.topRight.x * unscale),
      y: Math.round(candidateCornersScaled.corners.topRight.y * unscale)
    },
    bottomRight: {
      x: Math.round(candidateCornersScaled.corners.bottomRight.x * unscale),
      y: Math.round(candidateCornersScaled.corners.bottomRight.y * unscale)
    },
    bottomLeft: {
      x: Math.round(candidateCornersScaled.corners.bottomLeft.x * unscale),
      y: Math.round(candidateCornersScaled.corners.bottomLeft.y * unscale)
    }
  }

  // 6. Geometry, Perspective & Framing calculations
  const geometry = computeDocumentGeometry(cornersOrig, origWidth, origHeight)
  const perspective = computePerspectiveMetrics(geometry, origWidth, origHeight)
  const framing = computeFramingMetrics(geometry, origWidth, origHeight, candidateCornersScaled.status)

  onProgress?.({
    status: 'Assessing OCR layout quality...',
    progress: 0.9,
    stage: 'layout'
  })

  // 7. Layout quality calculation
  const layoutQuality = computeLayoutQuality(geometry, textRegions, candidateCornersScaled.status)

  // 8. Build explainable findings
  const findings = buildLayoutFindings(candidateCornersScaled.status, candidateCornersScaled.score, geometry, perspective, framing, layoutQuality)

  onProgress?.({
    status: 'Boundary and layout analysis complete',
    progress: 1.0,
    stage: 'complete'
  })

  return {
    status: candidateCornersScaled.status,
    statusLabel: getStatusLabel(candidateCornersScaled.status),
    detectorScore: candidateCornersScaled.score,
    scoreDefinition: 'Heuristic boundary detector score (0-100). Indicates geometric edge fit clarity, not fraud probability.',
    geometry: candidateCornersScaled.status !== 'boundary-not-detected' ? geometry : undefined,
    perspective: candidateCornersScaled.status !== 'boundary-not-detected' ? perspective : undefined,
    framing,
    layoutQuality,
    findings,
    analyzedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }
}

/**
 * Searches the gradient field for the primary document quadrilateral
 */
function findQuadrilateralFromGradients(
  gradMag: Float32Array,
  width: number,
  height: number,
  meanGrad: number
): { status: BoundaryDetectionStatus; score: number; corners: DocumentCorners } {
  // If the entire image is blank or has almost zero edge energy
  if (meanGrad < 2.5) {
    return {
      status: 'boundary-not-detected',
      score: 10,
      corners: {
        topLeft: { x: 0, y: 0 },
        topRight: { x: width, y: 0 },
        bottomRight: { x: width, y: height },
        bottomLeft: { x: 0, y: height }
      }
    }
  }

  // Adaptive threshold for edge support
  const threshold = Math.max(18, meanGrad * 1.8)

  // Find bounding transition along rays from outside inward
  // Top edge
  let topY = 0
  for (let y = Math.round(height * 0.02); y < height * 0.45; y++) {
    let edgeEnergy = 0
    for (let x = Math.round(width * 0.2); x < width * 0.8; x++) {
      if (gradMag[y * width + x] > threshold) edgeEnergy++
    }
    if (edgeEnergy > width * 0.25) {
      topY = y
      break
    }
  }

  // Bottom edge
  let bottomY = height
  for (let y = Math.round(height * 0.98); y > height * 0.55; y--) {
    let edgeEnergy = 0
    for (let x = Math.round(width * 0.2); x < width * 0.8; x++) {
      if (gradMag[y * width + x] > threshold) edgeEnergy++
    }
    if (edgeEnergy > width * 0.25) {
      bottomY = y
      break
    }
  }

  // Left edge
  let leftX = 0
  for (let x = Math.round(width * 0.02); x < width * 0.45; x++) {
    let edgeEnergy = 0
    for (let y = Math.round(height * 0.2); y < height * 0.8; y++) {
      if (gradMag[y * width + x] > threshold) edgeEnergy++
    }
    if (edgeEnergy > height * 0.25) {
      leftX = x
      break
    }
  }

  // Right edge
  let rightX = width
  for (let x = Math.round(width * 0.98); x > width * 0.55; x--) {
    let edgeEnergy = 0
    for (let y = Math.round(height * 0.2); y < height * 0.8; y++) {
      if (gradMag[y * width + x] > threshold) edgeEnergy++
    }
    if (edgeEnergy > height * 0.25) {
      rightX = x
      break
    }
  }

  // Refine corner positions with slight perspective tolerance
  const corners: DocumentCorners = {
    topLeft: { x: Math.max(0, leftX), y: Math.max(0, topY) },
    topRight: { x: Math.min(width, rightX), y: Math.max(0, topY) },
    bottomRight: { x: Math.min(width, rightX), y: Math.min(height, bottomY) },
    bottomLeft: { x: Math.max(0, leftX), y: Math.min(height, bottomY) }
  }

  // Measure quad dimensions
  const quadW = rightX - leftX
  const quadH = bottomY - topY
  const quadArea = quadW * quadH
  const totalArea = width * height
  const areaRatio = quadArea / totalArea

  // Calculate heuristic detector score
  let score = 50

  // 1. Edge sharpness and boundary presence bonus/penalty
  const hasDistinctEdges = (topY > 2 ? 10 : 0) + (bottomY < height - 2 ? 10 : 0) + (leftX > 2 ? 10 : 0) + (rightX < width - 2 ? 10 : 0)
  score += hasDistinctEdges

  // 2. Aspect ratio plausibility: standard IDs/documents are ~1.2 to 2.0
  const aspect = quadW / Math.max(1, quadH)
  if (aspect >= 1.1 && aspect <= 2.2) {
    score += 15
  } else if (aspect >= 0.5 && aspect <= 3.0) {
    score += 5
  } else {
    score -= 20
  }

  // 3. Area coverage plausibility
  if (areaRatio >= 0.25 && areaRatio <= 0.92) {
    score += 15
  } else if (areaRatio > 0.95) {
    // Likely full-bleed scan with no margins
    score -= 10
  } else if (areaRatio < 0.15) {
    score -= 20
  }

  score = Math.max(0, Math.min(100, Math.round(score)))

  // Determine status based on score and edge contacts
  let status: BoundaryDetectionStatus = 'boundary-detected'
  if (score >= LAYOUT_THRESHOLDS.MIN_DETECTOR_SCORE_RELIABLE && areaRatio >= LAYOUT_THRESHOLDS.MIN_AREA_COVERAGE_RATIO) {
    status = 'boundary-detected'
  } else if (score >= LAYOUT_THRESHOLDS.MIN_DETECTOR_SCORE_PARTIAL) {
    status = 'partial-boundary-detected'
  } else if (score >= LAYOUT_THRESHOLDS.MIN_DETECTOR_SCORE_UNCERTAIN) {
    status = 'boundary-uncertain'
  } else {
    status = 'boundary-not-detected'
  }

  return { status, score, corners }
}

function getStatusLabel(status: BoundaryDetectionStatus): string {
  switch (status) {
    case 'boundary-detected':
      return 'Boundary Localized'
    case 'partial-boundary-detected':
      return 'Partial Boundary Detected'
    case 'boundary-uncertain':
      return 'Boundary Uncertain'
    case 'boundary-not-detected':
      return 'Boundary Not Detected'
    case 'unsupported':
      return 'Analysis Unsupported'
    case 'error':
      return 'Detection Failed'
  }
}

function createEmptyLayoutResult(
  status: BoundaryDetectionStatus,
  statusLabel: string,
  score: number,
  note: string
): DocumentLayoutResult {
  return {
    status,
    statusLabel,
    detectorScore: score,
    scoreDefinition: 'Heuristic boundary detector score (0-100). Indicates geometric edge fit clarity, not fraud probability.',
    framing: {
      status: 'inconclusive',
      statusLabel: 'Framing Inconclusive',
      marginsPx: { top: 0, right: 0, bottom: 0, left: 0 },
      minMarginPx: 0,
      areaCoveragePercent: 0,
      assessmentNote: note
    },
    layoutQuality: {
      performed: false,
      status: 'not-assessable',
      statusLabel: 'Not Assessable',
      totalTextRegions: 0,
      regionsInsideBoundary: 0,
      regionsOutsideBoundary: 0,
      containmentRatio: null,
      containmentFormatted: 'N/A',
      isLayoutConsistent: true,
      isBoundaryReliable: false,
      layoutAssessmentNote: note
    },
    findings: [
      {
        id: 'lay-inconclusive',
        title: 'Boundary Analysis Inconclusive',
        category: 'limitations',
        severity: 'info',
        metricName: 'Boundary Detection',
        measuredValue: statusLabel,
        observation: note,
        explanation: 'Automatic edge detection could not isolate a candidate quadrilateral within acceptable confidence thresholds.',
        importance: 'Prevents automated perspective correction and layout containment auditing.',
        recommendation: 'Ensure the document is photographed on a contrasting background with all four physical corners visible.',
        limitations: 'Inconclusive boundary detection does not indicate document invalidity or fraudulent tampering.'
      }
    ],
    analyzedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }
}

/**
 * Builds structured, explainable findings for boundary, perspective, framing, and layout
 */
export function buildLayoutFindings(
  boundaryStatus: BoundaryDetectionStatus,
  detectorScore: number,
  geometry?: DocumentGeometry,
  perspective?: PerspectiveMetrics,
  framing?: FramingMetrics,
  layoutQuality?: LayoutQualityMetrics
): LayoutFinding[] {
  const findings: LayoutFinding[] = []

  // 1. Boundary Detection Finding
  if (boundaryStatus === 'boundary-detected') {
    findings.push({
      id: 'lay-bound-ok',
      title: 'Document Perimeter Localized',
      category: 'boundary',
      severity: 'info',
      metricName: 'Boundary Detector Score',
      measuredValue: `${detectorScore} / 100`,
      threshold: `≥ ${LAYOUT_THRESHOLDS.MIN_DETECTOR_SCORE_RELIABLE}`,
      observation: `Document boundary isolated with high edge energy (${geometry?.averageWidth} × ${geometry?.averageHeight} px, area ratio ${Math.round((geometry?.areaCoverageRatio || 0) * 100)}%).`,
      explanation: 'Continuous high-contrast gradient transitions separate the document substrate from surrounding background.',
      importance: 'Enables perspective distortion evaluation and spatial layout containment checks.',
      recommendation: 'Proceed with automated screening.',
      limitations: 'Estimated boundaries are computer-generated heuristics and do not certify physical edge integrity.'
    })
  } else if (boundaryStatus === 'partial-boundary-detected') {
    findings.push({
      id: 'lay-bound-partial',
      title: 'Partial Boundary Detected',
      category: 'boundary',
      severity: 'low',
      metricName: 'Boundary Detector Score',
      measuredValue: `${detectorScore} / 100`,
      threshold: `${LAYOUT_THRESHOLDS.MIN_DETECTOR_SCORE_PARTIAL} - ${LAYOUT_THRESHOLDS.MIN_DETECTOR_SCORE_RELIABLE}`,
      observation: 'Some document edges were identified, but one or more borders contact the frame perimeter or exhibit low contrast.',
      explanation: 'Tight cropping or background color similarity impedes full four-corner localization.',
      importance: 'Limits perspective verification accuracy on unverified edges.',
      recommendation: 'Review the boundary overlay in the ingestion viewer.',
      limitations: 'Partial boundary detection is common in mobile camera captures.'
    })
  } else {
    findings.push({
      id: 'lay-bound-uncertain',
      title: 'Boundary Detection Inconclusive',
      category: 'boundary',
      severity: 'info',
      metricName: 'Boundary Detector Score',
      measuredValue: `${detectorScore} / 100`,
      threshold: `< ${LAYOUT_THRESHOLDS.MIN_DETECTOR_SCORE_PARTIAL}`,
      observation: 'No distinct four-corner quadrilateral could be localized reliably in this image raster.',
      explanation: 'The image may be a borderless digital scan, cropped full-bleed, or captured on a visually matching surface.',
      importance: 'Perspective metrics and layout containment checks cannot be computed automatically.',
      recommendation: 'Manual visual inspection recommended if framing or perspective verification is required.',
      limitations: 'Absence of detectable borders does not constitute evidence of document tampering.'
    })
  }

  // 2. Perspective & Skew Findings
  if (perspective) {
    if (perspective.isSeverePerspective) {
      findings.push({
        id: 'lay-persp-skew',
        title: 'Perspective Distortion Detected',
        category: 'perspective',
        severity: 'low',
        metricName: 'Apparent Keystone Ratio',
        measuredValue: `${perspective.apparentKeystoneRatio}`,
        threshold: `≥ ${LAYOUT_THRESHOLDS.KEYSTONE_WARN_RATIO}`,
        observation: perspective.observation,
        explanation: 'Opposite edges converge significantly, indicating the camera sensor was angled relative to the document plane during capture.',
        importance: 'Severe perspective keystoning can distort character glyphs and reduce OCR transcription fidelity.',
        recommendation: 'Confirm that OCR field transcription remains accurate across all lines.',
        limitations: 'Perspective distortion is standard in handheld camera captures and does not imply forgery.'
      })
    } else {
      findings.push({
        id: 'lay-persp-ok',
        title: 'Planar Orthogonality Preserved',
        category: 'perspective',
        severity: 'info',
        metricName: 'Keystone Ratio',
        measuredValue: `${perspective.apparentKeystoneRatio}`,
        threshold: `≥ ${LAYOUT_THRESHOLDS.KEYSTONE_WARN_RATIO}`,
        observation: 'Document exhibits minimal perspective convergence; corner angles are near 90° orthogonal.',
        explanation: 'The optical capture axis appears aligned perpendicular to the credential surface.',
        importance: 'Ensures optimal character aspect ratio for optical recognition engines.',
        recommendation: 'No perspective adjustment required.',
        limitations: 'Planar alignment does not prove the document is authentic.'
      })
    }

    if (perspective.isRotated) {
      findings.push({
        id: 'lay-rot-notice',
        title: 'Document Rotation Detected',
        category: 'perspective',
        severity: 'info',
        metricName: 'In-Plane Rotation Angle',
        measuredValue: `${perspective.rotationAngleDeg}°`,
        threshold: `±${LAYOUT_THRESHOLDS.ROTATION_WARN_DEG}°`,
        observation: `Document is oriented at an angle of ${perspective.rotationAngleDeg}° relative to the horizontal frame axis.`,
        explanation: 'The physical credential was tilted during scanning or photography.',
        importance: 'Rotation angle is distinct from perspective distortion; characters retain proportional glyph geometry.',
        recommendation: 'Ensure all textual fields were successfully ingested by the OCR model.',
        limitations: 'Document tilt is an ordinary capture characteristic and carries no fraud significance.'
      })
    }
  }

  // 3. Framing & Margin Findings
  if (framing) {
    if (framing.status === 'partially-cropped') {
      findings.push({
        id: 'lay-frame-crop',
        title: 'Document Perimeter Close to Frame Border',
        category: 'framing',
        severity: 'low',
        metricName: 'Minimum Border Margin',
        measuredValue: `${framing.minMarginPx} px`,
        threshold: `> 2 px`,
        observation: framing.assessmentNote,
        explanation: 'The document boundary intersects or directly borders the edge of the image raster.',
        importance: 'Security features located on document margins (such as microtext, serial numbers, or guilloche borders) may be truncated.',
        recommendation: 'Verify whether all essential card edges and marginal security markings are visible.',
        limitations: 'Border contact indicates image crop; it does not indicate physical document damage.'
      })
    } else if (framing.status === 'excessive-background') {
      findings.push({
        id: 'lay-frame-bg',
        title: 'High Background Ratio',
        category: 'framing',
        severity: 'info',
        metricName: 'Document Area Coverage',
        measuredValue: `${framing.areaCoveragePercent}%`,
        threshold: `≥ 35%`,
        observation: framing.assessmentNote,
        explanation: 'The document occupies a relatively small portion of the capture frame.',
        importance: 'Effective pixel resolution on credential details is reduced compared to full image capacity.',
        recommendation: 'Consider a closer capture if fine microprint verification is required.',
        limitations: 'Surrounding background is normal in flatbed scans or desktop captures.'
      })
    }
  }

  // 4. Layout Quality & OCR Text Containment Findings
  if (layoutQuality && (layoutQuality.performed || layoutQuality.status !== 'not-assessable')) {
    if (layoutQuality.status === 'uncertain-boundary') {
      findings.push({
        id: 'lay-text-uncertain',
        title: 'Document Boundary Uncertain',
        category: 'layout',
        severity: 'info',
        metricName: 'Boundary Reliability',
        measuredValue: 'Uncertain Boundary',
        threshold: 'N/A',
        observation: layoutQuality.layoutAssessmentNote,
        explanation: 'Document boundary could not be localized with high geometric confidence, so spatial text containment is not reliably assessable.',
        importance: 'Prevents false containment conclusions on weakly delineated documents.',
        recommendation: 'Evaluate document visually or recapture on a contrasting background.',
        limitations: 'Spatial containment relies on accurate credential perimeter delineation.'
      })
    } else if (layoutQuality.status === 'no-text-regions' || layoutQuality.totalTextRegions === 0) {
      findings.push({
        id: 'lay-text-none',
        title: 'No OCR Text Regions for Spatial Containment',
        category: 'layout',
        severity: 'info',
        metricName: 'Text Containment Ratio',
        measuredValue: 'N/A (0/0)',
        threshold: 'N/A',
        observation: layoutQuality.layoutAssessmentNote,
        explanation: 'No OCR text regions were available to test against the estimated document perimeter.',
        importance: 'Spatial containment metric is only evaluated when OCR detects bounding boxes.',
        recommendation: 'Run OCR on documents containing legible typography to assess text containment.',
        limitations: 'Document may contain non-standard fonts, low contrast text, or graphical content only.'
      })
    } else if (layoutQuality.status === 'missing-bboxes') {
      findings.push({
        id: 'lay-text-nobbox',
        title: 'OCR Text Lacks Bounding Boxes',
        category: 'layout',
        severity: 'info',
        metricName: 'Text Containment Ratio',
        measuredValue: 'N/A',
        threshold: 'N/A',
        observation: layoutQuality.layoutAssessmentNote,
        explanation: 'OCR text was provided without spatial bounding boxes.',
        importance: 'Spatial containment requires bounding coordinates for each text line/word.',
        recommendation: 'Ensure OCR extraction returns spatial bounding boxes.',
        limitations: 'Containment analysis cannot proceed without coordinate data.'
      })
    } else if (!layoutQuality.isLayoutConsistent && layoutQuality.regionsOutsideBoundary > 0) {
      const containmentPct = layoutQuality.containmentRatio !== null ? `${Math.round(layoutQuality.containmentRatio * 100)}%` : 'N/A'
      findings.push({
        id: 'lay-text-outside',
        title: 'Text Detected Outside Estimated Boundary',
        category: 'layout',
        severity: 'low',
        metricName: 'Text Containment Ratio',
        measuredValue: containmentPct,
        threshold: `≥ ${Math.round(LAYOUT_THRESHOLDS.MIN_TEXT_CONTAINMENT_RATIO * 100)}%`,
        observation: layoutQuality.layoutAssessmentNote,
        explanation: `${layoutQuality.regionsOutsideBoundary} OCR text region(s) fall outside the computed document boundary.`,
        importance: 'Could indicate external background text, document holder markings, or slight boundary detector clipping.',
        recommendation: 'Inspect the document boundary overlay to verify whether the boundary or text regions are misaligned.',
        limitations: 'Bounding box containment is heuristic; OCR boxes may overlap margin borders.'
      })
    } else if (layoutQuality.totalTextRegions > 0 && layoutQuality.containmentRatio !== null) {
      findings.push({
        id: 'lay-text-contained',
        title: 'OCR Text Ingestion Contained',
        category: 'layout',
        severity: 'info',
        metricName: 'Text Containment Ratio',
        measuredValue: `${Math.round(layoutQuality.containmentRatio * 100)}% (${layoutQuality.regionsInsideBoundary}/${layoutQuality.totalTextRegions})`,
        threshold: `≥ ${Math.round(LAYOUT_THRESHOLDS.MIN_TEXT_CONTAINMENT_RATIO * 100)}%`,
        observation: layoutQuality.layoutAssessmentNote,
        explanation: 'All detected text clusters reside securely within the estimated credential perimeter.',
        importance: 'Confirms that extracted text belongs to the primary document substrate rather than external artifacts.',
        recommendation: 'No layout remediation required.',
        limitations: 'Containment does not certify authenticity of the underlying text content.'
      })
    }
  }

  return findings
}

/**
 * Top-level service function for Document Boundary & Layout Analysis
 */
export async function performDocumentLayoutAnalysis(
  options: PerformDocumentLayoutOptions
): Promise<DocumentLayoutResult> {
  const { file, previewUrl, sourceCanvas, textRegions, onProgress } = options

  try {
    let imgElement: HTMLImageElement

    if (sourceCanvas) {
      imgElement = new Image()
      imgElement.src = sourceCanvas.toDataURL('image/png')
      await new Promise<void>((resolve) => {
        imgElement.onload = () => resolve()
      })
    } else {
      imgElement = await loadImageElement(file, previewUrl)
    }

    return await analyzeDocumentBoundary(imgElement, textRegions, onProgress)
  } catch (err: any) {
    console.warn('FALCON Document Layout Analysis Warning:', err)
    return createEmptyLayoutResult(
      'error',
      'Analysis Failed',
      0,
      err?.message || 'An unexpected error occurred during document boundary analysis.'
    )
  }
}
