import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  // Premium base: smooth 200ms transitions, gentle press scale, clear focus ring
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-brand-btn hover:from-brand-600 hover:to-brand-700 hover:shadow-glow hover:-translate-y-px',
        destructive:
          'bg-gradient-to-b from-red-500 to-red-600 text-white shadow hover:from-red-600 hover:to-red-700 hover:-translate-y-px',
        outline:
          'border border-gray-200 bg-white text-gray-700 shadow-sm hover:border-brand-200 hover:bg-brand-50/40 hover:text-brand-700 hover:-translate-y-px hover:shadow',
        secondary:
          'bg-gray-100 text-gray-900 shadow-sm hover:bg-gray-200/80 hover:-translate-y-px',
        ghost: 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900',
        link: 'text-brand-600 underline-offset-4 hover:underline',
        success:
          'bg-gradient-to-b from-emerald-500 to-emerald-600 text-white shadow hover:from-emerald-600 hover:to-emerald-700 hover:-translate-y-px',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-lg px-3 text-xs',
        lg: 'h-11 rounded-xl px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
