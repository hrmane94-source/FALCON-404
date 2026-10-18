import React from 'react'
import { User, QrCode, ScanLine } from 'lucide-react'

export const DocumentScanIllustration: React.FC = () => {
  return (
    <div className="relative w-full max-w-md mx-auto select-none font-sans">
      {/* Outer Viewfinder Chassis with forensic corner brackets & coordinate tags */}
      <div className="relative p-3.5 sm:p-4 rounded-xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden">
        {/* Precision corner reticles */}
        <div className="absolute top-2 left-2 w-3.5 h-3.5 border-t-2 border-l-2 border-orange-500 pointer-events-none" />
        <div className="absolute top-2 right-2 w-3.5 h-3.5 border-t-2 border-r-2 border-orange-500 pointer-events-none" />
        <div className="absolute bottom-2 left-2 w-3.5 h-3.5 border-b-2 border-l-2 border-orange-500 pointer-events-none" />
        <div className="absolute bottom-2 right-2 w-3.5 h-3.5 border-b-2 border-r-2 border-orange-500 pointer-events-none" />

        {/* Reticle grid background pattern */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #f97316 1px, transparent 1px)',
            backgroundSize: '16px 16px'
          }}
        />

        {/* Forensic Specimen Card Container */}
        <div className="relative overflow-hidden bg-slate-950 rounded-lg border border-slate-800 shadow-inner">
          {/* Active laser scan beam with neon trail */}
          <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-orange-400 to-transparent z-30 shadow-[0_0_12px_rgba(249,115,22,1)] animate-scan-beam pointer-events-none" />

          {/* Specimen Header Strip - Clear Synthetic Disclaimer */}
          <div className="px-3.5 py-2 bg-slate-900/90 border-b border-slate-800 text-white flex items-center justify-between font-mono">
            <div className="flex items-center gap-1.5">
              <ScanLine className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
              <span className="text-[10px] tracking-wider text-orange-400 font-semibold uppercase">
                TEST SPECIMEN
              </span>
            </div>
            <span className="text-[9px] text-amber-400 uppercase tracking-wider bg-amber-950/80 border border-amber-800/80 px-2 py-0.5 rounded font-semibold">
              SYNTHETIC DEMO — NOT A REAL ID
            </span>
          </div>

          {/* Specimen Anatomy */}
          <div className="p-4 space-y-3 relative">
            <div className="flex items-start gap-3.5">
              {/* Photo Box with biometric target overlay */}
              <div className="relative w-20 h-24 rounded bg-slate-900 border border-slate-700 flex flex-col items-center justify-center flex-shrink-0 text-slate-500 overflow-hidden">
                <User className="w-10 h-10 stroke-[1.2] text-slate-600" />
                {/* Facial alignment crosshair */}
                <div className="absolute inset-2 border border-dashed border-orange-500/40 rounded pointer-events-none" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-2 h-2 border border-orange-500/60 rounded-full" />
                </div>
                <span className="absolute bottom-1 text-[8px] font-mono text-slate-400 tracking-wider">
                  MOCK PHOTO
                </span>
              </div>

              {/* Fictional Specimen Details */}
              <div className="flex-1 space-y-2 pt-0.5 text-[11px] font-mono">
                <div>
                  <span className="text-[8px] uppercase tracking-wider text-slate-400 block">
                    SAMPLE HOLDER NAME
                  </span>
                  <div className="font-bold text-slate-100 text-xs tracking-tight">
                    JANE DOE (SAMPLE)
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[8px] uppercase tracking-wider text-slate-400 block">
                      SAMPLE ID
                    </span>
                    <span className="text-slate-300 text-[10px] font-semibold">
                      0000 0000 0000
                    </span>
                  </div>
                  <div>
                    <span className="text-[8px] uppercase tracking-wider text-slate-400 block">
                      SAMPLE DOB
                    </span>
                    <span className="text-slate-300 text-[10px]">
                      01/01/2000
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[8px] uppercase tracking-wider text-slate-400 block">
                    ISSUER STANDARD
                  </span>
                  <span className="text-slate-400 text-[10px]">
                    FICTIONAL DEMO AUTHORITY
                  </span>
                </div>
              </div>

              {/* Mock Barcode Block */}
              <div className="w-11 h-11 rounded bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-slate-400 flex-shrink-0 relative">
                <QrCode className="w-7 h-7 stroke-[1.2] text-slate-400" />
                <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.9)]" />
              </div>
            </div>

            {/* Fictional Machine Readable Zone (MRZ) Specimen */}
            <div className="p-2 rounded bg-slate-900/90 border border-slate-800/80 font-mono text-[9px] text-slate-400 tracking-wider leading-relaxed select-all">
              <div className="text-slate-500">P&lt;UTODEMO&lt;&lt;CITIZEN&lt;SAMPLE&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</div>
              <div className="text-orange-400/80">X0000000&lt;0UTO0001014M3001019&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;00</div>
            </div>
          </div>
        </div>

        {/* Credible Status Pill - No fake DPI claims */}
        <div className="mt-2.5 flex items-center justify-between px-1 text-[10px] font-mono text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-300 font-semibold tracking-wider">ILLUSTRATIVE INTERFACE SPECIMEN</span>
          </div>
          <span className="text-slate-400 tracking-wider">NON-OFFICIAL MOCKUP</span>
        </div>
      </div>
    </div>
  )
}
