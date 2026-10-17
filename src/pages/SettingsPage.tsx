import React from 'react'
import { Card } from '../components/common/Card'

export const SettingsPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          System Settings
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Platform configurations and sensitivity thresholds. Scheduled for backend connection in Phase 2.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* API Gateway Configuration */}
        <Card
          title="Service Endpoints"
          subtitle="Connection endpoints for the verification pipeline."
        >
          <div className="space-y-4 text-xs">
            <div>
              <label className="text-slate-700 font-medium block mb-1">
                Backend Gateway URL
              </label>
              <input
                type="text"
                disabled
                value="http://localhost:8000/api/v1 (Standby)"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-xs cursor-not-allowed font-mono"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Offline — will connect when backend services are launched in Phase 2.
              </span>
            </div>

            <div className="pt-3 border-t border-slate-100 text-slate-500">
              <span className="font-medium text-slate-700 block mb-1">Status</span>
              <p>Frontend operating in standalone demonstrator mode.</p>
            </div>
          </div>
        </Card>

        {/* Sensitivity Thresholds */}
        <Card
          title="Verification Sensitivity"
          subtitle="Planned confidence thresholds for automated screening."
        >
          <div className="space-y-4 text-xs text-slate-600">
            <div>
              <div className="flex justify-between mb-1">
                <span className="font-medium text-slate-700">OCR Confidence Threshold</span>
                <span className="font-mono text-slate-500">85%</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-blue-600 h-1.5 rounded-full w-[85%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="font-medium text-slate-700">Face Match Similarity Cutoff</span>
                <span className="font-mono text-slate-500">75%</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-blue-600 h-1.5 rounded-full w-[75%]" />
              </div>
            </div>

            <div className="pt-2 text-[11px] text-slate-400">
              Thresholds will become adjustable once processing models are integrated.
            </div>
          </div>
        </Card>
      </div>

      {/* Privacy & Retention */}
      <Card
        title="Privacy &amp; Data Handling"
        subtitle="Data retention policies for processed credentials."
      >
        <div className="space-y-2 text-xs text-slate-600">
          <p className="leading-relaxed">
            The screening system is being designed to minimize data retention. Under default institutional policy, raw document images are cleared after review, keeping only verification metadata and examiner decisions for audit records.
          </p>
          <span className="inline-block mt-2 text-[11px] text-slate-400 font-medium">
            Designed for institutional privacy compliance.
          </span>
        </div>
      </Card>
    </div>
  )
}
