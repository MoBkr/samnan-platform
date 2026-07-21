import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset transition-colors duration-200',
  {
    variants: {
      variant: {
        default: 'bg-blue-50 text-blue-700 ring-blue-600/15',
        success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
        warning: 'bg-amber-50 text-amber-700 ring-amber-600/20',
        danger: 'bg-red-50 text-red-700 ring-red-600/15',
        secondary: 'bg-gray-50 text-gray-600 ring-gray-500/15',
        purple: 'bg-purple-50 text-purple-700 ring-purple-600/15',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
