import React, { useState, useMemo } from 'react'
import {
  FileText,
  Download,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Cpu,
  Lock,
  Sliders,
  Sparkles,
  Scan,
  Archive,
  Zap
} from 'lucide-react'
import type {
  ScreeningReportData,
  ImageIntegrityResult,
  DocumentLayoutResult,
  OCRResult,
  OCRStatus,
  WorkflowScreeningDossier,
  AIMLScreeningResult
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
  mlResult?: AIMLScreeningResult | null
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
  workflowDossier: _workflowDossier,
  mlResult,
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
  const [localReportId] = useState(
    () => `FLC-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString().slice(-4)}`
  )
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
    mlResult: mlResult || undefined,
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

  // =========================================================================
  // SECTION 1: Document Risk Assessment Logic
  // =========================================================================
  const riskAssessment = useMemo(() => {
    if (mlResult && mlResult.predictedClass !== 'ERROR') {
      const score = Math.round(mlResult.tamperingScore * 100)
      let level: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW'
      let levelLabel = 'LOW RISK'
      let badgeVariant: 'success' | 'warning' | 'danger' = 'success'
      let interpretation =
        'No visual manipulation or tampering patterns detected across neural feature extractors. Document exhibits consistent forensic properties.'

      if (mlResult.predictedClass === 'MANIPULATED' || score > 60) {
        level = 'HIGH'
        levelLabel = 'HIGH RISK'
        badgeVariant = 'danger'
        interpretation =
          'High probability of image tampering detected by neural feature analysis. Close examiner review of facial portrait, typography, and background integrity is required.'
      } else if (mlResult.predictedClass === 'NEEDS_REVIEW' || (score >= 40 && score <= 60)) {
        level = 'MEDIUM'
        levelLabel = 'MEDIUM RISK'
        badgeVariant = 'warning'
        interpretation =
          'Ambiguous tampering indicators detected near the classification boundary. Corroborating physical inspection is advised.'
      }

      return {
        hasScore: true,
        score,
        level,
        levelLabel,
        badgeVariant,
        interpretation,
        isMlBacked: true
      }
    }

    // Heuristic fallback if ML is offline or not run
    const priority = assessment.priority
    if (priority === 'manual-review') {
      return {
        hasScore: false,
        score: null,
        level: 'HIGH' as const,
        levelLabel: 'HIGH RISK (MANUAL REVIEW)',
        badgeVariant: 'warning' as const,
        interpretation: assessment.summary,
        isMlBacked: false
      }
    }
    if (priority === 'inconclusive') {
      return {
        hasScore: false,
        score: null,
        level: 'MEDIUM' as const,
        levelLabel: 'MEDIUM RISK (INCONCLUSIVE)',
        badgeVariant: 'neutral' as const,
        interpretation: assessment.summary,
        isMlBacked: false
      }
    }
    return {
      hasScore: false,
      score: null,
      level: 'LOW' as const,
      levelLabel: 'LOW RISK (STANDARD)',
      badgeVariant: 'success' as const,
      interpretation: assessment.summary,
      isMlBacked: false
    }
  }, [mlResult, assessment])

  // =========================================================================
  // SECTION 4: Implemented & Executed Verification Checks
  // =========================================================================
  const executedChecks = useMemo(() => {
    const checks: Array<{
      id: string
      name: string
      category: string
      status: 'PASS' | 'FAIL' | 'NEEDS_REVIEW'
      detail: string
    }> = []

    // 1. Image Resolution & Dimension
    checks.push({
      id: 'chk-res',
      name: 'Raster Resolution & Matrix Size',
      category: 'Raster Geometry',
      status: quality.isLowResolution ? 'NEEDS_REVIEW' : 'PASS',
      detail: `${quality.width} × ${quality.height} px (${quality.isLowResolution ? 'Sub-optimal resolution' : 'Adequate for OCR & forensics'})`
    })

    // 2. Exposure & Contrast Dynamic Range
    checks.push({
      id: 'chk-lum',
      name: 'Photometric Exposure & Contrast',
      category: 'Photometric Quality',
      status: quality.isExtremeLuminance || quality.isLowContrast ? 'NEEDS_REVIEW' : 'PASS',
      detail: `Luminance: ${quality.meanLuminance}/255 • Contrast: ${quality.contrastStdDev} (${quality.isExtremeLuminance ? 'Extreme' : 'Balanced'})`
    })

    // 3. Laplacian Edge Sharpness / Focus
    checks.push({
      id: 'chk-blur',
      name: 'Laplacian Edge Sharpness & Focus',
      category: 'Optical Quality',
      status: quality.isPotentialBlur ? 'NEEDS_REVIEW' : 'PASS',
      detail: `Variance score: ${quality.blurScore} (${quality.isPotentialBlur ? 'Potential blur detected' : 'Sharp & in-focus'})`
    })

    // 4. Container Format & Metadata Signature
    checks.push({
      id: 'chk-meta',
      name: 'Metadata Container & Software Signature',
      category: 'File Structure',
      status: metadata.softwareDetected ? 'NEEDS_REVIEW' : 'PASS',
      detail: `${metadata.format} • ${metadata.softwareDetected ? metadata.softwareStatusLabel : 'No editing signatures detected'}`
    })

    // 5. Compression Artifacts (ELA)
    checks.push({
      id: 'chk-ela',
      name: 'Compression Consistency (ELA)',
      category: 'Compression Forensics',
      status: ela.supported && ela.variance > 0.15 ? 'NEEDS_REVIEW' : 'PASS',
      detail: ela.supported
        ? `Variance: ${(ela.variance * 100).toFixed(1)}% (${ela.variance > 0.15 ? 'High error variance' : 'Uniform compression'})`
        : 'Non-JPEG container (compression analysis skipped)'
    })

    // 6. Optical Character Recognition (OCR)
    checks.push({
      id: 'chk-ocr',
      name: 'Surface OCR Transcription & Field Parsing',
      category: 'Content Extraction',
      status:
        ocrStatus === 'success' && (ocrResult?.confidence ?? 0) >= 60
          ? 'PASS'
          : ocrStatus === 'error'
          ? 'FAIL'
          : 'NEEDS_REVIEW',
      detail:
        ocrStatus === 'success'
          ? `${ocrResult?.confidence ?? 0}% confidence (${ocrResult?.candidateFields.length ?? 0} candidate fields recognized)`
          : `OCR status: ${ocrStatus.toUpperCase()}`
    })

    // 7. Document Boundary & Containment (if executed)
    if (layoutResult) {
      checks.push({
        id: 'chk-layout',
        name: 'Perimeter Boundary & Perspective Skew',
        category: 'Spatial Geometry',
        status: layoutResult.status === 'boundary-detected' ? 'PASS' : 'NEEDS_REVIEW',
        detail: `${layoutResult.statusLabel} (${layoutResult.detectorScore}/100) • ${layoutResult.layoutQuality.containmentFormatted} contained`
      })
    }

    // 8. AI Neural Tampering Classification (if executed)
    if (mlResult && mlResult.predictedClass !== 'ERROR') {
      checks.push({
        id: 'chk-ml',
        name: 'Neural Document Tampering Detection',
        category: 'AI Classifier',
        status:
          mlResult.predictedClass === 'GENUINE'
            ? 'PASS'
            : mlResult.predictedClass === 'MANIPULATED'
            ? 'FAIL'
            : 'NEEDS_REVIEW',
        detail: `${mlResult.predictedClass} (P(Tampered): ${(mlResult.manipulatedProbability * 100).toFixed(1)}%, ${(mlResult.confidence * 100).toFixed(1)}% confidence)`
      })
    }

    return checks
  }, [quality, metadata, ela, ocrStatus, ocrResult, layoutResult, mlResult])

  const passedChecks = executedChecks.filter((c) => c.status === 'PASS')
  const failedChecks = executedChecks.filter((c) => c.status === 'FAIL')
  const reviewChecks = executedChecks.filter((c) => c.status === 'NEEDS_REVIEW')

  return (
    <Card
      sectionCode="VERIFICATION // DOSSIER"
      title="Document Screening & Forensic Audit Report"
      subtitle={`Generated ${nowFormatted} • Case Ref: ${reportId} • Specimen: ${documentName}`}
      action={
        <div className="flex items-center gap-2 font-mono">
          <Badge variant={riskAssessment.badgeVariant} size="sm">
            {riskAssessment.levelLabel}
          </Badge>
        </div>
      }
    >
      <div className="space-y-6 font-sans">
        {/* ================================================================= */}
        {/* SECTION 1 — DOCUMENT RISK ASSESSMENT                              */}
        {/* ================================================================= */}
        <section className="p-5 rounded-xl bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900/90 dark:via-slate-950 dark:to-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200/70 dark:border-slate-800 gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="font-heading text-sm font-bold tracking-wider uppercase text-slate-900 dark:text-slate-100">
                SECTION 1 // DOCUMENT RISK ASSESSMENT
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
              OPERATIONAL EXAMINER TRIAGE
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
            {/* Visual Risk Score Indicator (0-100) */}
            <div className="md:col-span-4 flex flex-col items-center justify-center p-4 rounded-xl bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-center space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500">
                OVERALL TAMPERING RISK SCORE
              </span>

              {riskAssessment.hasScore ? (
                <div className="relative flex items-center justify-center my-1">
                  <div
                    className={`w-28 h-28 rounded-full border-8 flex flex-col items-center justify-center transition-all ${
                      riskAssessment.level === 'HIGH'
                        ? 'border-rose-500 bg-rose-500/5 text-rose-600 dark:text-rose-400'
                        : riskAssessment.level === 'MEDIUM'
                        ? 'border-amber-500 bg-amber-500/5 text-amber-600 dark:text-amber-400'
                        : 'border-emerald-500 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    <span className="text-3xl font-heading font-black tracking-tight leading-none">
                      {riskAssessment.score}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">
                      / 100
                    </span>
                  </div>
                </div>
              ) : (
                <div className="my-3 px-4 py-3 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="font-heading font-bold text-base text-slate-800 dark:text-slate-200">
                    HEURISTIC TRIAGE
                  </span>
                </div>
              )}

              <Badge variant={riskAssessment.badgeVariant} size="sm">
                LEVEL // {riskAssessment.level}
              </Badge>
            </div>

            {/* Risk Interpretation & Findings */}
            <div className="md:col-span-8 space-y-3 font-sans">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                  EXAMINER RISK INTERPRETATION
                </span>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-snug">
                  {riskAssessment.interpretation}
                </p>
              </div>

              {/* Top Contributing Findings */}
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1.5">
                  CONTRIBUTING FORENSIC FINDINGS
                </span>
                {assessment.contributingFindings.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {assessment.contributingFindings.map((f) => (
                      <span
                        key={f.id}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono font-medium border ${
                          f.severity === 'medium'
                            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                            : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                        <span>{f.title}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 font-mono flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>All core image integrity heuristics are within normal baseline tolerances.</span>
                  </p>
                )}
              </div>

              {/* Core Image Integrity Summary Row */}
              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase">CONTAINER</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{metadata.format}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase">COMPRESSION</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {ela.supported ? (ela.variance > 0.15 ? 'HIGH VARIANCE' : 'UNIFORM') : 'NON-JPEG'}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase">SHARPNESS</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {quality.isPotentialBlur ? 'BLUR HAZARD' : 'SHARP'}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase">RESOLUTION</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {quality.isLowResolution ? 'SUB-OPTIMAL' : 'ADEQUATE'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* SECTION 2 — AI DOCUMENT CLASSIFICATION                            */}
        {/* ================================================================= */}
        {mlResult ? (
          <section className="p-5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-cyan-600 dark:text-cyan-400 animate-pulse" />
                <h3 className="font-heading text-sm font-bold tracking-wider uppercase text-slate-900 dark:text-slate-100">
                  SECTION 2 // AI DOCUMENT CLASSIFICATION
                </h3>
              </div>
              <Badge
                variant={
                  mlResult.predictedClass === 'GENUINE'
                    ? 'success'
                    : mlResult.predictedClass === 'MANIPULATED'
                    ? 'danger'
                    : mlResult.predictedClass === 'NEEDS_REVIEW'
                    ? 'warning'
                    : 'neutral'
                }
                size="sm"
              >
                {mlResult.predictedClass === 'GENUINE' && '● GENUINE // TAMPER-FREE'}
                {mlResult.predictedClass === 'MANIPULATED' && '▲ MANIPULATED // FORGERY DETECTED'}
                {mlResult.predictedClass === 'NEEDS_REVIEW' && '◆ NEEDS REVIEW // AMBIGUOUS'}
                {mlResult.predictedClass === 'ERROR' && '✕ SERVICE UNAVAILABLE'}
              </Badge>
            </div>

            {/* Prominent Hero Status Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                  AI CLASSIFICATION
                </span>
                <span
                  className={`text-xl font-heading font-black block tracking-tight ${
                    mlResult.predictedClass === 'GENUINE'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : mlResult.predictedClass === 'MANIPULATED'
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {mlResult.predictedClass}
                </span>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                  P(GENUINE)
                </span>
                <span className="text-xl font-heading font-bold text-slate-900 dark:text-slate-100 block">
                  {(mlResult.genuineProbability * 100).toFixed(1)}%
                </span>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                  P(MANIPULATED)
                </span>
                <span
                  className={`text-xl font-heading font-bold block ${
                    mlResult.manipulatedProbability > 0.5
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-slate-900 dark:text-slate-100'
                  }`}
                >
                  {(mlResult.manipulatedProbability * 100).toFixed(1)}%
                </span>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                  INFERENCE LATENCY
                </span>
                <span className="text-xl font-heading font-bold text-slate-900 dark:text-slate-100 block">
                  {mlResult.processingTimeMs.toFixed(1)} ms
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal block truncate">
                  Device: {mlResult.device}
                </span>
              </div>
            </div>

            {/* Probability Distribution Bar */}
            <div className="space-y-1.5 font-mono">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <span>GENUINE</span>
                  <span>{(mlResult.genuineProbability * 100).toFixed(1)}%</span>
                </span>
                <span className="text-[10px] text-slate-400 font-normal uppercase tracking-wider">
                  DECISION THRESHOLD: 50% (REVIEW BAND: 40%–60%)
                </span>
                <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <span>MANIPULATED</span>
                  <span>{(mlResult.manipulatedProbability * 100).toFixed(1)}%</span>
                </span>
              </div>
              <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex relative border border-slate-300 dark:border-slate-700">
                <div
                  className="bg-emerald-500 transition-all duration-500"
                  style={{ width: `${Math.round(mlResult.genuineProbability * 100)}%` }}
                />
                <div
                  className="bg-rose-500 transition-all duration-500"
                  style={{ width: `${Math.round(mlResult.manipulatedProbability * 100)}%` }}
                />
                <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white dark:bg-slate-950 shadow-sm" />
              </div>
            </div>

            {/* Mandatory Governance & Experimental Scope Notice */}
            <div className="p-3.5 rounded-lg bg-cyan-500/5 dark:bg-cyan-500/10 border border-cyan-500/20 text-xs font-sans text-cyan-900 dark:text-cyan-200 space-y-1.5">
              <div className="flex items-start gap-2 font-bold font-mono text-[11px] uppercase tracking-wide">
                <AlertTriangle className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
                <span>AI SCREENING DISCLAIMER &amp; LIMITATIONS // MobileNetV3-Small</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pl-6">
                {mlResult.screeningDisclaimer}
              </p>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 pl-6 space-y-0.5 font-sans">
                <p>
                  <strong>Model Sensitivity Scope:</strong> High sensitivity to photo swaps (100% test recall) and shadow anomalies (100% test recall). Low sensitivity to micro text alterations and localized copy-move cloning (0% test recall).
                </p>
              </div>
            </div>
          </section>
        ) : (
          <section className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-slate-400" />
              <span>AI Neural Tampering Screening: Service offline or not invoked for this specimen.</span>
            </div>
            <span className="text-[10px] uppercase font-bold text-slate-400">HEURISTICS ONLY</span>
          </section>
        )}

        {/* ================================================================= */}
        {/* SECTION 3 — DOCUMENT FORENSIC ANALYSIS                            */}
        {/* ================================================================= */}
        <section className="space-y-3 font-mono">
          <div className="flex items-center justify-between pb-1 border-b border-slate-200/70 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-orange-500" />
              <h3 className="font-heading text-sm font-bold tracking-wider uppercase text-slate-900 dark:text-slate-100">
                SECTION 3 // DOCUMENT FORENSIC ANALYSIS
              </h3>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              MULTI-DIMENSIONAL EVIDENCE CARDS
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            {/* Card 1: OCR Surface Extraction */}
            <div className="p-3.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-purple-500" />
                  <span>OCR EXTRACTION</span>
                </span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {ocrStatus === 'success' ? `${ocrResult?.confidence ?? 'N/A'}% QUAL` : ocrStatus.toUpperCase()}
                </span>
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {detectedDocTypeField?.value || selectedDocumentType}
              </div>
              <p className="text-[11px] font-sans text-slate-500 dark:text-slate-400">
                {ocrResult?.candidateFields.length ?? 0} candidate fields parsed via client-side WebAssembly.
              </p>
            </div>

            {/* Card 2: Image Dimensions & Quality */}
            <div className="p-3.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-orange-500" />
                  <span>DIMENSIONS &amp; ASPECT</span>
                </span>
                <span className={quality.isLowResolution ? 'font-bold text-amber-600' : 'text-slate-600 dark:text-slate-400'}>
                  {quality.isLowResolution ? 'SUB-OPTIMAL' : 'ADEQUATE'}
                </span>
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {quality.width} × {quality.height} PX
              </div>
              <p className="text-[11px] font-sans text-slate-500 dark:text-slate-400">
                Aspect ratio: {quality.aspectRatio} ({quality.aspectRatioLabel})
              </p>
            </div>

            {/* Card 3: Exposure & Photometric Contrast */}
            <div className="p-3.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
                  <span>EXPOSURE &amp; CONTRAST</span>
                </span>
                <span className={quality.isExtremeLuminance ? 'font-bold text-amber-600' : 'text-slate-600 dark:text-slate-400'}>
                  {quality.isExtremeLuminance ? 'EXTREME' : 'BALANCED'}
                </span>
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {quality.meanLuminance} / 255 LMN
              </div>
              <p className="text-[11px] font-sans text-slate-500 dark:text-slate-400">
                RMS contrast std dev: {quality.contrastStdDev} ({quality.isLowContrast ? 'Compressed' : 'Optimal dynamic range'})
              </p>
            </div>

            {/* Card 4: EXIF Metadata & Software Headers */}
            <div className="p-3.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>CONTAINER &amp; EXIF</span>
                </span>
                <span className={metadata.softwareDetected ? 'font-bold text-amber-600' : 'text-emerald-600'}>
                  {metadata.softwareDetected ? 'EDIT MARKER' : 'CLEAN'}
                </span>
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {metadata.format} CONTAINER
              </div>
              <p className="text-[11px] font-sans text-slate-500 dark:text-slate-400 truncate" title={metadata.softwareStatusLabel}>
                {metadata.softwareDetected ? metadata.softwareStatusLabel : 'No third-party image manipulation software tags detected.'}
              </p>
            </div>

            {/* Card 5: Error Level Analysis (ELA) */}
            <div className="p-3.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>COMPRESSION (ELA)</span>
                </span>
                <span className={ela.variance > 0.15 ? 'font-bold text-amber-600' : 'text-emerald-600'}>
                  {ela.supported ? (ela.variance > 0.15 ? 'VARIANCE ANOMALY' : 'UNIFORM') : 'SKIPPED'}
                </span>
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {ela.supported ? `${Math.round(ela.variance * 100)}% ERROR VARIANCE` : 'NON-JPEG SPECIMEN'}
              </div>
              <p className="text-[11px] font-sans text-slate-500 dark:text-slate-400 truncate" title={ela.assessmentNote}>
                {ela.assessmentNote}
              </p>
            </div>

            {/* Card 6: Laplacian Sharpness & Blur */}
            <div className="p-3.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5">
                  <Scan className="w-3.5 h-3.5 text-blue-500" />
                  <span>LAPLACIAN SHARPNESS</span>
                </span>
                <span className={quality.isPotentialBlur ? 'font-bold text-amber-600' : 'text-emerald-600'}>
                  {quality.isPotentialBlur ? 'BLUR WARNING' : 'SHARP'}
                </span>
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                SCORE // {quality.blurScore}
              </div>
              <p className="text-[11px] font-sans text-slate-500 dark:text-slate-400">
                {quality.isPotentialBlur ? 'Soft raster edges observed. Inspect for synthetic resampling.' : 'Sharp edge gradients consistent with standard capture.'}
              </p>
            </div>

            {/* Card 7: Boundary & Layout (if executed) */}
            {layoutResult && (
              <div className="p-3.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-1.5 sm:col-span-2 md:col-span-3">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5">
                    <Scan className="w-3.5 h-3.5 text-orange-500" />
                    <span>BOUNDARY, PERSPECTIVE &amp; LAYOUT CONTAINMENT</span>
                  </span>
                  <Badge variant={layoutResult.status === 'boundary-detected' ? 'success' : 'warning'} size="sm">
                    {layoutResult.statusLabel.toUpperCase()} ({layoutResult.detectorScore}/100)
                  </Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block">GEOMETRY</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {layoutResult.geometry ? `${layoutResult.geometry.averageWidth} × ${layoutResult.geometry.averageHeight} px` : 'Perimeter Uncertain'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block">PERSPECTIVE / TILT</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {layoutResult.perspective ? `${layoutResult.perspective.rotationAngleDeg}° tilt • Keystone: ${layoutResult.perspective.apparentKeystoneRatio}` : 'Near-orthogonal'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block">TEXT CONTAINMENT</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {layoutResult.layoutQuality.containmentFormatted} contained
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ================================================================= */}
        {/* SECTION 4 — VERIFICATION SUMMARY                                  */}
        {/* ================================================================= */}
        <section className="p-5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4 font-mono">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200/70 dark:border-slate-800 gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="font-heading text-sm font-bold tracking-wider uppercase text-slate-900 dark:text-slate-100">
                SECTION 4 // VERIFICATION SUMMARY (EXECUTED CHECKS ONLY)
              </h3>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {executedChecks.length} CHECKS EXECUTED
            </span>
          </div>

          {/* Tri-Status Summary Counters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block font-bold">
                  PASSED CHECKS
                </span>
                <span className="text-2xl font-heading font-black text-emerald-900 dark:text-emerald-100 block">
                  {passedChecks.length}
                </span>
              </div>
              <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>

            <div className="p-3.5 rounded-lg bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-rose-800 dark:text-rose-300 uppercase tracking-wider block font-bold">
                  FAILED CHECKS
                </span>
                <span className="text-2xl font-heading font-black text-rose-900 dark:text-rose-100 block">
                  {failedChecks.length}
                </span>
              </div>
              <XCircle className="w-6 h-6 text-rose-600 dark:text-rose-400" />
            </div>

            <div className="p-3.5 rounded-lg bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-amber-800 dark:text-amber-300 uppercase tracking-wider block font-bold">
                  NEEDS REVIEW
                </span>
                <span className="text-2xl font-heading font-black text-amber-900 dark:text-amber-100 block">
                  {reviewChecks.length}
                </span>
              </div>
              <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>

          {/* Clean Executed Checks List */}
          <div className="divide-y divide-slate-200/70 dark:divide-slate-800 text-xs">
            {executedChecks.map((check) => (
              <div key={check.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {check.name}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200/60 dark:bg-slate-800 text-slate-500">
                      {check.category}
                    </span>
                  </div>
                  <p className="text-[11px] font-sans text-slate-500 dark:text-slate-400">
                    {check.detail}
                  </p>
                </div>
                <div>
                  {check.status === 'PASS' && (
                    <Badge variant="success" size="sm">
                      PASS
                    </Badge>
                  )}
                  {check.status === 'FAIL' && (
                    <Badge variant="danger" size="sm">
                      FAIL
                    </Badge>
                  )}
                  {check.status === 'NEEDS_REVIEW' && (
                    <Badge variant="warning" size="sm">
                      REVIEW
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="p-2.5 rounded bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 font-sans">
            <strong>Audit Transparency Note:</strong> Only implemented automated heuristics and neural checks are listed above. Unimplemented format algorithms, mathematical checksums, and statutory issuer database lookups are not evaluated in this release.
          </div>
        </section>

        {/* ================================================================= */}
        {/* SECTION 5 — AUDIT REPORT & EXPORT                                 */}
        {/* ================================================================= */}
        <section className="pt-3 border-t border-slate-200/80 dark:border-slate-800 space-y-4 font-mono">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
            <div className="flex items-center gap-2">
              <Archive className="w-4 h-4 text-orange-500" />
              <h3 className="font-heading text-sm font-bold tracking-wider uppercase text-slate-900 dark:text-slate-100">
                SECTION 5 // AUDIT REPORT &amp; EXPORT
              </h3>
            </div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500">
              Ref: <strong className="text-slate-700 dark:text-slate-300">{reportId}</strong> • Station: {stationId}
            </div>
          </div>

          {/* Privacy Controls Panel */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              <Lock className="w-3.5 h-3.5 text-orange-500" />
              <span>EXPORT PRIVACY CONTROLS (DEFAULT: MASKED &amp; REDACTED)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-sans">
              <label className="flex items-start gap-2.5 text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeIdentifiableFields}
                  onChange={(e) => setIncludeIdentifiableFields(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-slate-300 dark:border-slate-700 text-orange-600 focus:ring-orange-500 cursor-pointer"
                />
                <span className="leading-tight">
                  <strong className="block text-slate-900 dark:text-slate-100 font-medium">
                    Unmask candidate identity fields
                  </strong>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Includes names, IDs, dates of birth (masked by default)
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-2.5 text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeFullOCR}
                  onChange={(e) => setIncludeFullOCR(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-slate-300 dark:border-slate-700 text-orange-600 focus:ring-orange-500 cursor-pointer"
                />
                <span className="leading-tight">
                  <strong className="block text-slate-900 dark:text-slate-100 font-medium">
                    Include raw OCR text buffer
                  </strong>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Includes unparsed character dump (redacted by default)
                  </span>
                </span>
              </label>
            </div>

            {/* PII Unmasking Alert */}
            {includeIdentifiableFields && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-md text-[11px] font-sans text-amber-900 dark:text-amber-200 flex items-start gap-2 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold block font-mono uppercase text-amber-950 dark:text-amber-100">
                    PII UNMASKING ACTIVE
                  </strong>
                  <span>
                    Downloaded reports will contain unmasked identity attributes. Ensure adherence to data protection standards.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">
                PRIVACY: BITMAPS EXCLUDED • 100% IN-BROWSER
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
                          (autoSaveStatus === 'saved' ? `Saved locally in audit ledger. (Ref: ${reportId})` : '')}
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
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
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
              >
                {isAlreadyArchived ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>
                      {autoSaveStatus === 'saved' ? 'AUTO-SAVED IN AUDIT LEDGER' : 'SAVED IN AUDIT LEDGER'}
                    </span>
                  </>
                ) : savingState === 'saving' || autoSaveStatus === 'saving' ? (
                  <span>ARCHIVING...</span>
                ) : autoSaveStatus === 'error' ? (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-white" />
                    <span>RETRY SAVE</span>
                  </>
                ) : (
                  <>
                    <Archive className="w-3.5 h-3.5 text-orange-400" />
                    <span>SAVE TO AUDIT LEDGER</span>
                  </>
                )}
              </button>

              {/* Text Dossier Export */}
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

              {/* JSON Report Export */}
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
            <span>FORENSIC SCREENING DOSSIER</span>
          </div>
        </section>
      </div>
    </Card>
  )
}
