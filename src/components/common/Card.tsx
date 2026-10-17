import React from 'react'

export interface CardProps {
  title?: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  headerClassName?: string
  bodyClassName?: string
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  action,
  children,
  className = '',
  headerClassName = '',
  bodyClassName = ''
}) => {
  return (
    <div
      className={`bg-white rounded-xl border border-slate-200/70 shadow-xs ${className}`}
    >
      {(title || subtitle || action) && (
        <div
          className={`px-6 py-4.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${headerClassName}`}
        >
          <div>
            {title && (
              <h3 className="text-base font-semibold text-slate-900 tracking-tight">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-slate-500 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}
      <div className={`p-6 ${bodyClassName}`}>{children}</div>
    </div>
  )
}
