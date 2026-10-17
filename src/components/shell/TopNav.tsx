import React from 'react'
import { Menu, Plus } from 'lucide-react'
import type { NavigationSection } from '../../types'

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
  const getSectionTitle = (section: NavigationSection) => {
    switch (section) {
      case 'overview':
        return 'Overview'
      case 'new-verification':
        return 'New Verification'
      case 'case-history':
        return 'Case History'
      case 'reports':
        return 'Reports'
      case 'settings':
        return 'Settings'
      default:
        return 'Screening Portal'
    }
  }

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200/80 h-16 flex items-center px-4 sm:px-8 justify-between">
      {/* Left: Mobile menu & current section title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-1.5 -ml-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 lg:hidden cursor-pointer"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <h2 className="text-base font-semibold text-slate-900 tracking-tight">
          {getSectionTitle(currentSection)}
        </h2>
      </div>

      {/* Right: Unobtrusive prototype status & primary action */}
      <div className="flex items-center gap-3">
        {/* Subtle prototype indicator */}
        <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-md text-xs font-normal text-slate-500 bg-slate-100 border border-slate-200/60">
          Prototype Phase
        </span>

        {/* Primary Action Button */}
        {currentSection !== 'new-verification' && (
          <button
            type="button"
            onClick={() => onNavigate('new-verification')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Start Verification</span>
          </button>
        )}
      </div>
    </header>
  )
}
