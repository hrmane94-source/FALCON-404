import React from 'react'
import {
  AlertTriangle,
  Clock,
  Layers,
  CheckCircle2,
  XCircle,
  HelpCircle
} from 'lucide-react'
import type {
  VerificationSummary,
  SupportedDocumentType,
  ValidationCheckResult
} from '../../types/verificationWorkflow.ts'
import { Card } from '../common/Card.tsx'
import { Badge } from '../common/Badge.tsx'

export interface VerificationSummaryPanelProps {
  documentType: SupportedDocumentType
  summary: VerificationSummary
  allValidationChecks?: ValidationCheckResult[]
}

export const VerificationSummaryPanel: React.FC<VerificationSummaryPanelProps> = ({
  documentType,
  summary,
  allValidationChecks: _allValidationChecks
}) => {
  return (
    <Card
      sectionCode="STAGE // 05-A"
      title="Multi-Stage Verification Summary"
      subtitle={`Consolidated operational screening audit for ${documentType}`}
      action={
        <div className="flex items-center gap-2 font-mono">
          <Badge variant="warning" size="sm">
            STATUS // PENDING REVIEW
          </Badge>
        </div>
      }
    >
      <div className="space-y-6 font-sans">
        {/* MULTI-METRIC STATUS COUNTERS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
          {/* Passed Checks */}
          <div className="p-3.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/80 space-y-1">
            <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300">
              <span className="text-[10px] uppercase font-bold tracking-wider">PASSED CHECKS</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-950 dark:text-emerald-100">
              {summary.passedChecks}
            </div>
            <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 font-sans">
              Implemented checks passed
            </p>
          </div>

          {/* Failed Checks */}
          <div className="p-3.5 rounded-lg bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/80 space-y-1">
            <div className="flex items-center justify-between text-rose-800 dark:text-rose-300">
              <span className="text-[10px] uppercase font-bold tracking-wider">FAILED CHECKS</span>
              <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            </div>
            <div className="text-2xl font-bold text-rose-950 dark:text-rose-100">
              {summary.failedChecks}
            </div>
            <p className="text-[10px] text-rose-700/80 dark:text-rose-400/80 font-sans">
              Rule violations observed
            </p>
          </div>

          {/* Unimplemented Checks (Step 1 Baseline) */}
          <div className="p-3.5 rounded-lg bg-slate-100/80 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
              <span className="text-[10px] uppercase font-bold tracking-wider">UNIMPLEMENTED</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {summary.unimplementedChecks}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-sans">
              Scheduled for Step 2/3
            </p>
          </div>

          {/* Needs Review / Unreadable */}
          <div className="p-3.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/80 space-y-1">
            <div className="flex items-center justify-between text-amber-800 dark:text-amber-300">
              <span className="text-[10px] uppercase font-bold tracking-wider">NEEDS REVIEW</span>
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-950 dark:text-amber-100">
              {summary.checksRequiringManualReview.length}
            </div>
            <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80 font-sans">
              Unresolved observations
            </p>
          </div>
        </div>

        {/* COMPLETED PROCESSING STAGES BREAKDOWN */}
        <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-3 font-mono">
          <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-orange-500" />
              <span className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                COMPLETED PIPELINE STAGES IN THIS SESSION:
              </span>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">
              {summary.completedStages.length} STAGES EXECUTED
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {summary.completedStages.map((stage) => (
              <span
                key={stage}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300/60 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>{stage}</span>
              </span>
            ))}
          </div>
        </div>

        {/* VERIFICATION DIMENSIONS TABLE */}
        <div className="space-y-3 font-mono">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              VERIFICATION DIMENSION STATUS MATRIX
            </h4>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              INDEPENDENT CAPABILITY AUDIT
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {/* Dimension 1: Client OCR */}
            <div className="py-2.5 flex items-center justify-between gap-3">
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200">OCR Surface Extraction:</span>
                <p className="text-[11px] font-sans text-slate-500 dark:text-slate-400">
                  Client-side WebAssembly optical recognition via Tesseract.js v7.
                </p>
              </div>
              <Badge variant="success" size="sm">
                IMPLEMENTED // ACTIVE
              </Badge>
            </div>

            {/* Dimension 2: Image Forensics */}
            <div className="py-2.5 flex items-center justify-between gap-3">
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200">Raster Forensics &amp; ELA:</span>
                <p className="text-[11px] font-sans text-slate-500 dark:text-slate-400">
                  Contrast, Laplacian variance blur, EXIF container, and 12x JPEG ELA.
                </p>
              </div>
              <Badge variant="success" size="sm">
                IMPLEMENTED // ACTIVE
              </Badge>
            </div>

            {/* Dimension 3: Deterministic Rules */}
            <div className="py-2.5 flex items-center justify-between gap-3">
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200">Deterministic Identifier Rules:</span>
                <p className="text-[11px] font-sans text-slate-500 dark:text-slate-400">
                  Verhoeff checksums, standard format regex, and chronological date logic.
                </p>
              </div>
              <Badge variant="neutral" size="sm">
                NOT IMPLEMENTED (STEP 2)
              </Badge>
            </div>

            {/* Dimension 4: ML Tampering */}
            <div className="py-2.5 flex items-center justify-between gap-3">
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200">Trained Machine Learning Model:</span>
                <p className="text-[11px] font-sans text-slate-500 dark:text-slate-400">
                  Deep neural patch segmentation for localized digital alteration detection.
                </p>
              </div>
              <Badge variant="neutral" size="sm">
                NOT IMPLEMENTED (PHASE 8)
              </Badge>
            </div>

            {/* Dimension 5: Statutory Issuer Verification */}
            <div className="py-2.5 flex items-center justify-between gap-3">
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200">Statutory Authority Gateway:</span>
                <p className="text-[11px] font-sans text-slate-500 dark:text-slate-400">
                  Direct cryptographic query against government registries (DigiLocker / UIDAI).
                </p>
              </div>
              <Badge variant="warning" size="sm">
                UNAVAILABLE
              </Badge>
            </div>
          </div>
        </div>

        {/* SCIENTIFIC EXPLANATION OF PROBABILITY & OVERALL VERDICT BAN */}
        <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs font-mono text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
            <HelpCircle className="w-4 h-4 text-orange-500 flex-shrink-0" />
            <span>TRANSPARENCY NOTE: NO ARTIFICIAL &quot;AUTHENTICITY SCORE&quot;</span>
          </div>
          <p className="font-sans leading-relaxed">
            FALCON-404 deliberately refrains from computing a single, aggregated &quot;authenticity percentage&quot; or binary
            PASS/FAIL verdict. In forensic document analysis, image-quality defects (blur, glare, lossy compression) do not
            constitute legal proof of forgery, and a successful OCR extraction does not prove official credential issuance.
            Each dimension is reported independently to support human examiner triage.
          </p>
        </div>
      </div>
    </Card>
  )
}
