/**
 * Report Export Utility for FALCON-404 Phase 4.
 * Generates downloadable screening summaries in JSON and Text formats directly in the browser.
 * Respects privacy controls: excludes raw OCR text by default.
 */

import type { ScreeningReportData } from '../types'
import { PROJECT_BRANDING } from '../constants/branding'

/**
 * Safely anonymizes a candidate person's name for export.
 *
 * Rules:
 * 1. A candidate name is considered safely anonymized ONLY if every individual
 *    word token contains at least 3 alphabetic characters (e.g. "Jane" -> "J***", "Doe" -> "D**").
 * 2. If any token consists of single-letter initials or short abbreviations (e.g. "N", "L", "J",
 *    "N L J", "A. B.", "J Doe"), retaining the initial leaves 50%-100% of the token exposed.
 *    In these cases, safe anonymization cannot be reliably established -> returns "[REDACTED]".
 * 3. The resulting string must genuinely obscure the name and strictly not equal the original.
 */
export function maskCandidateName(nameVal: string): string {
  const trimmed = nameVal.trim()
  if (!trimmed) return '[REDACTED]'

  const tokens = trimmed.split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return '[REDACTED]'

  // If any token has fewer than 3 letters (e.g. initials "N", "L", "J", "A.", or 1-2 char fragments),
  // preserving the initial fails to achieve reliable anonymization.
  const hasUnsafeToken = tokens.some((token) => {
    const letters = token.replace(/[^A-Za-z]/g, '')
    return letters.length < 3
  })

  if (hasUnsafeToken) {
    return '[REDACTED]'
  }

  // Anonymize standard multi-letter tokens (length >= 3)
  const maskedTokens = tokens.map((part) => {
    const firstChar = part[0]
    const asteriskCount = Math.min(part.length - 1, 5)
    return firstChar + '*'.repeat(asteriskCount)
  })

  const result = maskedTokens.join(' ')

  // Verification sanity check: must contain asterisks and not match the original
  if (result === trimmed || !result.includes('*')) {
    return '[REDACTED]'
  }

  return result
}

/**
 * Masks identifiable candidate fields for privacy by default.
 * - Names: Reliably anonymized with asterisks if all tokens >= 3 chars, otherwise [REDACTED].
 * - Identifiers: Masks leading/middle characters, showing at most last 4 characters/digits (e.g. "•••• •••• 1098" or "••••••234F")
 * - Dates of Birth: Fully masked across day, month, and year (e.g. "••/••/••••")
 * - MRZ: Masks document numbers and checksums (e.g. "P<IND••••••••••••••••••••••••••••")
 * - Document types: Kept as-is (non-PII)
 */
export function maskCandidateFieldValue(field: { category: string; value: string }): string {
  const val = field.value.trim()
  if (!val) return val

  switch (field.category) {
    case 'identifier': {
      // If it looks like Aadhaar (12 digits with spaces or no spaces)
      if (/^\d{4}\s\d{4}\s\d{4}$/.test(val)) {
        return '•••• •••• ' + val.slice(-4)
      }
      const alphanumeric = val.replace(/\s+/g, '')
      if (alphanumeric.length <= 4) {
        return '••••'
      }
      // General alphanumeric ID (PAN, Passport, DL)
      const last4 = val.slice(-4)
      const maskedPart = '•'.repeat(Math.min(val.length - 4, 8))
      return `${maskedPart}${last4}`
    }
    case 'name': {
      if (val === 'Name not confidently detected') {
        return val
      }
      return maskCandidateName(val)
    }
    case 'date': {
      // Mask the entire candidate date of birth (day, month, AND year) to protect personal privacy
      return '••/••/••••'
    }
    case 'mrz': {
      if (val.length > 10) {
        return val.slice(0, 5) + '•'.repeat(val.length - 8) + val.slice(-3)
      }
      return '••••••••••'
    }
    case 'document-type': {
      return val
    }
    default:
      return '[REDACTED]'
  }
}

/**
 * Generates a structured JSON string of the screening report.
 */
