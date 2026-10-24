import React, { useState } from 'react'
import {
  FileText,
  Download,
  ShieldAlert,
  Sliders,
  Sparkles,
  Scan,
  Lock,
  Archive,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react'
import type {
  ScreeningReportData,
  ImageIntegrityResult,
  DocumentLayoutResult,
  OCRResult,
  OCRStatus,
  WorkflowScreeningDossier
} from '../../types'
import { Card } from '../common/Card'
import { Badge } from '../common/Badge'
import {
  generateScreeningReportJson,
  generateScreeningReportText,
  downloadReportFile
} from '../../utils/reportExport'
import { PROJECT_BRANDING } from '../../constants/branding'
import { useCases } from '../../context/CaseContext'
import { buildSavedCaseRecord } from '../../services/caseStorageService'

export interface ScreeningReportSectionProps {
  documentName: string
  selectedDocumentType: string
  ocrStatus: OCRStatus
  ocrResult: OCRResult | null
  integrityResult: ImageIntegrityResult | null
  layoutResult?: DocumentLayoutResult | null
  workflowDossier?: WorkflowScreeningDossier | null
  disabled?: boolean
  reportId?: string
  autoSaveStatus?: 'idle' | 'saving' | 'saved' | 'error'
  autoSaveError?: string | null
  onRetryAutoSave?: () => void
}

export const ScreeningReportSection: React.FC<ScreeningReportSectionProps> = ({
  documentName,
  selectedDocumentType,
  ocrStatus,
  ocrResult,
  integrityResult,
  layoutResult,
  workflowDossier,
  disabled = false,
  reportId: passedReportId,
  autoSaveStatus = 'idle',
  autoSaveError = null,
  onRetryAutoSave
}) => {
  const { saveCase, cases, stationId } = useCases()
  const [includeFullOCR, setIncludeFullOCR] = useState(false)
  const [includeIdentifiableFields, setIncludeIdentifiableFields] = useState(false)
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null)
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null)

  // Stable report ID: use passed ID from screening session or fallback to local stable ID
  const [localReportId] = useState(() => `FLC-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString().slice(-4)}`)
  const reportId = passedReportId || localReportId
  const [nowFormatted] = useState(() => new Date().toLocaleString())

  if (!integrityResult) return null

  const isAlreadyArchived =
    cases.some((c) => c.id === reportId) ||
    savingState === 'saved' ||
    autoSaveStatus === 'saved'

  const detectedDocTypeField = ocrResult?.candidateFields.find((f) => f.category === 'document-type')

  const reportData: ScreeningReportData = {
    reportId,
    generatedAt: nowFormatted,
    documentName,
    selectedDocumentType,
    detectedDocumentType: detectedDocTypeField?.value,
    ocrStatus,
    ocrConfidence: ocrResult?.confidence,
    ocrResult: ocrResult || undefined,
    integrityResult,
    layoutResult: layoutResult || undefined,
    privacySettings: {
      includeFullOCR,
      includeIdentifiableFields
    }
  }

  const handleSaveToLedger = async () => {
    if (disabled || isAlreadyArchived || savingState === 'saving') return
    try {
      setSavingState('saving')
      const record = buildSavedCaseRecord(reportData, stationId)
      await saveCase(record)
      setSavingState('saved')
      setSaveFeedback('CASE DOSSIER SAVED TO LOCAL AUDIT LEDGER')
      setTimeout(() => setSaveFeedback(null), 4000)
    } catch (err) {
      console.error('Failed to save case to local IndexedDB ledger:', err)
      setSavingState('idle')
      setSaveFeedback('FAILED TO SAVE CASE')
      setTimeout(() => setSaveFeedback(null), 4000)
    }
  }

  const handleExportJson = () => {
    const jsonStr = generateScreeningReportJson(reportData)
    const filename = `FALCON-Report-${documentName.replace(/[^a-zA-Z0-9_-]/g, '_')}-${Date.now()}.json`
    downloadReportFile(jsonStr, filename, 'application/json')
    setDownloadSuccess('JSON REPORT DOWNLOADED')
    setTimeout(() => setDownloadSuccess(null), 3000)
  }

  const handleExportText = () => {
    const textStr = generateScreeningReportText(reportData)
    const filename = `FALCON-Report-${documentName.replace(/[^a-zA-Z0-9_-]/g, '_')}-${Date.now()}.txt`
    downloadReportFile(textStr, filename, 'text/plain')
    setDownloadSuccess('TEXT DOSSIER DOWNLOADED')
    setTimeout(() => setDownloadSuccess(null), 3000)
  }

  const { quality, metadata, ela, assessment } = integrityResult

  return (
    <Card
      sectionCode="STAGE // 05"
      title="Preliminary Screening Dossier"
      subtitle={`Generated ${nowFormatted} • Dossier Ref: ${reportId} • ${PROJECT_BRANDING.developerAttribution}`}
      action={
        <div className="flex items-center gap-2 font-mono">
          {assessment.priority === 'standard' && (
            <Badge variant="success" size="sm">
              STANDARD TRIAGE
            </Badge>
          )}
          {assessment.priority === 'manual-review' && (
            <Badge variant="warning" size="sm">
              MANUAL REVIEW REQUIRED
            </Badge>
          )}
          {assessment.priority === 'inconclusive' && (
            <Badge variant="neutral" size="sm">
              INCONCLUSIVE
            </Badge>
          )}
        </div>
      }
    >
      <div className="space-y-6 font-sans">
        {/* SECTION A: INTAKE OVERVIEW */}
        <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-3 font-mono">
          <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              SECTION A // INTAKE SPECIFICATIONS
            </span>
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">{integrityResult.fileProperties.fileName}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 block">STANDARD SELECTED</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">{selectedDocumentType}</span>
            </div>
            <div>
              <span className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 block">OCR CLASSIFICATION</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {detectedDocTypeField ? detectedDocTypeField.value : 'UNCLASSIFIED'}
              </span>
            </div>
            <div>
              <span className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 block">OCR STATUS</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {ocrStatus === 'success' ? `COMPLETE (${ocrResult?.confidence ?? 'N/A'}% QUAL)` : ocrStatus.toUpperCase()}
              </span>
            </div>
            <div>
              <span className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 block">RASTER MATRIX</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {quality.width} × {quality.height} • {metadata.format}
              </span>
            </div>
          </div>
        </div>

        {/* SECTION B & C: QUALITY & FORENSIC CHECKS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          {/* Quality Audit Column */}
          <div className="p-4 rounded-lg bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">
              <Sliders className="w-3.5 h-3.5 text-orange-500" />
              <span>SECTION B // RASTER METRICS</span>
            </div>

            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400 dark:text-slate-500">DIMENSIONS:</span>
                <span className={quality.isLowResolution ? 'font-bold text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-slate-200 font-bold'}>
                  {quality.width} × {quality.height} PX {quality.isLowResolution ? '(SUB-OPTIMAL)' : '(ADEQUATE)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 dark:text-slate-500">ASPECT RATIO:</span>
                <span className="text-slate-800 dark:text-slate-200 font-bold">
                  {quality.aspectRatio} ({quality.aspectRatioLabel})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 dark:text-slate-500">LUMINANCE:</span>
                <span className={quality.isExtremeLuminance ? 'font-bold text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-slate-200 font-bold'}>
                  {quality.meanLuminance} / 255 {quality.isExtremeLuminance ? '(EXTREME)' : '(BALANCED)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 dark:text-slate-500">RMS CONTRAST:</span>
                <span className={quality.isLowContrast ? 'font-bold text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-slate-200 font-bold'}>
                  {quality.contrastStdDev} {quality.isLowContrast ? '(COMPRESSED)' : '(OPTIMAL)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 dark:text-slate-500">LAPLACIAN SHARPNESS:</span>
                <span className={quality.isPotentialBlur ? 'font-bold text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-slate-200 font-bold'}>
                  {quality.blurScore} {quality.isPotentialBlur ? '(POTENTIAL BLUR)' : '(SHARP)'}
                </span>
              </div>
            </div>
          </div>

          {/* Forensic Checks Column */}
          <div className="p-4 rounded-lg bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">
              <Sparkles className="w-3.5 h-3.5 text-purple-500" />
              <span>SECTION C // FORENSIC INTEGRITY</span>
            </div>

            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400 dark:text-slate-500">CONTAINER FORMAT:</span>
                <span className="text-slate-800 dark:text-slate-200 font-bold truncate max-w-[200px]" title={metadata.containerStatusLabel}>
                  {metadata.containerStatusLabel}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 dark:text-slate-500">EXIF HEADERS:</span>
                <span className="text-slate-800 dark:text-slate-200 font-bold truncate max-w-[200px]" title={metadata.exifStatusLabel}>
                  {metadata.exifStatusLabel}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 dark:text-slate-500">SOFTWARE SIGNATURE:</span>
                <span className={metadata.softwareDetected ? 'font-bold text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-slate-200 font-bold'} title={metadata.softwareStatusLabel}>
                  {metadata.softwareStatusLabel}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 dark:text-slate-500">ELA VARIANCE:</span>
                <span className={ela.variance > 0.15 ? 'font-bold text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-slate-200 font-bold'}>
                  {ela.supported ? `${Math.round(ela.variance * 100)}% HIGH VARIANCE` : 'SKIPPED (NON-JPEG)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 dark:text-slate-500">FORENSIC NOTE:</span>
                <span className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-[200px]" title={ela.assessmentNote}>
                  {ela.assessmentNote}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION D: DOCUMENT BOUNDARY & PERSPECTIVE */}
        {layoutResult && (
          <div className="p-4 rounded-lg bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-2.5 text-xs font-mono">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                <Scan className="w-3.5 h-3.5 text-orange-500" />
                <span>SECTION D // BOUNDARY &amp; PERSPECTIVE AUDIT</span>
              </div>
              <Badge
                variant={
                  layoutResult.status === 'boundary-detected'
                    ? 'success'
                    : layoutResult.status === 'partial-boundary-detected'
                    ? 'warning'
                    : 'neutral'
                }
                size="sm"
              >
                {layoutResult.statusLabel.toUpperCase()} ({layoutResult.detectorScore}/100)
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px] pt-1">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded border border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-400 dark:text-slate-500 uppercase font-mono text-[9px] block">PERIMETER &amp; GEOMETRY</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 block mt-0.5">
                  {layoutResult.geometry ? `${layoutResult.geometry.averageWidth} × ${layoutResult.geometry.averageHeight} PX (${layoutResult.geometry.quadAspectRatio}:1)` : 'UNCERTAIN'}
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[10px] block mt-0.5">
                  COVERAGE: {layoutResult.framing.areaCoveragePercent}% OF RASTER
                </span>
              </div>

              <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded border border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-400 dark:text-slate-500 uppercase font-mono text-[9px] block">PERSPECTIVE &amp; SKEW</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 block mt-0.5">
                  {layoutResult.perspective ? `KEYSTONE: ${layoutResult.perspective.apparentKeystoneRatio} • TILT: ${layoutResult.perspective.rotationAngleDeg}°` : 'UNAVAILABLE'}
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[10px] block mt-0.5">
                  {layoutResult.perspective?.isSeverePerspective ? 'OFF-AXIS PERSPECTIVE' : 'NEAR-ORTHOGONAL'}
                </span>
              </div>

              <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded border border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-400 dark:text-slate-500 uppercase font-mono text-[9px] block">LAYOUT CONTAINMENT</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 block mt-0.5">
                  {layoutResult.layoutQuality.containmentRatio !== null
                    ? `${layoutResult.layoutQuality.containmentFormatted} CONTAINED`
                    : `CONTAINMENT: ${layoutResult.layoutQuality.containmentFormatted}`}
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[10px] block mt-0.5">
                  {layoutResult.layoutQuality.totalTextRegions > 0
                    ? `${layoutResult.layoutQuality.regionsInsideBoundary}/${layoutResult.layoutQuality.totalTextRegions} REGIONS INSIDE`
                    : 'NO TEXT REGIONS'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* SECTION E: PRELIMINARY ASSESSMENT & FINDINGS */}
        <div className="p-4 rounded-lg bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-3 font-mono">
          <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              {layoutResult ? 'SECTION E // PRELIMINARY ASSESSMENT' : 'SECTION D // PRELIMINARY ASSESSMENT'}
            </span>
            <Badge
              variant={
                assessment.priority === 'manual-review'
                  ? 'warning'
                  : assessment.priority === 'inconclusive'
                  ? 'neutral'
                  : 'success'
              }
              size="sm"
            >
              PRIORITY: {assessment.priorityLabel.toUpperCase()}
            </Badge>
          </div>

          <div className="space-y-1 text-xs">
            <p className="font-bold text-slate-900 dark:text-slate-100 font-heading">{assessment.summary}</p>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-sans">
              <strong>RECOMMENDED ACTION:</strong> {assessment.recommendedAction}
            </p>
          </div>

          <div className="pt-1">
            <span className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
              CONTRIBUTING FINDINGS ({assessment.contributingFindings.length})
            </span>
            <div className="flex flex-wrap gap-1.5">
              {assessment.contributingFindings.map((f) => (
                <span
                  key={f.id}
                  className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] text-slate-700 dark:text-slate-300 font-semibold"
                >
                  {f.title}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* SECTION F: IDENTIFIER VALIDATION & VERIFICATION BREAKDOWN */}
        {workflowDossier && (
          <div className="p-4 rounded-lg bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-3 font-mono">
            <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                SECTION F // IDENTIFIER VALIDATION &amp; SCOPE BREAKDOWN
              </span>
              <Badge variant="neutral" size="sm">
                STEP 1 // BASELINE
              </Badge>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                <span>TARGET DOCUMENT CATEGORY:</span>
                <strong className="text-slate-900 dark:text-slate-100">{workflowDossier.selectedDocumentType}</strong>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                <span>DETERMINISTIC IDENTIFIER CHECKS:</span>
                <span className="text-amber-600 dark:text-amber-400 font-bold">
                  {workflowDossier.verificationSummary.unimplementedChecks} NOT IMPLEMENTED (STEP 2 SCHEDULED)
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                <span>ISSUER REGISTRY VERIFICATION:</span>
                <span className="text-slate-500 font-bold">UNAVAILABLE (NO LIVE GATEWAY)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800 text-[10px] font-sans">
              <div className="p-2.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                <strong className="text-emerald-700 dark:text-emerald-400 font-mono uppercase block">
                  ✓ WHAT THE SYSTEM VERIFIED:
                </strong>
                <ul className="list-disc list-inside text-slate-600 dark:text-slate-300 space-y-0.5">
                  <li>Client-side OCR transcription &amp; candidate field detection</li>
                  <li>Image exposure, contrast, and Laplacian blur score</li>
                  <li>Metadata container (EXIF/JFIF/software markers)</li>
                  <li>JPEG Error Level Analysis compression artifacts</li>
                  <li>Document perimeter localization &amp; layout containment</li>
                </ul>
              </div>

              <div className="p-2.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                <strong className="text-amber-700 dark:text-amber-400 font-mono uppercase block">
                  ✗ WHAT THE SYSTEM DID NOT VERIFY:
                </strong>
                <ul className="list-disc list-inside text-slate-600 dark:text-slate-300 space-y-0.5">
                  <li>Deterministic mathematical checksums or format pattern validity (Step 2)</li>
                  <li>Official issuer authority database registration or active status</li>
                  <li>Biometric matching to genuine credential holder</li>
                  <li>Physical security thread, microprinting, or holographic features</li>
                  <li>Notice: Expired credentials indicate lapsed validity, NOT forgery or tampering</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* SECTION G: LIMITATIONS */}
        <div className="p-4 bg-amber-500/10 dark:bg-amber-950/30 rounded-lg border border-amber-500/30 text-[11px] font-mono text-amber-950 dark:text-amber-200 space-y-2">
          <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-amber-900 dark:text-amber-300">
            <ShieldAlert className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <span>INSTITUTIONAL LIMITATIONS &amp; EVALUATION BOUNDARIES</span>
          </div>
          <ul className="list-disc list-inside space-y-1 leading-relaxed font-sans text-amber-900/90 dark:text-amber-200/90 text-xs">
            <li>
              <strong>No Authenticity Verdict:</strong> FALCON screening does NOT certify this document as authentic or genuine.
            </li>
            <li>
              <strong>No Definite Fraud Classification:</strong> Quality flags represent inspection cues; they do not establish fraud.
            </li>
            <li>
              <strong>Credential Expiry Is Separate from Fraud:</strong> An expired document indicates lapsed administrative validity; it does NOT constitute evidence of forgery or tampering.
            </li>
            <li>
              <strong>No External Registry Query:</strong> Candidate identifiers are parsed locally and not queried against government databases.
            </li>
          </ul>
        </div>

        {/* SECTION H: PRIVACY CONTROLS & EXPORT */}
        <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 space-y-3 font-mono">
          <div className="p-3 bg-slate-50/80 dark:bg-slate-950/60 rounded-lg border border-slate-200/80 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              <Lock className="w-3.5 h-3.5 text-orange-500" />
              <span>EXPORT PRIVACY CONTROLS (DEFAULT: MASKED &amp; REDACTED)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-sans">
              <label className="flex items-start gap-2 text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeIdentifiableFields}
                  onChange={(e) => setIncludeIdentifiableFields(e.target.checked)}
                  className="w-3.5 h-3.5 mt-0.5 rounded border-slate-300 dark:border-slate-700 text-orange-600 focus:ring-orange-500 cursor-pointer"
                />
                <span className="leading-tight">
                  <strong className="block text-slate-900 dark:text-slate-100 font-medium">Unmask candidate identity fields</strong>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Includes names, IDs, dates of birth (masked by default)</span>
                </span>
              </label>

              <label className="flex items-start gap-2 text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeFullOCR}
                  onChange={(e) => setIncludeFullOCR(e.target.checked)}
                  className="w-3.5 h-3.5 mt-0.5 rounded border-slate-300 dark:border-slate-700 text-orange-600 focus:ring-orange-500 cursor-pointer"
                />
                <span className="leading-tight">
                  <strong className="block text-slate-900 dark:text-slate-100 font-medium">Include raw OCR text buffer</strong>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Includes unparsed character dump (redacted by default)</span>
                </span>
              </label>
            </div>

            {/* Explicit PII Export Warning */}
            {includeIdentifiableFields && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-md text-[11px] font-sans text-amber-900 dark:text-amber-200 flex items-start gap-2 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold block font-mono uppercase text-amber-950 dark:text-amber-100">
                    EXPLICIT PII UNMASKING WARNING
                  </strong>
                  <span>
                    You have enabled unmasking of personal identity fields. Downloaded dossier files will contain unmasked personal names, full identifier sequences, and dates of birth. Ensure strict compliance with personal data protection regulations prior to export or distribution.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Save to Ledger / Export Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">
                PRIVACY GUARANTEE: BITMAPS EXCLUDED • 100% IN-BROWSER
              </span>
              {(saveFeedback || downloadSuccess || autoSaveStatus === 'saved' || autoSaveError) && (
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold animate-in fade-in">
                  {autoSaveError ? (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                      <span className="text-amber-600 dark:text-amber-400">{autoSaveError}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {saveFeedback ||
                          downloadSuccess ||
                          (autoSaveStatus === 'saved'
                            ? `Screening completed and case saved locally. (Ref: ${reportId})`
                            : '')}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 font-mono">
              {/* Save / Archive to Local Ledger */}
              <button
                type="button"
                disabled={
                  disabled ||
                  isAlreadyArchived ||
                  savingState === 'saving' ||
                  autoSaveStatus === 'saving'
                }
                onClick={autoSaveStatus === 'error' && onRetryAutoSave ? onRetryAutoSave : handleSaveToLedger}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  isAlreadyArchived
                    ? 'bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 cursor-default'
                    : savingState === 'saving' || autoSaveStatus === 'saving'
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-300 dark:border-slate-700 cursor-wait'
                    : autoSaveStatus === 'error'
                    ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                    : disabled
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-700 cursor-not-allowed'
                    : 'bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 border border-slate-900 dark:border-slate-100 shadow-2xs'
                }`}
                title={
                  isAlreadyArchived
                    ? 'This screening dossier is already saved in your browser IndexedDB ledger'
                    : 'Save screening metrics and masked candidate fields to client IndexedDB'
                }
              >
                {isAlreadyArchived ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>
                      {autoSaveStatus === 'saved' ? 'AUTO-SAVED TO AUDIT LEDGER' : 'SAVED TO AUDIT LEDGER'}
                    </span>
                  </>
                ) : savingState === 'saving' || autoSaveStatus === 'saving' ? (
                  <span>ARCHIVING...</span>
                ) : autoSaveStatus === 'error' ? (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-white" />
                    <span>RETRY SAVE TO LEDGER</span>
                  </>
                ) : (
                  <>
                    <Archive className="w-3.5 h-3.5 text-orange-400" />
                    <span>SAVE TO AUDIT LEDGER</span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={disabled}
                onClick={handleExportText}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                  disabled
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-700 cursor-not-allowed'
                    : 'bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 shadow-2xs'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>TEXT DOSSIER</span>
              </button>

              <button
                type="button"
                disabled={disabled}
                onClick={handleExportJson}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded text-xs font-bold uppercase tracking-wider shadow-xs transition-all cursor-pointer ${
                  disabled
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                    : 'bg-orange-600 hover:bg-orange-700 text-white shadow-orange-600/20'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>EXPORT JSON REPORT</span>
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between text-[10px] font-mono text-slate-400 dark:text-slate-500 gap-1 uppercase tracking-wider">
            <span>{PROJECT_BRANDING.developerAttribution} // FALCON-404</span>
            <span>INSTITUTIONAL SCREENING DOSSIER</span>
          </div>
        </div>
      </div>
    </Card>
  )
}
