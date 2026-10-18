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
  Info,
  CheckCircle2,
  Sparkles,
  HelpCircle,
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
        return <Badge variant="success" size="sm">Boundary Localized</Badge>
      case 'partial-boundary-detected':
        return <Badge variant="warning" size="sm">Partial Boundary</Badge>
      case 'boundary-uncertain':
        return <Badge variant="neutral" size="sm">Boundary Uncertain</Badge>
      case 'boundary-not-detected':
        return <Badge variant="neutral" size="sm">No Boundary Detected</Badge>
      default:
        return <Badge variant="danger" size="sm">{result.statusLabel}</Badge>
    }
  }

  return (
    <Card
      title="Stage 04: Document Boundary & Layout Analysis"
      subtitle="Evaluates document boundary localization, perspective distortion, framing compliance, and text layout containment."
      action={
        <div className="flex items-center gap-2">
          {getStatusBadge()}

          {status === 'idle' && (
            <button
              type="button"
              disabled={disabled}
              onClick={onRunAnalysis}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer ${
                disabled
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run Boundary Analysis</span>
            </button>
          )}

          {isError && (
            <button
              type="button"
              disabled={disabled}
              onClick={onRetryAnalysis}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry Analysis</span>
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* State 1: Idle Notice */}
        {status === 'idle' && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-semibold">
              <Scan className="w-4 h-4 text-blue-600" />
              <span>Ready for Client-Side Edge &amp; Layout Inspection</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Detects physical card boundaries using Sobel gradient analysis, measures in-plane rotation and perspective keystone ratios, checks border framing margins, and audits OCR text containment within the estimated credential region.
            </p>
          </div>
        )}

        {/* State 2: Active Analysis Progress */}
        {isAnalyzing && (
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600 animate-spin" />
                <span>{progress?.status || 'Analyzing document perimeter...'}</span>
              </span>
              <span className="font-mono text-slate-500">
                {Math.round((progress?.progress || 0) * 100)}%
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.max(5, (progress?.progress || 0) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* State 3: Error Banner */}
        {isError && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-rose-900">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>Boundary Analysis Engine Failure</span>
            </div>
            <p className="text-[11px] leading-relaxed">{error}</p>
          </div>
        )}

        {/* State 4: Complete Results */}
        {isComplete && result && (
          <div className="space-y-6">
            {/* Top Navigation Tabs */}
            <div className="flex items-center gap-1 border-b border-slate-200 pb-2 text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveTab('metrics')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'metrics'
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Geometry &amp; Perspective ({result.detectorScore}/100)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('findings')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'findings'
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <span>Explainable Findings</span>
                <span className="w-4.5 h-4.5 rounded-full bg-slate-100 text-slate-600 text-[10px] flex items-center justify-center font-bold">
                  {result.findings.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('corners')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'corners'
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Corner Coordinates
              </button>
            </div>

            {/* TAB 1: METRICS (Geometry, Perspective, Framing, Layout) */}
            {activeTab === 'metrics' && (
              <div className="space-y-4">
                {/* 4 Metric Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Card 1: Boundary Fit */}
                  <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-1">
                    <div className="flex items-center justify-between text-slate-400">
                      <span
                        className="text-[10px] uppercase font-mono tracking-wider font-semibold cursor-help"
                        title="Heuristic boundary detector edge-fit score (0-100). Reflects geometric edge contrast and corner consistency, not document authenticity or fraud probability."
                      >
                        Heuristic Boundary Score
                      </span>
                      <Scan className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl font-bold text-slate-900">{result.detectorScore}</span>
                      <span className="text-xs text-slate-400">/ 100</span>
                    </div>
                    <span className="text-[11px] text-slate-500 block truncate font-medium">
                      {result.statusLabel}
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate">
                      Detector edge fit (not a fraud probability)
                    </span>
                  </div>

                  {/* Card 2: Perspective Keystone */}
                  <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-1">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="text-[10px] uppercase font-mono tracking-wider font-semibold">Keystone Ratio</span>
                      <Maximize className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl font-bold text-slate-900">
                        {result.perspective ? result.perspective.apparentKeystoneRatio : 'N/A'}
                      </span>
                      <span className="text-xs text-slate-400">ratio</span>
                    </div>
                    <span className="text-[11px] text-slate-500 block truncate font-medium">
                      {result.perspective?.isSeverePerspective ? 'Perspective convergence' : 'Near-orthogonal'}
                    </span>
                  </div>

                  {/* Card 3: In-Plane Rotation */}
                  <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-1">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="text-[10px] uppercase font-mono tracking-wider font-semibold">Rotation Angle</span>
                      <RotateCw className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl font-bold text-slate-900">
                        {result.perspective ? `${result.perspective.rotationAngleDeg}°` : '0.0°'}
                      </span>
                      <span className="text-xs text-slate-400">tilt</span>
                    </div>
                    <span className="text-[11px] text-slate-500 block truncate font-medium">
                      {result.perspective?.isRotated ? 'Tilt detected' : 'Level alignment'}
                    </span>
                  </div>

                  {/* Card 4: Framing & Clearance */}
                  <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-1">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="text-[10px] uppercase font-mono tracking-wider font-semibold">Framing Status</span>
                      <Crop className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl font-bold text-slate-900">
                        {result.framing.minMarginPx}
                      </span>
                      <span className="text-xs text-slate-400">px min margin</span>
                    </div>
                    <span className="text-[11px] text-slate-500 block truncate font-medium">
                      {result.framing.statusLabel}
                    </span>
                  </div>
                </div>

                {/* Perspective & Framing Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Panel A: Perspective & Corner Angles */}
                  <div className="p-4 rounded-xl border border-slate-200/80 bg-white space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                        <Maximize className="w-3.5 h-3.5 text-blue-600" />
                        <span>Perspective &amp; Quadrilateral Angles</span>
                      </span>
                      {result.perspective && (
                        <span className="text-[10px] font-mono text-slate-400">
                          Skew: {result.perspective.horizontalSkewRatio}H • {result.perspective.verticalSkewRatio}V
                        </span>
                      )}
                    </div>

                    {result.perspective ? (
                      <div className="space-y-2.5">
                        <div className="grid grid-cols-4 gap-2 text-center">
                          {[
                            { label: 'Top-Left', val: result.perspective.cornerAnglesDeg.topLeft },
                            { label: 'Top-Right', val: result.perspective.cornerAnglesDeg.topRight },
                            { label: 'Bottom-Right', val: result.perspective.cornerAnglesDeg.bottomRight },
                            { label: 'Bottom-Left', val: result.perspective.cornerAnglesDeg.bottomLeft }
                          ].map((c) => (
                            <div key={c.label} className="p-2 bg-slate-50 rounded-lg border border-slate-200/60">
                              <span className="text-[9px] uppercase font-mono text-slate-400 block">{c.label}</span>
                              <span className="font-semibold text-xs text-slate-900">{c.val}°</span>
                            </div>
                          ))}
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-200/60">
                          {result.perspective.observation}
                        </p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500 italic">
                        Perspective angles are unavailable because boundary could not be localized.
                      </p>
                    )}
                  </div>

                  {/* Panel B: Layout Containment & Margins */}
                  <div className="p-4 rounded-xl border border-slate-200/80 bg-white space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-blue-600" />
                        <span>OCR Text Spatial Containment</span>
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 font-medium">
                        {result.layoutQuality.containmentRatio !== null
                          ? `${result.layoutQuality.containmentFormatted} contained`
                          : result.layoutQuality.containmentFormatted}
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/60">
                          <span className="text-[9px] uppercase font-mono text-slate-400 block">Total Text Boxes</span>
                          <span className="font-semibold text-xs text-slate-900">{result.layoutQuality.totalTextRegions}</span>
                        </div>
                        <div className="p-2 bg-emerald-50/70 rounded-lg border border-emerald-200/60 text-emerald-900">
                          <span className="text-[9px] uppercase font-mono text-emerald-700 block">Inside Boundary</span>
                          <span className="font-semibold text-xs">
                            {result.layoutQuality.totalTextRegions > 0 ? result.layoutQuality.regionsInsideBoundary : 'N/A'}
                          </span>
                        </div>
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/60">
                          <span className="text-[9px] uppercase font-mono text-slate-400 block">Outside Boundary</span>
                          <span className="font-semibold text-xs text-slate-900">
                            {result.layoutQuality.totalTextRegions > 0 ? result.layoutQuality.regionsOutsideBoundary : 'N/A'}
                          </span>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-200/60">
                        {result.layoutQuality.layoutAssessmentNote}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Framing Margin Breakdown */}
                <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">Border Margin Clearance</span>
                    <span className="text-[11px] text-slate-500 font-medium">{result.framing.statusLabel}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[11px]">
                    <div className="p-2 bg-white rounded-lg border border-slate-200/70">
                      <span className="text-[9px] uppercase font-mono text-slate-400 block">Top Margin</span>
                      <span className="font-mono font-medium">{result.framing.marginsPx.top} px</span>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-slate-200/70">
                      <span className="text-[9px] uppercase font-mono text-slate-400 block">Right Margin</span>
                      <span className="font-mono font-medium">{result.framing.marginsPx.right} px</span>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-slate-200/70">
                      <span className="text-[9px] uppercase font-mono text-slate-400 block">Bottom Margin</span>
                      <span className="font-mono font-medium">{result.framing.marginsPx.bottom} px</span>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-slate-200/70">
                      <span className="text-[9px] uppercase font-mono text-slate-400 block">Left Margin</span>
                      <span className="font-mono font-medium">{result.framing.marginsPx.left} px</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 pt-1 leading-relaxed">
                    {result.framing.assessmentNote}
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: EXPLAINABLE FINDINGS */}
            {activeTab === 'findings' && (
              <div className="space-y-3">
                {/* Filter buttons */}
                <div className="flex flex-wrap items-center gap-1.5 pb-1">
                  {[
                    { id: 'all', label: 'All Findings' },
                    { id: 'boundary', label: 'Boundary' },
                    { id: 'perspective', label: 'Perspective' },
                    { id: 'framing', label: 'Framing' },
                    { id: 'layout', label: 'Layout' }
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id as any)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        selectedCategory === cat.id
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
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
                          className="border border-slate-200/80 rounded-xl overflow-hidden transition-all bg-white shadow-2xs"
                        >
                          <button
                            type="button"
                            onClick={() => toggleFinding(finding.id)}
                            className="w-full p-3.5 text-left flex items-start justify-between gap-3 hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={
                                    finding.severity === 'high'
                                      ? 'danger'
                                      : finding.severity === 'medium'
                                      ? 'warning'
                                      : finding.severity === 'low'
                                      ? 'warning'
                                      : 'neutral'
                                  }
                                  size="sm"
                                >
                                  {finding.category.toUpperCase()}
                                </Badge>
                                <span className="font-semibold text-xs text-slate-900">
                                  {finding.title}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-600 line-clamp-1">
                                {finding.observation}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-[11px] font-mono text-slate-500 font-medium">
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
                            <div className="p-3.5 pt-0 border-t border-slate-100 space-y-2 text-xs bg-slate-50/60 animate-in fade-in">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                                <div>
                                  <span className="text-[10px] uppercase font-mono text-slate-400 block">Technical Explanation</span>
                                  <p className="text-[11px] text-slate-700 leading-relaxed mt-0.5">{finding.explanation}</p>
                                </div>
                                <div>
                                  <span className="text-[10px] uppercase font-mono text-slate-400 block">Why It Matters</span>
                                  <p className="text-[11px] text-slate-700 leading-relaxed mt-0.5">{finding.importance}</p>
                                </div>
                              </div>

                              <div className="p-2.5 bg-blue-50/70 rounded-lg border border-blue-200/60 text-blue-950 text-[11px] flex items-start gap-2">
                                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 mt-0.5" />
                                <div>
                                  <strong>Recommended Action:</strong> {finding.recommendation}
                                </div>
                              </div>

                              {finding.limitations && (
                                <div className="text-[10px] text-slate-500 italic flex items-center gap-1.5 pt-1">
                                  <HelpCircle className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                  <span>{finding.limitations}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                </div>
              </div>
            )}

            {/* TAB 3: CORNERS (Corner Coordinates Table) */}
            {activeTab === 'corners' && (
              <div className="space-y-3">
                {result.geometry ? (
                  <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono text-[10px] uppercase">
                        <tr>
                          <th className="p-2.5">Vertex</th>
                          <th className="p-2.5">Pixel (X, Y)</th>
                          <th className="p-2.5">Normalized (0-1)</th>
                          <th className="p-2.5">Internal Angle</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                        <tr>
                          <td className="p-2.5 font-bold text-slate-900">Top-Left (TL)</td>
                          <td className="p-2.5">{result.geometry.corners.topLeft.x}, {result.geometry.corners.topLeft.y} px</td>
                          <td className="p-2.5 text-slate-500">{result.geometry.normalizedCorners.topLeft.x}, {result.geometry.normalizedCorners.topLeft.y}</td>
                          <td className="p-2.5 text-blue-700 font-semibold">{result.perspective?.cornerAnglesDeg.topLeft}°</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-bold text-slate-900">Top-Right (TR)</td>
                          <td className="p-2.5">{result.geometry.corners.topRight.x}, {result.geometry.corners.topRight.y} px</td>
                          <td className="p-2.5 text-slate-500">{result.geometry.normalizedCorners.topRight.x}, {result.geometry.normalizedCorners.topRight.y}</td>
                          <td className="p-2.5 text-blue-700 font-semibold">{result.perspective?.cornerAnglesDeg.topRight}°</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-bold text-slate-900">Bottom-Right (BR)</td>
                          <td className="p-2.5">{result.geometry.corners.bottomRight.x}, {result.geometry.corners.bottomRight.y} px</td>
                          <td className="p-2.5 text-slate-500">{result.geometry.normalizedCorners.bottomRight.x}, {result.geometry.normalizedCorners.bottomRight.y}</td>
                          <td className="p-2.5 text-blue-700 font-semibold">{result.perspective?.cornerAnglesDeg.bottomRight}°</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-bold text-slate-900">Bottom-Left (BL)</td>
                          <td className="p-2.5">{result.geometry.corners.bottomLeft.x}, {result.geometry.corners.bottomLeft.y} px</td>
                          <td className="p-2.5 text-slate-500">{result.geometry.normalizedCorners.bottomLeft.x}, {result.geometry.normalizedCorners.bottomLeft.y}</td>
                          <td className="p-2.5 text-blue-700 font-semibold">{result.perspective?.cornerAnglesDeg.bottomLeft}°</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic p-4 text-center">
                    No corner coordinates available for this raster.
                  </p>
                )}

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 text-[11px] text-slate-500 flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                  <p>
                    <strong>Evaluation Scope:</strong> Coordinates represent the computer-vision edge detector's estimated quadrilateral bounding perimeter. They are not legal boundary certificates and do not establish physical credential authenticity.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
