import React, { useState } from 'react'
import { Plus, Eye, ArrowRight, ShieldCheck } from 'lucide-react'
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

export interface OverviewPageProps {
  onNavigate: (section: NavigationSection) => void
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ onNavigate }) => {
  const [selectedCase, setSelectedCase] = useState<MockCaseRecord | null>(null)
  const [showDemoRecords, setShowDemoRecords] = useState(true)

  return (
    <div className="space-y-8">
      {/* 1 & 2. Attractive Hero Section with Document Scanning Illustration */}
      <section className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 lg:p-10 shadow-xs overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Left Column: Mission & Call to Action */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200/60 text-xs text-slate-700 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-orange-500" />
                <span>{PROJECT_BRANDING.projectName}</span>
              </div>
              <span className="text-xs text-slate-500 font-normal">
                {PROJECT_BRANDING.developerAttribution}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
              Intelligent Identity Verification
            </h1>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl">
              Screen identity documents, examine potential alterations, and support consistent verification decisions across institutional intake workflows.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('new-verification')}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-medium shadow-xs transition-colors cursor-pointer group"
              >
                <span>Start Verification</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <span className="text-xs text-slate-500 sm:pl-2">
                Phase 1 Prototype — Interface Only
              </span>
            </div>
          </div>

          {/* Right Column: Visual Document Scanning Illustration */}
          <div className="lg:col-span-5 flex justify-center">
            <DocumentScanIllustration />
          </div>
        </div>
      </section>

      {/* 3. Improved Five-Stage Verification Pipeline */}
      <section>
        <PipelineVisualizer />
      </section>

      {/* 4. Compact System Status */}
      <section>
        <SystemReadinessCard />
      </section>

      {/* 5. Recent Activity */}
      <section>
        <Card
          title="Recent Activity"
          subtitle="Recent screening records shown for layout demonstration."
          action={
            <button
              type="button"
              onClick={() => setShowDemoRecords(!showDemoRecords)}
              className="text-xs text-slate-500 hover:text-slate-800 transition-colors cursor-pointer font-medium"
            >
              {showDemoRecords ? 'Show Empty State' : 'Show Sample Records'}
            </button>
          }
        >
          {showDemoRecords ? (
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-medium">
                    <th className="pb-3 font-medium">Case ID</th>
                    <th className="pb-3 font-medium">Document</th>
                    <th className="pb-3 font-medium">Subject</th>
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {DEMO_CASE_RECORDS.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 font-mono font-medium text-slate-800">
                        {item.caseNumber}
                      </td>
                      <td className="py-3 text-slate-700 font-medium">
                        {item.documentType}
                        <span className="block text-[11px] text-slate-400 font-normal">
                          {item.issuerCountry}
                        </span>
                      </td>
                      <td className="py-3 text-slate-600">
                        {item.holderNameSample}
                      </td>
                      <td className="py-3 text-slate-500">
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
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="No recent verifications"
              description="New screening records will appear here as documents are ingested through the verification workflow."
              action={
                <button
                  type="button"
                  onClick={() => onNavigate('new-verification')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Start Verification</span>
                </button>
              }
            />
          )}
        </Card>
      </section>

      {/* 6. Subtle Project Information Footer */}
      <section className="pt-2">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-3 py-3 text-xs text-slate-500 bg-white/70 rounded-xl border border-slate-200/60">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">{PROJECT_BRANDING.projectName}</span>
            <span className="text-slate-300">•</span>
            <span>{PROJECT_BRANDING.developerAttribution}</span>
          </div>
          <span className="text-slate-400 text-[11px]">{PROJECT_BRANDING.challengeName}</span>
        </div>
      </section>

      {/* Case Details Modal */}
      <Modal
        isOpen={selectedCase !== null}
        onClose={() => setSelectedCase(null)}
        title={selectedCase ? `Case ${selectedCase.caseNumber}` : ''}
        subtitle="Illustrative record for preview"
        maxWidth="md"
      >
        {selectedCase && (
          <div className="space-y-4 text-xs text-slate-600">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-[11px] text-slate-400 block mb-0.5">Document Type</span>
                <span className="font-semibold text-slate-900">{selectedCase.documentType}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-[11px] text-slate-400 block mb-0.5">Subject Sample</span>
                <span className="font-semibold text-slate-900">{selectedCase.holderNameSample}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-[11px] text-slate-400 block mb-0.5">Format</span>
                <span className="text-slate-800">{selectedCase.issuerCountry}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-[11px] text-slate-400 block mb-0.5">Status</span>
                <span className="font-semibold text-slate-800">{selectedCase.plannedOutcomeLabel}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg">
              <span className="text-[11px] text-slate-400 block mb-1 font-medium">Notes</span>
              <p className="text-slate-700 leading-relaxed">
                {selectedCase.discrepancyNote}
              </p>
            </div>

            <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-100">
              Note: This is demonstration data to illustrate the record view.
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
