/**
 * Utility to export SavedCaseRecord objects (from IndexedDB) as JSON and Text files.
 * Guarantees that exported files match the existing privacy rules and do NOT include
 * unstored data or unmasked PII.
 */

import type { SavedCaseRecord } from '../types/caseRecord'
import { PROJECT_BRANDING } from '../constants/branding'
import { downloadReportFile } from './reportExport'

export function generateSavedCaseJson(record: SavedCaseRecord): string {
  const exportPayload = {
    schemaVersion: record.schemaVersion,
    dossierReference: record.id,
    exportTimestamp: new Date().toISOString(),
    recordSavedAt: record.savedAt,
    system: {
      platform: PROJECT_BRANDING.projectName,
      branding: PROJECT_BRANDING.systemTagline,
      developerAttribution: record.developerAttribution,
      stationIdentifier: record.stationId || 'STANDALONE_TERMINAL'
    },
    privacyControls: {
      isPersistentArchivedRecord: true,
      rawOcrTextIncluded: false,
      rawOcrTextNote: 'Raw OCR buffer excluded from persistent storage by client-side privacy protocol.',
      candidateFieldsMasked: true,
      originalImageStored: false,
      originalImageNote: 'Original document pixel raster is strictly ephemeral and never retained in persistent storage.'
    },
    documentIntake: {
      categorySelected: record.documentCategory,
      detectedClassification: record.detectedDocumentType || 'Unclassified',
      format: record.fileFormat,
      fileSize: record.fileSizeFormatted,
      fileSizeBytes: record.fileSizeBytes,
      dimensions: `${record.dimensions.width} × ${record.dimensions.height} px`,
      aspectRatio: `${record.aspectRatio}:1`
    },
    ocrExtraction: {
      status: record.ocrStatus,
      confidence: record.ocrConfidence !== undefined ? `${record.ocrConfidence}%` : 'N/A',
      candidateFields: record.candidateFields.map((f) => ({
        label: f.label,
        category: f.category,
        maskedValue: f.value,
        ruleApplied: f.patternMatched
      }))
    },
    imageQuality: record.quality,
    metadataInspection: record.metadata,
    errorLevelAnalysis: record.ela,
    boundaryAndLayout: {
      statusLabel: record.boundaryStatus,
      detectorScore: `${record.detectorScore} / 100`,
      geometry: record.geometry,
      perspective: record.perspective,
      framing: record.framing,
      layoutQuality: record.layoutQuality,
      findings: record.layoutFindings
    },
    explainableFindings: record.integrityFindings,
    preliminaryAssessment: record.assessment,
    evaluationDisclaimer: [
      'Preliminary heuristic assessment generated in-browser.',
      'Does NOT establish document authenticity or legal validity.',
      'No external government registry queries performed.'
    ]
  }

  return JSON.stringify(exportPayload, null, 2)
}

