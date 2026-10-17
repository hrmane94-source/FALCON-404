import React from 'react'

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto border-t border-slate-200/80 bg-white text-slate-400 text-xs px-6 sm:px-8 py-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
        <div>
          <span className="font-semibold text-slate-700">FALCON</span>
          <span className="mx-2 text-slate-300">•</span>
          <span>AI-Based Fake Identity &amp; Document Screening System</span>
        </div>

        <div className="text-slate-400">
          Seva First Innovation Challenge 2026
        </div>
      </div>
    </footer>
  )
}
