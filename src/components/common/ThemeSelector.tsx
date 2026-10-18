import React from 'react'
import { Sun, Moon, Laptop } from 'lucide-react'
import { useTheme, type Theme } from '../../context/ThemeContext'

export interface ThemeSelectorProps {
  className?: string
  size?: 'sm' | 'md'
  showLabels?: boolean
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  className = '',
  size = 'sm',
  showLabels = false
}) => {
  const { theme, setTheme } = useTheme()

  const options: { id: Theme; label: string; code: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'light', label: 'Light', code: 'LT', icon: Sun },
    { id: 'system', label: 'Auto', code: 'SYS', icon: Laptop },
    { id: 'dark', label: 'Dark', code: 'DK', icon: Moon }
  ]

  const sizeClasses = size === 'sm' ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1.5 text-xs'
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'

  return (
    <div
      role="radiogroup"
      aria-label="Screening terminal color mode selector"
      className={`inline-flex items-center rounded-lg bg-slate-100/90 dark:bg-slate-900/90 p-0.5 border border-slate-200 dark:border-slate-800 ${className}`}
    >
      {options.map((opt) => {
        const Icon = opt.icon
        const isActive = theme === opt.id

        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            title={`Switch to ${opt.label} mode`}
            onClick={() => setTheme(opt.id)}
            className={`relative flex items-center gap-1.5 rounded-md ${sizeClasses} font-mono font-medium transition-all duration-150 cursor-pointer ${
              isActive
                ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-slate-100 shadow-xs border border-slate-200/80 dark:border-slate-700'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 border border-transparent'
            }`}
          >
            <Icon className={`${iconSize} ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`} />
            {showLabels ? (
              <span className="text-[10px] uppercase tracking-wider">{opt.label}</span>
            ) : (
              <span className="text-[9px] uppercase tracking-wider">{opt.code}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
