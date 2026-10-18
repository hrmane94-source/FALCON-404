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
  ImageIntegrityResult,
  LayoutAnalysisStatus,
  LayoutProgress,
  DocumentLayoutResult
} from '../types'
import { Card } from '../components/common/Card'
import { Badge } from '../components/common/Badge'
import { DocumentUploader } from '../components/upload/DocumentUploader'
import { OCRAnalysisSection } from '../components/ocr/OCRAnalysisSection'
import { ImageIntegritySection } from '../components/integrity/ImageIntegritySection'
import { DocumentLayoutSection } from '../components/layout/DocumentLayoutSection'
import { DocumentBoundaryOverlay } from '../components/layout/DocumentBoundaryOverlay'
import { ScreeningReportSection } from '../components/report/ScreeningReportSection'
import { performOCR } from '../services/ocrService'
import { performImageIntegrityAnalysis } from '../services/imageIntegrityService'
import { performDocumentLayoutAnalysis } from '../services/documentLayoutService'
import { PROJECT_BRANDING } from '../constants/branding'

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

  // Stage 04: Document Boundary & Layout state (Phase 5)
  const [layoutStatus, setLayoutStatus] = useState<LayoutAnalysisStatus>('idle')
  const [layoutProgress, setLayoutProgress] = useState<LayoutProgress | null>(null)
  const [layoutResult, setLayoutResult] = useState<DocumentLayoutResult | null>(null)
  const [layoutError, setLayoutError] = useState<string | null>(null)

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
    setLayoutStatus('idle')
    setLayoutProgress(null)
    setLayoutResult(null)
    setLayoutError(null)
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

  const handleRunOCR = async (): Promise<OCRResult | null> => {
    if (!uploadedDoc?.file) return null

    setOcrStatus('initializing')
    setOcrError(null)
    setOcrProgress({
      status: 'INITIALIZING OCR WASM ENGINE...',
      progress: 0,
      stage: 'initializing'
    })

    try {
      const result = await performOCR({
        imageSource: uploadedDoc.file,
        documentCategory: selectedDocType,
        onProgress: (progress: OCRProgress) => {
          setOcrProgress(progress)
          if (progress.stage === 'recognizing') {
            setOcrStatus('recognizing')
          }
        }
      })

      setOcrResult(result)
      setOcrStatus('success')
      return result
    } catch (err: any) {
      setOcrStatus('error')
      setOcrError(
        err?.message ||
          'Failed to complete OCR processing. Please check image quality and try again.'
      )
      return null
    }
  }

  const handleRunIntegrity = async (): Promise<ImageIntegrityResult | null> => {
    if (!uploadedDoc?.file) return null

    setIntegrityStatus('analyzing')
    setIntegrityError(null)
    setIntegrityProgress({
      status: 'DECODING RASTER MATRIX & COMPUTING LAPLACIAN EDGES...',
      progress: 0.1,
      stage: 'reading'
    })

    try {
      const result = await performImageIntegrityAnalysis({
        file: uploadedDoc.file,
        previewUrl: uploadedDoc.previewUrl,
        onProgress: (prog: IntegrityProgress) => {
          setIntegrityProgress(prog)
        }
      })

      setIntegrityResult(result)
      setIntegrityStatus('success')
      return result
    } catch (err: any) {
      setIntegrityStatus('error')
      setIntegrityError(
        err?.message || 'Failed to complete image integrity analysis. Please try another image.'
      )
      return null
    }
  }

  const handleRunLayout = async (passedOcr?: OCRResult | null): Promise<DocumentLayoutResult | null> => {
    if (!uploadedDoc?.file) return null

    setLayoutStatus('analyzing')
    setLayoutError(null)
    setLayoutProgress({
      status: 'CONVOLVING SOBEL MATRIX & ESTIMATING QUADRILATERAL...',
      progress: 0.15,
      stage: 'decoding'
    })

    try {
      const activeOcr = passedOcr !== undefined ? passedOcr : ocrResult
      const result = await performDocumentLayoutAnalysis({
        file: uploadedDoc.file,
        previewUrl: uploadedDoc.previewUrl,
        textRegions: activeOcr?.textRegions,
        onProgress: (prog) => {
          setLayoutProgress(prog)
        }
      })

      setLayoutResult(result)
      setLayoutStatus('success')
      return result
    } catch (err: any) {
      setLayoutStatus('error')
      setLayoutError(
        err?.message || 'Failed to complete document boundary and layout analysis.'
      )
      return null
    }
  }

  const handleRunCompleteScreening = async () => {
    if (!uploadedDoc?.file) return
    let currentOcr = ocrResult
    if (ocrStatus !== 'success') {
      currentOcr = await handleRunOCR()
    }
    await handleRunIntegrity()
    await handleRunLayout(currentOcr)
  }

  const isOcrRunning = ocrStatus === 'initializing' || ocrStatus === 'recognizing'
  const isIntegrityRunning = integrityStatus === 'analyzing'
  const isLayoutRunning = layoutStatus === 'analyzing'
  const isProcessing = isOcrRunning || isIntegrityRunning || isLayoutRunning

  const documentOptions: { type: DocumentType; label: string; description: string; code: string }[] = [
    {
      type: 'National ID',
      code: 'STD // NID',
      label: 'National ID / Aadhaar',
      description: 'Standard national identity card with text and QR format.'
    },
    {
      type: 'Passport',
      code: 'STD // PPT',
      label: 'Passport',
      description: 'Standard travel document with photo page and MRZ lines.'
    },
    {
      type: "Driver's License",
      code: 'STD // DLN',
      label: "Driver's License",
      description: 'Motor vehicle operating credential format.'
    },
    {
      type: 'Voter ID',
      code: 'STD // VID',
      label: 'Voter ID',
      description: 'Electoral photo identity credential.'
    },
    {
      type: 'PAN Card',
      code: 'STD // PAN',
      label: 'PAN Card',
      description: 'Tax identification account card format.'
    }
  ]

  const getStep2BannerContent = () => {
    if (isProcessing) {
      return {
        icon: <Loader2 className="w-5 h-5 animate-spin text-orange-500" />,
        iconBg: 'bg-orange-500/10 border-orange-500/30',
        title: isOcrRunning
          ? 'STAGE 02 IN PROGRESS // OPTICAL CHARACTER RECOGNITION (OCR)'
          : isIntegrityRunning
          ? 'STAGE 03 IN PROGRESS // IMAGE INTEGRITY & ERROR LEVEL ANALYSIS'
          : 'STAGE 04 IN PROGRESS // SOBEL BOUNDARY & LAYOUT ANALYSIS',
        subtitle:
          'Client-side algorithms are actively analyzing document glyphs, raster integrity, and boundary geometry in-memory.'
      }
    }
    if (integrityResult && ocrResult && layoutResult) {
      return {
        icon: <FileCheck2 className="w-5 h-5 text-emerald-500" />,
        iconBg: 'bg-emerald-500/10 border-emerald-500/30',
        title: 'COMPLETE SCREENING FINALIZED // DOSSIER READY',
        subtitle:
          'Client-side OCR transcription, image integrity checks, and document boundary/perspective analysis are complete. Review audit findings below.'
      }
    }
    if (integrityResult && ocrResult) {
      return {
        icon: <FileCheck2 className="w-5 h-5 text-emerald-500" />,
        iconBg: 'bg-emerald-500/10 border-emerald-500/30',
        title: 'OCR & INTEGRITY COMPLETE // READY FOR BOUNDARY LOCATOR',
        subtitle:
          'Client-side OCR transcription and image integrity checks are complete. Run Stage 04 below to evaluate boundary localization, perspective, and layout containment.'
      }
    }
    if (ocrStatus === 'success') {
      return {
        icon: <Sparkles className="w-5 h-5 text-purple-500" />,
        iconBg: 'bg-purple-500/10 border-purple-500/30',
        title: 'OCR COMPLETE // STAGES 03 & 04 READY FOR INVOCATION',
        subtitle:
          'Document characters have been extracted. Click "RUN COMPLETE SCREENING PASS" to evaluate raster integrity, metadata, ELA, and document boundaries.'
      }
    }
    if (ocrStatus === 'error' || integrityStatus === 'error' || layoutStatus === 'error') {
      return {
        icon: <AlertTriangle className="w-5 h-5 text-rose-500" />,
        iconBg: 'bg-rose-500/10 border-rose-500/30',
        title: 'ENGINE EXECUTION FAULT DETECTED',
        subtitle:
          'One of the client-side screening pipelines encountered an error. You may retry below or upload a different image.'
      }
    }
    return {
      icon: <FileCheck2 className="w-5 h-5 text-orange-500" />,
      iconBg: 'bg-orange-500/10 border-orange-500/30',
      title: 'SPECIMEN INGESTED // READY FOR MULTI-STAGE SCREENING',
      subtitle:
        'Your document file is validated in-memory. You can execute individual OCR, Integrity, and Boundary checks below or run a complete screening pass.'
    }
  }

  const bannerContent = getStep2BannerContent()

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Step Indicator Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/90 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight uppercase">
              INTAKE &amp; SCREENING WORKSPACE
            </h2>
            <Badge variant="neutral" size="sm">
              SEC // 02
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-sans">
            Client-side specimen intake, OCR glyph extraction, forensic integrity checks, boundary geometry, and screening dossier.
          </p>
        </div>

        {/* Stepper tracker */}
        <div className="flex items-center gap-2 self-start sm:self-auto font-mono text-xs">
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors ${
              currentStep === 'upload'
                ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/30 font-bold'
                : 'bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <span>01 // INTAKE</span>
          </div>

          <span className="text-slate-300 dark:text-slate-700">→</span>

          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors ${
              currentStep === 'review'
                ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/30 font-bold'
                : 'bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <span>02 // SCREENING &amp; DOSSIER</span>
          </div>
        </div>
      </div>

      {/* STEP 1: UPLOAD & PREVIEW */}
      {currentStep === 'upload' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Step 1A: Document Category Selection */}
          <Card
            sectionCode="INTAKE // 01"
            title="Credential Standard Selection"
            subtitle="Choose the institutional credential standard for automated screening rules."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 font-mono">
              {documentOptions.map((item) => {
                const isSelected = selectedDocType === item.type
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => setSelectedDocType(item.type)}
                    className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-orange-500 bg-orange-500/10 ring-1 ring-orange-500'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-950'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] text-slate-400 font-mono">
                        {item.code}
                      </span>
                      {isSelected && (
                        <div className="w-3.5 h-3.5 rounded-full bg-orange-500 text-white flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <div className="font-heading text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                      {item.label}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug font-sans">
                      {item.description}
                    </p>
                  </button>
                )
              })}
            </div>
          </Card>

          {/* Step 1B: Document Upload Component */}
          <Card
            sectionCode="INTAKE // 02"
            title="Specimen File Ingestion"
            subtitle="Upload document image for in-browser client staging and validation."
          >
            <DocumentUploader
              document={uploadedDoc}
              onDocumentSelected={handleDocumentSelected}
              onDocumentRemoved={handleDocumentRemoved}
              label="Credential Image Ingestion"
              description="Drop document capture or click to browse workstation storage"
            />

            {/* Navigation / Next Action Button */}
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono">
              <button
                type="button"
                onClick={() => onNavigate('overview')}
                className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-bold uppercase tracking-wider transition-colors cursor-pointer text-left sm:text-auto"
              >
                ← RETURN TO OVERVIEW
              </button>

              <button
                type="button"
                disabled={!uploadedDoc}
                onClick={() => setCurrentStep('review')}
                className={`inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  uploadedDoc
                    ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-md shadow-orange-600/20'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                }`}
              >
                <span>PROCEED TO SCREENING PIPELINE</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </Card>

          {/* Privacy & Protocol Notice */}
          <div className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1.5 font-mono">
            <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold uppercase tracking-wider">
              <Lock className="w-3.5 h-3.5 text-orange-500" />
              <span>IN-BROWSER CLIENT INGESTION PROTOCOL</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
              Files uploaded here are validated entirely within your local browser runtime. Images are never transmitted to external APIs or recorded to persistent storage. Please use synthetic or mock credentials for demonstration.
            </p>
          </div>
        </div>
      )}

      {/* STEP 2: REVIEW INGESTION & SCREENING WORKFLOW */}
      {currentStep === 'review' && uploadedDoc && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Review Status Banner */}
          <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3 font-mono">
            <div className="flex items-start gap-3">
              <div
                className={`w-9 h-9 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 ${bannerContent.iconBg}`}
              >
                {bannerContent.icon}
              </div>
              <div className="space-y-1">
                <h3 className="font-heading text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight uppercase">
                  {bannerContent.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
                  {bannerContent.subtitle}
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded border border-slate-200/70 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
              <p className="font-sans leading-relaxed">
                <strong>Evaluation Transparency:</strong> FALCON performs client-side OCR character transcription, image integrity, and geometric boundary checks. It does not certify documents as authentic, nor does it definitively establish fraud.
              </p>
            </div>
          </div>

          {/* Document Ingestion Summary */}
          <Card
            sectionCode="DOSSIER // 01"
            title="Specimen Ingestion Record"
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
                className={`text-xs font-mono font-bold uppercase tracking-wider cursor-pointer ${
                  isProcessing
                    ? 'text-slate-400 dark:text-slate-600 cursor-not-allowed'
                    : 'text-orange-600 hover:text-orange-700 dark:text-orange-400'
                }`}
              >
                [REPLACE_SPECIMEN]
              </button>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-start font-mono">
              {/* Image Preview with Boundary Overlay */}
              <div className="sm:col-span-5 bg-slate-950 rounded-lg p-2.5 border border-slate-800 flex flex-col items-center justify-center">
                <div className="relative max-h-64 w-full flex items-center justify-center rounded overflow-hidden bg-black/40">
                  <img
                    src={uploadedDoc.previewUrl}
                    alt={uploadedDoc.name}
                    className="max-h-64 w-auto object-contain rounded"
                  />
                  {layoutResult && (
                    <DocumentBoundaryOverlay
                      layoutResult={layoutResult}
                      imageWidth={uploadedDoc.dimensions?.width}
                      imageHeight={uploadedDoc.dimensions?.height}
                    />
                  )}
                </div>
                <div className="flex items-center justify-between w-full mt-2 text-[10px] text-slate-400 font-mono">
                  <span>CANVAS // PREVIEW</span>
                  {layoutResult && (
                    <span className="text-orange-400 font-bold uppercase">{layoutResult.statusLabel}</span>
                  )}
                </div>
              </div>

              {/* Data Breakdown */}
              <div className="sm:col-span-7 space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded border border-slate-200/60 dark:border-slate-800">
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-0.5">
                      STANDARD
                    </span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">{selectedDocType}</span>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded border border-slate-200/60 dark:border-slate-800">
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-0.5">
                      INGESTION STATUS
                    </span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase">VALIDATED IN-MEMORY</span>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded border border-slate-200/60 dark:border-slate-800">
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-0.5">
                      FILE IDENTIFIER
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                      {uploadedDoc.name}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded border border-slate-200/60 dark:border-slate-800">
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-0.5">
                      STORAGE SIZE
                    </span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">{uploadedDoc.sizeFormatted}</span>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded border border-slate-200/60 dark:border-slate-800">
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-0.5">
                      CODEC &amp; MIME
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {uploadedDoc.detectedFormat}
                    </span>
                  </div>

                  {uploadedDoc.dimensions && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded border border-slate-200/60 dark:border-slate-800">
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-0.5">
                        RESOLUTION MATRIX
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {uploadedDoc.dimensions.width} × {uploadedDoc.dimensions.height} PX
                      </span>
                    </div>
                  )}
                </div>

                {/* Master Screening Control Bar */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-orange-500/10 rounded-lg border border-orange-500/30">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-orange-950 dark:text-orange-200 block font-mono">
                      AUTONOMOUS MULTI-STAGE SCREENING BUS
                    </span>
                    <span className="text-[11px] text-orange-800 dark:text-orange-300 font-sans">
                      Execute OCR (Stage 02), Image Forensics (Stage 03), and Boundary Quad Locator (Stage 04) in one deterministic sequence.
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleRunCompleteScreening}
                    className={`inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded text-xs font-mono font-bold uppercase tracking-wider shadow-md transition-all cursor-pointer flex-shrink-0 ${
                      isProcessing
                        ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-600 cursor-not-allowed'
                        : 'bg-orange-600 hover:bg-orange-700 text-white shadow-orange-600/30'
                    }`}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>SCREENING ACTIVE...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>RUN COMPLETE SCREENING PASS</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </Card>

          {/* STAGE 02: Client-Side OCR Analysis Section */}
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

          {/* STAGE 04: Document Boundary, Perspective, and Layout Section */}
          <DocumentLayoutSection
            status={layoutStatus}
            progress={layoutProgress}
            result={layoutResult}
            error={layoutError}
            disabled={isProcessing}
            onRunAnalysis={() => handleRunLayout()}
            onRetryAnalysis={() => handleRunLayout()}
          />

          {/* PRELIMINARY SCREENING REPORT DOSSIER */}
          {integrityResult && (
            <ScreeningReportSection
              documentName={uploadedDoc.name}
              selectedDocumentType={selectedDocType}
              ocrStatus={ocrStatus}
              ocrResult={ocrResult}
              integrityResult={integrityResult}
              layoutResult={layoutResult}
              disabled={isProcessing}
            />
          )}

          {/* Bottom Navigation & Action Bar */}
          <div className="pt-2 border-t border-slate-200/90 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono">
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => {
                if (!isProcessing) {
                  resetAnalysisState()
                  setCurrentStep('upload')
                }
              }}
              className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider cursor-pointer ${
                isProcessing
                  ? 'text-slate-400 dark:text-slate-600 cursor-not-allowed'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>RETURN TO INTAKE</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleReset}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                  isProcessing
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>UPLOAD NEW SPECIMEN</span>
              </button>

              <button
                type="button"
                disabled={isProcessing}
                onClick={() => onNavigate('overview')}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                  isProcessing
                    ? 'bg-slate-400 dark:bg-slate-700 text-slate-200 dark:text-slate-500 cursor-not-allowed'
                    : 'bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white'
                }`}
              >
                <span>OVERVIEW CONSOLE</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Developer Attribution Footer */}
      <div className="pt-4 border-t border-slate-200/60 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider">
        <span>CREATOR // {PROJECT_BRANDING.developerAttribution}</span>
        <span className="text-[10px]">{PROJECT_BRANDING.challengeName} // GEN 2</span>
      </div>
    </div>
  )
}
