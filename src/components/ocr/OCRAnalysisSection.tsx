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
  FileQuestion,
  Terminal
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
      // Fallback
    }
  }

  const getCategoryIcon = (category: CandidateCategory) => {
    switch (category) {
      case 'document-type':
        return <CreditCard className="w-3.5 h-3.5 text-orange-500" />
      case 'identifier':
        return <Hash className="w-3.5 h-3.5 text-blue-500" />
      case 'name':
        return <User className="w-3.5 h-3.5 text-emerald-500" />
      case 'date':
        return <Calendar className="w-3.5 h-3.5 text-amber-500" />
      case 'mrz':
        return <Binary className="w-3.5 h-3.5 text-purple-500" />
      default:
        return <FileText className="w-3.5 h-3.5 text-slate-400" />
    }
  }

  const getConfidenceBadge = (confidence: number, hasText: boolean) => {
    if (!hasText) {
      return (
        <Badge variant="neutral" title="No readable alphanumeric text detected by OCR engine">
          CONFIDENCE: N/A
        </Badge>
      )
    }
    const label = `CONFIDENCE: ${confidence}%`
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
        sectionCode="STAGE // 02"
        title="Optical Character Recognition (OCR)"
        subtitle="In-browser WebAssembly character recognition via Tesseract.js v7"
        action={
          <Badge variant="neutral" size="sm">
            READY // STANDBY
          </Badge>
        }
      >
        <div className="space-y-4 font-sans">
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-2">
            <div className="flex items-center gap-2 font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
              <FileSearch className="w-4 h-4 text-orange-500" />
              <span>CLIENT-SIDE GLYPH &amp; FIELD EXTRACTION</span>
            </div>
            <p className="leading-relaxed">
              Execute client-side OCR on this document raster. The neural LSTM engine runs locally in a dedicated WebAssembly background worker to extract document numbers, candidate names, dates, and MRZ lines without exposing private image pixels to external servers.
            </p>
          </div>

          <div className="p-3 bg-amber-500/10 dark:bg-amber-950/30 rounded-lg border border-amber-500/30 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-2 font-mono">
            <ShieldAlert className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p>
              <strong>EVALUATION PROTOCOL:</strong> Optical transcription transcribes surface text characters. It does not authenticate this document or verify existence against institutional registries.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              ENGINE // TESSERACT V7 (WASM LSTM • LOCAL THREAD)
            </span>
            <button
              type="button"
              disabled={disabled}
              onClick={onRunOCR}
              className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider shadow-xs transition-all cursor-pointer ${
                disabled
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                  : 'bg-orange-600 hover:bg-orange-700 text-white shadow-orange-600/20 hover:shadow-md'
              }`}
            >
              <FileSearch className="w-4 h-4" />
              <span>EXECUTE OCR PARSER</span>
            </button>
          </div>
        </div>
      </Card>
    )
  }

  // 2. STATE: PROCESSING
  if (ocrStatus === 'initializing' || ocrStatus === 'recognizing') {
    const isRecognizing = ocrProgress?.stage === 'recognizing'
    const progressPercent = typeof ocrProgress?.progress === 'number'
      ? Math.round(ocrProgress.progress * 100)
      : 0

    return (
      <Card
        sectionCode="STAGE // 02"
        title="Optical Character Recognition (OCR)"
        subtitle="Processing in isolated WebAssembly worker thread..."
        action={
          <Badge variant="info" size="sm" className="animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>ANALYZING...</span>
          </Badge>
        }
      >
        <div className="space-y-4 py-2 font-sans">
          <div className="p-4 rounded-lg bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200/80 dark:border-orange-900/40 space-y-3 font-mono">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-bold text-orange-950 dark:text-orange-200 tracking-wider uppercase">
                <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
                <span>{ocrProgress?.status || 'Processing document glyphs...'}</span>
              </div>
              {isRecognizing && (
                <span className="font-mono font-bold text-orange-600 dark:text-orange-400 text-xs">
                  {progressPercent}%
                </span>
              )}
            </div>

            {/* Precision Progress Bar */}
            <div className="w-full h-2 bg-orange-100 dark:bg-orange-950/60 rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-500 dark:bg-orange-400 rounded-full transition-all duration-300 ease-out shadow-[0_0_8px_rgba(249,115,22,0.8)]"
                style={{
                  width: isRecognizing ? `${Math.max(5, progressPercent)}%` : '20%'
                }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] text-orange-800/80 dark:text-orange-300/80 uppercase tracking-wider">
              <span>STAGE // {isRecognizing ? 'CHARACTER RECOGNITION' : 'WASM INITIALIZATION'}</span>
              <span>SANDBOX // LOCAL ENGINE</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
            Please wait while the document raster is analyzed. On initial execution, the English recognition dataset (~4MB) is fetched once and cached in browser memory.
          </p>
        </div>
      </Card>
    )
  }

  // 3. STATE: ERROR
  if (ocrStatus === 'error') {
    return (
      <Card
        sectionCode="STAGE // 02"
        title="Optical Character Recognition (OCR)"
        subtitle="Text extraction encountered a critical execution fault"
        action={
          <Badge variant="danger" size="sm">
            EXECUTION FAILED
          </Badge>
        }
      >
        <div className="space-y-4 font-sans">
          <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200 text-xs space-y-2">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-mono font-bold uppercase tracking-wider block text-rose-950 dark:text-rose-100 mb-0.5">
                  OCR ENGINE EXECUTION FAULT
                </span>
                <p className="text-rose-800 dark:text-rose-300 text-[11px] leading-relaxed">
                  {ocrError || 'Unable to initialize the OCR engine or extract text from this document image.'}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              disabled={disabled}
              onClick={onRetryOCR}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold uppercase tracking-wider shadow-xs transition-all cursor-pointer ${
                disabled
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                  : 'bg-rose-600 hover:bg-rose-700 text-white'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>RETRY OCR PIPELINE</span>
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
        sectionCode="STAGE // 02"
        title="Optical Character Recognition (OCR)"
        subtitle={`Completed at ${ocrResult.extractedAt} • Neural LSTM Engine`}
        action={
          <div className="flex items-center gap-2 font-mono">
            {getConfidenceBadge(ocrResult.confidence, hasText)}
            <Badge variant="success" size="sm">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              <span>OCR COMPLETE</span>
            </Badge>
          </div>
        }
      >
        <div className="space-y-6 font-sans">
          {/* EMPTY RESULT NOTICE */}
          {!hasText && (
            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 text-xs space-y-2">
              <div className="flex items-start gap-2.5">
                <FileQuestion className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-mono font-bold uppercase tracking-wider block text-amber-950 dark:text-amber-100 mb-0.5">
                    NO LEGIBLE CHARACTERS IDENTIFIED
                  </span>
                  <p className="text-amber-800 dark:text-amber-300 text-[11px] leading-relaxed">
                    The optical character recognition engine completed execution, but no readable characters were identified in this raster.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* CANDIDATE FIELDS SECTION */}
          {hasText && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800 font-mono">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    CANDIDATE STRUCTURED FIELDS
                  </h4>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono">
                    {candidateFields.length} MATCHES
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  HEURISTIC PARSING // UNVERIFIED
                </span>
              </div>

              {candidateFields.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {candidateFields.map((field) => (
                    <div
                      key={field.id}
                      className="p-3.5 rounded-lg bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-2 transition-colors hover:border-slate-300 dark:hover:border-slate-700"
                    >
                      <div className="flex items-center justify-between gap-2 font-mono">
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                          {getCategoryIcon(field.category)}
                          <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-600 dark:text-slate-400">
                            {field.label}
                          </span>
                        </div>
                        {field.category === 'name' && field.confidenceTier ? (
                          <span
                            className={`text-[9px] uppercase font-mono px-1.5 py-0.5 rounded border font-semibold ${
                              field.confidenceTier === 'confident'
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/80'
                                : field.confidenceTier === 'review'
                                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/80'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-slate-700'
                            }`}
                          >
                            {field.confidenceTier === 'confident'
                              ? 'CONFIDENT'
                              : field.confidenceTier === 'review'
                              ? 'REQUIRES REVIEW'
                              : 'UNCERTAIN'}
                          </span>
                        ) : (
                          <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {field.category}
                          </span>
                        )}
                      </div>

                      <div
                        className={`font-mono text-xs font-bold break-all bg-white dark:bg-slate-900 px-3 py-2 rounded border border-slate-200/60 dark:border-slate-800 ${
                          field.value === 'Name not confidently detected'
                            ? 'text-slate-500 dark:text-slate-400 italic font-normal'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {field.value}
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 dark:text-slate-500">
                        <span>RULE // {field.patternMatched}</span>
                      </div>

                      {field.contextNote && (
                        <p className="text-[10px] font-mono text-amber-800 dark:text-amber-300 bg-amber-500/10 dark:bg-amber-950/40 px-2 py-1 rounded border border-amber-500/20">
                          {field.contextNote}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800 text-center text-xs font-mono text-slate-500 dark:text-slate-400">
                  NO STANDARD FIELD PATTERNS (IDS, DATES, MRZ) MATCHED THE OCR STREAM. SEE RAW GLYPHS BELOW.
                </div>
              )}
            </div>
          )}

          {/* RAW OCR TEXT OUTPUT TERMINAL */}
          <div className="space-y-2">
            <div className="flex items-center justify-between font-mono">
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-orange-500" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  RAW OCR OUTPUT STREAM
                </h4>
                {hasText && (
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    ({ocrResult.lines.length} LINES DETECTED)
                  </span>
                )}
              </div>

              {hasText && (
                <button
                  type="button"
                  onClick={() => handleCopyText(ocrResult.rawText)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">COPIED</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>COPY STREAM</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {hasText ? (
              <pre className="p-4 rounded-lg bg-slate-950 text-slate-200 font-mono text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-64 border border-slate-800 shadow-inner selection:bg-orange-600 selection:text-white">
                {ocrResult.rawText}
              </pre>
            ) : (
              <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-500 font-mono text-xs italic text-center">
                [EMPTY TEXT BUFFER — NO CHARACTERS RECOGNIZED]
              </div>
            )}
          </div>

          {/* TRANSPARENT EVALUATION DISCLAIMER */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-lg border border-slate-200/70 dark:border-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-400 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 block">
                AUDIT LOG SPECIFICATION:
              </span>
              <p className="leading-relaxed">
                Candidate field parsing applies deterministic regex heuristics to OCR text tokens. Extracted identity fields must be reviewed against official documentation before any institutional determination.
              </p>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  return null
}
