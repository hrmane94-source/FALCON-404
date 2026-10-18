import React, { useState } from 'react'
import {
  FileText,
  Download,
  ShieldAlert,
  Check,
  Sliders,
  Sparkles
} from 'lucide-react'
import type {
  ScreeningReportData,
  ImageIntegrityResult,
  OCRResult,
  OCRStatus
} from '../../types'
import { Card } from '../common/Card'
import { Badge } from '../common/Badge'
import {
  generateScreeningReportJson,
  generateScreeningReportText,
  downloadReportFile
} from '../../utils/reportExport'

export interface ScreeningReportSectionProps {
  documentName: string
  selectedDocumentType: string
  ocrStatus: OCRStatus
  ocrResult: OCRResult | null
  integrityResult: ImageIntegrityResult | null
  disabled?: boolean
}

export const ScreeningReportSection: React.FC<ScreeningReportSectionProps> = ({
  documentName,
  selectedDocumentType,
  ocrStatus,
  ocrResult,
  integrityResult,
  disabled = false
}) => {
  const [includeFullOCR, setIncludeFullOCR] = useState(false)
  const [includeIdentifiableFields, setIncludeIdentifiableFields] = useState(false)
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null)

  if (!integrityResult) return null

  const reportId = `FLC-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString().slice(-4)}`
  const nowFormatted = new Date().toLocaleString()

  const detectedDocTypeField = ocrResult?.candidateFields.find((f) => f.category === 'document-type')

  const reportData: ScreeningReportData = {
    reportId,
    generatedAt: nowFormatted,
    documentName,
    selectedDocumentType,
    detectedDocumentType: detectedDocTypeField?.value,
    ocrStatus,
    ocrConfidence: ocrResult?.confidence,
    ocrResult: ocrResult || undefined,
    integrityResult,
    privacySettings: {
      includeFullOCR,
      includeIdentifiableFields
    }
  }

  const handleExportJson = () => {
    const jsonStr = generateScreeningReportJson(reportData)
    const filename = `FALCON-Report-${documentName.replace(/[^a-zA-Z0-9_\-]/g, '_')}-${Date.now()}.json`
    downloadReportFile(jsonStr, filename, 'application/json')
    setDownloadSuccess('JSON Report downloaded')
    setTimeout(() => setDownloadSuccess(null), 3000)
  }

  const handleExportText = () => {
    const textStr = generateScreeningReportText(reportData)
    const filename = `FALCON-Report-${documentName.replace(/[^a-zA-Z0-9_\-]/g, '_')}-${Date.now()}.txt`
    downloadReportFile(textStr, filename, 'text/plain')
    setDownloadSuccess('Text Dossier downloaded')
    setTimeout(() => setDownloadSuccess(null), 3000)
  }

  const { quality, metadata, ela, assessment } = integrityResult

  return (
    <Card
      title="Preliminary Screening Report"
      subtitle={`Generated ${nowFormatted} • Dossier Ref: ${reportId}`}
      action={
        <div className="flex items-center gap-2">
          {assessment.priority === 'standard' && (
            <Badge variant="success" size="sm">
              Standard Triage
            </Badge>
          )}
          {assessment.priority === 'manual-review' && (
            <Badge variant="warning" size="sm">
              Manual Review Required
            </Badge>
          )}
          {assessment.priority === 'inconclusive' && (
            <Badge variant="neutral" size="sm">
              Analysis Inconclusive
            </Badge>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* SECTION A: DOCUMENT OVERVIEW */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
              A. Intake &amp; Overview
            </span>
            <span className="text-[11px] font-mono text-slate-500">{integrityResult.fileProperties.fileName}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-[10px] uppercase font-mono text-slate-400 block">Intake Selection</span>
              <span className="font-semibold text-slate-900">{selectedDocumentType}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono text-slate-400 block">OCR Classification</span>
              <span className="font-medium text-slate-800">
                {detectedDocTypeField ? detectedDocTypeField.value : 'Unclassified'}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono text-slate-400 block">OCR Recognition</span>
              <span className="font-medium text-slate-800">
                {ocrStatus === 'success' ? `Complete (${ocrResult?.confidence ?? 'N/A'}% Quality)` : ocrStatus.toUpperCase()}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono text-slate-400 block">Raster &amp; Format</span>
              <span className="font-medium text-slate-800">
                {quality.width} × {quality.height} • {metadata.format}
              </span>
            </div>
          </div>
        </div>

        {/* SECTION B & C: QUALITY & INTEGRITY SUMMARY */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Quality Audit Column */}
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 space-y-2.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 border-b border-slate-100 pb-2">
              <Sliders className="w-3.5 h-3.5 text-blue-600" />
              <span>B. Image Quality Assessment</span>
            </div>

            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Dimensions Check:</span>
                <span className={quality.isLowResolution ? 'font-medium text-amber-700' : 'text-slate-800'}>
                  {quality.width} × {quality.height} px {quality.isLowResolution ? '(Sub-optimal)' : '(Adequate)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Raster Aspect Ratio:</span>
                <span className="text-slate-800 font-medium">
                  {quality.aspectRatio} ({quality.aspectRatioLabel})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Luminance / Exposure:</span>
                <span className={quality.isExtremeLuminance ? 'font-medium text-amber-700' : 'text-slate-800'}>
                  {quality.meanLuminance} / 255 {quality.isExtremeLuminance ? '(Extreme)' : '(Balanced)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">RMS Contrast:</span>
                <span className={quality.isLowContrast ? 'font-medium text-amber-700' : 'text-slate-800'}>
                  {quality.contrastStdDev} {quality.isLowContrast ? '(Compressed range)' : '(Good separation)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Edge Sharpness:</span>
                <span className={quality.isPotentialBlur ? 'font-medium text-amber-700' : 'text-slate-800'}>
                  {quality.blurScore} variance {quality.isPotentialBlur ? '(Potential blur)' : '(Sharp)'}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-100">
                {quality.physicalRatioNote}
              </div>
            </div>
          </div>

          {/* Integrity & ELA Column */}
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 space-y-2.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 border-b border-slate-100 pb-2">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>C. Image Integrity &amp; Forensic Checks</span>
            </div>

            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Container Format:</span>
                <span className="text-slate-800 font-medium truncate max-w-[200px]" title={metadata.containerStatusLabel}>
                  {metadata.containerStatusLabel}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">EXIF Headers:</span>
                <span className="text-slate-800 truncate max-w-[200px]" title={metadata.exifStatusLabel}>
                  {metadata.exifStatusLabel}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Software Signatures:</span>
                <span className={metadata.softwareDetected ? 'font-medium text-amber-700' : 'text-slate-800'} title={metadata.softwareStatusLabel}>
                  {metadata.softwareStatusLabel}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Capture Device:</span>
                <span className="text-slate-800 truncate max-w-[200px]" title={metadata.cameraStatusLabel}>
                  {metadata.cameraStatusLabel}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Error Level Analysis:</span>
                <span className={ela.variance > 0.15 ? 'font-medium text-amber-700' : 'text-slate-800'}>
                  {ela.supported ? `${Math.round(ela.variance * 100)}% high variance` : 'Skipped (Non-JPEG)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Forensic Note:</span>
                <span className="text-slate-700 truncate max-w-[200px]" title={ela.assessmentNote}>
                  {ela.assessmentNote}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION D: PRELIMINARY ASSESSMENT & FINDINGS */}
        <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
              D. Preliminary Assessment
            </span>
            <Badge
              variant={
                assessment.priority === 'manual-review'
                  ? 'warning'
                  : assessment.priority === 'inconclusive'
                  ? 'neutral'
                  : 'success'
              }
              size="sm"
            >
              Priority: {assessment.priorityLabel}
            </Badge>
          </div>

          <div className="space-y-1 text-xs text-slate-700">
            <p className="font-semibold text-slate-900">{assessment.summary}</p>
            <p className="text-[11px] text-slate-600">
              <strong>Recommended Action:</strong> {assessment.recommendedAction}
            </p>
          </div>

          <div className="pt-1">
            <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
              Contributing Findings ({assessment.contributingFindings.length})
            </span>
            <div className="flex flex-wrap gap-1.5">
              {assessment.contributingFindings.map((f) => (
                <span
                  key={f.id}
                  className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] text-slate-700 font-medium"
                >
                  {f.title}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* SECTION E: INSTITUTIONAL LIMITATIONS & EVALUATION TRANSPARENCY */}
        <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200/80 text-[11px] text-amber-950 space-y-2">
          <div className="flex items-center gap-2 font-bold text-xs text-amber-900">
            <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>E. Institutional Limitations &amp; Ethical Boundaries</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-amber-900/90 leading-relaxed">
            <li>
              <strong>No Authenticity Verdict:</strong> This system does NOT certify this document as authentic or legally genuine.
            </li>
            <li>
              <strong>No Definite Fraud Classification:</strong> Quality flags and compression variations indicate areas for inspection; they do not establish fraud.
            </li>
            <li>
              <strong>Format Constraints:</strong> Non-JPEG images cannot be evaluated with Error Level Analysis.
            </li>
            <li>
              <strong>No External Registry Connection:</strong> Document numbers have not been verified against government databases (e.g. UIDAI CIDR or NSDL).
            </li>
          </ul>
        </div>

        {/* SECTION F: PRIVACY CONTROLS & EXPORT */}
        <div className="pt-3 border-t border-slate-200/80 space-y-3">
          <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
              <ShieldAlert className="w-3.5 h-3.5 text-slate-600" />
              <span>Export Privacy Controls (Default: Redacted &amp; Masked)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <label className="flex items-start gap-2 text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeIdentifiableFields}
                  onChange={(e) => setIncludeIdentifiableFields(e.target.checked)}
                  className="w-3.5 h-3.5 mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="leading-tight">
                  <strong className="block text-slate-900 font-medium">Unmask candidate identity fields</strong>
                  <span className="text-[10px] text-slate-500">Includes raw names, IDs, dates of birth (masked by default)</span>
                </span>
              </label>

              <label className="flex items-start gap-2 text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeFullOCR}
                  onChange={(e) => setIncludeFullOCR(e.target.checked)}
                  className="w-3.5 h-3.5 mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="leading-tight">
                  <strong className="block text-slate-900 font-medium">Include raw OCR text buffer</strong>
                  <span className="text-[10px] text-slate-500">Includes full extracted text buffer (redacted by default)</span>
                </span>
              </label>
            </div>

            {(includeIdentifiableFields || includeFullOCR) && (
              <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-300/80 text-[11px] text-amber-950 flex items-start gap-2 animate-in fade-in">
                <ShieldAlert className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Privacy Notice:</strong> You have opted to include sensitive personal identity details or raw OCR buffers in the exported report. Ensure this export is stored securely and handled in compliance with organizational data protection standards and applicable privacy legislation.
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <span className="text-[11px] text-slate-400">
              Exports execute 100% locally in browser memory. No data is uploaded.
            </span>

            <div className="flex items-center gap-2">
              {downloadSuccess && (
                <span className="text-xs text-emerald-700 font-medium flex items-center gap-1 animate-in fade-in">
                  <Check className="w-3.5 h-3.5" />
                  <span>{downloadSuccess}</span>
                </span>
              )}

              <button
                type="button"
                disabled={disabled}
                onClick={handleExportText}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  disabled
                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200/90 hover:border-slate-300 shadow-2xs'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>Download Text Dossier</span>
              </button>

              <button
                type="button"
                disabled={disabled}
                onClick={handleExportJson}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer ${
                  disabled
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON Report</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
