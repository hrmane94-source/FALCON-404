import React, { useState } from 'react'
import {
  Scan,
  Maximize,
  RotateCw,
  Crop,
  Layers,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Play,
  RotateCcw
} from 'lucide-react'
import type {
  DocumentLayoutResult,
  LayoutAnalysisStatus,
  LayoutProgress,
  LayoutFindingCategory
} from '../../types'
import { Card } from '../common/Card'
import { Badge } from '../common/Badge'

export interface DocumentLayoutSectionProps {
  status: LayoutAnalysisStatus
  progress: LayoutProgress | null
  result: DocumentLayoutResult | null
  error: string | null
  disabled?: boolean
  onRunAnalysis: () => void
  onRetryAnalysis: () => void
}

export const DocumentLayoutSection: React.FC<DocumentLayoutSectionProps> = ({
  status,
  progress,
  result,
  error,
  disabled = false,
  onRunAnalysis,
  onRetryAnalysis
}) => {
  const [activeTab, setActiveTab] = useState<'metrics' | 'findings' | 'corners'>('metrics')
  const [selectedCategory, setSelectedCategory] = useState<LayoutFindingCategory | 'all'>('all')
  const [expandedFindingId, setExpandedFindingId] = useState<string | null>(null)

  const isAnalyzing = status === 'analyzing'
  const isComplete = status === 'success' && result !== null
  const isError = status === 'error'

  const toggleFinding = (id: string) => {
    setExpandedFindingId(expandedFindingId === id ? null : id)
  }

  const getStatusBadge = () => {
    if (!result) return null
    switch (result.status) {
      case 'boundary-detected':
        return <Badge variant="success" size="sm">BOUNDARY LOCALIZED</Badge>
      case 'partial-boundary-detected':
        return <Badge variant="warning" size="sm">PARTIAL BOUNDARY</Badge>
      case 'boundary-uncertain':
        return <Badge variant="neutral" size="sm">UNCERTAIN</Badge>
      case 'boundary-not-detected':
        return <Badge variant="neutral" size="sm">NO BOUNDARY</Badge>
      default:
        return <Badge variant="danger" size="sm">{result.statusLabel.toUpperCase()}</Badge>
    }
  }

  return (
    <Card
      sectionCode="STAGE // 04"
      title="Document Boundary & Layout Analysis"
      subtitle="Evaluates perimeter boundary localization, perspective distortion, framing compliance, and OCR text containment."
      action={
        <div className="flex items-center gap-2 font-mono">
          {getStatusBadge()}

          {status === 'idle' && (
            <button
              type="button"
              disabled={disabled}
              onClick={onRunAnalysis}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider shadow-xs transition-all cursor-pointer ${
                disabled
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                  : 'bg-orange-600 hover:bg-orange-700 text-white shadow-orange-600/20'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>RUN BOUNDARY AUDIT</span>
            </button>
          )}

          {isError && (
            <button
              type="button"
              disabled={disabled}
              onClick={onRetryAnalysis}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>RETRY</span>
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-6 font-sans">
        {/* State 1: Idle Notice */}
        {status === 'idle' && (
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-2">
            <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-mono font-bold uppercase tracking-wider">
              <Scan className="w-4 h-4 text-orange-500" />
              <span>CLIENT-SIDE PERIMETER &amp; PERSPECTIVE AUDIT</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
              Detects physical credential boundaries using Sobel gradient analysis, measures in-plane rotation and perspective keystone ratios, checks framing margins, and audits OCR text containment within the estimated credential perimeter.
            </p>
          </div>
        )}

        {/* State 2: Active Analysis Progress */}
        {isAnalyzing && (
          <div className="p-6 rounded-lg bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200/80 dark:border-orange-900/40 space-y-3 font-mono">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-orange-950 dark:text-orange-200 flex items-center gap-2 uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-orange-500 animate-spin" />
                <span>{progress?.status || 'Analyzing document perimeter...'}</span>
              </span>
              <span className="font-mono font-bold text-orange-600 dark:text-orange-400">
                {Math.round((progress?.progress || 0) * 100)}%
              </span>
            </div>
            <div className="w-full bg-orange-100 dark:bg-orange-950/60 h-2 rounded-full overflow-hidden">
              <div
                className="bg-orange-500 dark:bg-orange-400 h-full rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(249,115,22,0.8)]"
                style={{ width: `${Math.max(5, (progress?.progress || 0) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* State 3: Error Banner */}
        {isError && (
          <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-200 space-y-2">
            <div className="flex items-center gap-2 font-mono font-bold uppercase tracking-wider text-rose-900 dark:text-rose-100">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
              <span>BOUNDARY DETECTOR FAILURE</span>
            </div>
            <p className="text-[11px] leading-relaxed font-sans">{error}</p>
          </div>
        )}

        {/* State 4: Complete Results */}
        {isComplete && result && (
          <div className="space-y-6">
            {/* Top Navigation Tabs */}
            <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 pb-2 text-xs font-mono font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('metrics')}
                className={`px-3 py-1.5 rounded uppercase tracking-wider transition-colors cursor-pointer ${
                  activeTab === 'metrics'
                    ? 'bg-orange-600 text-white'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                GEOMETRY ({result.detectorScore}/100)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('findings')}
                className={`px-3 py-1.5 rounded uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'findings'
                    ? 'bg-orange-600 text-white'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <span>FINDINGS</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] ${activeTab === 'findings' ? 'bg-orange-800 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
                  {result.findings.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('corners')}
                className={`px-3 py-1.5 rounded uppercase tracking-wider transition-colors cursor-pointer ${
                  activeTab === 'corners'
                    ? 'bg-orange-600 text-white'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                COORDINATES (TL, TR, BR, BL)
              </button>
            </div>

            {/* TAB 1: METRICS */}
            {activeTab === 'metrics' && (
              <div className="space-y-4">
                {/* 4 Metric Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
                  {/* Card 1: Boundary Fit */}
                  <div className="p-3.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 space-y-1">
                    <div className="flex items-center justify-between text-slate-400 dark:text-slate-500">
                      <span className="text-[9px] uppercase tracking-wider font-semibold">
                        DETECTOR SCORE
                      </span>
                      <Scan className="w-3.5 h-3.5 text-orange-500" />
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl font-bold text-slate-900 dark:text-slate-100">{result.detectorScore}</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">/ 100</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 block truncate uppercase">
                      {result.statusLabel}
                    </span>
                  </div>

                  {/* Card 2: Perspective Keystone */}
                  <div className="p-3.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 space-y-1">
                    <div className="flex items-center justify-between text-slate-400 dark:text-slate-500">
                      <span className="text-[9px] uppercase tracking-wider font-semibold">KEYSTONE RATIO</span>
                      <Maximize className="w-3.5 h-3.5 text-orange-500" />
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
                        {result.perspective ? result.perspective.apparentKeystoneRatio : 'N/A'}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">RATIO</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 block truncate uppercase">
                      {result.perspective?.isSeverePerspective ? 'PERSPECTIVE CONVERGENCE' : 'NEAR-ORTHOGONAL'}
                    </span>
                  </div>

                  {/* Card 3: In-Plane Rotation */}
                  <div className="p-3.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 space-y-1">
                    <div className="flex items-center justify-between text-slate-400 dark:text-slate-500">
                      <span className="text-[9px] uppercase tracking-wider font-semibold">ROTATION ANGLE</span>
                      <RotateCw className="w-3.5 h-3.5 text-orange-500" />
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
                        {result.perspective ? `${result.perspective.rotationAngleDeg}°` : '0.0°'}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">TILT</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 block truncate uppercase">
                      {result.perspective?.isRotated ? 'TILT DETECTED' : 'LEVEL ALIGNMENT'}
                    </span>
                  </div>

                  {/* Card 4: Framing & Clearance */}
                  <div className="p-3.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 space-y-1">
                    <div className="flex items-center justify-between text-slate-400 dark:text-slate-500">
                      <span className="text-[9px] uppercase tracking-wider font-semibold">FRAMING MARGIN</span>
                      <Crop className="w-3.5 h-3.5 text-orange-500" />
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
                        {result.framing.minMarginPx}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">PX MIN</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 block truncate uppercase">
                      {result.framing.statusLabel}
                    </span>
                  </div>
                </div>

                {/* Perspective & Spatial Containment Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono">
                  {/* Panel A: Corner Angles */}
                  <div className="p-4 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <Maximize className="w-3.5 h-3.5 text-orange-500" />
                        <span>INTERNAL QUAD ANGLES</span>
                      </span>
                      {result.perspective && (
                        <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                          SKEW: {result.perspective.horizontalSkewRatio}H • {result.perspective.verticalSkewRatio}V
                        </span>
                      )}
                    </div>

                    {result.perspective ? (
                      <div className="space-y-2.5">
                        <div className="grid grid-cols-4 gap-2 text-center">
                          {[
                            { label: 'TL', val: result.perspective.cornerAnglesDeg.topLeft },
                            { label: 'TR', val: result.perspective.cornerAnglesDeg.topRight },
                            { label: 'BR', val: result.perspective.cornerAnglesDeg.bottomRight },
                            { label: 'BL', val: result.perspective.cornerAnglesDeg.bottomLeft }
                          ].map((c) => (
                            <div key={c.label} className="p-2 bg-slate-50 dark:bg-slate-900 rounded border border-slate-200/60 dark:border-slate-800">
                              <span className="text-[8px] uppercase font-mono text-slate-400 dark:text-slate-500 block">{c.label}</span>
                              <span className="font-bold text-xs text-slate-900 dark:text-slate-100">{c.val}°</span>
                            </div>
                          ))}
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900 p-2.5 rounded border border-slate-200/60 dark:border-slate-800 font-sans">
                          {result.perspective.observation}
                        </p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 italic font-sans">
                        Perspective angles unavailable because perimeter could not be localized.
                      </p>
                    )}
                  </div>

                  {/* Panel B: Layout Containment */}
                  <div className="p-4 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-orange-500" />
                        <span>OCR TEXT SPATIAL CONTAINMENT</span>
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-bold uppercase">
                        {result.layoutQuality.containmentRatio !== null
                          ? `${result.layoutQuality.containmentFormatted} CONTAINED`
                          : result.layoutQuality.containmentFormatted}
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded border border-slate-200/60 dark:border-slate-800">
                          <span className="text-[8px] uppercase font-mono text-slate-400 dark:text-slate-500 block">TOTAL BOXES</span>
                          <span className="font-bold text-xs text-slate-900 dark:text-slate-100">{result.layoutQuality.totalTextRegions}</span>
                        </div>
                        <div className="p-2 bg-emerald-500/10 rounded border border-emerald-500/30 text-emerald-950 dark:text-emerald-200">
                          <span className="text-[8px] uppercase font-mono text-emerald-600 dark:text-emerald-400 block">INSIDE</span>
                          <span className="font-bold text-xs">
                            {result.layoutQuality.totalTextRegions > 0 ? result.layoutQuality.regionsInsideBoundary : 'N/A'}
                          </span>
                        </div>
                        <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded border border-slate-200/60 dark:border-slate-800">
                          <span className="text-[8px] uppercase font-mono text-slate-400 dark:text-slate-500 block">OUTSIDE</span>
                          <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                            {result.layoutQuality.totalTextRegions > 0 ? result.layoutQuality.regionsOutsideBoundary : 'N/A'}
                          </span>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900 p-2.5 rounded border border-slate-200/60 dark:border-slate-800 font-sans">
                        {result.layoutQuality.layoutAssessmentNote}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: FINDINGS */}
            {activeTab === 'findings' && (
              <div className="space-y-3 font-mono">
                {/* Filter buttons */}
                <div className="flex flex-wrap items-center gap-1.5 pb-1">
                  {[
                    { id: 'all', label: 'ALL FINDINGS' },
                    { id: 'boundary', label: 'BOUNDARY' },
                    { id: 'perspective', label: 'PERSPECTIVE' },
                    { id: 'framing', label: 'FRAMING' },
                    { id: 'layout', label: 'LAYOUT' }
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id as any)}
                      className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                        selectedCategory === cat.id
                          ? 'bg-orange-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Findings Accordion List */}
                <div className="space-y-2">
                  {result.findings
                    .filter((f) => selectedCategory === 'all' || f.category === selectedCategory)
                    .map((finding) => {
                      const isExpanded = expandedFindingId === finding.id
                      return (
                        <div
                          key={finding.id}
                          className="border border-slate-200/80 dark:border-slate-800 rounded-lg overflow-hidden transition-all bg-white dark:bg-slate-950"
                        >
                          <button
                            type="button"
                            onClick={() => toggleFinding(finding.id)}
                            className="w-full p-3.5 text-left flex items-start justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors cursor-pointer"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={
                                    finding.severity === 'high'
                                      ? 'danger'
                                      : finding.severity === 'medium'
                                      ? 'warning'
                                      : 'neutral'
                                  }
                                  size="sm"
                                >
                                  {finding.category.toUpperCase()}
                                </Badge>
                                <span className="font-bold text-xs text-slate-900 dark:text-slate-100 font-heading">
                                  {finding.title}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-1 font-sans">
                                {finding.observation}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 font-bold">
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
                            <div className="p-3.5 pt-0 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs bg-slate-50/60 dark:bg-slate-900/40 animate-in fade-in">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                                <div>
                                  <span className="text-[9px] uppercase font-mono text-slate-400 dark:text-slate-500 block">TECHNICAL EXPLANATION</span>
                                  <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed mt-0.5 font-sans">{finding.explanation}</p>
                                </div>
                                <div>
                                  <span className="text-[9px] uppercase font-mono text-slate-400 dark:text-slate-500 block">OPERATIONAL SIGNIFICANCE</span>
                                  <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed mt-0.5 font-sans">{finding.importance}</p>
                                </div>
                              </div>

                              <div className="p-2.5 bg-orange-500/10 rounded border border-orange-500/20 text-orange-950 dark:text-orange-200 text-[11px] flex items-start gap-2">
                                <CheckCircle2 className="w-3.5 h-3.5 text-orange-500 flex-shrink-0 mt-0.5" />
                                <div>
                                  <strong>ACTION:</strong> {finding.recommendation}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                </div>
              </div>
            )}

            {/* TAB 3: CORNERS TABLE */}
            {activeTab === 'corners' && (
              <div className="space-y-3 font-mono">
                {result.geometry ? (
                  <div className="overflow-x-auto rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider">
                        <tr>
                          <th className="p-2.5">VERTEX</th>
                          <th className="p-2.5">PIXEL (X, Y)</th>
                          <th className="p-2.5">NORMALIZED (0-1)</th>
                          <th className="p-2.5">INTERNAL ANGLE</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                        <tr>
                          <td className="p-2.5 font-bold text-slate-900 dark:text-slate-100">Top-Left (TL)</td>
                          <td className="p-2.5 text-slate-800 dark:text-slate-200">{result.geometry.corners.topLeft.x}, {result.geometry.corners.topLeft.y} px</td>
                          <td className="p-2.5 text-slate-500 dark:text-slate-400">{result.geometry.normalizedCorners.topLeft.x}, {result.geometry.normalizedCorners.topLeft.y}</td>
                          <td className="p-2.5 text-orange-600 dark:text-orange-400 font-bold">{result.perspective?.cornerAnglesDeg.topLeft}°</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-bold text-slate-900 dark:text-slate-100">Top-Right (TR)</td>
                          <td className="p-2.5 text-slate-800 dark:text-slate-200">{result.geometry.corners.topRight.x}, {result.geometry.corners.topRight.y} px</td>
                          <td className="p-2.5 text-slate-500 dark:text-slate-400">{result.geometry.normalizedCorners.topRight.x}, {result.geometry.normalizedCorners.topRight.y}</td>
                          <td className="p-2.5 text-orange-600 dark:text-orange-400 font-bold">{result.perspective?.cornerAnglesDeg.topRight}°</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-bold text-slate-900 dark:text-slate-100">Bottom-Right (BR)</td>
                          <td className="p-2.5 text-slate-800 dark:text-slate-200">{result.geometry.corners.bottomRight.x}, {result.geometry.corners.bottomRight.y} px</td>
                          <td className="p-2.5 text-slate-500 dark:text-slate-400">{result.geometry.normalizedCorners.bottomRight.x}, {result.geometry.normalizedCorners.bottomRight.y}</td>
                          <td className="p-2.5 text-orange-600 dark:text-orange-400 font-bold">{result.perspective?.cornerAnglesDeg.bottomRight}°</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-bold text-slate-900 dark:text-slate-100">Bottom-Left (BL)</td>
                          <td className="p-2.5 text-slate-800 dark:text-slate-200">{result.geometry.corners.bottomLeft.x}, {result.geometry.corners.bottomLeft.y} px</td>
                          <td className="p-2.5 text-slate-500 dark:text-slate-400">{result.geometry.normalizedCorners.bottomLeft.x}, {result.geometry.normalizedCorners.bottomLeft.y}</td>
                          <td className="p-2.5 text-orange-600 dark:text-orange-400 font-bold">{result.perspective?.cornerAnglesDeg.bottomLeft}°</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400 italic p-4 text-center font-sans">
                    No corner coordinates available for this raster.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
