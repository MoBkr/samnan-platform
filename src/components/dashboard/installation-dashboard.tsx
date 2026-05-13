import Link from 'next/link'
import { Hammer, CheckCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { InstallationStatusBadge } from '@/components/shared/status-badge'
import { formatDateShort } from '@/lib/utils'
import type { Profile, Installation } from '@/types/database'

interface InstallationDashboardProps {
  profile: Profile
  installations: (Installation & { project: { id: string; client_name: string; project_name: string } })[]
}

export function InstallationDashboard({ profile, installations }: InstallationDashboardProps) {
  const today = new Date().toISOString().split('T')[0]
  const todayInstallations = installations.filter((i) => i.scheduled_date === today)
  const upcoming = installations.filter((i) => i.scheduled_date && i.scheduled_date > today)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">مرحباً، {profile.full_name}</h1>
        <p className="text-sm text-gray-500">قسم التركيبات</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50">
              <Hammer className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{todayInstallations.length}</p>
              <p className="text-sm text-gray-500">تركيب اليوم</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
              <CheckCircle className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{upcoming.length}</p>
              <p className="text-sm text-gray-500">مجدول قادم</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="border-b border-gray-100 p-4">
            <h2 className="font-semibold text-gray-900">جدول التركيب</h2>
          </div>
          {installations.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-400">لا توجد مواعيد تركيب</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {installations.map((inst) => (
                <li key={inst.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{inst.project.project_name}</p>
                    <p className="text-xs text-gray-500">
                      {inst.project.client_name} — {formatDateShort(inst.scheduled_date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <InstallationStatusBadge status={inst.status} />
                    <Link href={`/projects/${inst.project.id}`}>
                      <Button size="sm" variant="outline">عرض</Button>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
