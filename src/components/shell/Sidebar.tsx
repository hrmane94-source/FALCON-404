import React from 'react'
import {
  LayoutDashboard,
  PlusCircle,
  FileText,
  SlidersHorizontal,
  FolderArchive,
  X,
  Cpu,
  ShieldCheck
} from 'lucide-react'
import type { NavigationSection } from '../../types'
import { PROJECT_BRANDING } from '../../constants/branding'
import { FalconEmblem } from '../common/FalconEmblem'

export interface SidebarProps {
  currentSection: NavigationSection
  onNavigate: (section: NavigationSection) => void
  isOpen: boolean
  onClose: () => void
}

interface NavItemConfig {
  id: NavigationSection
  stageIndex: string
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
      stageIndex: '01',
      label: 'System Overview',
      icon: LayoutDashboard
    },
    {
      id: 'new-verification',
      stageIndex: '02',
      label: 'Document Intake & Screening',
      icon: PlusCircle
    },
    {
      id: 'case-history',
      stageIndex: '03',
      label: 'Case History',
      icon: FolderArchive
    },
    {
      id: 'reports',
      stageIndex: '04',
      label: 'Audit Reports',
      icon: FileText,
      badge: 'Dossier Active'
    },
    {
      id: 'settings',
      stageIndex: '05',
      label: 'Platform Settings',
      icon: SlidersHorizontal
    }
  ]

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Forensic Navigation Rail */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-white dark:bg-[#090d16] text-slate-700 dark:text-slate-300 flex flex-col border-r border-slate-200/90 dark:border-slate-800/90 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header / Brand Identity with Official Falcon Emblem */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/40 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-slate-900 dark:bg-slate-800/90 text-white border border-slate-800 dark:border-slate-700 shadow-xs flex-shrink-0">
                <FalconEmblem size={24} />
              </div>
              <div className="min-w-0">
                <span className="font-heading font-bold text-base tracking-tight text-slate-950 dark:text-slate-50 block leading-none">
                  {PROJECT_BRANDING.projectName}
                </span>
                <span className="font-mono text-[10px] tracking-widest uppercase text-blue-600 dark:text-blue-400 font-semibold block mt-1">
                  Forensic Intelligence
                </span>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 text-[10px] font-mono text-slate-400 dark:text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>TERMINAL // ONLINE</span>
              <span>•</span>
              <span>WASM // ACTIVE</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 -mr-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Technical Group Header */}
        <div className="px-5 pt-4 pb-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center justify-between">
          <span>Screening Workstation</span>
          <span>SEC // 01</span>
        </div>

        {/* Navigation Items Rail */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
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
                className={`w-full group flex items-center justify-between px-3 py-2.5 rounded-lg text-xs transition-all cursor-pointer text-left ${
                  isActive
                    ? 'bg-blue-50/90 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-semibold border-l-2 border-blue-600 dark:border-blue-500 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 font-normal'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`font-mono text-[10px] tracking-tighter ${
                      isActive ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-400 dark:text-slate-600'
                    }`}
                  >
                    {item.stageIndex}
                  </span>
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 transition-colors ${
                      isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge && (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-100/60 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/60 font-medium">
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Workstation Specification & Developer Attribution Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#070b12]/60 space-y-3">
          {/* Workstation Capabilities Indicator */}
          <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 space-y-1.5 text-[10px]">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 font-mono">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-3 h-3 text-blue-500" />
                <span>ENGINES</span>
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">ALL LOCAL</span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
              Tesseract OCR • Canvas ELA • Edge Quad Geometry
            </div>
          </div>

          {/* Explicit Developer Attribution */}
          <div className="pt-1 flex items-center justify-between">
            <div className="min-w-0">
              <span className="text-slate-400 dark:text-slate-500 block font-mono text-[9px] uppercase tracking-wider">
                Developed by
              </span>
              <span className="font-heading font-semibold text-slate-900 dark:text-slate-200 text-xs truncate block">
                {PROJECT_BRANDING.developerName}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded border border-slate-200/60 dark:border-slate-700/60">
              <ShieldCheck className="w-3 h-3 text-orange-500" />
              <span>GEN 2</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
