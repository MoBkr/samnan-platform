import { InboxIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  message: string
  description?: string
  icon?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ message, description, icon, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center animate-fade-up', className)}>
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-b from-gray-50 to-gray-100 ring-1 ring-inset ring-gray-200/60 shadow-sm">
        {icon ?? <InboxIcon className="h-8 w-8 text-gray-400" />}
      </div>
      <h3 className="mb-1 text-base font-semibold text-gray-900">{message}</h3>
      {description && <p className="mb-4 max-w-sm text-sm leading-relaxed text-gray-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
