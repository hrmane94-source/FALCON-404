import React from 'react'
import { FileText, Download, BarChart2 } from 'lucide-react'
import { Card } from '../components/common/Card'

export const ReportsPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Reports &amp; Auditing
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Inspection reporting and compliance exports. Scheduled for integration in Phase 4.
        </p>
      </div>

      {/* Planned Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <FileText className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">
            Case Summary PDF
          </h3>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            Detailed examination report containing document captures, extracted fields, and examiner determinations.
          </p>
          <span className="inline-block mt-4 text-[10px] text-slate-400 font-medium px-2 py-0.5 rounded bg-slate-100">
            Phase 4 Feature
          </span>
        </Card>

        <Card>
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <Download className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">
            Activity Log Export
          </h3>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            Downloadable CSV/JSON log of verification transactions for institutional compliance and internal review.
          </p>
          <span className="inline-block mt-4 text-[10px] text-slate-400 font-medium px-2 py-0.5 rounded bg-slate-100">
            Phase 4 Feature
          </span>
        </Card>

        <Card>
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <BarChart2 className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">
            Screening Analytics
          </h3>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            Summary metrics on verification volumes, document types, and common discrepancy patterns across intake points.
          </p>
          <span className="inline-block mt-4 text-[10px] text-slate-400 font-medium px-2 py-0.5 rounded bg-slate-100">
            Phase 4 Feature
          </span>
        </Card>
      </div>

      {/* Info notice */}
      <div className="p-4 rounded-xl bg-white border border-slate-200/80 text-xs text-slate-500">
        <span className="font-semibold text-slate-800 block mb-1">
          Development Roadmap Notice
        </span>
        <p className="leading-relaxed">
          Reporting tools rely on persistent database storage (Phase 2) and verification engine results (Phase 3). Export capabilities will become functional once those services are integrated.
        </p>
      </div>
    </div>
  )
}
