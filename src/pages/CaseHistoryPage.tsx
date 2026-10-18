import React, { useState } from 'react'
import {
  Search,
  Eye,
  Trash2,
  Download,
  FileText,
  AlertTriangle,
  Sliders,
  Sparkles,
  Scan,
  Lock,
  ShieldAlert,
  ArrowRight
} from 'lucide-react'
import type { NavigationSection } from '../types'
import type { SavedCaseRecord } from '../types/caseRecord'
import { Card } from '../components/common/Card'
import { Badge } from '../components/common/Badge'
import { Modal } from '../components/common/Modal'
import { EmptyState } from '../components/common/EmptyState'
import { useCases } from '../context/CaseContext'
import { exportSavedCaseJson, exportSavedCaseText } from '../utils/savedCaseExport'
import { PROJECT_BRANDING } from '../constants/branding'

export interface CaseHistoryPageProps {
  onNavigate?: (section: NavigationSection) => void
}

export const CaseHistoryPage: React.FC<CaseHistoryPageProps> = ({ onNavigate }) => {
  const { cases, isLoading, deleteCase } = useCases()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedPriority, setSelectedPriority] = useState<string>('all')

  const [selectedCase, setSelectedCase] = useState<SavedCaseRecord | null>(null)
  const [caseToDelete, setCaseToDelete] = useState<SavedCaseRecord | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Filter records
  const filteredRecords = cases.filter((r) => {
    const matchesSearch =
      searchTerm.trim() === '' ||
      r.id.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
      r.documentCategory.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
      (r.detectedDocumentType && r.detectedDocumentType.toLowerCase().includes(searchTerm.toLowerCase().trim())) ||
      r.candidateFields.some((f) => f.value.toLowerCase().includes(searchTerm.toLowerCase().trim()))

    const matchesCategory = selectedCategory === 'all' || r.documentCategory === selectedCategory
    const matchesPriority = selectedPriority === 'all' || r.assessment.priority === selectedPriority

    return matchesSearch && matchesCategory && matchesPriority
  })

  const handleDeleteConfirm = async () => {
    if (!caseToDelete) return
    try {
      setIsDeleting(true)
      await deleteCase(caseToDelete.id)
      if (selectedCase?.id === caseToDelete.id) {
        setSelectedCase(null)
      }
      setCaseToDelete(null)
    } catch (err) {
      console.error('Failed to delete case:', err)
    } finally {
      setIsDeleting(false)
    }
  }

  // Candidate name or identifier preview from candidateFields
  const getCandidatePreview = (record: SavedCaseRecord): { name: string; id: string | null } => {
    const nameField = record.candidateFields.find((f) => f.category === 'name')
    const idField = record.candidateFields.find((f) => f.category === 'identifier')
    return {
      name: nameField?.value || 'ANONYMIZED',
      id: idField?.value || null
    }
  }

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
            Client-side screening ledger stored in local browser database (IndexedDB).
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider">
            {cases.length} {cases.length === 1 ? 'RECORD' : 'RECORDS'} PERSISTED
          </span>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('new-verification')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              <span>NEW SCREENING</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row gap-3 font-mono">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="SEARCH BY CASE REF OR MASKED VALUE..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500 uppercase tracking-wider font-mono"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer font-mono uppercase tracking-wider"
        >
          <option value="all">ALL DOCUMENT STANDARDS</option>
          <option value="National ID">NATIONAL ID</option>
          <option value="Passport">PASSPORT</option>
          <option value="Driver's License">DRIVER'S LICENSE</option>
          <option value="Voter ID">VOTER ID</option>
          <option value="Other">OTHER</option>
        </select>

        <select
          value={selectedPriority}
          onChange={(e) => setSelectedPriority(e.target.value)}
          className="px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer font-mono uppercase tracking-wider"
        >
          <option value="all">ALL TRIAGE PRIORITIES</option>
          <option value="standard">STANDARD TRIAGE</option>
          <option value="manual-review">MANUAL REVIEW</option>
          <option value="inconclusive">INCONCLUSIVE</option>
        </select>
      </div>

      {/* Table Card */}
      <Card sectionCode="AUDIT // 01">
        {isLoading ? (
          <div className="py-12 text-center text-xs font-mono text-slate-400">
            LOADING CLIENT AUDIT DATABASE...
          </div>
        ) : filteredRecords.length > 0 ? (
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  <th className="pb-3 font-semibold">CASE REF</th>
                  <th className="pb-3 font-semibold">DOCUMENT SPEC</th>
                  <th className="pb-3 font-semibold">CANDIDATE PII (MASKED)</th>
                  <th className="pb-3 font-semibold">ARCHIVED DATE</th>
                  <th className="pb-3 font-semibold">TRIAGE STATUS</th>
                  <th className="pb-3 font-semibold text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {filteredRecords.map((item) => {
                  const candidate = getCandidatePreview(item)
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/60 transition-colors">
                      <td className="py-3 font-bold text-slate-900 dark:text-slate-100">
                        {item.id}
                        {item.stationId && (
                          <span className="block text-[9px] font-mono text-slate-400 dark:text-slate-500">
                            STN: {item.stationId}
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-slate-800 dark:text-slate-200 font-medium font-sans">
                        {item.documentCategory}
                        <span className="block text-[10px] font-mono text-slate-400 dark:text-slate-500 font-normal">
                          {item.fileFormat} • {item.fileSizeFormatted}
                        </span>
                      </td>
                      <td className="py-3 text-slate-700 dark:text-slate-300 text-xs font-mono">
                        <div>{candidate.name}</div>
                        {candidate.id && (
                          <div className="text-[10px] text-slate-400 dark:text-slate-500">
                            {candidate.id}
                          </div>
                        )}
                      </td>
                      <td className="py-3 text-slate-500 dark:text-slate-400 text-[11px]">
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
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedCase(item)}
                            className="inline-flex items-center gap-1 text-[11px] font-mono text-orange-600 hover:text-orange-700 dark:text-orange-400 font-bold transition-colors cursor-pointer uppercase tracking-wider"
                            title="Inspect full stored dossier"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>VIEW DOSSIER</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setCaseToDelete(item)}
                            className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
                            title="Delete case record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : cases.length === 0 ? (
          <EmptyState
            title="NO ARCHIVED SCREENING DOSSIERS"
            description="Run an identity document screening in the New Verification module and click 'Save to Audit Ledger' to archive forensic findings in your local browser database."
            action={
              onNavigate ? (
                <button
                  type="button"
                  onClick={() => onNavigate('new-verification')}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs font-mono font-bold uppercase cursor-pointer tracking-wider"
                >
                  START NEW SCREENING
                </button>
              ) : undefined
            }
          />
        ) : (
          <EmptyState
            title="NO RECORDS MATCHING AUDIT QUERY"
            description="No archived cases match the active search term or filter criteria."
            action={
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('')
                  setSelectedCategory('all')
                  setSelectedPriority('all')
                }}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs font-mono font-bold uppercase cursor-pointer tracking-wider"
              >
                RESET FILTERS
              </button>
            }
          />
        )}
      </Card>

      {/* Case Dossier Detail Modal */}
      <Modal
        isOpen={selectedCase !== null}
        onClose={() => setSelectedCase(null)}
        title={selectedCase ? `ARCHIVED DOSSIER // ${selectedCase.id}` : ''}
        subtitle={
          selectedCase
            ? `${selectedCase.documentCategory} • Archived ${selectedCase.savedAt} • ${PROJECT_BRANDING.developerAttribution}`
            : ''
        }
        maxWidth="2xl"
      >
        {selectedCase && (
          <div className="space-y-5 text-xs font-sans text-slate-700 dark:text-slate-300 max-h-[75vh] overflow-y-auto pr-1">
            {/* Header Telemetry */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 font-mono text-[11px]">
              <div>
                <span className="text-[9px] uppercase tracking-wider text-slate-400 block">CASE REFERENCE</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{selectedCase.id}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wider text-slate-400 block">DOCUMENT SPEC</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{selectedCase.documentCategory}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wider text-slate-400 block">TRIAGE PRIORITY</span>
                <span className="font-bold uppercase text-orange-600 dark:text-orange-400">
                  {selectedCase.assessment.priorityLabel}
                </span>
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wider text-slate-400 block">STATION ID</span>
                <span className="text-slate-800 dark:text-slate-200 font-medium">
                  {selectedCase.stationId || 'STANDALONE_CLIENT'}
                </span>
              </div>
            </div>

            {/* SECTION A: INTAKE SPECIFICATIONS */}
            <div className="p-3.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 font-mono">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 block border-b border-slate-100 dark:border-slate-800 pb-1.5">
                SECTION A // INTAKE SPECIFICATIONS
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
                <div>
                  <span className="text-[9px] text-slate-400 block">FILE FORMAT:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {selectedCase.fileFormat} ({selectedCase.fileSizeFormatted})
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block">RASTER MATRIX:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {selectedCase.dimensions.width} × {selectedCase.dimensions.height} PX
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block">ASPECT RATIO:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedCase.aspectRatio}:1</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block">OCR STATUS:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {selectedCase.ocrStatus.toUpperCase()} ({selectedCase.ocrConfidence ?? 'N/A'}%)
                  </span>
                </div>
              </div>
            </div>

            {/* SECTION B: MASKED IDENTITY FIELDS */}
            <div className="p-3.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 font-mono">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-orange-500" />
                  <span>SECTION B // MASKED IDENTITY FIELDS (PRIVACY GOVERNED)</span>
                </span>
                <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">
                  PERSISTENT PRIVACY COMPLIANT
                </span>
              </div>

              {selectedCase.candidateFields.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  {selectedCase.candidateFields.map((field, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 flex justify-between items-center"
                    >
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 block">
                          {field.label}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{field.value}</span>
                      </div>
                      <Badge variant="neutral" size="sm">
                        {field.category}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 font-sans">
                  No candidate identity fields parsed from OCR stream.
                </p>
              )}
            </div>

            {/* SECTION C & D: RASTER QUALITY & FORENSIC CHECKS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              {/* Raster Metrics */}
              <div className="p-3.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-1.5">
                  <Sliders className="w-3.5 h-3.5 text-orange-500" />
                  <span>SECTION C // RASTER METRICS</span>
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">RESOLUTION:</span>
                    <span className={selectedCase.quality.isLowResolution ? 'font-bold text-amber-600' : 'font-bold text-slate-800 dark:text-slate-200'}>
                      {selectedCase.quality.isLowResolution ? 'SUB-OPTIMAL' : 'ADEQUATE'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">LUMINANCE:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {selectedCase.quality.meanLuminance} / 255
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">RMS CONTRAST:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {selectedCase.quality.contrastStdDev}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">BLUR SCORE:</span>
                    <span className={selectedCase.quality.isPotentialBlur ? 'font-bold text-amber-600' : 'font-bold text-slate-800 dark:text-slate-200'}>
                      {selectedCase.quality.blurScore} {selectedCase.quality.isPotentialBlur ? '(BLURRED)' : '(SHARP)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Forensic & ELA */}
              <div className="p-3.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                  <span>SECTION D // FORENSIC INTEGRITY</span>
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">CONTAINER:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                      {selectedCase.metadata.containerStatusLabel}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">SOFTWARE:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                      {selectedCase.metadata.softwareStatusLabel}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">ELA STATUS:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {selectedCase.ela.supported ? `${Math.round(selectedCase.ela.variance * 100)}% VARIANCE` : 'SKIPPED (NON-JPEG)'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">FORENSIC NOTE:</span>
                    <span className="text-slate-600 dark:text-slate-400 truncate max-w-[150px]">
                      {selectedCase.ela.assessmentNote}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION E: BOUNDARY & LAYOUT */}
            <div className="p-3.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 font-mono">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Scan className="w-3.5 h-3.5 text-orange-500" />
                  <span>SECTION E // BOUNDARY &amp; PERSPECTIVE AUDIT</span>
                </span>
                <span className="text-[10px] text-slate-500">
                  {selectedCase.boundaryStatus} ({selectedCase.detectorScore}/100)
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded border border-slate-200/60 dark:border-slate-800">
                  <span className="text-slate-400 text-[9px] block">QUAD DIMENSIONS</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block mt-0.5">
                    {selectedCase.geometry ? `${selectedCase.geometry.averageWidth} × ${selectedCase.geometry.averageHeight} PX` : 'UNCERTAIN'}
                  </span>
                </div>
                <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded border border-slate-200/60 dark:border-slate-800">
                  <span className="text-slate-400 text-[9px] block">PERSPECTIVE / TILT</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block mt-0.5">
                    {selectedCase.perspective ? `TILT: ${selectedCase.perspective.rotationAngleDeg}° • SKEW: ${selectedCase.perspective.apparentKeystoneRatio}` : 'N/A'}
                  </span>
                </div>
                <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded border border-slate-200/60 dark:border-slate-800">
                  <span className="text-slate-400 text-[9px] block">FRAMING COVERAGE</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block mt-0.5">
                    {selectedCase.framing.areaCoveragePercent}% OF RASTER
                  </span>
                </div>
              </div>
            </div>

            {/* SECTION F: PRELIMINARY ASSESSMENT */}
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 font-mono">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  SECTION F // PRELIMINARY ASSESSMENT
                </span>
                <Badge
                  variant={
                    selectedCase.assessment.priority === 'standard'
                      ? 'success'
                      : selectedCase.assessment.priority === 'manual-review'
                      ? 'warning'
                      : 'neutral'
                  }
                  size="sm"
                >
                  {selectedCase.assessment.priorityLabel.toUpperCase()}
                </Badge>
              </div>
              <p className="font-bold text-slate-900 dark:text-slate-100 text-xs font-heading">
                {selectedCase.assessment.summary}
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 font-sans">
                <strong>RECOMMENDED ACTION:</strong> {selectedCase.assessment.recommendedAction}
              </p>
              {selectedCase.assessment.contributingFindings.length > 0 && (
                <div className="pt-1 flex flex-wrap gap-1">
                  {selectedCase.assessment.contributingFindings.map((f) => (
                    <span
                      key={f.id}
                      className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] text-slate-700 dark:text-slate-300 font-semibold"
                    >
                      {f.title}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* SECTION G: EVALUATION DISCLAIMER */}
            <div className="p-3 bg-amber-500/10 dark:bg-amber-950/30 rounded border border-amber-500/30 text-[11px] font-mono text-amber-950 dark:text-amber-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                <span>INSTITUTIONAL DISCLAIMER</span>
              </div>
              <p className="font-sans text-[11px]">
                Preliminary screening cues generated locally in-browser. Does not certify legal authenticity or definitively confirm document forgery. No external registry queries performed.
              </p>
            </div>

            {/* Export and Action Buttons */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 font-mono">
              <button
                type="button"
                onClick={() => setCaseToDelete(selectedCase)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-red-600 hover:text-red-700 dark:text-red-400 rounded border border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>DELETE DOSSIER</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => exportSavedCaseText(selectedCase)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>EXPORT TXT</span>
                </button>

                <button
                  type="button"
                  onClick={() => exportSavedCaseJson(selectedCase)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs font-bold uppercase tracking-wider shadow-xs shadow-orange-600/20 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>EXPORT JSON</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={caseToDelete !== null}
        onClose={() => setCaseToDelete(null)}
        title="CONFIRM RECORD DELETION"
        maxWidth="sm"
      >
        <div className="space-y-4 font-mono text-xs">
          <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-950/40 rounded border border-red-200 dark:border-red-900/60 text-red-900 dark:text-red-200">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-1 font-sans">
              <strong className="font-mono text-xs font-bold block text-red-950 dark:text-red-100 uppercase">
                PERMANENT REMOVAL
              </strong>
              <p className="text-[11px] leading-relaxed">
                Permanently purge dossier <strong>{caseToDelete?.id}</strong> from your local browser database (IndexedDB)? This action cannot be reversed.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setCaseToDelete(null)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded font-bold uppercase tracking-wider cursor-pointer transition-colors"
            >
              CANCEL
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleDeleteConfirm}
              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded font-bold uppercase tracking-wider cursor-pointer shadow-xs transition-colors"
            >
              {isDeleting ? 'PURGING...' : 'CONFIRM PURGE'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
