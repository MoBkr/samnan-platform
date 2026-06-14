'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CollapsibleSectionProps {
  title: string
  icon?: React.ReactNode
  iconBg?: string
  count?: number
  defaultOpen?: boolean
  urgent?: boolean
  /** Small hint shown next to the title (e.g. "استعراض فقط") */
  hint?: string
  children: React.ReactNode
}

export function CollapsibleSection({
  title,
  icon,
  iconBg = 'bg-gray-100 text-gray-600',
  count,
  defaultOpen = false,
  urgent = false,
  hint,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={cn(
      'rounded-2xl border bg-white shadow-sm overflow-hidden transition-colors',
      urgent ? 'border-red-200' : 'border-gray-100'
    )}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-5 py-4 text-start hover:bg-gray-50/50 transition-colors"
      >
        {icon && (
          <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl shrink-0', iconBg)}>
            {icon}
          </div>
        )}
        <span className="font-bold text-gray-900">{title}</span>
        {count !== undefined && (
          <span className={cn(
            'rounded-full px-2.5 py-0.5 text-xs font-bold leading-none',
            urgent ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
          )}>
            {count}
          </span>
        )}
        {hint && <span className="text-xs text-gray-400">— {hint}</span>}
        <ChevronDown className={cn(
          'ms-auto h-5 w-5 shrink-0 text-gray-400 transition-transform duration-200',
          open && 'rotate-180'
        )} />
      </button>
      {open && <div className="border-t border-gray-50">{children}</div>}
    </div>
  )
}
