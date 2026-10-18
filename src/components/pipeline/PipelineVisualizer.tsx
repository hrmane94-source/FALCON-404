import React, { useState } from 'react'
import {
  Camera,
  FileSearch,
  ShieldAlert,
  Scan,
  ClipboardCheck,
  ChevronRight,
  Info,
  ArrowRight
} from 'lucide-react'
import { PIPELINE_STAGES } from '../../data/pipelineStages'
import type { PipelineStage } from '../../types'
import { Modal } from '../common/Modal'

export const PipelineVisualizer: React.FC = () => {
  const [selectedStage, setSelectedStage] = useState<PipelineStage | null>(null)

  const getStageIcon = (iconName: string) => {
    const iconClass = "w-4 h-4 text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
    switch (iconName) {
      case 'Camera':
        return <Camera className={iconClass} />
      case 'FileSearch':
        return <FileSearch className={iconClass} />
      case 'ShieldAlert':
        return <ShieldAlert className={iconClass} />
      case 'UserCheck':
        return <Scan className={iconClass} />
      case 'ClipboardCheck':
        return <ClipboardCheck className={iconClass} />
      default:
        return <Info className={iconClass} />
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-xs transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-heading text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Screening Architecture Pipeline
            </h3>
            <span className="text-[10px] font-mono uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200/60 dark:border-blue-800/60 font-semibold">
              5 Implemented Stages
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Sequential screening bus: Document Ingestion → OCR Extraction → Forensic Analysis → Layout Inspection → Screening Report
          </p>
        </div>
        <span className="self-start sm:self-auto text-[10px] font-mono uppercase tracking-widest text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-200/80 dark:border-emerald-800/80 font-bold">
          CLIENT // READY
        </span>
      </div>

      {/* Five-Stage Connected Pipeline Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-5 relative">
        {PIPELINE_STAGES.map((stage, idx) => (
          <div
            key={stage.id}
            onClick={() => setSelectedStage(stage)}
            className="group relative bg-slate-50/60 dark:bg-slate-950/50 hover:bg-white dark:hover:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-blue-500/80 dark:hover:border-blue-500/80 hover:shadow-md hover:shadow-blue-500/5 rounded-lg p-4 transition-all duration-200 ease-out cursor-pointer flex flex-col justify-between"
          >
            {/* Desktop visual connection arrow between stages */}
            {idx < PIPELINE_STAGES.length - 1 && (
              <div className="hidden md:flex absolute -right-2.5 top-1/2 -translate-y-1/2 z-10 w-5 h-5 rounded-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 items-center justify-center text-slate-400 dark:text-slate-500 shadow-xs pointer-events-none group-hover:border-blue-400 group-hover:text-blue-500 transition-colors">
                <ArrowRight className="w-2.5 h-2.5 stroke-[2.5]" />
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">
                  {stage.stepNumber}
                </span>
                <span className="text-[9px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 font-semibold">
                  READY
                </span>
              </div>

              <div className="w-8 h-8 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 group-hover:border-blue-500/50 flex items-center justify-center mb-2.5 transition-colors shadow-2xs">
                {getStageIcon(stage.iconName)}
              </div>

              <h4 className="font-heading text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 leading-snug transition-colors">
                {stage.name}
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                {stage.subtitle}
              </p>
            </div>

            <div className="mt-3.5 pt-2 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              <span className="uppercase tracking-wider">VIEW SPEC</span>
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        ))}
      </div>

      {/* Modal for inspect specs */}
      <Modal
        isOpen={selectedStage !== null}
        onClose={() => setSelectedStage(null)}
        title={selectedStage ? `${selectedStage.stepNumber} // ${selectedStage.name.toUpperCase()}` : ''}
        subtitle={selectedStage?.subtitle}
        maxWidth="md"
      >
        {selectedStage && (
          <div className="space-y-4 text-xs text-slate-600 dark:text-slate-400 font-sans">
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 block mb-1">
                ENGINE OBJECTIVE
              </span>
              <p className="leading-relaxed text-slate-700 dark:text-slate-300">
                {selectedStage.description}
              </p>
            </div>

            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 block mb-2">
                ACTIVE CLIENT CAPABILITIES
              </span>
              <ul className="space-y-1.5 list-disc pl-4 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                {selectedStage.details.map((detail, index) => (
                  <li key={index} className="leading-relaxed">
                    {detail}
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-950/70 rounded border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-mono leading-relaxed">
              <span className="font-bold text-slate-900 dark:text-slate-100">FALCON RUNTIME: </span>
              In-browser WebAssembly execution utilizing Tesseract LSTM, Sobel matrix convolution, and canvas-based Error Level Analysis (ELA).
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
