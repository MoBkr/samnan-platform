import { formatDate } from '@/lib/utils'
import { EmptyState } from '@/components/shared/empty-state'
import { ClipboardList } from 'lucide-react'
import type { ActivityLog } from '@/types/database'

interface ActivityTabProps {
  activityLog: ActivityLog[]
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
      {activityLog.map((log) => (
        <div key={log.id} className="flex gap-4 rounded-lg border border-gray-100 bg-white p-4">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
            {log.user?.full_name?.[0] ?? '؟'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900">{log.action}</p>
            <p className="mt-0.5 text-xs text-gray-500">
              {log.user?.full_name ?? 'مجهول'} — {formatDate(log.created_at)}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
