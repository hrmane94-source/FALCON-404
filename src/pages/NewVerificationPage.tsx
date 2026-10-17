import React, { useState } from 'react'
import { UploadCloud, Camera, Check, Info } from 'lucide-react'
import type { NavigationSection, DocumentType } from '../types'
import { Card } from '../components/common/Card'
import { Modal } from '../components/common/Modal'

export interface NewVerificationPageProps {
  onNavigate: (section: NavigationSection) => void
}

export const NewVerificationPage: React.FC<NewVerificationPageProps> = ({ onNavigate }) => {
  const [selectedDoc, setSelectedDoc] = useState<DocumentType>('National ID')
  const [showNoticeModal, setShowNoticeModal] = useState(false)

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

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Intro */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          New Verification
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Select a credential type and prepare document images for screening.
        </p>
      </div>

      {/* Step 1: Document Selection */}
      <Card
        title="1. Select Document Type"
        subtitle="Choose the credential format you want to verify."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {documentOptions.map((item) => {
            const isSelected = selectedDoc === item.type
            return (
              <button
                key={item.type}
                type="button"
                onClick={() => setSelectedDoc(item.type)}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600/30'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
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

      {/* Step 2: Document Capture Zones */}
      <Card
        title="2. Document Capture"
        subtitle="Upload or capture the front, reverse side, and holder photo."
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="border border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-center bg-slate-50/60 hover:bg-slate-50 transition-colors">
            <UploadCloud className="w-6 h-6 text-slate-400 mb-2" />
            <span className="text-xs font-semibold text-slate-800">
              Front Side
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5">
              Photo &amp; text details
            </span>
          </div>

          <div className="border border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-center bg-slate-50/60 hover:bg-slate-50 transition-colors">
            <UploadCloud className="w-6 h-6 text-slate-400 mb-2" />
            <span className="text-xs font-semibold text-slate-800">
              Reverse Side
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5">
              Address &amp; barcodes
            </span>
          </div>

          <div className="border border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-center bg-slate-50/60 hover:bg-slate-50 transition-colors">
            <Camera className="w-6 h-6 text-slate-400 mb-2" />
            <span className="text-xs font-semibold text-slate-800">
              Holder Photo
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5">
              For facial comparison
            </span>
          </div>
        </div>

        {/* Prototype note */}
        <div className="mt-5 p-3.5 bg-slate-50 rounded-lg border border-slate-200/80 flex items-start gap-2.5 text-xs text-slate-600">
          <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
          <p>
            <strong>Phase 1 Notice:</strong> Ingestion and automated verification processing will be connected in Phase 2. File uploads are disabled in this prototype.
          </p>
        </div>

        {/* Action Button */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onNavigate('overview')}
            className="text-xs text-slate-500 hover:text-slate-800 font-medium transition-colors cursor-pointer"
          >
            Return to Overview
          </button>

          <button
            type="button"
            onClick={() => setShowNoticeModal(true)}
            className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-medium shadow-xs transition-colors cursor-pointer"
          >
            Start Verification
          </button>
        </div>
      </Card>

      {/* Notice Modal */}
      <Modal
        isOpen={showNoticeModal}
        onClose={() => setShowNoticeModal(false)}
        title="Processing Engine Not Connected"
        subtitle="Phase 1 Prototype Boundary"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs text-slate-600">
          <p className="leading-relaxed">
            In accordance with Phase 1 objectives, the frontend layout and workflow are active, but backend OCR, forensic image analysis, and biometric comparison services have not yet been integrated.
          </p>

          <div className="p-3 bg-slate-50 rounded-lg text-slate-700 space-y-1">
            <span className="font-semibold block text-slate-900">Upcoming Milestones:</span>
            <p>• Phase 2: Document ingestion API and OCR extraction</p>
            <p>• Phase 3: Image tampering forensics and face matching</p>
            <p>• Phase 4: Human review dashboard and report export</p>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={() => setShowNoticeModal(false)}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 cursor-pointer"
            >
              Understood
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
