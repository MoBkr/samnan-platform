import { EmptyState } from '@/components/shared/empty-state'
import { ClipboardList, ArrowLeft } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import type { ActivityLog } from '@/types/database'

interface ActivityTabProps {
  activityLog: ActivityLog[]
}

type Change = { from: string; to: string }

function getChanges(details: unknown): Record<string, Change> | null {
  if (!details || typeof details !== 'object') return null
  const c = (details as { changes?: unknown }).changes
  if (!c || typeof c !== 'object') return null
  return c as Record<string, Change>
}

export function ActivityTab({ activityLog }: ActivityTabProps) {
  if (activityLog.length === 0) {
    return (
      <EmptyState
        message="لا يوجد سجل نشاط"
        icon={<ClipboardList className="h-8 w-8 text-gray-400" />}
      />
    )
  }

  return (
    <div className="space-y-3">
      {activityLog.map((log) => {
        const changes = getChanges(log.details)
        return (
          <div key={log.id} className="flex gap-4 rounded-xl border border-gray-100 bg-white p-4">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
              {log.user?.full_name?.[0] ?? '؟'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900">{log.action}</p>
              <p className="mt-0.5 text-xs text-gray-500">
                {log.user?.full_name ?? 'مجهول'} — {formatDateTime(log.created_at)}
              </p>

              {/* Old → New audit diff */}
              {changes && Object.keys(changes).length > 0 && (
                <div className="mt-2.5 space-y-1.5 rounded-lg bg-gray-50 border border-gray-100 p-2.5">
                  {Object.entries(changes).map(([field, { from, to }]) => (
                    <div key={field} className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="font-medium text-gray-500">{field}:</span>
                      <span className="rounded bg-white border border-gray-200 px-1.5 py-0.5 text-gray-400 line-through">{from}</span>
                      <ArrowLeft className="h-3 w-3 text-gray-400" />
                      <span className="rounded bg-brand-50 border border-brand-100 px-1.5 py-0.5 font-semibold text-brand-700">{to}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
