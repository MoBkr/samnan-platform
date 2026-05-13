import Link from 'next/link'
import { Package, Truck, Clock, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MaterialStatusBadge } from '@/components/shared/status-badge'
import type { Profile, Material, SupplyOrder } from '@/types/database'

interface SupplyDashboardProps {
  profile: Profile
  pendingMaterials: (Material & { project: { id: string; client_name: string; project_name: string } })[]
  upcomingOrders: (SupplyOrder & { project: { id: string; client_name: string; project_name: string } })[]
}

export function SupplyDashboard({ profile, pendingMaterials, upcomingOrders }: SupplyDashboardProps) {
  const preparing = pendingMaterials.filter(m => m.status === 'preparing')
  const pending = pendingMaterials.filter(m => m.status === 'pending')

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-amber-700 to-amber-900 p-6 text-white shadow-lg">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-8 -left-8 h-48 w-48 rounded-full bg-amber-300 blur-2xl" />
        </div>
        <div className="relative z-10">
          <p className="text-amber-200 text-sm">قسم التوريد</p>
          <h1 className="text-2xl font-bold mt-1">مرحباً، {profile.full_name}</h1>
          <p className="text-amber-200 text-sm mt-1">
            {pendingMaterials.length} طلب مواد — {upcomingOrders.length} توريد مجدول
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        {[
          { icon: <Package className="h-5 w-5" />, bg: 'bg-amber-50 text-amber-700', value: pending.length, label: 'طلبات جديدة' },
          { icon: <Clock className="h-5 w-5" />, bg: 'bg-blue-50 text-blue-700', value: preparing.length, label: 'قيد التجهيز' },
          { icon: <Truck className="h-5 w-5" />, bg: 'bg-emerald-50 text-emerald-700', value: upcomingOrders.length, label: 'توريدات مجدولة' },
          { icon: <CheckCircle2 className="h-5 w-5" />, bg: 'bg-gray-50 text-gray-600', value: pendingMaterials.filter(m => m.status === 'ready').length, label: 'جاهز للتوريد' },
        ].map(({ icon, bg, value, label }) => (
          <div key={label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${bg}`}>{icon}</div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Pending material requests */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-50 px-5 py-4">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-gray-900">طلبات المواد</h2>
            {pendingMaterials.length > 0 && (
              <Badge variant="warning" className="text-xs">{pendingMaterials.length}</Badge>
            )}
          </div>
        </div>
        {pendingMaterials.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            </div>
            <p className="text-sm font-medium text-gray-700">لا توجد طلبات معلقة</p>
            <p className="text-xs text-gray-400 mt-1">جميع الطلبات تم معالجتها</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {pendingMaterials.map((material) => (
              <li key={material.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50/50 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{material.project.project_name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {material.project.client_name}
                    {' — '}
                    {(material.items as {name:string}[]).length} مادة
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <MaterialStatusBadge status={material.status} />
                  <Link href={`/projects/${material.project.id}`}>
                    <Button size="sm" variant="outline" className="text-xs h-8">عرض</Button>
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Upcoming supply orders */}
      {upcomingOrders.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-50 px-5 py-4">
            <h2 className="font-semibold text-gray-900">التوريدات المجدولة</h2>
          </div>
          <ul className="divide-y divide-gray-50">
            {upcomingOrders.map((order) => (
              <li key={order.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{order.project.project_name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {order.scheduled_date ? new Date(order.scheduled_date).toLocaleDateString('ar-SA') : 'غير محدد'}
                  </p>
                </div>
                <Link href={`/projects/${order.project.id}`}>
                  <Button size="sm" variant="outline" className="text-xs h-8">التفاصيل</Button>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
