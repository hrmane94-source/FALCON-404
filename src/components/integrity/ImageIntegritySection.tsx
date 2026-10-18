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
  Layers,
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
        return <Badge variant="danger">High Concern</Badge>
      case 'medium':
        return <Badge variant="warning">Moderate Concern</Badge>
      case 'low':
        return <Badge variant="neutral">Minor Flag</Badge>
      default:
        return <Badge variant="info">Informational</Badge>
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'standard':
        return (
          <Badge variant="success" size="md">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Standard Review</span>
          </Badge>
        )
      case 'manual-review':
        return (
          <Badge variant="warning" size="md">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Manual Review Recommended</span>
          </Badge>
        )
      case 'inconclusive':
        return (
          <Badge variant="neutral" size="md">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Analysis Inconclusive</span>
          </Badge>
        )
      default:
        return <Badge variant="neutral">{priority}</Badge>
    }
  }

  // 1. STATE: IDLE
  if (status === 'idle') {
    return (
      <Card
        title="Stage 03: Image Integrity & Forensics"
        subtitle="Client-side raster quality, metadata headers, and Error Level Analysis (ELA)"
        action={
          <Badge variant="neutral" size="sm">
            Ready to Analyze
          </Badge>
        }
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-600 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>In-Browser Image Forensics &amp; Quality Audit</span>
            </div>
            <p className="leading-relaxed">
              Examines raster quality (exposure, contrast, sharpness, resolution), parses embedded EXIF/JFIF metadata containers, and evaluates localized JPEG compression differentials (Error Level Analysis). Operates 100% locally in browser memory.
            </p>
          </div>

          <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/60 text-[11px] text-amber-900 flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p>
              <strong>Objective Evaluation:</strong> Image analysis detects anomalies and quality constraints. Ordinary compression, resizing, and screenshotting can create artifacts. Findings represent triage signals, not definitive proof of fraud.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-[11px] text-slate-400">
              Pipeline: Quality Matrix • Metadata Inspector • Canvas ELA Engine
            </span>
            <button
              type="button"
              disabled={disabled}
              onClick={onRunAnalysis}
              className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer ${
                disabled
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/10'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Run Image Integrity Analysis</span>
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
        title="Stage 03: Image Integrity & Forensics"
        subtitle="Executing browser-side forensic and quality evaluation..."
        action={
          <Badge variant="info" size="sm" className="animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Analyzing Raster...</span>
          </Badge>
        }
      >
        <div className="space-y-4 py-2">
          <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/80 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-medium text-blue-900">
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                <span>{progress?.status || 'Inspecting raster attributes...'}</span>
              </div>
              <span className="font-mono font-semibold text-blue-700 text-xs">{progressPercent}%</span>
            </div>

            <div className="w-full h-2.5 bg-blue-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.max(8, progressPercent)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-blue-700/80">
              <span>Stage: {progress?.stage || 'Quality & Metadata Analysis'}</span>
              <span>In-Memory Canvas Execution</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            Evaluating luminance variance, Laplacian sharpness, and recompression error differentials. No document data is transmitted to external servers.
          </p>
        </div>
      </Card>
    )
  }

  // 3. STATE: ERROR
  if (status === 'error') {
    return (
      <Card
        title="Stage 03: Image Integrity & Forensics"
        subtitle="Analysis could not be completed"
        action={
          <Badge variant="danger" size="sm">
            Analysis Failed
          </Badge>
        }
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-2">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block text-rose-950 mb-0.5">
                  Integrity Pipeline Error
                </span>
                <p className="text-rose-800 text-[11px] leading-relaxed">
                  {error || 'Unable to decode image pixels or perform canvas recompression analysis.'}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              disabled={disabled}
              onClick={onRetryAnalysis}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer ${
                disabled
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-rose-600 hover:bg-rose-700 text-white'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry Integrity Analysis</span>
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
        title="Stage 03: Image Integrity & Quality Findings"
        subtitle={`Completed at ${result.analyzedAt} • Client-Side Heuristics`}
        action={
          <div className="flex items-center gap-2">
            {getPriorityBadge(assessment.priority)}
          </div>
        }
      >
        <div className="space-y-6">
          {/* ASSESSMENT SUMMARY BANNER */}
          <div
            className={`p-4 rounded-2xl border text-xs space-y-2 ${
              assessment.priority === 'manual-review'
                ? 'bg-amber-50/70 border-amber-200/90 text-amber-950'
                : assessment.priority === 'inconclusive'
                ? 'bg-slate-50 border-slate-200/90 text-slate-900'
                : 'bg-emerald-50/60 border-emerald-200/80 text-emerald-950'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {assessment.priority === 'manual-review' ? (
                <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              ) : assessment.priority === 'inconclusive' ? (
                <HelpCircle className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <span className="font-bold text-sm block">
                  Preliminary Triage: {assessment.priorityLabel}
                </span>
                <p className="leading-relaxed">{assessment.summary}</p>
                <div className="pt-1 flex items-center gap-1.5 text-[11px] opacity-90 font-medium">
                  <span>Recommended Action:</span>
                  <span>{assessment.recommendedAction}</span>
                </div>
              </div>
            </div>
          </div>

          {/* QUALITY METRICS GRID */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-blue-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Physical Raster &amp; Quality Metrics
                </h4>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                {quality.width} × {quality.height} px
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              {/* Resolution Metric */}
              <div
                className={`p-3 rounded-xl border ${
                  quality.isLowResolution
                    ? 'bg-amber-50/60 border-amber-200/80'
                    : 'bg-slate-50/80 border-slate-200/70'
                }`}
              >
                <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
                  Raster Resolution
                </span>
                <span className="font-semibold text-slate-900 block truncate">
                  {quality.width} × {quality.height}
                </span>
                <span
                  className={`text-[10px] font-medium block mt-0.5 ${
                    quality.isLowResolution ? 'text-amber-700' : 'text-emerald-700'
                  }`}
                >
                  {quality.isLowResolution ? 'Sub-optimal' : 'Adequate'}
                </span>
              </div>

              {/* Luminance Metric */}
              <div
                className={`p-3 rounded-xl border ${
                  quality.isExtremeLuminance
                    ? 'bg-amber-50/60 border-amber-200/80'
                    : 'bg-slate-50/80 border-slate-200/70'
                }`}
              >
                <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
                  Perceived Luminance
                </span>
                <span className="font-semibold text-slate-900 block">
                  {quality.meanLuminance} / 255
                </span>
                <span
                  className={`text-[10px] font-medium block mt-0.5 ${
                    quality.isExtremeLuminance ? 'text-amber-700' : 'text-emerald-700'
                  }`}
                >
                  {quality.meanLuminance < 50 ? 'Under-Exposed' : quality.meanLuminance > 215 ? 'Over-Exposed' : 'Balanced'}
                </span>
              </div>

              {/* Contrast Metric */}
              <div
                className={`p-3 rounded-xl border ${
                  quality.isLowContrast
                    ? 'bg-amber-50/60 border-amber-200/80'
                    : 'bg-slate-50/80 border-slate-200/70'
                }`}
              >
                <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
                  RMS Contrast
                </span>
                <span className="font-semibold text-slate-900 block">
                  {quality.contrastStdDev} StdDev
                </span>
                <span
                  className={`text-[10px] font-medium block mt-0.5 ${
                    quality.isLowContrast ? 'text-amber-700' : 'text-emerald-700'
                  }`}
                >
                  {quality.isLowContrast ? 'Low Dynamic Range' : 'Adequate Separation'}
                </span>
              </div>

              {/* Sharpness / Blur Metric */}
              <div
                className={`p-3 rounded-xl border ${
                  quality.isPotentialBlur
                    ? 'bg-amber-50/60 border-amber-200/80'
                    : 'bg-slate-50/80 border-slate-200/70'
                }`}
              >
                <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
                  Laplacian Sharpness
                </span>
                <span className="font-semibold text-slate-900 block">
                  {quality.blurScore} Variance
                </span>
                <span
                  className={`text-[10px] font-medium block mt-0.5 ${
                    quality.isPotentialBlur ? 'text-amber-700' : 'text-emerald-700'
                  }`}
                >
                  {quality.isPotentialBlur ? 'Potential Blur' : 'Sharp Edges'}
                </span>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 italic pt-0.5">
              {quality.physicalRatioNote}
            </p>
          </div>

          {/* METADATA & ELA FORENSIC SUMMARY ROW */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Metadata Card */}
            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/70 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                  <FileCode2 className="w-4 h-4 text-indigo-600" />
                  <span>Metadata Container</span>
                </div>
                <Badge variant={metadata.status === 'present' ? 'info' : 'neutral'} size="sm">
                  {metadata.format} • {metadata.status.toUpperCase()}
                </Badge>
              </div>

              <div className="space-y-1.5 text-[11px] text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-400">Container Format:</span>
                  <span className="font-medium text-slate-800 truncate max-w-[200px]" title={metadata.containerStatusLabel}>
                    {metadata.containerStatusLabel}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">EXIF Headers:</span>
                  <span className="font-medium text-slate-800 truncate max-w-[200px]" title={metadata.exifStatusLabel}>
                    {metadata.exifStatusLabel}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Software Signature:</span>
                  <span className="font-medium text-slate-800 truncate max-w-[180px]" title={metadata.softwareStatusLabel}>
                    {metadata.softwareStatusLabel}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Capture Device:</span>
                  <span className="font-medium text-slate-800 truncate max-w-[180px]" title={metadata.cameraStatusLabel}>
                    {metadata.cameraStatusLabel}
                  </span>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-200/60">
                {metadata.note}
              </p>
            </div>

            {/* Error Level Analysis Card */}
            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/70 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span>Error Level Analysis (ELA)</span>
                </div>
                <Badge variant={ela.supported ? (ela.variance > 0.15 ? 'warning' : 'success') : 'neutral'} size="sm">
                  {ela.supported ? 'JPEG 85% ELA' : 'Non-JPEG (N/A)'}
                </Badge>
              </div>

              {ela.supported ? (
                <>
                  <div className="space-y-1.5 text-[11px] text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Mean Recompression Error:</span>
                      <span className="font-mono font-medium text-slate-800">{ela.meanError}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">High-Variance Area:</span>
                      <span className="font-mono font-medium text-slate-800">
                        {Math.round(ela.variance * 100)}% of raster
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Max Error Delta:</span>
                      <span className="font-mono font-medium text-slate-800">{ela.maxError} / 255</span>
                    </div>
                  </div>

                  {ela.elaVisualizationUrl && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setShowElaHeatmap(!showElaHeatmap)}
                        className="inline-flex items-center gap-1.5 text-[11px] font-medium text-purple-700 hover:text-purple-900 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{showElaHeatmap ? 'Hide ELA Difference Map' : 'Inspect ELA Difference Map'}</span>
                      </button>

                      {showElaHeatmap && (
                        <div className="mt-2 p-2 bg-slate-950 rounded-lg border border-slate-800 flex flex-col items-center">
                          <img
                            src={ela.elaVisualizationUrl}
                            alt="Error Level Analysis Heatmap"
                            className="max-h-48 w-auto object-contain rounded"
                          />
                          <span className="text-[10px] text-slate-400 font-mono mt-1 text-center">
                            12× Enhanced Error Map (Bright areas indicate higher compression variance)
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {ela.assessmentNote}
                </p>
              )}
            </div>
          </div>

          {/* EXPLAINABLE FINDINGS AUDIT LIST */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Explainable Findings
                </h4>
                <Badge variant="neutral" size="sm">
                  {findings.length} Observations
                </Badge>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1 text-[11px]">
                {(['all', 'quality', 'metadata', 'manipulation'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer capitalize ${
                      selectedCategory === cat
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
                    className="rounded-xl border border-slate-200/80 bg-white transition-all overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => toggleFindingExpand(finding.id)}
                      className="w-full p-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50/70 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {getSeverityBadge(finding.severity)}
                        <span className="text-xs font-semibold text-slate-900 truncate">
                          {finding.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                          {finding.measuredValue}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 border-t border-slate-100 text-xs space-y-2.5 bg-slate-50/40 animate-in fade-in duration-150">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <span className="text-slate-400 block font-mono">OBSERVATION</span>
                            <span className="text-slate-700">{finding.observation}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-mono">EXPLANATION</span>
                            <span className="text-slate-700">{finding.explanation}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <span className="text-slate-400 block font-mono">OPERATIONAL IMPACT</span>
                            <span className="text-slate-700">{finding.importance}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-mono">RECOMMENDED ACTION</span>
                            <span className="text-slate-700 font-medium">{finding.recommendation}</span>
                          </div>
                        </div>

                        {finding.limitations && (
                          <div className="p-2 rounded-lg bg-slate-100/80 text-[10px] text-slate-500 italic">
                            Limitation: {finding.limitations}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* TRANSPARENCY DISCLAIMER */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70 text-[11px] text-slate-600 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p>
                <strong>Evaluation Transparency:</strong> Image integrity analysis evaluates physical raster metrics and compression indicators. It does NOT prove document genuineness, nor does it definitively establish fraud.
              </p>
              <div className="flex items-center gap-1.5 text-slate-500 pt-0.5">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                <span>1:1 Facial biometric comparison remains scheduled for Phase 5.</span>
              </div>
            </div>
          </div>

          {/* ACTION BAR: RE-RUN */}
          <div className="pt-1 flex justify-end">
            <button
              type="button"
              disabled={disabled}
              onClick={onRunAnalysis}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer ${
                disabled ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Re-run Integrity Analysis</span>
            </button>
          </div>
        </div>
      </Card>
    )
  }

  return null
}
