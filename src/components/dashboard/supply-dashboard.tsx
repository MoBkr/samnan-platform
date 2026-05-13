import Link from 'next/link'
import { Package, Truck } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MaterialStatusBadge } from '@/components/shared/status-badge'
import type { Profile, Material, SupplyOrder } from '@/types/database'

interface SupplyDashboardProps {
  profile: Profile
  pendingMaterials: (Material & { project: { id: string; client_name: string; project_name: string } })[]
  upcomingOrders: (SupplyOrder & { project: { id: string; client_name: string; project_name: string } })[]
}

export function SupplyDashboard({ profile, pendingMaterials, upcomingOrders }: SupplyDashboardProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">مرحباً، {profile.full_name}</h1>
        <p className="text-sm text-gray-500">قسم التوريد</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50">
              <Package className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{pendingMaterials.length}</p>
              <p className="text-sm text-gray-500">طلبات مواد معلقة</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
              <Truck className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{upcomingOrders.length}</p>
              <p className="text-sm text-gray-500">توريدات مجدولة</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="border-b border-gray-100 p-4">
            <h2 className="font-semibold text-gray-900">طلبات المواد المعلقة</h2>
          </div>
          {pendingMaterials.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-400">لا توجد طلبات معلقة ✓</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {pendingMaterials.map((material) => (
                <li key={material.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{material.project.project_name}</p>
                    <p className="text-xs text-gray-500">
                      {material.project.client_name} — {(material.items as {name:string}[]).length} مواد
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <MaterialStatusBadge status={material.status} />
                    <Link href={`/projects/${material.project.id}`}>
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
