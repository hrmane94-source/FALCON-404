import React, { useState } from 'react'
import { Eye, ArrowRight, ShieldCheck } from 'lucide-react'
import type { NavigationSection, MockCaseRecord } from '../types'
import { PipelineVisualizer } from '../components/pipeline/PipelineVisualizer'
import { SystemReadinessCard } from '../components/readiness/SystemReadinessCard'
import { DocumentScanIllustration } from '../components/common/DocumentScanIllustration'
import { Card } from '../components/common/Card'
import { Badge } from '../components/common/Badge'
import { Modal } from '../components/common/Modal'
import { EmptyState } from '../components/common/EmptyState'
import { DEMO_CASE_RECORDS } from '../data/mockCases'
import { PROJECT_BRANDING } from '../constants/branding'
import { useCases } from '../context/CaseContext'

export interface OverviewPageProps {
  onNavigate: (section: NavigationSection) => void
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ onNavigate }) => {
  const { cases } = useCases()
  const [selectedCase, setSelectedCase] = useState<MockCaseRecord | null>(null)
  const [showDemoRecords, setShowDemoRecords] = useState(false)

  return (
    <div className="space-y-7">
      {/* 1. Hero Forensic Header & Visualizer */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-6 sm:p-8 lg:p-10 shadow-xs relative overflow-hidden transition-colors">
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #f97316 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }}
        />

        <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Left Column: Headline, Supporting Text, Capabilities & Primary Action */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-wrap items-center gap-2 font-mono">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-800 dark:text-slate-200 font-semibold uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5 text-orange-500" />
                <span>{PROJECT_BRANDING.projectName} // FORENSIC INTELLIGENCE</span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {PROJECT_BRANDING.developerAttribution}
              </span>
            </div>

            <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-slate-50 tracking-tight leading-[1.08] uppercase">
              DOCUMENT FORENSICS.<br />
              MADE EXPLAINABLE.
            </h1>

            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl font-sans">
              Screen identity documents through OCR, image-integrity analysis, and document-layout assessment. Examine measurable findings, understand potential anomalies, and identify cases requiring further review.
            </p>

            {/* Forensic Capabilities Matrix */}
            <div className="pt-1 flex flex-wrap gap-2 text-[10px] font-mono text-slate-600 dark:text-slate-400">
              <span className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80">
                WASM OCR (Tesseract v7)
              </span>
              <span className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80">
                Error Level Analysis (ELA)
              </span>
              <span className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80">
                Sobel Quad Locator
              </span>
            </div>

            <div className="pt-3 flex flex-col sm:flex-row sm:items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('new-verification')}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-mono font-bold uppercase tracking-wider shadow-md shadow-orange-600/20 transition-all cursor-pointer group"
              >
                <span>START SCREENING WORKSPACE</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 sm:pl-2">
                100% In-Browser Execution • Zero Server Upload
              </span>
            </div>
          </div>

          {/* Right Column: Visual Document Scanning Illustration */}
          <div className="lg:col-span-5 flex justify-center">
            <DocumentScanIllustration />
          </div>
        </div>
      </section>

      {/* 2. Five-Stage Verification Pipeline */}
      <section>
        <PipelineVisualizer />
      </section>

      {/* 3. Compact System Status Telemetry */}
      <section>
        <SystemReadinessCard />
      </section>

      {/* 4. Recent Forensic Screening Activity */}
      <section>
        <Card
          sectionCode="HIST // 01"
          title="Recent Screening Log"
          subtitle={
            cases.length > 0 && !showDemoRecords
              ? `Live in-browser audit ledger (${cases.length} records archived) • ${PROJECT_BRANDING.developerAttribution}`
              : 'Demonstrator specimen records for evaluation and test workflows.'
          }
          action={
            <div className="flex items-center gap-2 font-mono text-xs">
              {cases.length > 0 && (
                <Badge variant={!showDemoRecords ? 'success' : 'neutral'} size="sm">
                  {!showDemoRecords ? 'LIVE AUDIT LEDGER' : 'DEMO SPECIMENS'}
                </Badge>
              )}
              <button
                type="button"
                onClick={() => setShowDemoRecords(!showDemoRecords)}
                className="text-xs font-mono text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors cursor-pointer uppercase tracking-wider"
              >
                [{showDemoRecords ? 'LIVE_CASES' : 'DEMO_SPECIMENS'}]
              </button>
            </div>
          }
        >
          {cases.length > 0 && !showDemoRecords ? (
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    <th className="pb-3 font-semibold">CASE REF</th>
                    <th className="pb-3 font-semibold">DOCUMENT SPEC</th>
                    <th className="pb-3 font-semibold">MASKED CANDIDATE</th>
                    <th className="pb-3 font-semibold">ARCHIVED DATE</th>
                    <th className="pb-3 font-semibold">TRIAGE STATUS</th>
                    <th className="pb-3 font-semibold text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {cases.slice(0, 5).map((item) => {
                    const nameField = item.candidateFields.find((f) => f.category === 'name')
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                          {item.id}
                        </td>
                        <td className="py-3 text-slate-800 dark:text-slate-200 font-medium font-sans">
                          {item.documentCategory}
                          <span className="block text-[10px] font-mono text-slate-400 dark:text-slate-500 font-normal">
                            {item.fileFormat} • {item.fileSizeFormatted}
                          </span>
                        </td>
                        <td className="py-3 font-mono text-slate-600 dark:text-slate-400 text-xs">
                          {nameField?.value || 'ANONYMIZED'}
                        </td>
                        <td className="py-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          {item.savedAt}
                        </td>
                        <td className="py-3">
                          {item.assessment.priority === 'standard' && (
                            <Badge variant="success" size="sm">
                              STANDARD
                            </Badge>
                          )}
                          {item.assessment.priority === 'manual-review' && (
                            <Badge variant="warning" size="sm">
                              MANUAL REVIEW
                            </Badge>
                          )}
                          {item.assessment.priority === 'inconclusive' && (
                            <Badge variant="neutral" size="sm">
                              INCONCLUSIVE
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          <button
                            type="button"
                            onClick={() => onNavigate('case-history')}
                            className="inline-flex items-center gap-1 text-[11px] font-mono text-orange-600 hover:text-orange-700 dark:text-orange-400 font-bold transition-colors cursor-pointer uppercase tracking-wider"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>VIEW DOSSIER</span>
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : DEMO_CASE_RECORDS.length > 0 && showDemoRecords ? (
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    <th className="pb-3 font-semibold">CASE REF</th>
                    <th className="pb-3 font-semibold">DOCUMENT SPEC</th>
                    <th className="pb-3 font-semibold">SUBJECT NAME</th>
                    <th className="pb-3 font-semibold">TIMESTAMP</th>
                    <th className="pb-3 font-semibold">TRIAGE STATUS</th>
                    <th className="pb-3 font-semibold text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {DEMO_CASE_RECORDS.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                        {item.caseNumber}
                      </td>
                      <td className="py-3 text-slate-800 dark:text-slate-200 font-medium">
                        {item.documentType}
                        <span className="block text-[10px] font-mono text-slate-400 dark:text-slate-500 font-normal">
                          {item.issuerCountry}
                        </span>
                      </td>
                      <td className="py-3 font-mono text-slate-600 dark:text-slate-400 text-xs">
                        {item.holderNameSample}
                      </td>
                      <td className="py-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        {item.submissionDate}
                      </td>
                      <td className="py-3">
                        {item.plannedOutcomeLabel === 'Approved' && (
                          <Badge variant="success" size="sm">
                            Approved
                          </Badge>
                        )}
                        {item.plannedOutcomeLabel === 'Flagged' && (
                          <Badge variant="danger" size="sm">
                            Flagged
                          </Badge>
                        )}
                        {item.plannedOutcomeLabel === 'Under Review' && (
                          <Badge variant="warning" size="sm">
                            Under Review
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedCase(item)}
                          className="inline-flex items-center gap-1 text-[11px] font-mono text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>DOSSIER</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="NO SCREENING CASES IN LOCAL LEDGER"
              description="No documents have been screened and archived yet in your current browser profile. Launch a new verification intake to create your first case."
              action={
                <button
                  type="button"
                  onClick={() => onNavigate('new-verification')}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs font-mono font-bold uppercase cursor-pointer"
                >
                  START FIRST SCREENING
                </button>
              }
            />
          )}
        </Card>
      </section>

      {/* Case Details Modal */}
      <Modal
        isOpen={selectedCase !== null}
        onClose={() => setSelectedCase(null)}
        title={selectedCase ? `DOSSIER // ${selectedCase.caseNumber}` : ''}
        subtitle={selectedCase ? `${selectedCase.documentType} • ${selectedCase.issuerCountry}` : ''}
        maxWidth="md"
      >
        {selectedCase && (
          <div className="space-y-4 text-xs font-sans text-slate-600 dark:text-slate-400">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-950/70 rounded border border-slate-200 dark:border-slate-800 font-mono text-[11px]">
              <div>
                <span className="text-[9px] uppercase tracking-wider text-slate-400 block">CASE ID</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{selectedCase.caseNumber}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wider text-slate-400 block">DOCUMENT TYPE</span>
                <span className="text-slate-800 dark:text-slate-200">{selectedCase.documentType}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wider text-slate-400 block">HOLDER SAMPLE</span>
                <span className="text-slate-800 dark:text-slate-200">{selectedCase.holderNameSample}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wider text-slate-400 block">INTAKE DATE</span>
                <span className="text-slate-800 dark:text-slate-200">{selectedCase.submissionDate}</span>
              </div>
            </div>

            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 block mb-1">
                SUMMARY ASSESSMENT
              </span>
              <p className="leading-relaxed text-slate-700 dark:text-slate-300">
                {selectedCase.discrepancyNote || `${selectedCase.inspectionType} examination completed. Standard triage baseline.`}
              </p>
            </div>

            <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-mono leading-relaxed">
              <strong>STATUS: </strong>{selectedCase.plannedOutcomeLabel.toUpperCase()} — Demonstrator case record archived in client state.
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
