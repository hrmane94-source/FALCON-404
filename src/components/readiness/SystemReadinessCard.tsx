import React from 'react'
import { SYSTEM_STATUS_COMPONENTS } from '../../data/systemStatus'
import type { ReadinessStatus } from '../../types'

export const SystemReadinessCard: React.FC = () => {
  const getStatusIndicator = (status: ReadinessStatus) => {
    switch (status) {
      case 'available':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Available
          </span>
        )
      case 'disconnected':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <span className="w-2 h-2 rounded-full bg-slate-300" />
            Not connected
          </span>
        )
      case 'not-integrated':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-amber-700 font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Not integrated
          </span>
        )
    }
  }

  return (
    <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-4 pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-base font-semibold text-slate-900 tracking-tight">
            System Status
          </h3>
          <p className="text-xs text-slate-500">
            Current technical status of platform components.
          </p>
        </div>
        <span className="text-[11px] text-slate-400">
          Phase 1 Evaluation Environment
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {SYSTEM_STATUS_COMPONENTS.map((item) => (
          <div key={item.id} className="p-3 rounded-lg bg-slate-50/70 border border-slate-100">
            <span className="text-xs font-semibold text-slate-800 block truncate">
              {item.name}
            </span>
            <div className="mt-2">
              {getStatusIndicator(item.status)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