export function generateSavedCaseText(record: SavedCaseRecord): string {
  const lines: string[] = []
  const separator = '='.repeat(80)
  const subSeparator = '-'.repeat(80)

  lines.push(separator)
  lines.push(`               ${PROJECT_BRANDING.projectName} // ARCHIVED SCREENING DOSSIER`)
  lines.push(`                    ${PROJECT_BRANDING.systemTagline}`)
  lines.push(separator)
  lines.push(`Dossier Reference : ${record.id}`)
  lines.push(`Recorded Date     : ${record.savedAt}`)
  lines.push(`Station ID        : ${record.stationId || 'STANDALONE_CLIENT'}`)
  lines.push(`Developer Credit  : ${record.developerAttribution}`)
  lines.push(`Storage Type      : Local Client-Side IndexedDB (Schema v${record.schemaVersion})`)
  lines.push(separator)
  lines.push('')

  lines.push(subSeparator)
  lines.push(' 1. INTAKE SPECIFICATION')
  lines.push(subSeparator)
  lines.push(`Document Category : ${record.documentCategory}`)
  lines.push(`Detected Standard : ${record.detectedDocumentType || 'Unclassified'}`)
  lines.push(`File Format       : ${record.fileFormat}`)
  lines.push(`Raster Dimensions : ${record.dimensions.width} × ${record.dimensions.height} px (${record.aspectRatio}:1)`)
  lines.push(`Storage Footprint : ${record.fileSizeFormatted}`)
  lines.push('')

  lines.push(subSeparator)
  lines.push(' 2. OCR EXTRACTION & MASKED CANDIDATE FIELDS')
  lines.push(subSeparator)
  lines.push(`OCR Engine Status : ${record.ocrStatus.toUpperCase()}`)
  lines.push(`Confidence Score  : ${record.ocrConfidence !== undefined ? `${record.ocrConfidence}%` : 'N/A'}`)
  lines.push('Candidate Fields  :')
  if (record.candidateFields.length === 0) {
    lines.push('  [No candidate structured fields identified]')
  } else {
    for (const f of record.candidateFields) {
      lines.push(`  - ${f.label.padEnd(24)}: ${f.value} [Rule: ${f.patternMatched}]`)
    }
  }
  lines.push('')

  lines.push(subSeparator)
  lines.push(' 3. IMAGE QUALITY & PHYSICAL RASTER FINDINGS')
  lines.push(subSeparator)
  lines.push(`Resolution Check  : ${record.quality.width} × ${record.quality.height} px ${record.quality.isLowResolution ? '(Sub-optimal)' : '(Adequate)'}`)
  lines.push(`Luminance (Mean)  : ${record.quality.meanLuminance} / 255 ${record.quality.isExtremeLuminance ? '(Extreme)' : '(Balanced)'}`)
  lines.push(`RMS Contrast      : ${record.quality.contrastStdDev} ${record.quality.isLowContrast ? '(Compressed)' : '(Good separation)'}`)
  lines.push(`Sharpness Score   : ${record.quality.blurScore} variance ${record.quality.isPotentialBlur ? '(Potential blur)' : '(Sharp)'}`)
  lines.push('')

  lines.push(subSeparator)
  lines.push(' 4. METADATA CONTAINER & COMPRESSION FORENSICS')
  lines.push(subSeparator)
  lines.push(`Metadata Status   : ${record.metadata.containerStatusLabel}`)
  lines.push(`EXIF Headers      : ${record.metadata.exifStatusLabel}`)
  lines.push(`Software Signature: ${record.metadata.softwareStatusLabel}`)
  lines.push(`Capture Device    : ${record.metadata.cameraStatusLabel}`)
  lines.push(`ELA Analysis      : ${record.ela.supported ? `${Math.round(record.ela.variance * 100)}% high variance (Mean: ${record.ela.meanError})` : 'Skipped (Non-JPEG)'}`)
  lines.push('')

  lines.push(subSeparator)
  lines.push(' 5. BOUNDARY & PERSPECTIVE ASSESSMENT')
  lines.push(subSeparator)
  lines.push(`Boundary Status   : ${record.boundaryStatus} (Score: ${record.detectorScore}/100)`)
  if (record.geometry) {
    lines.push(`Quad Dimensions   : ${record.geometry.averageWidth} × ${record.geometry.averageHeight} px`)
    lines.push(`Frame Coverage    : ${Math.round(record.geometry.areaCoverageRatio * 100)}% of raster`)
  }
  if (record.perspective) {
    lines.push(`Perspective Tilt  : ${record.perspective.rotationAngleDeg}°`)
    lines.push(`Keystone Ratio    : ${record.perspective.apparentKeystoneRatio}`)
  }
  lines.push(`Text Containment  : ${record.layoutQuality.containmentFormatted}`)
  lines.push('')

  lines.push(subSeparator)
  lines.push(' 6. PRELIMINARY TRIAGE ASSESSMENT')
  lines.push(subSeparator)
  lines.push(`Review Priority   : ${record.assessment.priorityLabel.toUpperCase()}`)
  lines.push(`Executive Summary : ${record.assessment.summary}`)
  lines.push(`Recommended Action: ${record.assessment.recommendedAction}`)
  lines.push('')

  lines.push(subSeparator)
  lines.push(' 7. PRIVACY SAFEGUARDS & DISCLOSURES')
  lines.push(subSeparator)
  lines.push('1. Client-Side Sandbox: Extracted and archived strictly within browser IndexedDB.')
  lines.push('2. Zero Server Transmission: No document pixels or PII uploaded to remote APIs.')
  lines.push('3. No Proof of Authenticity: Client-side triage cues only. Not a government certificate.')
  lines.push(separator)
  lines.push(`                 ${PROJECT_BRANDING.projectDeveloperCredit}`)
  lines.push(separator)
  lines.push('                       END OF ARCHIVED DOSSIER')
  lines.push(separator)

  return lines.join('\n')
}

export function exportSavedCaseJson(record: SavedCaseRecord): void {
  const content = generateSavedCaseJson(record)
  const filename = `FALCON-Archived-${record.id}-${Date.now()}.json`
  downloadReportFile(content, filename, 'application/json')
}

export function exportSavedCaseText(record: SavedCaseRecord): void {
  const content = generateSavedCaseText(record)
  const filename = `FALCON-Archived-${record.id}-${Date.now()}.txt`
  downloadReportFile(content, filename, 'text/plain')
}

export function exportConsolidatedAuditLedger(records: SavedCaseRecord[]): void {
  const now = new Date()
  const dateStr = now.toISOString().split('T')[0]

  const ledgerPayload = {
    archiveTitle: 'FALCON-404 Consolidated Client-Side Audit Ledger',
    generatedAt: now.toISOString(),
    exportDate: dateStr,
    developerAttribution: PROJECT_BRANDING.developerAttribution,
    disclaimer:
      'This ledger contains preliminary, client-side screening records stored locally on this workstation profile. It is NOT an official government registry record.',
    totalCases: records.length,
    statistics: {
      byDocumentCategory: records.reduce((acc, r) => {
        acc[r.documentCategory] = (acc[r.documentCategory] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      byPriority: records.reduce((acc, r) => {
        acc[r.assessment.priorityLabel] = (acc[r.assessment.priorityLabel] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    },
    records: records.map((r) => ({
      caseReference: r.id,
      timestamp: r.savedAt,
      documentCategory: r.documentCategory,
      detectedFormat: r.fileFormat,
      dimensions: `${r.dimensions.width}×${r.dimensions.height}`,
      ocrStatus: r.ocrStatus,
      ocrConfidence: r.ocrConfidence,
      priority: r.assessment.priorityLabel,
      summary: r.assessment.summary,
      maskedFieldsCount: r.candidateFields.length,
      stationId: r.stationId || 'UNASSIGNED'
    }))
  }

  const content = JSON.stringify(ledgerPayload, null, 2)
  const filename = `FALCON-Audit-Ledger-${dateStr}.json`
  downloadReportFile(content, filename, 'application/json')
}
