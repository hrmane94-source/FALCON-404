import React from 'react'
import {
  FileText,
  BarChart2,
  FileCode,
  Terminal
} from 'lucide-react'
import { Card } from '../components/common/Card'
import { Badge } from '../components/common/Badge'
import { PROJECT_BRANDING } from '../constants/branding'

export const ReportsPage: React.FC = () => {
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
            Screening dossier generation, compliance audit trails, and privacy-governed JSON exports.
          </p>
        </div>

        <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-900 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800 self-start sm:self-auto">
          CLIENT AUDIT BUS // ACTIVE
        </div>
      </div>

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
            <span className="text-slate-500 font-bold uppercase">PLANNED EXTENSION</span>
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
