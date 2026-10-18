import React, { useState } from 'react'
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Loader2,
  RotateCcw,
  Sliders,
  FileCode2,
  Sparkles,
  Info,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  HelpCircle
} from 'lucide-react'
import type {
  ImageIntegrityResult,
  IntegrityAnalysisStatus,
  IntegrityProgress,
  FindingCategory,
  FindingSeverity
} from '../../types'
import { Card } from '../common/Card'
import { Badge } from '../common/Badge'

export interface ImageIntegritySectionProps {
  status: IntegrityAnalysisStatus
  progress: IntegrityProgress | null
  result: ImageIntegrityResult | null
  error: string | null
  disabled?: boolean
  onRunAnalysis: () => void
  onRetryAnalysis: () => void
}

export const ImageIntegritySection: React.FC<ImageIntegritySectionProps> = ({
  status,
  progress,
  result,
  error,
  disabled = false,
  onRunAnalysis,
  onRetryAnalysis
}) => {
  const [selectedCategory, setSelectedCategory] = useState<FindingCategory | 'all'>('all')
  const [expandedFindings, setExpandedFindings] = useState<Record<string, boolean>>({})
  const [showElaHeatmap, setShowElaHeatmap] = useState(false)

  const toggleFindingExpand = (id: string) => {
    setExpandedFindings((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const getSeverityBadge = (severity: FindingSeverity) => {
    switch (severity) {
      case 'high':
        return <Badge variant="danger">HIGH CONCERN</Badge>
      case 'medium':
        return <Badge variant="warning">MODERATE</Badge>
      case 'low':
        return <Badge variant="neutral">MINOR FLAG</Badge>
      default:
        return <Badge variant="info">INFO</Badge>
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'standard':
        return (
          <Badge variant="success" size="md">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>STANDARD TRIAGE</span>
          </Badge>
        )
      case 'manual-review':
        return (
          <Badge variant="warning" size="md">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>MANUAL REVIEW REQUIRED</span>
          </Badge>
        )
      case 'inconclusive':
        return (
          <Badge variant="neutral" size="md">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>INCONCLUSIVE</span>
          </Badge>
        )
      default:
        return <Badge variant="neutral">{priority.toUpperCase()}</Badge>
    }
  }

  // 1. STATE: IDLE
  if (status === 'idle') {
    return (
      <Card
        sectionCode="STAGE // 03"
        title="Image Integrity & Forensics"
        subtitle="Client-side raster quality, metadata headers, and Error Level Analysis (ELA)"
        action={
          <Badge variant="neutral" size="sm">
            READY // STANDBY
          </Badge>
        }
      >
        <div className="space-y-4 font-sans">
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-2">
            <div className="flex items-center gap-2 font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
              <ShieldCheck className="w-4 h-4 text-orange-500" />
              <span>IN-BROWSER IMAGE FORENSICS &amp; COMPRESSION AUDIT</span>
            </div>
            <p className="leading-relaxed">
              Examines raster quality (exposure, contrast, sharpness, resolution), parses embedded EXIF/JFIF metadata containers, and evaluates localized JPEG compression differentials (Error Level Analysis). Operates 100% locally in browser memory.
            </p>
          </div>

          <div className="p-3 bg-amber-500/10 dark:bg-amber-950/30 rounded-lg border border-amber-500/30 text-[11px] font-mono text-amber-900 dark:text-amber-200 flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p>
              <strong>FORENSIC TRANSPARENCY:</strong> Image analysis detects anomalies and quality constraints. Ordinary compression, resizing, and screenshotting can create artifacts. Findings represent triage signals, not definitive proof of fraud.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              PIPELINE // QUALITY MATRIX • METADATA INSPECTOR • CANVAS ELA
            </span>
            <button
              type="button"
              disabled={disabled}
              onClick={onRunAnalysis}
              className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider shadow-xs transition-all cursor-pointer ${
                disabled
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                  : 'bg-orange-600 hover:bg-orange-700 text-white shadow-orange-600/20'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-white" />
              <span>EXECUTE FORENSIC AUDIT</span>
            </button>
          </div>
        </div>
      </Card>
    )
  }

  // 2. STATE: ANALYZING
  if (status === 'analyzing') {
    const progressPercent = typeof progress?.progress === 'number' ? Math.round(progress.progress * 100) : 30

    return (
      <Card
        sectionCode="STAGE // 03"
        title="Image Integrity & Forensics"
        subtitle="Executing browser-side forensic and quality evaluation..."
        action={
          <Badge variant="info" size="sm" className="animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>ANALYZING...</span>
          </Badge>
        }
      >
        <div className="space-y-4 py-2 font-sans">
          <div className="p-4 rounded-lg bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200/80 dark:border-orange-900/40 space-y-3 font-mono">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-bold text-orange-950 dark:text-orange-200 uppercase tracking-wider">
                <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
                <span>{progress?.status || 'Inspecting raster attributes...'}</span>
              </div>
              <span className="font-mono font-bold text-orange-600 dark:text-orange-400 text-xs">{progressPercent}%</span>
            </div>

            <div className="w-full h-2 bg-orange-100 dark:bg-orange-950/60 rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-500 dark:bg-orange-400 rounded-full transition-all duration-300 ease-out shadow-[0_0_8px_rgba(249,115,22,0.8)]"
                style={{ width: `${Math.max(8, progressPercent)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] text-orange-800/80 dark:text-orange-300/80 uppercase tracking-wider">
              <span>STAGE // {progress?.stage || 'QUALITY & METADATA'}</span>
              <span>SANDBOX // CANVAS EXECUTION</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
            Evaluating luminance variance, Laplacian sharpness, and recompression error differentials. Zero document data is transmitted to external servers.
          </p>
        </div>
      </Card>
    )
  }

  // 3. STATE: ERROR
  if (status === 'error') {
    return (
      <Card
        sectionCode="STAGE // 03"
        title="Image Integrity & Forensics"
        subtitle="Forensic analysis could not be completed"
        action={
          <Badge variant="danger" size="sm">
            PIPELINE FAULT
          </Badge>
        }
      >
        <div className="space-y-4 font-sans">
          <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200 text-xs space-y-2">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-mono font-bold uppercase tracking-wider block text-rose-950 dark:text-rose-100 mb-0.5">
                  INTEGRITY PIPELINE FAULT
                </span>
                <p className="text-rose-800 dark:text-rose-300 text-[11px] leading-relaxed">
                  {error || 'Unable to decode image pixels or perform canvas recompression analysis.'}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end font-mono">
            <button
              type="button"
              disabled={disabled}
              onClick={onRetryAnalysis}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold uppercase tracking-wider shadow-xs transition-all cursor-pointer ${
                disabled
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                  : 'bg-rose-600 hover:bg-rose-700 text-white'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>RETRY FORENSICS</span>
            </button>
          </div>
        </div>
      </Card>
    )
  }

  // 4. STATE: SUCCESS
  if (status === 'success' && result) {
    const { quality, metadata, ela, findings, assessment } = result
    const filteredFindings =
      selectedCategory === 'all' ? findings : findings.filter((f) => f.category === selectedCategory)

    return (
      <Card
        sectionCode="STAGE // 03"
        title="Image Integrity & Quality Findings"
        subtitle={`Completed at ${result.analyzedAt} • Client-Side Heuristics`}
        action={
          <div className="flex items-center gap-2 font-mono">
            {getPriorityBadge(assessment.priority)}
          </div>
        }
      >
        <div className="space-y-6 font-sans">
          {/* ASSESSMENT SUMMARY BANNER */}
          <div
            className={`p-4 rounded-lg border text-xs space-y-2 font-mono ${
              assessment.priority === 'manual-review'
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-950 dark:text-amber-200'
                : assessment.priority === 'inconclusive'
                ? 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {assessment.priority === 'manual-review' ? (
                <ShieldAlert className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              ) : assessment.priority === 'inconclusive' ? (
                <HelpCircle className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <span className="font-bold text-sm uppercase tracking-wider block font-heading">
                  PRELIMINARY TRIAGE: {assessment.priorityLabel}
                </span>
                <p className="leading-relaxed font-sans">{assessment.summary}</p>
                <div className="pt-1 flex items-center gap-1.5 text-[11px] font-mono opacity-90 font-bold">
                  <span>RECOMMENDED ACTION:</span>
                  <span>{assessment.recommendedAction}</span>
                </div>
              </div>
            </div>
          </div>

          {/* QUALITY METRICS GRID */}
          <div className="space-y-3 font-mono">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-orange-500" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  PHYSICAL RASTER METRICS
                </h4>
              </div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                {quality.width} × {quality.height} PX
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              {/* Resolution Metric */}
              <div
                className={`p-3 rounded-lg border ${
                  quality.isLowResolution
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-slate-50/80 dark:bg-slate-950/60 border-slate-200/80 dark:border-slate-800'
                }`}
              >
                <span className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                  RESOLUTION
                </span>
                <span className="font-bold text-slate-900 dark:text-slate-100 block truncate">
                  {quality.width} × {quality.height}
                </span>
                <span
                  className={`text-[10px] font-bold block mt-1 uppercase ${
                    quality.isLowResolution ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {quality.isLowResolution ? 'SUB-OPTIMAL' : 'ADEQUATE'}
                </span>
              </div>

              {/* Luminance Metric */}
              <div
                className={`p-3 rounded-lg border ${
                  quality.isExtremeLuminance
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-slate-50/80 dark:bg-slate-950/60 border-slate-200/80 dark:border-slate-800'
                }`}
              >
                <span className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                  LUMINANCE
                </span>
                <span className="font-bold text-slate-900 dark:text-slate-100 block">
                  {quality.meanLuminance} / 255
                </span>
                <span
                  className={`text-[10px] font-bold block mt-1 uppercase ${
                    quality.isExtremeLuminance ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {quality.meanLuminance < 50 ? 'UNDER-EXPOSED' : quality.meanLuminance > 215 ? 'OVER-EXPOSED' : 'BALANCED'}
                </span>
              </div>

              {/* Contrast Metric */}
              <div
                className={`p-3 rounded-lg border ${
                  quality.isLowContrast
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-slate-50/80 dark:bg-slate-950/60 border-slate-200/80 dark:border-slate-800'
                }`}
              >
                <span className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                  RMS CONTRAST
                </span>
                <span className="font-bold text-slate-900 dark:text-slate-100 block">
                  {quality.contrastStdDev} STDDEV
                </span>
                <span
                  className={`text-[10px] font-bold block mt-1 uppercase ${
                    quality.isLowContrast ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {quality.isLowContrast ? 'LOW DYNAMIC' : 'ADEQUATE'}
                </span>
              </div>

              {/* Sharpness Metric */}
              <div
                className={`p-3 rounded-lg border ${
                  quality.isPotentialBlur
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-slate-50/80 dark:bg-slate-950/60 border-slate-200/80 dark:border-slate-800'
                }`}
              >
                <span className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                  LAPLACIAN SHARPNESS
                </span>
                <span className="font-bold text-slate-900 dark:text-slate-100 block">
                  {quality.blurScore} VAR
                </span>
                <span
                  className={`text-[10px] font-bold block mt-1 uppercase ${
                    quality.isPotentialBlur ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {quality.isPotentialBlur ? 'POTENTIAL BLUR' : 'SHARP EDGES'}
                </span>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono pt-0.5">
              RATIO // {quality.physicalRatioNote}
            </p>
          </div>

          {/* METADATA & ELA FORENSIC SUMMARY ROW */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            {/* Metadata Card */}
            <div className="p-4 rounded-lg bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  <FileCode2 className="w-4 h-4 text-orange-500" />
                  <span>METADATA CONTAINER</span>
                </div>
                <Badge variant={metadata.status === 'present' ? 'info' : 'neutral'} size="sm">
                  {metadata.format} • {metadata.status.toUpperCase()}
                </Badge>
              </div>

              <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400 dark:text-slate-500">CONTAINER:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px]" title={metadata.containerStatusLabel}>
                    {metadata.containerStatusLabel}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 dark:text-slate-500">EXIF HEADERS:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px]" title={metadata.exifStatusLabel}>
                    {metadata.exifStatusLabel}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 dark:text-slate-500">SOFTWARE:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[180px]" title={metadata.softwareStatusLabel}>
                    {metadata.softwareStatusLabel}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 dark:text-slate-500">DEVICE:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[180px]" title={metadata.cameraStatusLabel}>
                    {metadata.cameraStatusLabel}
                  </span>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                NOTE // {metadata.note}
              </p>
            </div>

            {/* Error Level Analysis Card */}
            <div className="p-4 rounded-lg bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  <span>ERROR LEVEL ANALYSIS (ELA)</span>
                </div>
                <Badge variant={ela.supported ? (ela.variance > 0.15 ? 'warning' : 'success') : 'neutral'} size="sm">
                  {ela.supported ? 'JPEG 85% ELA' : 'NON-JPEG (SKIPPED)'}
                </Badge>
              </div>

              {ela.supported ? (
                <>
                  <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400 dark:text-slate-500">MEAN ERROR:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{ela.meanError}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 dark:text-slate-500">HIGH-VARIANCE AREA:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {Math.round(ela.variance * 100)}% OF RASTER
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 dark:text-slate-500">MAX ERROR DELTA:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{ela.maxError} / 255</span>
                    </div>
                  </div>

                  {ela.elaVisualizationUrl && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setShowElaHeatmap(!showElaHeatmap)}
                        className="inline-flex items-center gap-1.5 text-[10px] font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 cursor-pointer uppercase tracking-wider"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{showElaHeatmap ? 'HIDE ELA DIFFERENCE MAP' : 'INSPECT ELA DIFFERENCE MAP'}</span>
                      </button>

                      {showElaHeatmap && (
                        <div className="mt-2 p-2 bg-slate-950 rounded border border-slate-800 flex flex-col items-center">
                          <img
                            src={ela.elaVisualizationUrl}
                            alt="Error Level Analysis Heatmap"
                            className="max-h-48 w-auto object-contain rounded"
                          />
                          <span className="text-[9px] text-slate-400 font-mono mt-1 text-center uppercase tracking-wider">
                            12× ENHANCED ERROR MAP // HIGHER VALUES INDICATE COMPRESSION VARIANCE
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
                  {ela.assessmentNote}
                </p>
              )}
            </div>
          </div>

          {/* EXPLAINABLE FINDINGS AUDIT LIST */}
          <div className="space-y-3 font-mono">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  EXPLAINABLE FINDINGS AUDIT
                </h4>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                  {findings.length} FINDINGS
                </span>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1 text-[10px] uppercase font-bold">
                {(['all', 'quality', 'metadata', 'manipulation'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-orange-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Findings Accordion Cards */}
            <div className="space-y-2">
              {filteredFindings.map((finding) => {
                const isExpanded = expandedFindings[finding.id] ?? false

                return (
                  <div
                    key={finding.id}
                    className="rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 transition-all overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => toggleFindingExpand(finding.id)}
                      className="w-full p-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50/70 dark:hover:bg-slate-900/60 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {getSeverityBadge(finding.severity)}
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate font-heading">
                          {finding.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 hidden sm:inline">
                          {finding.measuredValue}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs space-y-2.5 bg-slate-50/40 dark:bg-slate-900/40 animate-in fade-in duration-150">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <span className="text-slate-400 dark:text-slate-500 block font-mono text-[9px] uppercase">OBSERVATION</span>
                            <span className="text-slate-700 dark:text-slate-300 font-sans">{finding.observation}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 dark:text-slate-500 block font-mono text-[9px] uppercase">TECHNICAL EXPLANATION</span>
                            <span className="text-slate-700 dark:text-slate-300 font-sans">{finding.explanation}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <span className="text-slate-400 dark:text-slate-500 block font-mono text-[9px] uppercase">OPERATIONAL IMPACT</span>
                            <span className="text-slate-700 dark:text-slate-300 font-sans">{finding.importance}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 dark:text-slate-500 block font-mono text-[9px] uppercase">RECOMMENDED ACTION</span>
                            <span className="text-slate-700 dark:text-slate-200 font-semibold font-sans">{finding.recommendation}</span>
                          </div>
                        </div>

                        {finding.limitations && (
                          <div className="p-2 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                            LIMITATION // {finding.limitations}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* ACTION BAR */}
          <div className="pt-1 flex justify-end font-mono">
            <button
              type="button"
              disabled={disabled}
              onClick={onRunAnalysis}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors cursor-pointer ${
                disabled ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>RE-RUN INTEGRITY AUDIT</span>
            </button>
          </div>
        </div>
      </Card>
    )
  }

  return null
}