export function generateScreeningReportJson(report: ScreeningReportData): string {
  const exportPayload = {
    reportMetadata: {
      reportId: report.reportId,
      projectName: PROJECT_BRANDING.projectName,
      developer: PROJECT_BRANDING.developerName,
      systemName: PROJECT_BRANDING.projectFullName,
      phase: 'Phase 5: Document Boundary, Perspective & Layout Assessment',
      generatedAt: report.generatedAt,
      engineVersion: PROJECT_BRANDING.version
    },
    documentIntake: {
      fileName: report.documentName,
      intakeCategorySelected: report.selectedDocumentType,
      detectedDocumentType: report.detectedDocumentType || 'Not detected from OCR keywords',
      fileProperties: report.integrityResult.fileProperties
    },
    opticalCharacterRecognition: {
      status: report.ocrStatus,
      confidenceScore: report.ocrConfidence !== undefined ? `${report.ocrConfidence}%` : 'N/A',
      confidenceDefinition: 'Glyph character recognition clarity (0-100%). Not a fraud probability.',
      candidateFieldsCount: report.ocrResult?.candidateFields.length || 0,
      privacyPolicy: {
        identifiableFieldsMaskedByDefault: true,
        includeIdentifiableFieldsOptIn: report.privacySettings.includeIdentifiableFields,
        rawOcrTextOptIn: report.privacySettings.includeFullOCR
      },
      candidateFields: report.ocrResult?.candidateFields.map((f) => {
        const isIdentifiableCategory = f.category !== 'document-type'
        const shouldMask = !report.privacySettings.includeIdentifiableFields && isIdentifiableCategory
        const processedValue = shouldMask ? maskCandidateFieldValue(f) : f.value
        const isActuallyMasked = shouldMask && processedValue !== f.value

        return {
          category: f.category,
          label: f.label,
          value: processedValue,
          masked: isActuallyMasked,
          patternMatched: f.patternMatched,
          confidenceTier: f.confidenceTier,
          contextNote: f.contextNote
        }
      }),
      rawOcrText: report.privacySettings.includeFullOCR
        ? report.ocrResult?.rawText || '[No OCR text extracted]'
        : '[Redacted by default for privacy. Enable full OCR export in settings to include]'
    },
    imageQualityMetrics: {
      dimensions: `${report.integrityResult.quality.width} × ${report.integrityResult.quality.height} px`,
      aspectRatio: `${report.integrityResult.quality.aspectRatio} (${report.integrityResult.quality.aspectRatioLabel})`,
      physicalBoundaryFramingNote: report.integrityResult.quality.physicalRatioNote,
      meanLuminance: `${report.integrityResult.quality.meanLuminance} / 255`,
      contrastStdDev: report.integrityResult.quality.contrastStdDev,
      laplacianBlurVariance: report.integrityResult.quality.blurScore,
      qualityFlags: {
        lowResolution: report.integrityResult.quality.isLowResolution,
        extremeLuminance: report.integrityResult.quality.isExtremeLuminance,
        lowContrast: report.integrityResult.quality.isLowContrast,
        potentialBlur: report.integrityResult.quality.isPotentialBlur
      }
    },
    metadataAudit: {
      status: report.integrityResult.metadata.status,
      format: report.integrityResult.metadata.format,
      containerStatus: report.integrityResult.metadata.containerStatusLabel,
      exifStatus: report.integrityResult.metadata.exifStatusLabel,
      cameraHardware: report.integrityResult.metadata.cameraStatusLabel,
      softwareSignature: report.integrityResult.metadata.softwareStatusLabel,
      timestampStatus: report.integrityResult.metadata.timestampStatusLabel,
      softwareDetected: report.integrityResult.metadata.softwareDetected || 'None detected',
      cameraMakeModel: report.integrityResult.metadata.cameraMakeModel || 'None detected',
      creationTimestamp: report.integrityResult.metadata.creationTimestamp || 'None detected',
      auditNote: report.integrityResult.metadata.note
    },
    errorLevelAnalysis: {
      performed: report.integrityResult.ela.performed,
      supported: report.integrityResult.ela.supported,
      recompressionQuality: `${report.integrityResult.ela.recompressionQuality * 100}%`,
      meanErrorLevel: report.integrityResult.ela.meanError,
      maxErrorLevel: report.integrityResult.ela.maxError,
      highVarianceAreaRatio: `${Math.round(report.integrityResult.ela.variance * 100)}%`,
      assessmentNote: report.integrityResult.ela.assessmentNote
    },
    documentBoundaryAndLayout: report.layoutResult
      ? {
          status: report.layoutResult.status,
          statusLabel: report.layoutResult.statusLabel,
          detectorScore: `${report.layoutResult.detectorScore} / 100`,
          scoreDefinition: report.layoutResult.scoreDefinition,
          geometry: report.layoutResult.geometry
            ? {
                dimensions: `${report.layoutResult.geometry.averageWidth} × ${report.layoutResult.geometry.averageHeight} px`,
                aspectRatio: `${report.layoutResult.geometry.quadAspectRatio}:1`,
                areaPixels: report.layoutResult.geometry.quadAreaPixels,
                areaCoverage: `${Math.round(report.layoutResult.geometry.areaCoverageRatio * 100)}% of frame`,
                corners: report.layoutResult.geometry.corners,
                normalizedCorners: report.layoutResult.geometry.normalizedCorners
              }
            : 'Boundary coordinates unavailable',
          perspective: report.layoutResult.perspective
            ? {
                rotationAngleDeg: `${report.layoutResult.perspective.rotationAngleDeg}°`,
                apparentKeystoneRatio: report.layoutResult.perspective.apparentKeystoneRatio,
                horizontalSkewRatio: report.layoutResult.perspective.horizontalSkewRatio,
                verticalSkewRatio: report.layoutResult.perspective.verticalSkewRatio,
                isSeverePerspective: report.layoutResult.perspective.isSeverePerspective,
                isRotated: report.layoutResult.perspective.isRotated,
                cornerAnglesDeg: report.layoutResult.perspective.cornerAnglesDeg,
                observation: report.layoutResult.perspective.observation
              }
            : 'Perspective metrics unavailable',
          framing: {
            status: report.layoutResult.framing.status,
            statusLabel: report.layoutResult.framing.statusLabel,
            minMarginPx: `${report.layoutResult.framing.minMarginPx} px`,
            marginsPx: report.layoutResult.framing.marginsPx,
            areaCoveragePercent: `${report.layoutResult.framing.areaCoveragePercent}%`,
            assessmentNote: report.layoutResult.framing.assessmentNote
          },
          layoutQuality: {
            status: report.layoutResult.layoutQuality.status,
            statusLabel: report.layoutResult.layoutQuality.statusLabel,
            performed: report.layoutResult.layoutQuality.performed,
            totalTextRegions: report.layoutResult.layoutQuality.totalTextRegions,
            regionsInsideBoundary: report.layoutResult.layoutQuality.regionsInsideBoundary,
            regionsOutsideBoundary: report.layoutResult.layoutQuality.regionsOutsideBoundary,
            containmentRatio: report.layoutResult.layoutQuality.containmentRatio !== null
              ? `${Math.round(report.layoutResult.layoutQuality.containmentRatio * 100)}%`
              : null,
            containmentFormatted: report.layoutResult.layoutQuality.containmentFormatted,
            isLayoutConsistent: report.layoutResult.layoutQuality.isLayoutConsistent,
            isBoundaryReliable: report.layoutResult.layoutQuality.isBoundaryReliable,
            assessmentNote: report.layoutResult.layoutQuality.layoutAssessmentNote
          },
          findings: report.layoutResult.findings
        }
      : {
          status: 'skipped',
          statusLabel: 'Not Executed',
          note: 'Document boundary and layout analysis was not executed for this dossier.'
        },
    explainableFindings: report.integrityResult.findings.map((f) => ({
      id: f.id,
      title: f.title,
      category: f.category,
      severity: f.severity,
      metricName: f.metricName,
      measuredValue: f.measuredValue,
      threshold: f.threshold || 'N/A',
      observation: f.observation,
      explanation: f.explanation,
      importance: f.importance,
      recommendation: f.recommendation,
      limitations: f.limitations || 'None noted'
    })),
    preliminaryAssessment: {
      priority: report.integrityResult.assessment.priority,
      priorityLabel: report.integrityResult.assessment.priorityLabel,
      summary: report.integrityResult.assessment.summary,
      recommendedAction: report.integrityResult.assessment.recommendedAction,
      disclaimer: report.integrityResult.assessment.disclaimer
    },
    institutionalDisclaimers: [
      'This report is generated from client-side automated heuristics executed in the examiner browser runtime.',
      'OCR extracts text glyphs and does not authenticate citizenship, identity records, or document issuance.',
      'Image quality metrics and Error Level Analysis (ELA) indicate potential compression anomalies and do NOT prove or disprove fraud.',
      'Missing camera metadata or EXIF headers is common across digital scans and message apps; it does not indicate fraud.',
      'Document boundary detection and perspective analysis are computer-vision heuristics and do not certify physical edge integrity.',
      'No external government registry lookups or live biometric 1:1 face verifications were performed.'
    ]
  }

  return JSON.stringify(exportPayload, null, 2)
}

