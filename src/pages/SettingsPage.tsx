import React, { useState } from 'react'
import {
  Sun,
  Moon,
  Laptop,
  Database,
  Trash2,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react'
import { Card } from '../components/common/Card'
import { Badge } from '../components/common/Badge'
import { Modal } from '../components/common/Modal'
import { useTheme, type Theme } from '../context/ThemeContext'
import { useCases } from '../context/CaseContext'
import { exportConsolidatedAuditLedger } from '../utils/savedCaseExport'
import { PROJECT_BRANDING } from '../constants/branding'

export const SettingsPage: React.FC = () => {
  const { theme, setTheme } = useTheme()
  const { cases, storageStats, stationId, setStationId, clearAllCases, refreshStats } = useCases()

  const [inputStationId, setInputStationId] = useState(stationId)
  const [stationSavedNotice, setStationSavedNotice] = useState(false)
  const [showPurgeModal, setShowPurgeModal] = useState(false)
  const [isPurging, setIsPurging] = useState(false)
  const [purgeSuccessNotice, setPurgeSuccessNotice] = useState(false)
  const [isRefreshingStats, setIsRefreshingStats] = useState(false)

  const handleStationIdSave = (e: React.FormEvent) => {
    e.preventDefault()
    setStationId(inputStationId)
    setStationSavedNotice(true)
    setTimeout(() => setStationSavedNotice(false), 3000)
  }

  const handleRefreshStats = async () => {
    setIsRefreshingStats(true)
    await refreshStats()
    setTimeout(() => setIsRefreshingStats(false), 500)
  }

  const handlePurgeAllConfirm = async () => {
    try {
      setIsPurging(true)
      await clearAllCases()
      setShowPurgeModal(false)
      setPurgeSuccessNotice(true)
      setTimeout(() => setPurgeSuccessNotice(false), 4000)
    } catch (err) {
      console.error('Failed to purge database:', err)
    } finally {
      setIsPurging(false)
    }
  }

  const handleExportArchive = () => {
    if (cases.length === 0) return
    exportConsolidatedAuditLedger(cases)
  }

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
            Interface preferences, local storage telemetry, station identifiers, and audit ledger maintenance.
          </p>
        </div>

        <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-900 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800 self-start sm:self-auto">
          CALIBRATION // NOMINAL
        </div>
      </div>

      {/* Station Identifier Configuration */}
      <Card
        sectionCode="STATION // 01"
        title="Examiner &amp; Station Identification"
        subtitle="Configures the audit station stamp attached to screening dossiers recorded from this browser profile."
      >
        <form onSubmit={handleStationIdSave} className="space-y-3 font-mono text-xs">
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="E.G. STATION-01, MOBILE-TERMINAL, BORDER-DESK-4"
                value={inputStationId}
                onChange={(e) => setInputStationId(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-500 uppercase tracking-wider font-mono font-bold"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded font-bold uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap"
            >
              UPDATE STATION ID
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>
              Currently Active Identifier:{' '}
              <strong className="text-slate-800 dark:text-slate-200">{stationId || 'DEFAULT (STATION-01)'}</strong>
            </span>
            {stationSavedNotice && (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>SAVED TO LOCAL PROFILE</span>
              </span>
            )}
          </div>
        </form>
      </Card>

      {/* Local Storage Telemetry & Maintenance */}
      <Card
        sectionCode="STORAGE // 02"
        title="Local Database &amp; Audit Ledger Maintenance"
        subtitle="Manage client-side IndexedDB storage (`falcon_cases_db`), review storage footprint, and maintain dossiers."
        action={
          <button
            type="button"
            onClick={handleRefreshStats}
            className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshingStats ? 'animate-spin' : ''}`} />
            <span>REFRESH</span>
          </button>
        }
      >
        <div className="space-y-4 font-mono text-xs">
          {/* Storage Telemetry Specs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800">
              <span className="text-[9px] uppercase tracking-wider text-slate-400 block">DATABASE STATUS</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 block mt-0.5 flex items-center gap-1">
                <Database className="w-3 h-3" />
                <span>CONNECTED</span>
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">falcon_cases_db (v1)</span>
            </div>

            <div className="p-3 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800">
              <span className="text-[9px] uppercase tracking-wider text-slate-400 block">ARCHIVED DOSSIERS</span>
              <span className="font-bold text-slate-900 dark:text-slate-100 block mt-0.5 text-base">
                {storageStats?.recordCount ?? cases.length}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Persistent records</span>
            </div>

            <div className="p-3 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800">
              <span className="text-[9px] uppercase tracking-wider text-slate-400 block">EST. STORAGE USED</span>
              <span className="font-bold text-slate-900 dark:text-slate-100 block mt-0.5 text-base">
                {storageStats?.estimatedStorageFormatted ?? '0 KB'}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Telemetry &amp; metrics only</span>
            </div>

            <div className="p-3 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800">
              <span className="text-[9px] uppercase tracking-wider text-slate-400 block">IMAGE BITMAP USAGE</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 block mt-0.5 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                <span>0 KB (NEVER SAVED)</span>
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Strict privacy boundary</span>
            </div>
          </div>

          {/* Privacy Guarantee Banner */}
          <div className="p-3 rounded bg-orange-50/50 dark:bg-orange-950/30 border border-orange-200/60 dark:border-orange-800/60 text-[11px] text-orange-950 dark:text-orange-200 font-sans leading-relaxed">
            <strong>Client-Side Storage Guarantee:</strong> FALCON-404 never stores raw unparsed OCR text buffers, original image pixel bitmaps, or unmasked government identifiers in persistent storage. All data resides solely inside your current browser profile in IndexedDB and is never sent to external servers.
          </div>

          {/* Maintenance Actions */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            {purgeSuccessNotice ? (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>AUDIT LEDGER SUCCESSFULLY PURGED</span>
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                ACTIONS APPLY EXCLUSIVELY TO THIS BROWSER PROFILE
              </span>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={cases.length === 0}
                onClick={handleExportArchive}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-bold uppercase tracking-wider border transition-colors ${
                  cases.length === 0
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-700 cursor-not-allowed'
                    : 'bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 cursor-pointer shadow-2xs'
                }`}
                title="Export all saved cases as a single consolidated JSON archive"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>EXPORT ARCHIVE ({cases.length})</span>
              </button>

              <button
                type="button"
                disabled={cases.length === 0}
                onClick={() => setShowPurgeModal(true)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-bold uppercase tracking-wider border transition-colors ${
                  cases.length === 0
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-700 cursor-not-allowed'
                    : 'bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900/60 cursor-pointer'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>PURGE AUDIT LEDGER</span>
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Appearance & Theme Selector */}
      <Card
        sectionCode="PREF // 03"
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

      {/* Purge All Confirmation Modal */}
      <Modal
        isOpen={showPurgeModal}
        onClose={() => setShowPurgeModal(false)}
        title="PURGE COMPLETE AUDIT DATABASE"
        maxWidth="sm"
      >
        <div className="space-y-4 font-mono text-xs">
          <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-950/40 rounded border border-red-200 dark:border-red-900/60 text-red-900 dark:text-red-200">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-1 font-sans">
              <strong className="font-mono text-xs font-bold block text-red-950 dark:text-red-100 uppercase">
                CRITICAL: PURGE ALL RECORDS
              </strong>
              <p className="text-[11px] leading-relaxed">
                Permanently purge all <strong>{cases.length} saved case dossiers</strong> from your local browser IndexedDB storage? All compliance records, raster telemetry, and audit logs will be permanently deleted.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={isPurging}
              onClick={() => setShowPurgeModal(false)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded font-bold uppercase tracking-wider cursor-pointer transition-colors"
            >
              CANCEL
            </button>
            <button
              type="button"
              disabled={isPurging}
              onClick={handlePurgeAllConfirm}
              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded font-bold uppercase tracking-wider cursor-pointer shadow-xs transition-colors"
            >
              {isPurging ? 'PURGING ALL...' : 'CONFIRM PURGE ALL'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
