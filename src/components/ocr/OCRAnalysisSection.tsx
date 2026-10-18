import React, { useState } from 'react'
import {
  FileSearch,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Copy,
  Check,
  ShieldAlert,
  Loader2,
  FileText,
  Calendar,
  User,
  Hash,
  CreditCard,
  Binary,
  Layers,
  FileQuestion
} from 'lucide-react'
import type { OCRProgress, OCRResult, OCRStatus, CandidateCategory } from '../../types'
import { Card } from '../common/Card'
import { Badge } from '../common/Badge'

export interface OCRAnalysisSectionProps {
  ocrStatus: OCRStatus
  ocrProgress: OCRProgress | null
  ocrResult: OCRResult | null
  ocrError: string | null
  disabled?: boolean
  onRunOCR: () => void
  onRetryOCR: () => void
}

export const OCRAnalysisSection: React.FC<OCRAnalysisSectionProps> = ({
  ocrStatus,
  ocrProgress,
  ocrResult,
  ocrError,
  disabled = false,
  onRunOCR,
  onRetryOCR
}) => {
  const [copied, setCopied] = useState(false)

  const handleCopyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback if clipboard API is not permitted
    }
  }

  const getCategoryIcon = (category: CandidateCategory) => {
    switch (category) {
      case 'document-type':
        return <CreditCard className="w-3.5 h-3.5 text-blue-600" />
      case 'identifier':
        return <Hash className="w-3.5 h-3.5 text-indigo-600" />
      case 'name':
        return <User className="w-3.5 h-3.5 text-emerald-600" />
      case 'date':
        return <Calendar className="w-3.5 h-3.5 text-amber-600" />
      case 'mrz':
        return <Binary className="w-3.5 h-3.5 text-purple-600" />
      default:
        return <FileText className="w-3.5 h-3.5 text-slate-600" />
    }
  }

  const getConfidenceBadge = (confidence: number, hasText: boolean) => {
    if (!hasText) {
      return (
        <Badge variant="neutral" title="No readable alphanumeric text detected by OCR engine">
          OCR Confidence: N/A
        </Badge>
      )
    }
    const label = `OCR Engine Confidence: ${confidence}%`
    const titleText =
      'Tesseract optical character recognition quality metric (0-100%). Measures glyph transcription clarity, NOT document authenticity, validity, or fraud likelihood.'
    if (confidence >= 80) {
      return (
        <Badge variant="success" title={titleText}>
          {label}
        </Badge>
      )
    }
    if (confidence >= 50) {
      return (
        <Badge variant="warning" title={titleText}>
          {label}
        </Badge>
      )
    }
    return (
      <Badge variant="danger" title={titleText}>
        {label}
      </Badge>
    )
  }

  // 1. STATE: IDLE
  if (ocrStatus === 'idle') {
    return (
      <Card
        title="Stage 02: Optical Character Recognition (OCR)"
        subtitle="In-browser WebAssembly character recognition via Tesseract.js v7"
        action={
          <Badge variant="neutral" size="sm">
            Ready to Analyze
          </Badge>
        }
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-600 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <FileSearch className="w-4 h-4 text-blue-600" />
              <span>Client-Side Document Text Extraction</span>
            </div>
            <p className="leading-relaxed">
              Execute genuine client-side OCR on this document image. The engine runs locally in a background WebAssembly worker to extract document numbers, candidate names, dates, and MRZ lines without transmitting image data to remote servers.
            </p>
          </div>

          <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/60 text-[11px] text-amber-900 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p>
              <strong>Evaluation Transparency:</strong> OCR transcribes visible alphanumeric characters. It does not authenticate this document or confirm that the holder exists in institutional registries.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-[11px] text-slate-400">
              Engine: Tesseract.js v7 (LSTM Model • In-Browser WASM)
            </span>
            <button
              type="button"
              disabled={disabled}
              onClick={onRunOCR}
              className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer ${
                disabled
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 hover:shadow-md'
              }`}
            >
              <FileSearch className="w-4 h-4" />
              <span>Run OCR Analysis</span>
            </button>
          </div>
        </div>
      </Card>
    )
  }

  // 2. STATE: PROCESSING (INITIALIZING OR RECOGNIZING)
  if (ocrStatus === 'initializing' || ocrStatus === 'recognizing') {
    const isRecognizing = ocrProgress?.stage === 'recognizing'
    const progressPercent = typeof ocrProgress?.progress === 'number'
      ? Math.round(ocrProgress.progress * 100)
      : 0

    return (
      <Card
        title="Stage 02: Optical Character Recognition (OCR)"
        subtitle="Processing in isolated WebAssembly worker..."
        action={
          <Badge variant="info" size="sm" className="animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Analyzing...</span>
          </Badge>
        }
      >
        <div className="space-y-4 py-2">
          {/* Progress Card */}
          <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/80 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-medium text-blue-900">
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                <span>{ocrProgress?.status || 'Processing document characters...'}</span>
              </div>
              {isRecognizing && (
                <span className="font-mono font-semibold text-blue-700 text-xs">
                  {progressPercent}%
                </span>
              )}
            </div>

            {/* Real Progress Bar */}
            <div className="w-full h-2.5 bg-blue-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-out"
                style={{
                  width: isRecognizing ? `${Math.max(5, progressPercent)}%` : '20%'
                }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-blue-700/80">
              <span>Stage: {isRecognizing ? 'Character Recognition' : 'Engine Initialization'}</span>
              <span>Local WebAssembly Runtime</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            Please wait while the document raster is analyzed. On initial execution, the English recognition dataset (~4MB) is fetched once and cached locally.
          </p>
        </div>
      </Card>
    )
  }

  // 3. STATE: ERROR
  if (ocrStatus === 'error') {
    return (
      <Card
        title="Stage 02: Optical Character Recognition (OCR)"
        subtitle="Text extraction encountered an issue"
        action={
          <Badge variant="danger" size="sm">
            Analysis Failed
          </Badge>
        }
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-2">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block text-rose-950 mb-0.5">
                  OCR Engine Execution Error
                </span>
                <p className="text-rose-800 text-[11px] leading-relaxed">
                  {ocrError || 'Unable to initialize the OCR engine or extract text from this document image.'}
                </p>
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-[11px] text-slate-600 space-y-1">
            <span className="font-semibold text-slate-800 block">Troubleshooting Suggestions:</span>
            <ul className="list-disc list-inside space-y-0.5 text-slate-600">
              <li>Ensure you have active internet connectivity (required on first run to download language data).</li>
              <li>Verify the image is in a supported raster format (JPEG, PNG, WebP) and not corrupted.</li>
              <li>Try uploading a higher-contrast or differently oriented image.</li>
            </ul>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              disabled={disabled}
              onClick={onRetryOCR}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer ${
                disabled
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-rose-600 hover:bg-rose-700 text-white'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry OCR Analysis</span>
            </button>
          </div>
        </div>
      </Card>
    )
  }

  // 4. STATE: SUCCESS
  if (ocrStatus === 'success' && ocrResult) {
    const hasText = ocrResult.rawText.trim().length > 0
    const candidateFields = ocrResult.candidateFields

    return (
      <Card
        title="Stage 02: Optical Character Recognition (OCR)"
        subtitle={`Completed at ${ocrResult.extractedAt}`}
        action={
          <div className="flex items-center gap-2">
            {getConfidenceBadge(ocrResult.confidence, hasText)}
            <Badge variant="success" size="sm">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>OCR Complete</span>
            </Badge>
          </div>
        }
      >
        <div className="space-y-6">
          {/* EMPTY RESULT NOTICE */}
          {!hasText && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
              <div className="flex items-start gap-2.5">
                <FileQuestion className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block text-amber-950 mb-0.5">
                    No Legible Text Detected
                  </span>
                  <p className="text-amber-800 text-[11px] leading-relaxed">
                    The optical character recognition engine completed execution, but no readable characters were identified in this image. This commonly occurs with blank documents, severe motion blur, low lighting, or graphics without printed alphanumeric characters.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* CANDIDATE FIELDS SECTION */}
          {hasText && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Candidate Structured Fields
                  </h4>
                  <Badge variant="neutral" size="sm">
                    {candidateFields.length} Pattern Matches
                  </Badge>
                </div>
                <span className="text-[11px] text-slate-400">
                  Heuristic Parsing (Unauthenticated)
                </span>
              </div>

              {candidateFields.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {candidateFields.map((field) => (
                    <div
                      key={field.id}
                      className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/70 space-y-1.5 transition-colors hover:border-slate-300"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          {getCategoryIcon(field.category)}
                          <span className="text-[11px] font-medium text-slate-500">
                            {field.label}
                          </span>
                        </div>
                        <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-600">
                          {field.category}
                        </span>
                      </div>

                      <div className="font-mono text-xs font-semibold text-slate-900 break-all bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/50">
                        {field.value}
                      </div>

                      <p className="text-[10px] text-slate-400 font-mono">
                        Rule: {field.patternMatched}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 text-center text-xs text-slate-500">
                  No standard identity fields (IDs, dates, MRZ) matched the recognized text patterns. See raw output below.
                </div>
              )}
            </div>
          )}

          {/* RAW OCR TEXT OUTPUT SECTION */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Raw OCR Output
                </h4>
                {hasText && (
                  <span className="text-[11px] font-mono text-slate-400">
                    ({ocrResult.lines.length} lines detected)
                  </span>
                )}
              </div>

              {hasText && (
                <button
                  type="button"
                  onClick={() => handleCopyText(ocrResult.rawText)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copy Text</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {hasText ? (
              <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-64 border border-slate-800 shadow-inner selection:bg-blue-600 selection:text-white">
                {ocrResult.rawText}
              </pre>
            ) : (
              <div className="p-4 rounded-xl bg-slate-100 text-slate-400 font-mono text-xs italic text-center">
                [Empty text buffer - no characters recognized]
              </div>
            )}
          </div>

          {/* TRANSPARENT EVALUATION DISCLAIMER (AUDIT POINTS 7 & 8) */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70 text-[11px] text-slate-600 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p>
                <strong>Evaluation Transparency:</strong> OCR extracts and transcribes visible alphanumeric characters from the document raster. It does not classify this document as genuine or fake, nor does it prove authenticity. Digital tampering detection (Error Level Analysis), copy-move forgery detection, and biometric facial matching are not performed in Phase 3.
              </p>
              <div className="flex items-center gap-1.5 text-slate-500 pt-0.5">
                <Layers className="w-3 h-3 text-slate-400" />
                <span>Forensic tampering checks (Phase 4) and biometric facial matching (Phase 5) remain scheduled.</span>
              </div>
            </div>
          </div>

          {/* ACTION BAR: RE-RUN OCR */}
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              disabled={disabled}
              onClick={onRunOCR}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer ${
                disabled ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Re-run OCR Analysis</span>
            </button>
          </div>
        </div>
      </Card>
    )
  }

  return null
}
