import React from 'react'
import { ShieldAlert, User, QrCode } from 'lucide-react'

export const DocumentScanIllustration: React.FC = () => {
  return (
    <div className="relative w-full max-w-md mx-auto select-none">
      {/* Outer Viewfinder Frame with corner reticles */}
      <div className="relative p-3 sm:p-4 rounded-2xl bg-gradient-to-b from-slate-100 to-slate-200/70 border border-slate-200 shadow-sm">
        {/* Viewfinder corner reticles */}
        <div className="absolute top-2 left-2 w-3.5 h-3.5 border-t-2 border-l-2 border-slate-400 rounded-tl-sm pointer-events-none" />
        <div className="absolute top-2 right-2 w-3.5 h-3.5 border-t-2 border-r-2 border-slate-400 rounded-tr-sm pointer-events-none" />
        <div className="absolute bottom-2 left-2 w-3.5 h-3.5 border-b-2 border-l-2 border-slate-400 rounded-bl-sm pointer-events-none" />
        <div className="absolute bottom-2 right-2 w-3.5 h-3.5 border-b-2 border-r-2 border-slate-400 rounded-br-sm pointer-events-none" />

        {/* The Credential Specimen Card */}
        <div className="relative overflow-hidden bg-white rounded-xl border border-slate-200/90 shadow-sm">
          {/* Subtle animated scan beam */}
          <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-orange-500 to-transparent z-20 shadow-[0_0_8px_rgba(249,115,22,0.8)] animate-scan-beam pointer-events-none" />

          {/* Card Header Bar */}
          <div className="px-4 py-2 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-[10px] font-mono tracking-wider text-orange-300 font-semibold">
                SYNTHETIC DEMO DOCUMENT
              </span>
            </div>
            <span className="text-[9px] font-mono text-slate-400">
              NON-OFFICIAL
            </span>
          </div>

          {/* Card Body */}
          <div className="p-4 space-y-3.5">
            <div className="flex items-start gap-3.5">
              {/* Photo Box with face-alignment guides */}
              <div className="relative w-20 h-24 rounded-lg bg-slate-100 border border-slate-200 flex flex-col items-center justify-center flex-shrink-0 text-slate-400 overflow-hidden">
                <User className="w-10 h-10 stroke-[1.5] text-slate-300" />
                <div className="absolute inset-1 border border-dashed border-slate-300/80 rounded" />
                <span className="absolute bottom-1 text-[8px] font-mono text-slate-400">
                  SAMPLE PHOTO
                </span>
              </div>

              {/* Text Fields with explicit fictional sample details */}
              <div className="flex-1 space-y-2 pt-0.5 text-[11px]">
                <div>
                  <span className="text-[9px] font-mono text-slate-400 block uppercase">
                    Sample Subject Name
                  </span>
                  <div className="font-semibold text-slate-800 font-mono text-xs">
                    JANE DOE (DEMO)
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[9px] font-mono text-slate-400 block uppercase">
                      Document ID
                    </span>
                    <span className="font-mono text-slate-700 text-[10px]">
                      DEMO-0000-00
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-slate-400 block uppercase">
                      Date of Birth
                    </span>
                    <span className="font-mono text-slate-700 text-[10px]">
                      01 / 01 / 2000
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[9px] font-mono text-slate-400 block uppercase">
                    Issuing Authority
                  </span>
                  <span className="text-slate-600 font-medium text-[10px]">
                    Fictional Test Authority (Mock)
                  </span>
                </div>
              </div>

              {/* QR / Pattern placeholder */}
              <div className="w-10 h-10 rounded bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 flex-shrink-0">
                <QrCode className="w-6 h-6 stroke-[1.2]" />
              </div>
            </div>

            {/* Fictional Machine Readable Zone (MRZ) Specimen */}
            <div className="p-2 rounded bg-slate-50 border border-slate-200/80 font-mono text-[9px] text-slate-400 tracking-wider leading-relaxed select-all">
              <div>P&lt;UTODEMO&lt;&lt;CITIZEN&lt;TEST&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</div>
              <div>X0000000&lt;0UTO0001014M3001019&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;00</div>
            </div>
          </div>
        </div>

        {/* Caption Pill */}
        <div className="mt-2.5 flex items-center justify-between px-1 text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
            Synthetic Document Preview
          </span>
          <span className="text-slate-400">
            Engine Disconnected (Phase 1)
          </span>
        </div>
      </div>
    </div>
  )
}