/**
 * Generates an institutional ASCII/text formatted screening dossier.
 */
export function generateScreeningReportText(report: ScreeningReportData): string {
  const dateStr = report.generatedAt
  const quality = report.integrityResult.quality
  const metadata = report.integrityResult.metadata
  const ela = report.integrityResult.ela
  const assessment = report.integrityResult.assessment

  const lines: string[] = [
    '================================================================================',
    '                   FALCON-404 DOCUMENT SCREENING DOSSIER',
    '       Client-Side Ingestion, OCR & Image Integrity Preliminary Report',
    `                   ${PROJECT_BRANDING.projectDeveloperCredit}`,
    '================================================================================',
    `Report ID        : ${report.reportId}`,
    `Project          : ${PROJECT_BRANDING.projectName}`,
    `Developed By     : ${PROJECT_BRANDING.developerName}`,
    `Generated At     : ${dateStr}`,
    `Document File    : ${report.documentName}`,
    `File Size        : ${report.integrityResult.fileProperties.fileSizeFormatted}`,
    `Detected Format  : ${report.integrityResult.fileProperties.detectedFormat} (${report.integrityResult.fileProperties.mimeType})`,
    `Raster Size      : ${quality.width} × ${quality.height} px (${quality.aspectRatioLabel})`,
    `Framing Note     : ${quality.physicalRatioNote}`,
    `Intake Category  : ${report.selectedDocumentType}`,
    `Detected Type    : ${report.detectedDocumentType || 'Unclassified by text keywords'}`,
    '',
    '--------------------------------------------------------------------------------',
    ' 1. PRELIMINARY ASSESSMENT & TRIAGE',
    '--------------------------------------------------------------------------------',
    `Review Priority  : [ ${assessment.priorityLabel.toUpperCase()} ]`,
    `Summary          : ${assessment.summary}`,
    `Action Required  : ${assessment.recommendedAction}`,
    `Evaluation Scope : Automated browser heuristics. Not a legal certificate of authenticity.`,
    '',
    '--------------------------------------------------------------------------------',
    ' 2. OPTICAL CHARACTER RECOGNITION (STAGE 02)',
    '--------------------------------------------------------------------------------',
    `OCR Engine Status: ${report.ocrStatus.toUpperCase()}`,
    `OCR Confidence   : ${report.ocrConfidence !== undefined ? `${report.ocrConfidence}%` : 'N/A'} (glyph clarity, not fraud probability)`,
    `Extracted Lines  : ${report.ocrResult?.lines.length || 0} text lines detected`,
    `Candidate Fields : ${report.ocrResult?.candidateFields.length || 0} pattern-matched fields`,
    `Privacy Setting  : Identifiable fields ${report.privacySettings.includeIdentifiableFields ? 'UNMASKED (opted-in)' : 'MASKED (default)'} • Raw OCR ${report.privacySettings.includeFullOCR ? 'INCLUDED' : 'REDACTED'}`,
    ''
  ]

  if (report.ocrResult && report.ocrResult.candidateFields.length > 0) {
    const isMasked = !report.privacySettings.includeIdentifiableFields
    lines.push(`Parsed Candidate Fields (${isMasked ? 'Masked for Data Privacy' : 'Unmasked by User Opt-In'}):`)
    for (const field of report.ocrResult.candidateFields) {
      const displayVal = isMasked ? maskCandidateFieldValue(field) : field.value
      lines.push(`  - [${field.category.toUpperCase()}] ${field.label}: ${displayVal}`)
      lines.push(`    Rule: ${field.patternMatched}`)
    }
    lines.push('')
  }

  if (report.privacySettings.includeFullOCR && report.ocrResult?.rawText) {
    lines.push('Raw Extracted OCR Output:')
    lines.push(report.ocrResult.rawText)
    lines.push('')
  } else {
    lines.push('[Full raw OCR buffer redacted by default for data privacy]')
    lines.push('')
  }

  lines.push(
    '--------------------------------------------------------------------------------',
    ' 3. IMAGE QUALITY & PHYSICAL RASTER METRICS',
    '--------------------------------------------------------------------------------',
    `Dimensions Check : ${quality.width} × ${quality.height} px ${quality.isLowResolution ? '[WARNING: Sub-optimal resolution]' : '[PASS]'}`,
    `Perceived Lum.   : ${quality.meanLuminance} / 255 ${quality.isExtremeLuminance ? '[WARNING: Extreme brightness/shadow]' : '[PASS]'}`,
    `RMS Contrast     : ${quality.contrastStdDev} (StdDev) ${quality.isLowContrast ? '[WARNING: Low dynamic range]' : '[PASS]'}`,
    `Laplacian Blur   : ${quality.blurScore} variance ${quality.isPotentialBlur ? '[WARNING: Potential focus/motion blur]' : '[PASS]'}`,
    ''
  )

  lines.push(
    '--------------------------------------------------------------------------------',
    ' 4. METADATA & CONTAINER AUDIT',
    '--------------------------------------------------------------------------------',
    `Container Status : ${metadata.containerStatusLabel}`,
    `EXIF Header      : ${metadata.exifStatusLabel}`,
    `Software Header  : ${metadata.softwareStatusLabel}`,
    `Capture Hardware : ${metadata.cameraStatusLabel}`,
    `Timestamp Header : ${metadata.timestampStatusLabel}`,
    `Audit Remark     : ${metadata.note}`,
    ''
  )

  lines.push(
    '--------------------------------------------------------------------------------',
    ' 5. ERROR LEVEL ANALYSIS (ELA) & COMPRESSION AUDIT',
    '--------------------------------------------------------------------------------',
    `Check Status     : ${ela.performed ? 'EXECUTED (JPEG 85% Recompression)' : 'SKIPPED (Non-JPEG or Unsupported)'}`,
    `Mean Error Level : ${ela.meanError}`,
    `Max Pixel Error  : ${ela.maxError}`,
    `High Variance %  : ${Math.round(ela.variance * 100)}% of raster area`,
    `Forensic Note    : ${ela.assessmentNote}`,
    ''
  )

  if (report.layoutResult) {
    const lay = report.layoutResult
    lines.push(
      '--------------------------------------------------------------------------------',
      ' 6. DOCUMENT BOUNDARY, PERSPECTIVE & LAYOUT AUDIT (STAGE 04)',
      '--------------------------------------------------------------------------------',
      `Detector Status  : ${lay.statusLabel} [Heuristic Score: ${lay.detectorScore}/100]`,
      `Estimated Bounds : ${lay.geometry ? `${lay.geometry.averageWidth} × ${lay.geometry.averageHeight} px (${lay.geometry.quadAspectRatio}:1 ratio, ${Math.round(lay.geometry.areaCoverageRatio * 100)}% coverage)` : 'Perimeter Uncertain'}`,
      `In-Plane Tilt    : ${lay.perspective ? `${lay.perspective.rotationAngleDeg}° (${lay.perspective.isRotated ? 'Tilt Detected' : 'Level'})` : 'N/A'}`,
      `Perspective Skew : ${lay.perspective ? `Keystone: ${lay.perspective.apparentKeystoneRatio} (Horiz: ${lay.perspective.horizontalSkewRatio}, Vert: ${lay.perspective.verticalSkewRatio})` : 'N/A'}`,
      `Corner Angles    : ${lay.perspective ? `TL: ${lay.perspective.cornerAnglesDeg.topLeft}° | TR: ${lay.perspective.cornerAnglesDeg.topRight}° | BR: ${lay.perspective.cornerAnglesDeg.bottomRight}° | BL: ${lay.perspective.cornerAnglesDeg.bottomLeft}°` : 'N/A'}`,
      `Framing Clearance: ${lay.framing.statusLabel} (Min margin: ${lay.framing.minMarginPx} px, T:${lay.framing.marginsPx.top} R:${lay.framing.marginsPx.right} B:${lay.framing.marginsPx.bottom} L:${lay.framing.marginsPx.left})`,
      `Text Containment : ${
        !lay.layoutQuality.performed || lay.layoutQuality.totalTextRegions === 0
          ? 'N/A (No OCR text regions available for spatial containment analysis)'
          : lay.layoutQuality.status === 'uncertain-boundary'
          ? `N/A (Uncertain boundary - ${lay.layoutQuality.regionsInsideBoundary}/${lay.layoutQuality.totalTextRegions} tentative text regions inside)`
          : lay.layoutQuality.containmentRatio !== null
          ? `${Math.round(lay.layoutQuality.containmentRatio * 100)}% (${lay.layoutQuality.regionsInsideBoundary}/${lay.layoutQuality.totalTextRegions} text boxes inside)`
          : 'N/A'
      }`,
      `Audit Remarks    : ${lay.framing.assessmentNote}`,
      ''
    )
  }

  const allFindings = [
    ...report.integrityResult.findings,
    ...(report.layoutResult?.findings || [])
  ]

  lines.push(
    '--------------------------------------------------------------------------------',
    ` ${report.layoutResult ? '7' : '6'}. EXPLAINABLE SCREENING FINDINGS (${allFindings.length} Total Indicators)`,
    '--------------------------------------------------------------------------------'
  )

  for (let i = 0; i < allFindings.length; i++) {
    const f = allFindings[i]
    lines.push(`[${i + 1}] ${f.title} (${f.severity.toUpperCase()} • ${f.category})`)
    lines.push(`    Metric      : ${f.metricName} = ${f.measuredValue} ${f.threshold ? `(Ref: ${f.threshold})` : ''}`)
    lines.push(`    Observation : ${f.observation}`)
    lines.push(`    Explanation : ${f.explanation}`)
    lines.push(`    Impact      : ${f.importance}`)
    lines.push(`    Action      : ${f.recommendation}`)
    if (f.limitations) {
      lines.push(`    Limitations : ${f.limitations}`)
    }
    lines.push('')
  }

  lines.push(
    '--------------------------------------------------------------------------------',
    ` ${report.layoutResult ? '8' : '7'}. INSTITUTIONAL EVALUATION LIMITATIONS & PRIVACY NOTICE`,
    '--------------------------------------------------------------------------------',
    '1. Client-Side Execution: All evaluations occurred strictly within browser memory.',
    '   No raster images or identity records were transmitted to external servers.',
    '2. No Proof of Authenticity: Automated heuristics evaluate optical clarity and',
    '   compression anomalies. They do NOT certify genuine issuance or detect identity theft.',
    '3. Scheduled Phases: Physical microprint examination, digital copy-move splicing,',
    '   and 1:1 facial biometric matching are staged for subsequent project phases.',
    '4. Boundary & Layout Heuristics: Four-corner boundary estimates and perspective',
    '   calculations are computer-vision approximations and do not guarantee edge integrity.',
    '--------------------------------------------------------------------------------',
    `                 ${PROJECT_BRANDING.projectDeveloperCredit}`,
    '================================================================================',
    '                          END OF SCREENING REPORT',
    '================================================================================'
  )

  return lines.join('\n')
}

/**
 * Triggers in-browser file download for the screening report.
 */
export function downloadReportFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
