import React from 'react'
import { Menu, ChevronRight, Scan } from 'lucide-react'
import type { NavigationSection } from '../../types'
import { ThemeSelector } from '../common/ThemeSelector'

export interface TopNavProps {
  currentSection: NavigationSection
  onNavigate: (section: NavigationSection) => void
  onToggleSidebar: () => void
}

export const TopNav: React.FC<TopNavProps> = ({
  currentSection,
  onNavigate,
  onToggleSidebar
}) => {
  const getSectionMetadata = (section: NavigationSection) => {
    switch (section) {
      case 'overview':
        return { title: 'Overview', code: 'SYS-OVERVIEW' }
      case 'new-verification':
        return { title: 'New Verification', code: 'INTAKE-SCREEN' }
      case 'case-history':
        return { title: 'Case History', code: 'ARCHIVE-LOG' }
      case 'reports':
        return { title: 'Audit Reports', code: 'REPORT-GEN' }
      case 'settings':
        return { title: 'Platform Settings', code: 'CFG-CONSOLE' }
      default:
        return { title: 'Screening Portal', code: 'TERMINAL' }
    }
  }

  const { title, code } = getSectionMetadata(currentSection)

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#090d16]/95 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800/90 h-16 flex items-center px-4 sm:px-8 justify-between transition-colors">
      {/* Left: Mobile trigger & Technical Breadcrumb Hierarchy */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-1.5 -ml-1 rounded-md text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden cursor-pointer"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-xs">
          <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500 hidden sm:inline">
            FALCON //
          </span>
          <span className="font-mono text-[10px] tracking-wider uppercase text-blue-600 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200/50 dark:border-blue-900/50 hidden md:inline">
            {code}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-700 hidden sm:inline" />
          <h1 className="font-heading text-base font-bold text-slate-950 dark:text-slate-50 tracking-tight">
            {title}
          </h1>
        </div>
      </div>

      {/* Right: Technical Controls (Theme Selector + Primary Screening CTA) */}
      <div className="flex items-center gap-3">
        {/* Working Theme Selector */}
        <ThemeSelector />

        {/* Primary Action Button */}
        {currentSection !== 'new-verification' && (
          <button
            type="button"
            onClick={() => onNavigate('new-verification')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-lg text-xs font-semibold font-sans transition-all cursor-pointer shadow-xs"
          >
            <Scan className="w-3.5 h-3.5" />
            <span>New Verification</span>
          </button>
        )}
      </div>
    </header>
  )
}
