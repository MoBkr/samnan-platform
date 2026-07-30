import { cn } from '@/lib/utils'

/**
 * Platform-wide date styling: dates render bold in dark brand blue so they
 * stand out at a glance (client request). Wrap any formatted date with it:
 * `<DateText>{formatDateShort(x)}</DateText>`.
 * `tone="danger"` keeps overdue dates red (still bold).
 */
export function DateText({
  children,
  tone = 'default',
  className,
}: {
  children: React.ReactNode
  tone?: 'default' | 'danger' | 'inherit'
  className?: string
}) {
  return (
    <span
      dir="ltr"
      className={cn(
        'font-bold',
        tone === 'default' && 'text-brand-800',
        tone === 'danger' && 'text-red-600',
        className
      )}
    >
      {children}
    </span>
  )
}
