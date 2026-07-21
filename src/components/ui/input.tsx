import * as React from 'react'
import { CalendarDays, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
}

// Date/time fields: clicking anywhere in the field opens the calendar, instead
// of forcing the user to type day/month/year or hit the tiny native icon.
const PICKER_TYPES = new Set(['date', 'datetime-local', 'time', 'month', 'week'])

const BASE =
  'flex h-10 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 transition-all duration-200 ease-out hover:border-gray-300 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:shadow disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-50'

// Hide the browser's default indicator but keep it stretched over the whole
// field, so a click anywhere opens the picker — and our own icon shows instead.
const PICKER_SKIN = [
  'cursor-pointer hover:border-brand-300 pl-9',
  '[&::-webkit-calendar-picker-indicator]:absolute',
  '[&::-webkit-calendar-picker-indicator]:inset-0',
  '[&::-webkit-calendar-picker-indicator]:h-full',
  '[&::-webkit-calendar-picker-indicator]:w-full',
  '[&::-webkit-calendar-picker-indicator]:cursor-pointer',
  '[&::-webkit-calendar-picker-indicator]:opacity-0',
  '[&::-webkit-datetime-edit]:text-gray-800',
  '[&::-webkit-datetime-edit-fields-wrapper]:p-0',
].join(' ')

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

    const field = (
      <input
        type={type}
        onClick={isPicker ? handleClick : onClick}
        className={cn(
          BASE,
          isPicker && PICKER_SKIN,
          error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
          className
        )}
        ref={ref}
        {...props}
      />
    )

    return (
      <div className="w-full">
        {isPicker ? (
          <div className="relative">
            {/* Our own icon, on theme — the native one is hidden above */}
            {type === 'time'
              ? <Clock className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-brand-500" />
              : <CalendarDays className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-brand-500" />}
            {field}
          </div>
        ) : field}
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }
