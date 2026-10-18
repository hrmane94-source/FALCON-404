import React from 'react'

export interface FalconEmblemProps {
  className?: string
  size?: number
  variant?: 'monochrome' | 'accent' | 'glow'
}

/**
 * FALCON // FORENSIC INTELLIGENCE Official Emblem
 * Combines:
 * 1. Precision document bounding brackets [ ]
 * 2. Aerodynamic geometric falcon wing chevrons
 * 3. Optical center reticle & scanning focal line
 */
export const FalconEmblem: React.FC<FalconEmblemProps> = ({
  className = '',
  size = 28,
  variant = 'accent'
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block flex-shrink-0 select-none ${className}`}
      aria-label="FALCON Forensic Intelligence Emblem"
    >
      {/* Document Corner Framing Brackets */}
      {/* Top-Left Bracket */}
      <path
        d="M3 9V4C3 3.44772 3.44772 3 4 3H9"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={variant === 'accent' ? 'text-slate-400 dark:text-slate-500' : 'text-current'}
      />
      {/* Top-Right Bracket */}
      <path
        d="M23 3H28C28.5523 3 29 3.44772 29 4V9"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={variant === 'accent' ? 'text-slate-400 dark:text-slate-500' : 'text-current'}
      />
      {/* Bottom-Right Bracket */}
      <path
        d="M29 23V28C29 28.5523 28.5523 29 28 29H23"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={variant === 'accent' ? 'text-slate-400 dark:text-slate-500' : 'text-current'}
      />
      {/* Bottom-Left Bracket */}
      <path
        d="M9 29H4C3.44772 29 3 28.5523 3 28V23"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={variant === 'accent' ? 'text-slate-400 dark:text-slate-500' : 'text-current'}
      />

      {/* Aerodynamic Geometric Falcon Wings (Precision Angled Polygons) */}
      {/* Left Wing Facet */}
      <path
        d="M7 11.5L16 6.5L12 16L7 11.5Z"
        fill="currentColor"
        className={variant === 'accent' ? 'text-blue-600 dark:text-blue-500' : 'text-current'}
      />
      {/* Right Wing Facet */}
      <path
        d="M25 11.5L16 6.5L20 16L25 11.5Z"
        fill="currentColor"
        className={variant === 'accent' ? 'text-blue-500 dark:text-blue-400' : 'text-current'}
      />

      {/* Center Raptor Talon & Scan Core Arrow */}
      <path
        d="M16 8.5L19 15.5L16 25.5L13 15.5L16 8.5Z"
        fill="currentColor"
        className={variant === 'accent' ? 'text-orange-500 dark:text-orange-400' : 'text-current'}
      />

      {/* Optical Precision Scan Line (Horizontal Horizon) */}
      <line
        x1="10"
        y1="16"
        x2="22"
        y2="16"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        className={variant === 'accent' ? 'text-white' : 'text-slate-900'}
      />
    </svg>
  )
}
