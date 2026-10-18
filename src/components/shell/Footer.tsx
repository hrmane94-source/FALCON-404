import React from 'react'
import { PROJECT_BRANDING } from '../../constants/branding'

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto border-t border-slate-200/80 bg-white text-slate-400 text-xs px-6 sm:px-8 py-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2 gap-y-1">
          <span className="font-semibold text-slate-800">{PROJECT_BRANDING.projectName}</span>
          <span className="text-slate-300">•</span>
          <span>{PROJECT_BRANDING.systemTagline}</span>
        </div>

        <div className="text-slate-500 flex flex-wrap items-center justify-center sm:justify-end gap-x-2 gap-y-1">
          <span>Developed by <strong className="text-slate-700 font-medium">{PROJECT_BRANDING.developerName}</strong></span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-400">{PROJECT_BRANDING.challengeName}</span>
        </div>
      </div>
    </footer>
  )
}
