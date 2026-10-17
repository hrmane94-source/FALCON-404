import React from 'react'

export interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent' | 'subtle' | 'neutral'
  size?: 'sm' | 'md'
  className?: string
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'sm',
  className = ''
}) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'

  const variantClasses = {
    default: 'bg-slate-100 text-slate-700 border border-slate-200/80',
    neutral: 'bg-slate-100 text-slate-600 border border-slate-200/60',
    subtle: 'bg-slate-100 text-slate-600 border border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
    warning: 'bg-amber-50 text-amber-800 border border-amber-200/80',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200/80',
    info: 'bg-blue-50 text-blue-700 border border-blue-200/80',
    accent: 'bg-orange-50 text-orange-800 border border-orange-200/80'
  }[variant]

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md font-medium text-[11px] leading-tight ${sizeClasses} ${variantClasses} ${className}`}
    >
      {children}
    </span>
  )
}
