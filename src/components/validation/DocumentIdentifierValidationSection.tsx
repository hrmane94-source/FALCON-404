import React, { useState } from 'react'
import {
  ShieldAlert,
  Hash,
  ExternalLink,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Clock,
  BookOpen
} from 'lucide-react'
import type {
  SupportedDocumentType,
  ValidationCheckResult,
  ExtractedDocumentField
} from '../../types/verificationWorkflow.ts'
import { VERIFICATION_STATUS_REGISTRY } from '../../types/verificationWorkflow.ts'
import { Card } from '../common/Card.tsx'
import { Badge } from '../common/Badge.tsx'
import { getRuleById } from '../../registry/ruleRegistry.ts'

export interface DocumentIdentifierValidationSectionProps {
  documentType: SupportedDocumentType
  extractedIdentifierField?: ExtractedDocumentField
  validationResults: ValidationCheckResult[]
  disabled?: boolean
}

export const DocumentIdentifierValidationSection: React.FC<DocumentIdentifierValidationSectionProps> = ({
  documentType,
  extractedIdentifierField,
  validationResults,
  disabled = false
}) => {
  const [showUnmasked, setShowUnmasked] = useState(false)

  const identifierValue = extractedIdentifierField?.value || ''
  const isPresent = Boolean(identifierValue && !identifierValue.toLowerCase().includes('not detected'))

  const maskIdentifier = (val: string): string => {
    if (!val || val.length <= 4) return val
    const clean = val.replace(/\s+/g, '')
    if (clean.length === 12) {
      // Aadhaar format
      return `•••• •••• ${clean.slice(-4)}`
    }
    if (clean.length === 10) {
      // PAN format
      return `••••••${clean.slice(-4)}`
    }
    return `${'•'.repeat(Math.max(4, clean.length - 4))}${clean.slice(-4)}`
  }

  const displayedIdentifier = showUnmasked ? identifierValue : maskIdentifier(identifierValue)

  const identifierChecks = validationResults.filter(
    (c) => c.checkCategory === 'identifier-format' || c.checkCategory === 'mathematical-checksum'
  )

  const getStatusBadge = (status: ValidationCheckResult['status']) => {
    const meta = VERIFICATION_STATUS_REGISTRY[status] || VERIFICATION_STATUS_REGISTRY.NOT_IMPLEMENTED

    if (status === 'PASS') {
      return (
        <Badge variant="success" size="sm">
          {meta.label}
        </Badge>
      )
    }
    if (status === 'FAIL') {
      return (
        <Badge variant="danger" size="sm">
          {meta.label}
        </Badge>
      )
    }
    if (status === 'UNREADABLE') {
      return (
        <Badge variant="warning" size="sm">
          {meta.label}
        </Badge>
      )
    }
    return (
      <Badge variant="neutral" size="sm">
        <Clock className="w-3 h-3 text-amber-500 mr-1" />
        {meta.label}
      </Badge>
    )
  }

  return (
    <Card
      sectionCode="STAGE // 04"
      title="Document Identifier Validation"
      subtitle={`Deterministic structural rules & checksum algorithms for ${documentType} • Step 1 Baseline`}
      action={
        <div className="flex items-center gap-2 font-mono">
          <Badge variant="neutral" size="sm">
            STEP 1 // INTERFACE ACTIVE
          </Badge>
        </div>
      }
    >
      <div className="space-y-6 font-sans">
        {/* EVALUATION NOTICE & ARCHITECTURAL TRANSPARENCY */}
        <div className="p-4 rounded-lg bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-200 space-y-2">
          <div className="flex items-center gap-2 font-mono font-bold uppercase tracking-wider text-amber-950 dark:text-amber-100">
            <ShieldAlert className="w-4 h-4 text-orange-500 flex-shrink-0" />
            <span>ALGORITHMIC VERIFICATION PROTOCOL // MILESTONE STEP 1 STATUS</span>
          </div>
          <p className="leading-relaxed">
            This section represents the dedicated UI and shared data contract for deterministic identifier validation.
            Specific mathematical algorithms (such as the Aadhaar Verhoeff dihedral group D5 checksum, PAN format syntax,
            and passport MRZ check-digits) are scheduled for development in <strong>Step 2</strong>.
            All checks below are registered in the authoritative Rule Registry and honestly reported as{' '}
            <strong>NOT_IMPLEMENTED</strong>. No check returns a false PASS.
          </p>
        </div>

        {/* TARGET IDENTIFIER PANEL */}
        <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-3 font-mono">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4 text-orange-500" />
              <span className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                TARGET IDENTIFIER FOR VALIDATION:
              </span>
            </div>
            {extractedIdentifierField?.isManuallyCorrected && (
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                MANUALLY CORRECTED BY EXAMINER
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200/70 dark:border-slate-800">
            <div className="text-sm font-bold tracking-wider text-slate-900 dark:text-slate-100 break-all">
              {isPresent ? (
                displayedIdentifier
              ) : (
                <span className="text-slate-400 italic font-normal">[NO IDENTIFIER DETECTED BY OCR]</span>
              )}
            </div>

            {isPresent && (
              <button
                type="button"
                disabled={disabled}
                onClick={() => setShowUnmasked(!showUnmasked)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                title={showUnmasked ? 'Mask identifier digits' : 'Reveal full identifier digits'}
              >
                {showUnmasked ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>MASK</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    <span>UNMASK</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>
              DOCUMENT CATEGORY: <strong>{documentType.toUpperCase()}</strong>
            </span>
            <span>
              PRIVACY POLICY: <Lock className="w-3 h-3 inline mx-0.5 text-emerald-500" /> MASKED BY DEFAULT
            </span>
          </div>
        </div>

        {/* RULE REGISTRY CHECKLIST */}
        <div className="space-y-3 font-mono">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                DETERMINISTIC VALIDATION CHECKLIST
              </h4>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono">
                {identifierChecks.length} CHECKS REGISTERED
              </span>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              AUTHORITATIVE SPECIFICATIONS
            </span>
          </div>

          <div className="space-y-3">
            {identifierChecks.map((check) => {
              const rule = check.ruleId ? getRuleById(check.ruleId) : undefined

              return (
                <div
                  key={check.checkId}
                  className="p-3.5 rounded-lg bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-2.5 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {check.checkName}
                        </span>
                        {check.ruleId && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300/50 dark:border-slate-700">
                            {check.ruleId}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-sans text-slate-600 dark:text-slate-400 leading-relaxed">
                        {check.explanation}
                      </p>
                    </div>

                    <div className="flex-shrink-0">{getStatusBadge(check.status)}</div>
                  </div>

                  {rule && (
                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/80 text-[10px] text-slate-500 dark:text-slate-400 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="w-3 h-3 text-orange-500 flex-shrink-0" />
                        <span>AUTHORITATIVE SOURCE: {rule.authoritativeSourceName}</span>
                        {rule.authoritativeSourceUrl && (
                          <a
                            href={rule.authoritativeSourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-orange-600 dark:text-orange-400 hover:underline inline-flex items-center gap-0.5 ml-1"
                          >
                            <span>REF</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                      {check.limitations && (
                        <div className="flex items-start gap-1 text-slate-400 dark:text-slate-500">
                          <AlertCircle className="w-3 h-3 text-slate-400 flex-shrink-0 mt-0.5" />
                          <span>LIMITATION: {check.limitations}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* TRANSPARENT DISCLAIMER FOOTER */}
        <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-lg border border-slate-200/70 dark:border-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-400 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 block">
              GOVERNANCE DIRECTIVE:
            </span>
            <p className="leading-relaxed">
              A successful OCR extraction does not equate to identifier validation. Passing a format syntax check
              does not guarantee institutional authenticity. All deterministic rules remain segregated from image-level
              forensics.
            </p>
          </div>
        </div>
      </div>
    </Card>
  )
}
