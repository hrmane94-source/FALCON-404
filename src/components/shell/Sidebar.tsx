import React from 'react'
import {
  LayoutDashboard,
  PlusCircle,
  FileText,
  SlidersHorizontal,
  FolderArchive,
  ShieldCheck,
  X
} from 'lucide-react'
import type { NavigationSection } from '../../types'

export interface SidebarProps {
  currentSection: NavigationSection
  onNavigate: (section: NavigationSection) => void
  isOpen: boolean
  onClose: () => void
}

interface NavItemConfig {
  id: NavigationSection
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentSection,
  onNavigate,
  isOpen,
  onClose
}) => {
  const navItems: NavItemConfig[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: LayoutDashboard
    },
    {
      id: 'new-verification',
      label: 'New Verification',
      icon: PlusCircle
    },
    {
      id: 'case-history',
      label: 'Case History',
      icon: FolderArchive
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: FileText,
      badge: 'Planned'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: SlidersHorizontal,
      badge: 'Planned'
    }
  ]

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-xs lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white text-slate-700 flex flex-col border-r border-slate-200/80 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header / Brand */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-4.5 h-4.5 text-orange-400" />
              </div>
              <div>
                <span className="font-bold text-lg tracking-tight text-slate-900 block leading-tight">
                  FALCON
                </span>
                <span className="text-[11px] text-slate-500 font-normal block leading-tight">
                  Document Screening
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mt-2.5 font-normal leading-snug">
              Seva First Innovation Challenge 2026
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 -mr-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 lg:hidden cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = currentSection === item.id
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onNavigate(item.id)
                  onClose()
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors cursor-pointer text-left ${
                  isActive
                    ? 'bg-blue-50/80 text-blue-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-normal'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 ${
                      isActive ? 'text-blue-600' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Footer / System status note */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="text-slate-500 font-medium">Phase 1</span>
            <span className="text-slate-400">Frontend Prototype</span>
          </div>
        </div>
      </aside>
    </>
  )
}
