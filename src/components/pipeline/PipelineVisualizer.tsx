import React, { useState } from 'react'
import {
  Camera,
  FileSearch,
  ShieldAlert,
  UserCheck,
  ClipboardCheck,
  ChevronRight,
  Info,
  ArrowRight,
  ArrowDown
} from 'lucide-react'
import { PIPELINE_STAGES } from '../../data/pipelineStages'
import type { PipelineStage } from '../../types'
import { Modal } from '../common/Modal'

export const PipelineVisualizer: React.FC = () => {
  const [selectedStage, setSelectedStage] = useState<PipelineStage | null>(null)

  const getStageIcon = (iconName: string) => {
    const iconClass = "w-4 h-4 text-slate-600 group-hover:text-blue-600 transition-colors"
    switch (iconName) {
      case 'Camera':
        return <Camera className={iconClass} />
      case 'FileSearch':
        return <FileSearch className={iconClass} />
      case 'ShieldAlert':
        return <ShieldAlert className={iconClass} />
      case 'UserCheck':
        return <UserCheck className={iconClass} />
      case 'ClipboardCheck':
        return <ClipboardCheck className={iconClass} />
      default:
        return <Info className={iconClass} />
    }
  }

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900 tracking-tight">
              Verification Workflow
            </h3>
            <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200/60">
              5 Planned Stages
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Sequential screening sequence: Document Capture → OCR &amp; Validation → Forensic Analysis → Face Comparison → Human Review
          </p>
        </div>
        <span className="self-start sm:self-auto text-[11px] font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200/80">
          Planned Pipeline • Engines Inactive
        </span>
      </div>

      {/* Five-Stage Connected Pipeline Grid with subtle hover feedback and visual connections */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5 pt-5 relative">
        {PIPELINE_STAGES.map((stage, idx) => (
          <React.Fragment key={stage.id}>
            <div
              onClick={() => setSelectedStage(stage)}
              className="group relative bg-white hover:bg-slate-50/50 border border-slate-200/80 hover:border-blue-300 hover:shadow-md hover:shadow-blue-500/5 hover:-translate-y-1 rounded-xl p-4.5 transition-all duration-200 ease-out cursor-pointer flex flex-col justify-between"
            >
              {/* Desktop visual connection arrow between stages */}
              {idx < PIPELINE_STAGES.length - 1 && (
                <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-white border border-slate-200 items-center justify-center text-slate-400 shadow-xs pointer-events-none group-hover:border-blue-200 group-hover:text-blue-500 transition-colors">
                  <ArrowRight className="w-3 h-3" />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-mono font-bold text-slate-400 group-hover:text-blue-600 transition-colors">
                    {stage.stepNumber}
                  </span>
                  <span className="text-[10px] font-medium text-slate-400 px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200/60 group-hover:border-blue-100 group-hover:text-blue-700 transition-colors">
                    Planned
                  </span>
                </div>

                <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200/80 group-hover:bg-blue-50/80 group-hover:border-blue-200 flex items-center justify-center mb-2.5 transition-all">
                  {getStageIcon(stage.iconName)}
                </div>

                <h4 className="text-xs font-semibold text-slate-900 group-hover:text-blue-900 leading-snug transition-colors">
                  {stage.name}
                </h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug group-hover:text-slate-600 transition-colors">
                  {stage.subtitle}
                </p>
              </div>

              <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 group-hover:text-blue-600 transition-colors">
                <span className="font-medium">Inspect specs</span>
                <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            {/* Mobile visual downward connector arrow */}
            {idx < PIPELINE_STAGES.length - 1 && (
              <div className="flex md:hidden items-center justify-center -my-1 text-slate-300">
                <ArrowDown className="w-4 h-4" />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Modal for inspect specs */}
      <Modal
        isOpen={selectedStage !== null}
        onClose={() => setSelectedStage(null)}
        title={selectedStage ? `${selectedStage.stepNumber}. ${selectedStage.name}` : ''}
        subtitle={selectedStage?.subtitle}
        maxWidth="md"
      >
        {selectedStage && (
          <div className="space-y-4 text-xs text-slate-600">
            <div>
              <span className="text-xs font-semibold text-slate-900 block mb-1">
                Objective
              </span>
              <p className="leading-relaxed text-slate-700">
                {selectedStage.description}
              </p>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-900 block mb-2">
                Planned Functional Capabilities
              </span>
              <ul className="space-y-1.5 list-disc pl-4 text-slate-700">
                {selectedStage.details.map((detail, index) => (
                  <li key={index} className="leading-relaxed">
                    {detail}
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-600 text-[11px] leading-relaxed">
              <span className="font-semibold text-slate-900">Current Phase Notice: </span>
              This verification stage is defined for development and will be connected when backend processing services are integrated in subsequent project phases.
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
