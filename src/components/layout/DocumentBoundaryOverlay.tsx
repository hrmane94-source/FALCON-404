import React, { useState } from 'react'
import { Eye, EyeOff, Maximize2, RotateCw, Sparkles, AlertCircle } from 'lucide-react'
import type { DocumentLayoutResult } from '../../types'

export interface DocumentBoundaryOverlayProps {
  layoutResult: DocumentLayoutResult | null
  imageWidth?: number
  imageHeight?: number
  className?: string
}

export const DocumentBoundaryOverlay: React.FC<DocumentBoundaryOverlayProps> = ({
  layoutResult,
  imageWidth: _imageWidth = 800,
  imageHeight: _imageHeight = 500,
  className = ''
}) => {
  const [showOverlay, setShowOverlay] = useState(true)
  const [showDetails, setShowDetails] = useState(false)

  if (!layoutResult) return null

  const { status, detectorScore, geometry, perspective, framing } = layoutResult
  const hasBoundary = status === 'boundary-detected' || status === 'partial-boundary-detected' || status === 'boundary-uncertain'
  const isReliable = status === 'boundary-detected'

  const corners = geometry?.normalizedCorners

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* SVG Vector Boundary Overlay */}
      {showOverlay && hasBoundary && corners && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-10 transition-opacity duration-200"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {/* Subtle quad fill and glowing stroke */}
          <polygon
            points={`${corners.topLeft.x * 100},${corners.topLeft.y * 100} ${corners.topRight.x * 100},${corners.topRight.y * 100} ${corners.bottomRight.x * 100},${corners.bottomRight.y * 100} ${corners.bottomLeft.x * 100},${corners.bottomLeft.y * 100}`}
            fill={isReliable ? 'rgba(37, 99, 235, 0.12)' : 'rgba(217, 119, 6, 0.15)'}
            stroke={isReliable ? '#2563eb' : '#d97706'}
            strokeWidth="0.8"
            strokeDasharray={isReliable ? 'none' : '2,1'}
            vectorEffect="non-scaling-stroke"
          />

          {/* Corner target circles */}
          {[
            { id: 'TL', pt: corners.topLeft },
            { id: 'TR', pt: corners.topRight },
            { id: 'BR', pt: corners.bottomRight },
            { id: 'BL', pt: corners.bottomLeft }
          ].map(({ id, pt }) => (
            <g key={id}>
              <circle
                cx={pt.x * 100}
                cy={pt.y * 100}
                r="1.5"
                fill={isReliable ? '#2563eb' : '#d97706'}
                stroke="#ffffff"
                strokeWidth="0.5"
              />
            </g>
          ))}
        </svg>
      )}

      {/* Floating Corner Badges in HTML for crisp text rendering */}
      {showOverlay && hasBoundary && corners && (
        <div className="absolute inset-0 pointer-events-none z-15 overflow-hidden">
          {[
            { label: 'TL', pt: corners.topLeft, align: '-translate-x-1/2 -translate-y-1/2' },
            { label: 'TR', pt: corners.topRight, align: '-translate-x-1/2 -translate-y-1/2' },
            { label: 'BR', pt: corners.bottomRight, align: '-translate-x-1/2 -translate-y-1/2' },
            { label: 'BL', pt: corners.bottomLeft, align: '-translate-x-1/2 -translate-y-1/2' }
          ].map(({ label, pt, align }) => (
            <div
              key={label}
              style={{ left: `${pt.x * 100}%`, top: `${pt.y * 100}%` }}
              className={`absolute ${align} flex items-center justify-center`}
            >
              <span
                className={`text-[9px] font-mono font-bold px-1 py-0.5 rounded shadow-xs ${
                  isReliable ? 'bg-blue-600 text-white' : 'bg-amber-600 text-white'
                }`}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Top Overlay Header / Toggle Controls */}
      <div className="absolute top-2 left-2 right-2 z-20 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-xs text-white px-2.5 py-1 rounded-lg text-[10px] font-medium shadow-sm">
          <Sparkles className="w-3 h-3 text-blue-400" />
          <span>Stage 04: Boundary Overlay</span>
          <span className="text-slate-400 font-mono">({detectorScore}/100)</span>
        </div>

        <div className="flex items-center gap-1.5">
          {hasBoundary && (
            <button
              type="button"
              onClick={() => setShowOverlay(!showOverlay)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-900 text-white text-[10px] font-medium shadow-sm transition-all cursor-pointer backdrop-blur-xs"
              title={showOverlay ? 'Hide boundary overlay' : 'Show boundary overlay'}
            >
              {showOverlay ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              <span>{showOverlay ? 'Hide Overlay' : 'Show Overlay'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-900 text-white text-[10px] font-medium shadow-sm transition-all cursor-pointer backdrop-blur-xs"
            title="Inspect geometric measurements"
          >
            <Maximize2 className="w-3 h-3 text-slate-300" />
            <span>{showDetails ? 'Hide Metrics' : 'Metrics'}</span>
          </button>
        </div>
      </div>

      {/* Floating Detailed Metrics Panel */}
      {showDetails && (
        <div className="absolute bottom-2 left-2 right-2 z-20 bg-slate-900/90 backdrop-blur-md text-white p-3 rounded-xl text-xs space-y-2 border border-slate-700/60 shadow-lg pointer-events-auto animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-1.5">
            <span className="font-semibold text-[11px] text-blue-300 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" />
              Document Geometry &amp; Perspective Metrics
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              Heuristic Score: {detectorScore}/100
            </span>
          </div>

          {geometry ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div>
                <span className="text-slate-400 block text-[9px] uppercase font-mono">Quad Dimensions</span>
                <span className="font-medium">{geometry.averageWidth} × {geometry.averageHeight} px</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px] uppercase font-mono">Area Coverage</span>
                <span className="font-medium">{Math.round(geometry.areaCoverageRatio * 100)}% of frame</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px] uppercase font-mono">Rotation Angle</span>
                <span className="font-medium flex items-center gap-1">
                  <RotateCw className="w-2.5 h-2.5 text-blue-400" />
                  {perspective?.rotationAngleDeg || 0}°
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px] uppercase font-mono">Keystone Ratio</span>
                <span className="font-medium">{perspective?.apparentKeystoneRatio || 1.0}</span>
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-amber-300">
              Document boundary could not be localized within this raster. Full geometry metrics are unavailable.
            </p>
          )}

          <div className="pt-1 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Framing: {framing.statusLabel}</span>
            <span className="text-slate-500">Computer-generated heuristic estimate</span>
          </div>
        </div>
      )}

      {/* Non-detected Banner Notice */}
      {!hasBoundary && (
        <div className="absolute bottom-2 left-2 right-2 z-20 bg-slate-900/85 backdrop-blur-xs text-amber-300 p-2.5 rounded-xl text-[11px] flex items-center gap-2 border border-amber-500/30">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>
            <strong>Boundary Inconclusive:</strong> No distinct quadrilateral boundary detected. Document may fill the entire raster or lack edge contrast.
          </span>
        </div>
      )}
    </div>
  )
}
