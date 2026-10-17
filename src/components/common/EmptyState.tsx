import React from 'react'
import { Inbox } from 'lucide-react'

export interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
  className?: string
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = <Inbox className="w-6 h-6 text-slate-400 stroke-[1.5]" />,
  title,
  description,
  action,
  className = ''
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center py-10 px-4 ${className}`}
    >
      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-3">
        {icon}
      </div>
      <h4 className="text-sm font-semibold text-slate-900 tracking-tight">
        {title}
      </h4>
      <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
