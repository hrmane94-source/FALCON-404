import React from 'react'

export interface CardProps {
  title?: string
  subtitle?: string
  sectionCode?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  headerClassName?: string
  bodyClassName?: string
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  sectionCode,
  action,
  children,
  className = '',
  headerClassName = '',
  bodyClassName = ''
}) => {
  return (
    <div
      className={`bg-white dark:bg-[#0c121e] rounded-xl border border-slate-200/90 dark:border-slate-800/90 shadow-2xs transition-colors overflow-hidden ${className}`}
    >
      {(title || subtitle || action || sectionCode) && (
        <div
          className={`px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-900/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${headerClassName}`}
        >
          <div>
            <div className="flex items-center gap-2">
              {sectionCode && (
                <span className="font-mono text-[9px] uppercase tracking-wider text-blue-600 dark:text-blue-400 font-semibold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 border border-blue-200/50 dark:border-blue-900/50">
                  {sectionCode}
                </span>
              )}
              {title && (
                <h3 className="font-heading text-sm sm:text-base font-bold text-slate-950 dark:text-slate-100 tracking-tight">
                  {title}
                </h3>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}
      <div className={`p-5 sm:p-6 ${bodyClassName}`}>{children}</div>
    </div>
  )
}
