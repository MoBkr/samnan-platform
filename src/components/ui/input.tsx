import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
}

// Date/time fields: clicking anywhere in the field opens the calendar, instead
// of forcing the user to type day/month/year or hit the tiny native icon.
const PICKER_TYPES = new Set(['date', 'datetime-local', 'time', 'month', 'week'])

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, onClick, ...props }, ref) => {
    const isPicker = !!type && PICKER_TYPES.has(type)

    const handleClick = (e: React.MouseEvent<HTMLInputElement>) => {
      if (isPicker && !props.readOnly && !props.disabled) {
        // showPicker throws if unsupported or without user activation — ignore
        // and fall back to the browser's default behaviour.
        try { e.currentTarget.showPicker() } catch { /* no-op */ }
      }
      onClick?.(e)
    }

    return (
      <div className="w-full">
        <input
          type={type}
          onClick={handleClick}
          className={cn(
            'flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/15 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-50 transition-colors',
            isPicker && 'cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 hover:[&::-webkit-calendar-picker-indicator]:opacity-100',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }
