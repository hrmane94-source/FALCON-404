import React, { useState } from 'react'
import {
  FileText,
  BarChart2,
  FileCode,
  Terminal,
  Download,
  ShieldCheck,
  AlertTriangle,
  Sliders,
  CheckCircle2,
  ArrowRight
} from 'lucide-react'
import type { NavigationSection } from '../types'
import { Card } from '../components/common/Card'
import { Badge } from '../components/common/Badge'
import { EmptyState } from '../components/common/EmptyState'
import { PROJECT_BRANDING } from '../constants/branding'
import { useCases } from '../context/CaseContext'
import { exportConsolidatedAuditLedger } from '../utils/savedCaseExport'

export interface ReportsPageProps {
  onNavigate?: (section: NavigationSection) => void
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ onNavigate }) => {
  const { cases, storageStats } = useCases()
  const [exportNotice, setExportNotice] = useState<string | null>(null)

  const totalCount = cases.length

  // Triage breakdown
  const standardCount = cases.filter((c) => c.assessment.priority === 'standard').length
  const manualCount = cases.filter((c) => c.assessment.priority === 'manual-review').length
  const inconclusiveCount = cases.filter((c) => c.assessment.priority === 'inconclusive').length

  const standardPercent = totalCount > 0 ? Math.round((standardCount / totalCount) * 100) : 0
  const manualPercent = totalCount > 0 ? Math.round((manualCount / totalCount) * 100) : 0
  const inconclusivePercent = totalCount > 0 ? Math.round((inconclusiveCount / totalCount) * 100) : 0

  // Category breakdown
  const categoryCounts: Record<string, number> = {
    'National ID': 0,
    Passport: 0,
    "Driver's License": 0,
    'Voter ID': 0,
    Other: 0
  }
  cases.forEach((c) => {
    if (categoryCounts[c.documentCategory] !== undefined) {
      categoryCounts[c.documentCategory]++
    } else {
      categoryCounts.Other++
    }
  })

  // Forensic Anomaly breakdown
  const compressionAnomalies = cases.filter(
    (c) => c.ela.supported && c.ela.variance > 0.15
  ).length
  const blurOrResolutionFlags = cases.filter(
    (c) => c.quality.isPotentialBlur || c.quality.isLowResolution
  ).length
  const perspectiveOrCropFlags = cases.filter(
    (c) =>
      c.perspective?.isSeverePerspective ||
      c.framing.status === 'tight-framing' ||
      c.framing.status === 'partially-cropped'
  ).length
  const softwareSignatures = cases.filter((c) => c.metadata.softwareDetected).length

  const handleExportConsolidated = () => {
    if (cases.length === 0) return
    exportConsolidatedAuditLedger(cases)
    setExportNotice('CONSOLIDATED AUDIT LEDGER EXPORTED')
    setTimeout(() => setExportNotice(null), 3500)
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Title & Forensic Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/90 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight uppercase">
              AUDIT &amp; REPORTING MODULE
            </h2>
            <Badge variant="neutral" size="sm">
              SEC // 04
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-sans">
            Screening dossier generation, compliance audit trails, and consolidated JSON ledgers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono">
          {exportNotice && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{exportNotice}</span>
            </span>
          )}

          <button
            type="button"
            disabled={totalCount === 0}
            onClick={handleExportConsolidated}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded text-xs font-bold uppercase tracking-wider shadow-xs transition-all ${
              totalCount === 0
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                : 'bg-orange-600 hover:bg-orange-700 text-white shadow-orange-600/20 cursor-pointer'
            }`}
            title={
              totalCount === 0
                ? 'No dossiers saved to local ledger yet'
                : 'Export complete consolidated audit ledger as JSON'
            }
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORT AUDIT LEDGER ({totalCount})</span>
          </button>
        </div>
      </div>

      {/* Aggregate Telemetry Row */}
      {totalCount > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
          <div className="p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
              TOTAL CASES ARCHIVED
            </span>
            <div className="text-2xl font-bold font-heading text-slate-900 dark:text-slate-100">
              {totalCount}
            </div>
            <span className="text-[10px] text-slate-500 block">
              EST. {storageStats?.estimatedStorageFormatted ?? '0 KB'} INDEXEDDB
            </span>
          </div>

          <div className="p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
              STANDARD TRIAGE
            </span>
            <div className="text-2xl font-bold font-heading text-emerald-600 dark:text-emerald-400">
              {standardCount}
            </div>
            <span className="text-[10px] text-slate-500 block">
              {standardPercent}% OF TOTAL ARCHIVE
            </span>
          </div>

          <div className="p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-[10px] text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
              MANUAL REVIEW
            </span>
            <div className="text-2xl font-bold font-heading text-amber-600 dark:text-amber-400">
              {manualCount}
            </div>
            <span className="text-[10px] text-slate-500 block">
              {manualPercent}% ELEVATED SCRUTINY
            </span>
          </div>

          <div className="p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
              INCONCLUSIVE
            </span>
            <div className="text-2xl font-bold font-heading text-slate-700 dark:text-slate-300">
              {inconclusiveCount}
            </div>
            <span className="text-[10px] text-slate-500 block">
              {inconclusivePercent}% DEFICIENT SAMPLES
            </span>
          </div>
        </div>
      ) : (
        <Card sectionCode="AUDIT // EMPTY">
          <EmptyState
            title="NO PERSISTED AUDIT RECORDS"
            description="The client-side screening ledger is currently empty. Run an identity verification on the New Verification page and select 'Save to Audit Ledger' to populate local compliance statistics."
            action={
              onNavigate ? (
                <button
                  type="button"
                  onClick={() => onNavigate('new-verification')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs font-mono font-bold uppercase cursor-pointer tracking-wider"
                >
                  <span>START FIRST SCREENING</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : undefined
            }
          />
        </Card>
      )}

      {/* Breakdown Details Grid */}
      {totalCount > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono">
          {/* Document Standards Distribution */}
          <Card
            sectionCode="METRIC // 01"
            title="Document Standards Distribution"
            subtitle="Archive breakdown by government standard category."
          >
            <div className="space-y-2.5 text-xs">
              {Object.entries(categoryCounts).map(([cat, count]) => {
                const pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-700 dark:text-slate-300 font-bold uppercase">
                        {cat}
                      </span>
                      <span className="text-slate-500">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-orange-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Forensic Anomaly Telemetry */}
          <Card
            sectionCode="METRIC // 02"
            title="Forensic Anomaly Telemetry"
            subtitle="Frequency of detected quality and structural flags."
          >
            <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
              <div className="flex justify-between items-center p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 text-[11px]">
                <div className="flex items-center gap-2">
                  <Sliders className="w-3.5 h-3.5 text-orange-500" />
                  <span>POTENTIAL BLUR / LOW RES</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {blurOrResolutionFlags} {blurOrResolutionFlags === 1 ? 'case' : 'cases'}
                </span>
              </div>

              <div className="flex justify-between items-center p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 text-[11px]">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-500" />
                  <span>HIGH ELA COMPRESSION VARIANCE</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {compressionAnomalies} {compressionAnomalies === 1 ? 'case' : 'cases'}
                </span>
              </div>

              <div className="flex justify-between items-center p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 text-[11px]">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  <span>PERSPECTIVE TILT / TIGHT CROP</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {perspectiveOrCropFlags} {perspectiveOrCropFlags === 1 ? 'case' : 'cases'}
                </span>
              </div>

              <div className="flex justify-between items-center p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 text-[11px]">
                <div className="flex items-center gap-2">
                  <FileCode className="w-3.5 h-3.5 text-blue-500" />
                  <span>SOFTWARE SIGNATURE IN METADATA</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {softwareSignatures} {softwareSignatures === 1 ? 'case' : 'cases'}
                </span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Report Templates Specification Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Dossier Card */}
        <Card sectionCode="SPEC // 01">
          <div className="w-9 h-9 rounded bg-orange-500/10 text-orange-500 flex items-center justify-center mb-3">
            <FileText className="w-5 h-5" />
          </div>
          <h3 className="font-heading text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight">
            Case Screening Dossier
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed font-sans">
            Comprehensive physical examination dossier comprising OCR transcription, physical raster metrics, ELA compression differential, and quad geometry.
          </p>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between font-mono text-[10px]">
            <span className="text-slate-400">OUTPUT</span>
            <span className="text-orange-600 dark:text-orange-400 font-bold uppercase">LIVE IN SCREENING</span>
          </div>
        </Card>

        {/* Activity Log Card */}
        <Card sectionCode="SPEC // 02">
          <div className="w-9 h-9 rounded bg-blue-500/10 text-blue-500 flex items-center justify-center mb-3">
            <FileCode className="w-5 h-5" />
          </div>
          <h3 className="font-heading text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight">
            Compliance JSON &amp; TXT
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed font-sans">
            Machine-readable JSON data records with default privacy masking (anonymized names, masked 12-digit IDs) for external SIEM integration.
          </p>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between font-mono text-[10px]">
            <span className="text-slate-400">FORMAT</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold uppercase">RFC-8259 JSON / TXT</span>
          </div>
        </Card>

        {/* Analytics Card */}
        <Card sectionCode="SPEC // 03">
          <div className="w-9 h-9 rounded bg-purple-500/10 text-purple-500 flex items-center justify-center mb-3">
            <BarChart2 className="w-5 h-5" />
          </div>
          <h3 className="font-heading text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight">
            Forensic Telemetry
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed font-sans">
            Aggregate screening statistics tracking compression flags, blur occurrences, and perspective tilt distributions across processed documents.
          </p>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between font-mono text-[10px]">
            <span className="text-slate-400">STATUS</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold uppercase">ACTIVE ENGINE</span>
          </div>
        </Card>
      </div>

      {/* Data Governance Notice */}
      <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 font-mono space-y-2">
        <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold uppercase tracking-wider">
          <Terminal className="w-4 h-4 text-orange-500" />
          <span>DATA INTEGRITY &amp; PRIVACY COMPLIANCE SPECIFICATION</span>
        </div>
        <p className="leading-relaxed font-sans text-xs">
          FALCON-404 enforces strict client-side privacy controls. Generated screening dossiers redact candidate identifiers and candidate subject names by default. All data downloads compile directly within browser memory via Object URL blobs, preventing storage in unencrypted browser caches.
        </p>
        <div className="pt-2 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-200/60 dark:border-slate-800 uppercase tracking-wider">
          <span>CREATOR // {PROJECT_BRANDING.developerAttribution}</span>
          <span>FALCON-404 FORENSIC WORKSTATION</span>
        </div>
      </div>
    </div>
  )
}
