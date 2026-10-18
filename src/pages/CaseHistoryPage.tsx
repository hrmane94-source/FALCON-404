import React, { useState } from 'react'
import { Search, Eye } from 'lucide-react'
import type { MockCaseRecord } from '../types'
import { DEMO_CASE_RECORDS } from '../data/mockCases'
import { Card } from '../components/common/Card'
import { Badge } from '../components/common/Badge'
import { Modal } from '../components/common/Modal'
import { EmptyState } from '../components/common/EmptyState'

export const CaseHistoryPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedCase, setSelectedCase] = useState<MockCaseRecord | null>(null)
  const [records, setRecords] = useState<MockCaseRecord[]>(DEMO_CASE_RECORDS)

  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      r.caseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.holderNameSample.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesType = selectedType === 'all' || r.documentType === selectedType

    return matchesSearch && matchesType
  })

  return (
    <div className="space-y-6">
      {/* Title & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200/90 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight uppercase">
              CASE AUDIT HISTORY
            </h2>
            <Badge variant="neutral" size="sm">
              SEC // 03
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-sans">
            Historical document screening ledger and demonstrator records.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            setRecords(records.length > 0 ? [] : DEMO_CASE_RECORDS)
          }
          className="text-xs font-mono font-bold text-slate-700 dark:text-slate-200 hover:text-orange-600 dark:hover:text-orange-400 px-3 py-1.5 bg-white dark:bg-slate-900 rounded border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer self-start sm:self-auto uppercase tracking-wider"
        >
          [{records.length > 0 ? 'PURGE_VIEW' : 'LOAD_RECORDS'}]
        </button>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row gap-3 font-mono">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="SEARCH BY CASE REF OR CANDIDATE NAME..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500 uppercase tracking-wider font-mono"
          />
        </div>

        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer font-mono uppercase tracking-wider"
        >
          <option value="all">ALL DOCUMENT STANDARDS</option>
          <option value="National ID">NATIONAL ID</option>
          <option value="Passport">PASSPORT</option>
          <option value="Driver's License">DRIVER'S LICENSE</option>
          <option value="Voter ID">VOTER ID</option>
        </select>
      </div>

      {/* Table Card */}
      <Card sectionCode="AUDIT // 01">
        {filteredRecords.length > 0 ? (
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  <th className="pb-3 font-semibold">CASE REF</th>
                  <th className="pb-3 font-semibold">DOCUMENT SPEC</th>
                  <th className="pb-3 font-semibold">SUBJECT NAME</th>
                  <th className="pb-3 font-semibold">INTAKE DATE</th>
                  <th className="pb-3 font-semibold">TRIAGE STATUS</th>
                  <th className="pb-3 font-semibold text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {filteredRecords.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/60 transition-colors">
                    <td className="py-3 font-bold text-slate-900 dark:text-slate-100">
                      {item.caseNumber}
                    </td>
                    <td className="py-3 text-slate-800 dark:text-slate-200 font-medium font-sans">
                      {item.documentType}
                      <span className="block text-[10px] font-mono text-slate-400 dark:text-slate-500 font-normal">
                        {item.issuerCountry}
                      </span>
                    </td>
                    <td className="py-3 text-slate-600 dark:text-slate-400 text-xs font-mono">
                      {item.holderNameSample}
                    </td>
                    <td className="py-3 text-slate-500 dark:text-slate-400 text-[11px]">
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
                        className="inline-flex items-center gap-1 text-[11px] font-mono text-orange-600 hover:text-orange-700 dark:text-orange-400 font-bold transition-colors cursor-pointer uppercase tracking-wider"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>VIEW DOSSIER</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="NO RECORDS MATCHING AUDIT QUERY"
            description="Adjust search parameters or reload demonstrator records."
            action={
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('')
                  setSelectedType('all')
                }}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs font-mono font-bold uppercase cursor-pointer"
              >
                Reset Filter
              </button>
            }
          />
        )}
      </Card>

      {/* Case Details Modal */}
      <Modal
        isOpen={selectedCase !== null}
        onClose={() => setSelectedCase(null)}
        title={selectedCase ? `CASE DOSSIER // ${selectedCase.caseNumber}` : ''}
        subtitle={selectedCase ? `${selectedCase.documentType} • ${selectedCase.issuerCountry}` : ''}
        maxWidth="md"
      >
        {selectedCase && (
          <div className="space-y-4 text-xs font-sans text-slate-600 dark:text-slate-400">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-950/70 rounded border border-slate-200 dark:border-slate-800 font-mono text-[11px]">
              <div>
                <span className="text-[9px] uppercase tracking-wider text-slate-400 block">CASE IDENTIFIER</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{selectedCase.caseNumber}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wider text-slate-400 block">DOCUMENT STANDARD</span>
                <span className="text-slate-800 dark:text-slate-200">{selectedCase.documentType}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wider text-slate-400 block">CANDIDATE HOLDER</span>
                <span className="text-slate-800 dark:text-slate-200">{selectedCase.holderNameSample}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wider text-slate-400 block">INTAKE TIMESTAMP</span>
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

            <div className="p-3 bg-orange-50/50 dark:bg-orange-950/40 rounded border border-orange-200/60 dark:border-orange-800/60 text-orange-950 dark:text-orange-200 text-[11px] font-mono leading-relaxed">
              <strong>TRIAGE: </strong>{selectedCase.plannedOutcomeLabel.toUpperCase()} — Demonstrator case record archived in client state.
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
