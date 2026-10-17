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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Case History
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Past verification records and outcomes. Demonstrator data shown below.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            setRecords(records.length > 0 ? [] : DEMO_CASE_RECORDS)
          }
          className="text-xs text-slate-600 hover:text-slate-900 font-medium px-3 py-1.5 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors cursor-pointer self-start sm:self-auto"
        >
          {records.length > 0 ? 'Clear Records' : 'Load Sample Records'}
        </button>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by case number or subject name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
        >
          <option value="all">All Document Types</option>
          <option value="National ID">National ID</option>
          <option value="Passport">Passport</option>
          <option value="Driver's License">Driver's License</option>
          <option value="Voter ID">Voter ID</option>
        </select>
      </div>

      {/* Table Card */}
      <Card>
        {filteredRecords.length > 0 ? (
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-medium">
                  <th className="pb-3 font-medium">Case ID</th>
                  <th className="pb-3 font-medium">Document</th>
                  <th className="pb-3 font-medium">Subject</th>
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 font-mono font-medium text-slate-800">
                      {item.caseNumber}
                    </td>
                    <td className="py-3 text-slate-800 font-medium">
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
            title="No records found"
            description="No cases match your search or the record list is currently empty."
            action={
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('')
                  setSelectedType('all')
                  setRecords(DEMO_CASE_RECORDS)
                }}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-medium cursor-pointer"
              >
                Reset Filters
              </button>
            }
          />
        )}
      </Card>

      {/* Detail Modal */}
      <Modal
        isOpen={selectedCase !== null}
        onClose={() => setSelectedCase(null)}
        title={selectedCase ? `Case ${selectedCase.caseNumber}` : ''}
        subtitle="Verification Summary"
        maxWidth="md"
      >
        {selectedCase && (
          <div className="space-y-4 text-xs text-slate-600">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-[11px] text-slate-400 block mb-0.5">Document</span>
                <span className="font-semibold text-slate-900">{selectedCase.documentType}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-[11px] text-slate-400 block mb-0.5">Subject</span>
                <span className="font-semibold text-slate-900">{selectedCase.holderNameSample}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-[11px] text-slate-400 block mb-0.5">Authority</span>
                <span className="text-slate-800">{selectedCase.issuerCountry}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-[11px] text-slate-400 block mb-0.5">Outcome</span>
                <span className="font-semibold text-slate-800">{selectedCase.plannedOutcomeLabel}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg">
              <span className="text-[11px] text-slate-400 block mb-1 font-medium">Findings Note</span>
              <p className="text-slate-700 leading-relaxed">
                {selectedCase.discrepancyNote}
              </p>
            </div>

            <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-100">
              Note: This is an illustrative record for preview purposes.
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
