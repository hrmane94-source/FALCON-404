import React from 'react'
import { SYSTEM_STATUS_COMPONENTS } from '../../data/systemStatus'
import type { ReadinessStatus } from '../../types'
import { CheckCircle2, CircleDashed, Cpu } from 'lucide-react'

export const SystemReadinessCard: React.FC = () => {
  const getStatusIndicator = (status: ReadinessStatus) => {
    switch (status) {
      case 'available':
        return (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
            ONLINE // READY
          </span>
        )
      case 'disconnected':
        return (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-400 dark:text-slate-500 font-medium tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-600" />
            STANDBY // DISCONNECTED
          </span>
        )
      case 'not-integrated':
        return (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-amber-600 dark:text-amber-400 font-medium tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            PHASE // PLANNED
          </span>
        )
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-5 shadow-xs transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
            <Cpu className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
              SYS // TELEMETRY & ENGINE READINESS
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Active verification subsystems and execution runtime environments.
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/80 px-2 py-0.5 rounded border border-slate-200/60 dark:border-slate-700/60">
          NODE // STANDALONE WASM
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {SYSTEM_STATUS_COMPONENTS.map((item, idx) => (
          <div
            key={item.id}
            className="p-3 rounded-lg bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800 transition-colors"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500">
                0{idx + 1} //
              </span>
              {item.status === 'available' ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              ) : (
                <CircleDashed className="w-3 h-3 text-slate-400" />
              )}
            </div>
            <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 block truncate">
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
