import React from 'react'
import { PROJECT_BRANDING } from '../../constants/branding'
import { FalconEmblem } from '../common/FalconEmblem'

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto border-t border-slate-200/90 dark:border-slate-800/90 bg-white/80 dark:bg-[#070b12]/80 backdrop-blur-xs text-xs px-6 sm:px-8 py-3.5 transition-colors">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2.5 gap-y-1">
          <div className="flex items-center gap-1.5 font-heading font-semibold text-slate-900 dark:text-slate-100">
            <FalconEmblem size={16} />
            <span>{PROJECT_BRANDING.projectName}</span>
          </div>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
            {PROJECT_BRANDING.systemConcept}
          </span>
          <span className="text-slate-300 dark:text-slate-700 hidden md:inline">•</span>
          <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 hidden md:inline">
            CORE // CLIENT-SIDE WASM
          </span>
        </div>

        <div className="text-slate-500 dark:text-slate-400 flex flex-wrap items-center justify-center sm:justify-end gap-x-2 gap-y-1 text-[11px]">
          <span>Developed by <strong className="font-heading font-semibold text-slate-800 dark:text-slate-200">{PROJECT_BRANDING.developerName}</strong></span>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <span className="font-mono text-slate-400 dark:text-slate-500">{PROJECT_BRANDING.challengeName}</span>
        </div>
      </div>
    </footer>
  )
}
