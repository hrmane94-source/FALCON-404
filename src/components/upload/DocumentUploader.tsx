import React, { useState, useRef } from 'react'
import {
  UploadCloud,
  FileImage,
  AlertCircle,
  X,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Loader2,
  Lock
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
  label = 'Document Image Ingestion',
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

      // If there was an existing document previewUrl, revoke it first to prevent memory leaks
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
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block text-rose-900">Upload Rejected</span>
              <p className="mt-0.5 leading-relaxed text-rose-700">{errorMessage}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="p-1 rounded text-rose-400 hover:text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
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
          className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center transition-all duration-200 cursor-pointer flex flex-col items-center justify-center ${
            isDragging
              ? 'border-blue-500 bg-blue-50/70 scale-[0.99]'
              : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50'
          }`}
        >
          {isValidating ? (
            <div className="flex flex-col items-center justify-center py-4 space-y-3">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <div className="text-xs text-slate-600 font-medium">
                Validating file content and header signatures...
              </div>
            </div>
          ) : (
            <>
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-colors ${
                  isDragging
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200/80 text-slate-500 shadow-xs'
                }`}
              >
                <UploadCloud className="w-6 h-6 stroke-[1.8]" />
              </div>

              <h4 className="text-sm font-semibold text-slate-900 tracking-tight">
                {isDragging ? 'Drop document image here' : label}
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">
                {description}. Drag and drop here or click to browse.
              </p>

              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    triggerBrowse()
                  }}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors shadow-xs cursor-pointer"
                >
                  Browse Files
                </button>
              </div>

              <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-400 font-normal">
                <span>JPEG, PNG, WebP</span>
                <span>•</span>
                <span>Max {formatFileSize(maxSizeBytes)}</span>
                <span>•</span>
                <span>In-browser validation</span>
              </div>
            </>
          )}
        </div>
      ) : (
        /* Preview Card */
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs transition-all space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-900 block leading-tight">
                  Document Ready for Review
                </span>
                <span className="text-[11px] text-slate-400">
                  Header signature and format validated
                </span>
              </div>
            </div>

            {/* Actions: Replace / Remove */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={triggerBrowse}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                title="Select a different document"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                <span>Replace</span>
              </button>

              <button
                type="button"
                onClick={handleRemove}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                title="Remove selected document"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>Remove</span>
              </button>
            </div>
          </div>

          {/* Preview Image & Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-start">
            {/* Visual Image Preview */}
            <div className="sm:col-span-5 bg-slate-100/70 border border-slate-200/80 rounded-xl p-2.5 flex items-center justify-center overflow-hidden">
              <img
                src={document.previewUrl}
                alt={document.name}
                className="max-h-56 w-auto object-contain rounded-lg shadow-2xs"
              />
            </div>

            {/* Metadata Breakdown */}
            <div className="sm:col-span-7 space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 space-y-2">
                <div className="flex items-start gap-2">
                  <FileImage className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] uppercase font-mono text-slate-400 block">
                      Filename
                    </span>
                    <span className="font-semibold text-slate-900 truncate block">
                      {document.name}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/50">
                  <div>
                    <span className="text-[10px] uppercase font-mono text-slate-400 block">
                      File Size
                    </span>
                    <span className="font-mono text-slate-700 font-medium">
                      {document.sizeFormatted}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-mono text-slate-400 block">
                      Detected Format
                    </span>
                    <span className="text-slate-700 font-medium">
                      {document.detectedFormat}
                    </span>
                  </div>
                  {document.dimensions && (
                    <div>
                      <span className="text-[10px] uppercase font-mono text-slate-400 block">
                        Dimensions
                      </span>
                      <span className="font-mono text-slate-700">
                        {document.dimensions.width} × {document.dimensions.height} px
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] uppercase font-mono text-slate-400 block">
                      Ingestion
                    </span>
                    <span className="text-slate-600">
                      {document.uploadedAt}
                    </span>
                  </div>
                </div>
              </div>

              {/* In-browser safety badge */}
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 px-1">
                <Lock className="w-3 h-3 text-slate-400" />
                <span>Encrypted in-memory object URL. Not saved to server or storage.</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
