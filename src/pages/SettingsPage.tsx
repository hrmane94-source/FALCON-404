import React from 'react'
import { Sun, Moon, Laptop } from 'lucide-react'
import { Card } from '../components/common/Card'
import { Badge } from '../components/common/Badge'
import { useTheme, type Theme } from '../context/ThemeContext'
import { PROJECT_BRANDING } from '../constants/branding'

export const SettingsPage: React.FC = () => {
  const { theme, setTheme } = useTheme()

  const themeOptions: {
    id: Theme
    code: string
    title: string
    description: string
    icon: React.ComponentType<{ className?: string }>
  }[] = [
    {
      id: 'light',
      code: 'THEME // 01',
      title: 'Light Forensic Aesthetic',
      description: 'Clean institutional daylight aesthetic with crisp slate surfaces and clear contrast.',
      icon: Sun
    },
    {
      id: 'dark',
      code: 'THEME // 02',
      title: 'Deep Obsidian Dark Theme',
      description: 'Deep navy/slate environment optimized for forensic analysis and low-light inspection.',
      icon: Moon
    },
    {
      id: 'system',
      code: 'THEME // 03',
      title: 'System Automatic Sync',
      description: 'Syncs automatically with your operating system display preferences.',
      icon: Laptop
    }
  ]

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Title & Forensic Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/90 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight uppercase">
              WORKSTATION CALIBRATION &amp; SETTINGS
            </h2>
            <Badge variant="neutral" size="sm">
              SEC // 05
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-sans">
            Interface preferences, platform configurations, and screening sensitivity thresholds.
          </p>
        </div>

        <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-900 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800 self-start sm:self-auto">
          SYSTEM CALIBRATION // NOMINAL
        </div>
      </div>

      {/* Appearance & Theme Selector */}
      <Card
        sectionCode="PREF // 01"
        title="Display Calibration &amp; Theme Engine"
        subtitle="Select your preferred optical presentation mode for document forensics."
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
          {themeOptions.map((opt) => {
            const Icon = opt.icon
            const isSelected = theme === opt.id

            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTheme(opt.id)}
                className={`p-4 rounded-lg border text-left transition-all duration-150 cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-orange-500/10 border-orange-500 ring-1 ring-orange-500'
                    : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className={`w-8 h-8 rounded flex items-center justify-center ${
                        isSelected
                          ? 'bg-orange-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[9px] uppercase tracking-wider text-slate-400">
                      {opt.code}
                    </span>
                  </div>

                  <h4 className="font-heading text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                    {opt.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-snug font-sans">
                    {opt.description}
                  </p>
                </div>

                <div className="mt-4 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">STATUS</span>
                  {isSelected ? (
                    <span className="text-orange-600 dark:text-orange-400 font-bold uppercase tracking-wider">
                      ACTIVE CALIBRATION
                    </span>
                  ) : (
                    <span className="text-slate-500 uppercase tracking-wider">SELECT</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 font-mono">
        {/* Service Endpoints */}
        <Card
          sectionCode="DIAG // 01"
          title="Runtime Execution Environment"
          subtitle="Connection gateway and WASM runtime endpoints."
        >
          <div className="space-y-4 text-xs">
            <div>
              <label className="text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider block mb-1">
                EXECUTION ARCHITECTURE
              </label>
              <input
                type="text"
                disabled
                value="CLIENT_WASM // STANDALONE RUNTIME"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-700 dark:text-slate-300 text-xs cursor-not-allowed font-mono font-bold"
              />
              <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
                Zero external dependencies. Images never leave client memory space.
              </span>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400">
              <span className="font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">DATA BOUNDARIES</span>
              <p className="font-sans text-xs">Full privacy controls active. Local Object URLs revoked upon unmount.</p>
            </div>
          </div>
        </Card>

        {/* Sensitivity Thresholds */}
        <Card
          sectionCode="CALIB // 02"
          title="Screening Sensitivity Thresholds"
          subtitle="Automated heuristics and confidence calibrations."
        >
          <div className="space-y-4 text-xs text-slate-600 dark:text-slate-400">
            <div>
              <div className="flex justify-between mb-1">
                <span className="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">OCR CONFIDENCE PASS</span>
                <span className="font-mono text-orange-600 dark:text-orange-400 font-bold">85%</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-orange-500 h-1.5 rounded-full w-[85%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">ELA ERROR VARIANCE CUTOFF</span>
                <span className="font-mono text-orange-600 dark:text-orange-400 font-bold">15%</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-purple-500 h-1.5 rounded-full w-[15%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">SOBEL EDGE FIT MINIMUM</span>
                <span className="font-mono text-orange-600 dark:text-orange-400 font-bold">50 / 100</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-1.5 rounded-full w-[50%]" />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Attribution Footer Bar */}
      <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400 gap-2">
        <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          {PROJECT_BRANDING.developerFullAttribution}
        </span>
        <span className="text-[10px] uppercase tracking-wider">
          {PROJECT_BRANDING.challengeName} // GEN 2
        </span>
      </div>
    </div>
  )
}
