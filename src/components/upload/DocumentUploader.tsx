import React, { useState, useRef } from 'react'
import {
  FileImage,
  AlertCircle,
  X,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Loader2,
  Lock,
  Crosshair
} from 'lucide-react'
import type { UploadedDocument } from '../../types'
import {
  validateDocumentFile,
  formatFileSize,
  MAX_FILE_SIZE_BYTES
} from '../../utils/fileValidation'

export interface DocumentUploaderProps {
  document: UploadedDocument | null
  onDocumentSelected: (doc: UploadedDocument) => void
  onDocumentRemoved: () => void
  maxSizeBytes?: number
  label?: string
  description?: string
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  document,
  onDocumentSelected,
  onDocumentRemoved,
  maxSizeBytes = MAX_FILE_SIZE_BYTES,
  label = 'Credential Image Ingestion',
  description = 'Upload front face or high-resolution document capture'
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileProcess = async (file: File) => {
    setErrorMessage(null)
    setIsValidating(true)

    try {
      const validation = await validateDocumentFile(file)

      if (!validation.valid) {
        setErrorMessage(validation.error || 'The selected file is not a valid document image.')
        setIsValidating(false)
        return
      }

      // Revoke prior URL to prevent memory leaks
      if (document?.previewUrl) {
        URL.revokeObjectURL(document.previewUrl)
      }

      const previewUrl = URL.createObjectURL(file)
      const now = new Date()
      const timeFormatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

      const newDoc: UploadedDocument = {
        file,
        previewUrl,
        name: file.name,
        sizeFormatted: formatFileSize(file.size),
        sizeBytes: file.size,
        mimeType: file.type || 'image/jpeg',
        detectedFormat: validation.detectedFormat || 'Standard Image',
        dimensions:
          validation.width && validation.height
            ? { width: validation.width, height: validation.height }
            : undefined,
        uploadedAt: `Today at ${timeFormatted}`
      }

      onDocumentSelected(newDoc)
    } catch {
      setErrorMessage('An unexpected error occurred while inspecting the file. Please try another image.')
    } finally {
      setIsValidating(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      handleFileProcess(files[0])
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileProcess(files[0])
    }
  }

  const triggerBrowse = () => {
    fileInputRef.current?.click()
  }

  const handleRemove = () => {
    if (document?.previewUrl) {
      URL.revokeObjectURL(document.previewUrl)
    }
    setErrorMessage(null)
    onDocumentRemoved()
  }

  return (
    <div className="space-y-4">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        onChange={handleFileInputChange}
        className="hidden"
        aria-label="Upload document file"
      />

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-3.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs flex items-start justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-mono font-bold uppercase tracking-wider block text-rose-900 dark:text-rose-100">
                INGESTION REJECTED // PARSE FAILED
              </span>
              <p className="mt-0.5 leading-relaxed text-rose-700 dark:text-rose-300 font-sans">{errorMessage}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="p-1 rounded text-rose-400 hover:text-rose-700 dark:hover:text-rose-200 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors cursor-pointer"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Dropzone OR Preview Card */}
      {!document ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerBrowse}
          className={`relative border-2 border-dashed rounded-xl p-8 sm:p-12 text-center transition-all duration-200 cursor-pointer flex flex-col items-center justify-center overflow-hidden ${
            isDragging
              ? 'border-orange-500 bg-orange-50/70 dark:bg-orange-950/40 scale-[0.99]'
              : 'border-slate-300 dark:border-slate-800 hover:border-orange-500/70 dark:hover:border-orange-500/70 bg-slate-50/50 dark:bg-slate-950/40 hover:bg-slate-50 dark:hover:bg-slate-900/50'
          }`}
        >
          {/* Subtle crosshair watermark in dropzone */}
          <div className="absolute top-3 left-3 w-3 h-3 border-t border-l border-slate-300 dark:border-slate-700" />
          <div className="absolute top-3 right-3 w-3 h-3 border-t border-r border-slate-300 dark:border-slate-700" />
          <div className="absolute bottom-3 left-3 w-3 h-3 border-b border-l border-slate-300 dark:border-slate-700" />
          <div className="absolute bottom-3 right-3 w-3 h-3 border-b border-r border-slate-300 dark:border-slate-700" />

          {isValidating ? (
            <div className="flex flex-col items-center justify-center py-6 space-y-3 font-mono">
              <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
              <div className="text-xs text-slate-700 dark:text-slate-300 font-semibold tracking-wider uppercase">
                VALIDATING FILE SIGNATURE & RASTER HEADERS...
              </div>
            </div>
          ) : (
            <>
              <div
                className={`w-12 h-12 rounded-lg flex items-center justify-center mb-3 transition-colors ${
                  isDragging
                    ? 'bg-orange-600 text-white shadow-md'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 shadow-2xs'
                }`}
              >
                <Crosshair className="w-6 h-6 stroke-[1.8]" />
              </div>

              <h4 className="font-heading text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight uppercase">
                {isDragging ? 'RELEASE SPECIMEN TO INGEST' : label}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm leading-relaxed font-sans">
                {description}. Drag and drop document file here or click to browse workstation storage.
              </p>

              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    triggerBrowse()
                  }}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-colors shadow-2xs cursor-pointer"
                >
                  BROWSE LOCAL DISK
                </button>
              </div>

              <div className="mt-5 flex items-center gap-2 text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                <span>FORMATS // JPEG, PNG, WEBP</span>
                <span>•</span>
                <span>MAX // {formatFileSize(maxSizeBytes)}</span>
                <span>•</span>
                <span>IN-MEMORY SANDBOX</span>
              </div>
            </>
          )}
        </div>
      ) : (
        /* Preview Card */
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-5 shadow-xs transition-all space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 block leading-tight">
                  SPECIMEN VALIDATED // READY FOR SCREENING
                </span>
                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                  Header signature and magic bytes confirmed
                </span>
              </div>
            </div>

            {/* Actions: Replace / Remove */}
            <div className="flex items-center gap-2 self-end sm:self-auto font-mono">
              <button
                type="button"
                onClick={triggerBrowse}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded text-xs font-semibold transition-colors cursor-pointer"
                title="Select a different document"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>REPLACE</span>
              </button>

              <button
                type="button"
                onClick={handleRemove}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 rounded text-xs font-semibold transition-colors cursor-pointer border border-rose-200/60 dark:border-rose-900/60"
                title="Remove selected document"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                <span>REMOVE</span>
              </button>
            </div>
          </div>

          {/* Preview Image & Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-start">
            {/* Visual Image Preview */}
            <div className="sm:col-span-5 bg-slate-950 border border-slate-800 rounded-lg p-2.5 flex items-center justify-center overflow-hidden relative">
              <img
                src={document.previewUrl}
                alt={document.name}
                className="max-h-56 w-auto object-contain rounded shadow-lg"
              />
              <div className="absolute top-2 right-2 text-[9px] font-mono text-white/70 bg-black/70 px-1.5 py-0.5 rounded">
                CANVAS // PREVIEW
              </div>
            </div>

            {/* Metadata Breakdown */}
            <div className="sm:col-span-7 space-y-3 font-mono text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-lg border border-slate-200/70 dark:border-slate-800 space-y-2">
                <div className="flex items-start gap-2">
                  <FileImage className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                      FILE IDENTIFIER
                    </span>
                    <span className="font-bold text-slate-900 dark:text-slate-100 truncate block">
                      {document.name}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/50 dark:border-slate-800">
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                      STORAGE SIZE
                    </span>
                    <span className="text-slate-700 dark:text-slate-300 font-semibold">
                      {document.sizeFormatted}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                      DETECTED CODEC
                    </span>
                    <span className="text-slate-700 dark:text-slate-300 font-semibold">
                      {document.detectedFormat}
                    </span>
                  </div>
                  {document.dimensions && (
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                        RASTER RESOLUTION
                      </span>
                      <span className="text-slate-700 dark:text-slate-300">
                        {document.dimensions.width} × {document.dimensions.height} PX
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                      INTAKE TIMESTAMP
                    </span>
                    <span className="text-slate-600 dark:text-slate-400 text-[11px]">
                      {document.uploadedAt}
                    </span>
                  </div>
                </div>
              </div>

              {/* In-browser safety badge */}
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 px-1 font-mono">
                <Lock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                <span>EPHEMERAL OBJECT URL // NOT TRANSMITTED OVER NETWORK</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
