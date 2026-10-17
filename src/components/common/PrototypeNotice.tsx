import React from 'react'
import { Info, AlertTriangle } from 'lucide-react'
import { Badge } from './Badge'

export interface PrototypeNoticeProps {
  compact?: boolean
  className?: string
}

export const PrototypeNotice: React.FC<PrototypeNoticeProps> = ({
  compact = false,
  className = ''
}) => {
  if (compact) {
    return (
      <div
        className={`flex items-center justify-between gap-3 px-3.5 py-2 bg-amber-50/90 border border-amber-200/90 rounded-md text-xs text-amber-900 ${className}`}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
          <span className="font-medium">
            Phase 1 Frontend Prototype: Backend &amp; AI engines are currently not integrated.
          </span>
        </div>
        <Badge variant="warning" size="sm">
          Prototype Mode
        </Badge>
      </div>
    )
  }

  return (
    <div
      className={`bg-slate-900 text-slate-200 rounded-lg border border-slate-800 p-4 sm:p-5 shadow-sm relative overflow-hidden ${className}`}
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600" />
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-md bg-orange-500/10 border border-orange-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Info className="w-4 h-4 text-orange-400" />
          </div>
          <div>
            <div className="flex items-center flex-wrap gap-2 mb-1">
              <span className="text-xs font-mono uppercase tracking-wider text-orange-400 font-semibold">
                SEVA FIRST INNOVATION CHALLENGE 2026
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-xs font-mono text-slate-300">Phase 1: Frontend Foundation</span>
            </div>
            <h4 className="text-sm font-semibold text-white tracking-tight">
              Institutional Demonstration Environment
            </h4>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-3xl">
              This deployment represents the interface foundation, navigation architecture, and planned workflow layout for FALCON. In accordance with Phase 1 parameters, backend microservices, OCR models, digital forensic algorithms, and biometric face verification are not connected. Displayed cases are illustrative demonstration fixtures.
            </p>
          </div>
        </div>
        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 flex-shrink-0 pt-1 border-t sm:border-t-0 border-slate-800">
          <Badge variant="subtle" size="md">
            Phase 1 / 5
          </Badge>
          <span className="text-[11px] font-mono text-slate-400">
            Offline Prototype
          </span>
        </div>
      </div>
    </div>
  )
}
