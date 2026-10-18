import React, { useState, useEffect } from 'react'
import {
  Check,
  ArrowRight,
  ArrowLeft,
  ShieldAlert,
  RotateCcw,
  FileCheck2,
  Lock,
  Loader2,
  AlertTriangle,
  Sparkles,
  ShieldCheck
} from 'lucide-react'
import type {
  NavigationSection,
  DocumentType,
  UploadedDocument,
  OCRStatus,
  OCRProgress,
  OCRResult,
  IntegrityAnalysisStatus,
  IntegrityProgress,
  ImageIntegrityResult
} from '../types'
import { Card } from '../components/common/Card'
import { Badge } from '../components/common/Badge'
import { DocumentUploader } from '../components/upload/DocumentUploader'
import { OCRAnalysisSection } from '../components/ocr/OCRAnalysisSection'
import { ImageIntegritySection } from '../components/integrity/ImageIntegritySection'
import { ScreeningReportSection } from '../components/report/ScreeningReportSection'
import { performOCR } from '../services/ocrService'
import { performImageIntegrityAnalysis } from '../services/imageIntegrityService'

export interface NewVerificationPageProps {
  onNavigate: (section: NavigationSection) => void
}

export const NewVerificationPage: React.FC<NewVerificationPageProps> = ({ onNavigate }) => {
  const [currentStep, setCurrentStep] = useState<'upload' | 'review'>('upload')
  const [selectedDocType, setSelectedDocType] = useState<DocumentType>('National ID')
  const [uploadedDoc, setUploadedDoc] = useState<UploadedDocument | null>(null)

  // Stage 02: OCR state
  const [ocrStatus, setOcrStatus] = useState<OCRStatus>('idle')
  const [ocrProgress, setOcrProgress] = useState<OCRProgress | null>(null)
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null)
  const [ocrError, setOcrError] = useState<string | null>(null)

  // Stage 03: Image Integrity state
  const [integrityStatus, setIntegrityStatus] = useState<IntegrityAnalysisStatus>('idle')
  const [integrityProgress, setIntegrityProgress] = useState<IntegrityProgress | null>(null)
  const [integrityResult, setIntegrityResult] = useState<ImageIntegrityResult | null>(null)
  const [integrityError, setIntegrityError] = useState<string | null>(null)

  // Clean up Object URL on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (uploadedDoc?.previewUrl) {
        URL.revokeObjectURL(uploadedDoc.previewUrl)
      }
    }
  }, [uploadedDoc])

  const resetAnalysisState = () => {
    setOcrStatus('idle')
    setOcrProgress(null)
    setOcrResult(null)
    setOcrError(null)
    setIntegrityStatus('idle')
    setIntegrityProgress(null)
    setIntegrityResult(null)
    setIntegrityError(null)
  }

  const handleDocumentSelected = (doc: UploadedDocument) => {
    resetAnalysisState()
    setUploadedDoc(doc)
  }

  const handleDocumentRemoved = () => {
    resetAnalysisState()
    setUploadedDoc(null)
  }

  const handleReset = () => {
    if (uploadedDoc?.previewUrl) {
      URL.revokeObjectURL(uploadedDoc.previewUrl)
    }
    resetAnalysisState()
    setUploadedDoc(null)
    setCurrentStep('upload')
  }

  const handleRunOCR = async () => {
    if (!uploadedDoc?.file) return

    setOcrStatus('initializing')
    setOcrError(null)
    setOcrProgress({
      status: 'Initializing OCR WebAssembly engine...',
      progress: 0,
      stage: 'initializing'
    })

    try {
      const result = await performOCR({
        imageSource: uploadedDoc.file,
        documentCategory: selectedDocType,
        onProgress: (prog) => {
          setOcrProgress(prog)
          if (prog.stage === 'recognizing') {
            setOcrStatus('recognizing')
          }
        }
      })

      setOcrResult(result)
      setOcrStatus('success')
    } catch (err: any) {
      setOcrStatus('error')
      setOcrError(
        err?.message ||
          'Failed to execute Optical Character Recognition. Please check network connectivity and try again.'
      )
    }
  }

  const handleRunIntegrity = async () => {
    if (!uploadedDoc?.file || !uploadedDoc.previewUrl) return

    setIntegrityStatus('analyzing')
    setIntegrityError(null)
    setIntegrityProgress({
      status: 'Reading container headers...',
      progress: 0.1,
      stage: 'reading'
    })

    try {
      const result = await performImageIntegrityAnalysis({
        file: uploadedDoc.file,
        previewUrl: uploadedDoc.previewUrl,
        onProgress: (prog) => {
          setIntegrityProgress(prog)
        }
      })

      setIntegrityResult(result)
      setIntegrityStatus('success')
    } catch (err: any) {
      setIntegrityStatus('error')
      setIntegrityError(
        err?.message || 'Failed to complete image integrity analysis. Please try another image.'
      )
    }
  }

  const handleRunCompleteScreening = async () => {
    if (!uploadedDoc?.file) return
    if (ocrStatus !== 'success') {
      await handleRunOCR()
    }
    await handleRunIntegrity()
  }

  const isOcrRunning = ocrStatus === 'initializing' || ocrStatus === 'recognizing'
  const isIntegrityRunning = integrityStatus === 'analyzing'
  const isProcessing = isOcrRunning || isIntegrityRunning

  const documentOptions: { type: DocumentType; label: string; description: string }[] = [
    {
      type: 'National ID',
      label: 'National ID / Aadhaar',
      description: 'Standard national identity card with text and QR code format.'
    },
    {
      type: 'Passport',
      label: 'Passport',
      description: 'Standard travel document with photo page and MRZ lines.'
    },
    {
      type: "Driver's License",
      label: "Driver's License",
      description: 'Motor vehicle operating license with issuing authority format.'
    },
    {
      type: 'Voter ID',
      label: 'Voter ID',
      description: 'Electoral photo identity credential.'
    },
    {
      type: 'PAN Card',
      label: 'PAN Card',
      description: 'Permanent Account Number identification card.'
    }
  ]

  const getStep2BannerContent = () => {
    if (isProcessing) {
      return {
        icon: <Loader2 className="w-4.5 h-4.5 animate-spin text-blue-600" />,
        iconBg: 'bg-blue-50 border-blue-200',
        title: isOcrRunning
          ? 'Running Stage 02: Optical Character Recognition (OCR)...'
          : 'Running Stage 03: Image Integrity & Forensics...',
        subtitle:
          'Client-side WebAssembly worker is actively analyzing document glyphs and physical raster properties. Please wait.'
      }
    }
    if (integrityResult && ocrResult) {
      return {
        icon: <FileCheck2 className="w-4.5 h-4.5 text-emerald-600" />,
        iconBg: 'bg-emerald-50 border-emerald-200',
        title: 'Preliminary Document Screening Completed',
        subtitle:
          'Client-side OCR transcription and image integrity checks are complete. Review explainable findings and download the screening dossier below.'
      }
    }
    if (ocrStatus === 'success') {
      return {
        icon: <Sparkles className="w-4.5 h-4.5 text-purple-600" />,
        iconBg: 'bg-purple-50 border-purple-200',
        title: 'OCR Complete • Stage 03 Integrity Analysis Ready',
        subtitle:
          'Document characters have been extracted. Click "Run Image Integrity Analysis" below to evaluate raster exposure, blur, metadata headers, and Error Level Analysis (ELA).'
      }
    }
    if (ocrStatus === 'error' || integrityStatus === 'error') {
      return {
        icon: <AlertTriangle className="w-4.5 h-4.5 text-rose-600" />,
        iconBg: 'bg-rose-50 border-rose-200',
        title: 'Document Ingestion Flagged an Engine Error',
        subtitle:
          'One of the client-side screening pipelines encountered an error. You may retry below or upload a different image.'
      }
    }
    return {
      icon: <FileCheck2 className="w-4.5 h-4.5 text-blue-600" />,
      iconBg: 'bg-blue-50 border-blue-200',
      title: 'Document Uploaded Successfully • Ready for Screening',
      subtitle:
        'Your document file is validated in-memory. You can execute individual OCR and Image Integrity checks below or run a complete preliminary screening.'
    }
  }

  const bannerContent = getStep2BannerContent()

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Step Indicator Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              New Verification
            </h2>
            <Badge variant="info" size="sm">
              Phase 4: Preliminary Screening
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Functional document intake, client-side OCR, image integrity analysis, and screening dossier.
          </p>
        </div>

        {/* Stepper tracker */}
        <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-medium">
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full transition-colors ${
              currentStep === 'upload'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
              1
            </span>
            <span>Upload Document</span>
          </div>

          <span className="text-slate-300">→</span>

          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full transition-colors ${
              currentStep === 'review'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            <span
              className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                currentStep === 'review'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-300 text-slate-600'
              }`}
            >
              2
            </span>
            <span>Screening &amp; Review</span>
          </div>
        </div>
      </div>

      {/* STEP 1: UPLOAD & PREVIEW */}
      {currentStep === 'upload' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Step 1A: Document Category Selection */}
          <Card
            title="1. Select Document Category"
            subtitle="Choose the institutional credential standard for screening."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {documentOptions.map((item) => {
                const isSelected = selectedDocType === item.type
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => setSelectedDocType(item.type)}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/60 ring-1 ring-blue-600/30'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-slate-900">
                        {item.label}
                      </span>
                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-white">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      {item.description}
                    </p>
                  </button>
                )
              })}
            </div>
          </Card>

          {/* Step 1B: Document Upload Component */}
          <Card
            title="2. Document File Intake"
            subtitle="Upload document image for client-side staging and validation."
          >
            <DocumentUploader
              document={uploadedDoc}
              onDocumentSelected={handleDocumentSelected}
              onDocumentRemoved={handleDocumentRemoved}
              label="Upload Credential Image"
              description="Drop document capture or click to browse"
            />

            {/* Navigation / Next Action Button */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => onNavigate('overview')}
                className="text-xs text-slate-500 hover:text-slate-800 font-medium transition-colors cursor-pointer text-left sm:text-auto"
              >
                ← Return to Overview
              </button>

              <button
                type="button"
                disabled={!uploadedDoc}
                onClick={() => setCurrentStep('review')}
                className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  uploadedDoc
                    ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-xs'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <span>Continue to Screening &amp; Review</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </Card>

          {/* Privacy & Protocol Notice */}
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 text-xs text-slate-600 space-y-1.5">
            <div className="flex items-center gap-2 text-slate-900 font-semibold">
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>In-Browser Client Ingestion Protocol</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Files uploaded here are validated entirely within your local browser runtime. Images are never transmitted to external APIs or recorded to persistent storage. Please use synthetic or mock credentials for demonstration.
            </p>
          </div>
        </div>
      )}

      {/* STEP 2: REVIEW INGESTION & SCREENING WORKFLOW */}
      {currentStep === 'review' && uploadedDoc && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Review Status Banner */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-3">
            <div className="flex items-start gap-3">
              <div
                className={`w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 mt-0.5 ${bannerContent.iconBg}`}
              >
                {bannerContent.icon}
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-slate-900">
                  {bannerContent.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {bannerContent.subtitle}
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-[11px] text-slate-600 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p>
                <strong>Evaluation Transparency:</strong> FALCON performs client-side OCR character transcription and image integrity checks. It does not certify documents as authentic, nor does it definitively establish fraud. No official government registry lookup or live 1:1 face matching has been executed.
              </p>
            </div>
          </div>

          {/* Document Ingestion Summary */}
          <Card
            title="Ingestion Dossier"
            subtitle="Metadata recorded during client-side intake."
            action={
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => {
                  if (!isProcessing) {
                    resetAnalysisState()
                    setCurrentStep('upload')
                  }
                }}
                className={`text-xs font-medium cursor-pointer ${
                  isProcessing
                    ? 'text-slate-400 cursor-not-allowed'
                    : 'text-blue-600 hover:text-blue-800'
                }`}
              >
                Replace or Modify File
              </button>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-start">
              {/* Image Preview */}
              <div className="sm:col-span-5 bg-slate-100 rounded-xl p-3 border border-slate-200/80 flex flex-col items-center justify-center">
                <img
                  src={uploadedDoc.previewUrl}
                  alt={uploadedDoc.name}
                  className="max-h-64 w-auto object-contain rounded-lg shadow-2xs"
                />
                <span className="text-[10px] text-slate-400 font-mono mt-2">
                  Client-side Raster Preview
                </span>
              </div>

              {/* Data Breakdown */}
              <div className="sm:col-span-7 space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                    <span className="text-[10px] uppercase font-mono text-slate-400 block mb-0.5">
                      Document Standard
                    </span>
                    <span className="font-semibold text-slate-900">{selectedDocType}</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                    <span className="text-[10px] uppercase font-mono text-slate-400 block mb-0.5">
                      Ingestion Status
                    </span>
                    <span className="font-medium text-emerald-700">Validated In-Memory</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                    <span className="text-[10px] uppercase font-mono text-slate-400 block mb-0.5">
                      File Name
                    </span>
                    <span className="font-medium text-slate-800 truncate block">
                      {uploadedDoc.name}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                    <span className="text-[10px] uppercase font-mono text-slate-400 block mb-0.5">
                      File Size
                    </span>
                    <span className="font-mono text-slate-700">{uploadedDoc.sizeFormatted}</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                    <span className="text-[10px] uppercase font-mono text-slate-400 block mb-0.5">
                      Format &amp; MIME
                    </span>
                    <span className="text-slate-800">
                      {uploadedDoc.detectedFormat} ({uploadedDoc.mimeType})
                    </span>
                  </div>

                  {uploadedDoc.dimensions && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                      <span className="text-[10px] uppercase font-mono text-slate-400 block mb-0.5">
                        Pixel Resolution
                      </span>
                      <span className="font-mono text-slate-800">
                        {uploadedDoc.dimensions.width} × {uploadedDoc.dimensions.height}
                      </span>
                    </div>
                  )}
                </div>

                {/* Primary Complete Screening Trigger Button */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-blue-50/50 rounded-xl border border-blue-200/60">
                  <div>
                    <span className="text-xs font-semibold text-blue-950 block">
                      Automated Preliminary Screening
                    </span>
                    <span className="text-[11px] text-blue-700">
                      Execute OCR and Image Integrity Analysis in one pass.
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleRunCompleteScreening}
                    className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer ${
                      isProcessing
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                    }`}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Screening Active...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Run Full Screening</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </Card>

          {/* STAGE 02: Genuine Client-Side OCR Analysis Section */}
          <OCRAnalysisSection
            ocrStatus={ocrStatus}
            ocrProgress={ocrProgress}
            ocrResult={ocrResult}
            ocrError={ocrError}
            disabled={isProcessing}
            onRunOCR={handleRunOCR}
            onRetryOCR={handleRunOCR}
          />

          {/* STAGE 03: Image Integrity, Quality, and ELA Section */}
          <ImageIntegritySection
            status={integrityStatus}
            progress={integrityProgress}
            result={integrityResult}
            error={integrityError}
            disabled={isProcessing}
            onRunAnalysis={handleRunIntegrity}
            onRetryAnalysis={handleRunIntegrity}
          />

          {/* PRELIMINARY SCREENING REPORT (Appears when integrity analysis has executed) */}
          {integrityResult && (
            <ScreeningReportSection
              documentName={uploadedDoc.name}
              selectedDocumentType={selectedDocType}
              ocrStatus={ocrStatus}
              ocrResult={ocrResult}
              integrityResult={integrityResult}
              disabled={isProcessing}
            />
          )}

          {/* Bottom Navigation & Action Bar */}
          <div className="pt-2 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => {
                if (!isProcessing) {
                  resetAnalysisState()
                  setCurrentStep('upload')
                }
              }}
              className={`inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer ${
                isProcessing
                  ? 'text-slate-400 cursor-not-allowed'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Upload Step</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleReset}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                  isProcessing
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Upload Another Document</span>
              </button>

              <button
                type="button"
                disabled={isProcessing}
                onClick={() => onNavigate('overview')}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                  isProcessing
                    ? 'bg-slate-400 text-slate-200 cursor-not-allowed'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                <span>Go to Overview</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
