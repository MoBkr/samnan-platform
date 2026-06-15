import { getPublicProject } from '@/lib/actions/share'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import { CheckCircle2, Circle, Clock, MapPin, Building2, Hammer, Wallet, Package } from 'lucide-react'
import Image from 'next/image'

export const dynamic = 'force-dynamic'

const STATUS_LABELS: Record<string, string> = {
  active: 'قيد التنفيذ', completed: 'مكتمل', on_hold: 'معلّق', cancelled: 'ملغي',
}
const MAT_LABELS: Record<string, string> = {
  pending: 'قيد الانتظار', preparing: 'قيد التجهيز', ready: 'جاهزة', delivered: 'تم التوريد', partial: 'توريد جزئي',
}
const PAY_STATUS: Record<string, { label: string; cls: string }> = {
  paid: { label: 'مدفوعة', cls: 'bg-emerald-100 text-emerald-700' },
  partial: { label: 'مدفوعة جزئياً', cls: 'bg-amber-100 text-amber-700' },
  pending: { label: 'بانتظار السداد', cls: 'bg-gray-100 text-gray-500' },
  overdue: { label: 'متأخرة', cls: 'bg-red-100 text-red-700' },
}

export default async function TrackPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const data = await getPublicProject(token)

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
            <Building2 className="h-7 w-7 text-gray-400" />
          </div>
          <h1 className="text-lg font-bold text-gray-900">الرابط غير صالح</h1>
          <p className="text-sm text-gray-500 mt-1">هذا الرابط غير موجود أو تم إيقافه. تواصل مع فريق سمنان.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50/40 to-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="mx-auto max-w-2xl px-5 py-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 border border-brand-100 p-1.5">
            <Image src="/logo.png" alt="سمنان" width={28} height={28} className="object-contain" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 leading-tight">منصة سمنان</p>
            <p className="text-xs text-gray-400 leading-tight">متابعة المشروع</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-5 py-6 space-y-5">
        {/* Header card */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <h1 className="text-xl font-bold text-gray-900">{data.project_name}</h1>
            <span className="rounded-full bg-brand-50 text-brand-700 px-3 py-1 text-xs font-semibold border border-brand-100">
              {STATUS_LABELS[data.status] ?? data.status}
            </span>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1.5"><Building2 className="h-4 w-4 text-gray-400" />{data.client_name}</span>
            {data.location && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-gray-400" />{data.location}</span>}
            {data.start_date && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-gray-400" />
                {formatDateShort(data.start_date)}{data.expected_end_date && ` — ${formatDateShort(data.expected_end_date)}`}
              </span>
            )}
          </div>
        </div>

        {/* Lifecycle timeline */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900 mb-4">مراحل المشروع</h2>
          <ol className="relative space-y-1">
            {data.lifecycle.map((step, i) => {
              const isLast = i === data.lifecycle.length - 1
              return (
                <li key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    {step.state === 'done' ? (
                      <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                    ) : step.state === 'current' ? (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600">
                        <Clock className="h-3.5 w-3.5 text-white" />
                      </div>
                    ) : (
                      <Circle className="h-6 w-6 text-gray-300" />
                    )}
                    {!isLast && <div className={`w-0.5 flex-1 min-h-[18px] ${step.state === 'done' ? 'bg-emerald-300' : 'bg-gray-200'}`} />}
                  </div>
                  <div className={`pb-4 ${isLast ? '' : ''}`}>
                    <p className={`text-sm font-semibold ${step.state === 'current' ? 'text-brand-700' : step.state === 'done' ? 'text-gray-900' : 'text-gray-400'}`}>
                      {step.label}
                    </p>
                    {step.state === 'current' && <p className="text-xs text-brand-500 mt-0.5">المرحلة الحالية</p>}
                  </div>
                </li>
              )
            })}
          </ol>
        </div>

        {/* Payments */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50"><Wallet className="h-4 w-4 text-emerald-600" /></div>
            <h2 className="text-sm font-bold text-gray-900">الدفعات</h2>
          </div>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5 text-sm">
              <span className="text-gray-500">المُحصّل</span>
              <span className="font-bold text-gray-900">{formatCurrency(data.collection.paid)} / {formatCurrency(data.collection.total)}</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${data.collection.pct}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-1">{data.collection.pct}% مكتمل</p>
          </div>
          {data.payments.length > 0 && (
            <div className="space-y-2">
              {data.payments.map((p, i) => {
                const s = PAY_STATUS[p.status] ?? { label: p.status, cls: 'bg-gray-100 text-gray-500' }
                return (
                  <div key={i} className="flex items-center justify-between rounded-xl border border-gray-100 px-3.5 py-2.5">
                    <span className="text-sm text-gray-700">{p.label}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.cls}`}>{s.label}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Materials */}
        {data.materials_status && (
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50"><Package className="h-4 w-4 text-amber-600" /></div>
              <h2 className="text-sm font-bold text-gray-900">المواد</h2>
            </div>
            <span className="rounded-full bg-amber-50 text-amber-700 px-3 py-1 text-xs font-semibold border border-amber-100">
              {MAT_LABELS[data.materials_status] ?? data.materials_status}
            </span>
          </div>
        )}

        {/* Installation */}
        {data.installation && (
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50"><Hammer className="h-4 w-4 text-purple-600" /></div>
                <h2 className="text-sm font-bold text-gray-900">التركيب</h2>
              </div>
              {data.installation.scheduled_date && (
                <span className="text-xs text-gray-500">{formatDateShort(data.installation.scheduled_date)}</span>
              )}
            </div>
            <div className="space-y-2">
              {data.installation.stages.map((s, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  {s.done ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> : <Circle className="h-4 w-4 text-gray-300 shrink-0" />}
                  <span className={`text-sm ${s.done ? 'text-gray-900' : 'text-gray-400'}`}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 py-2">
          صفحة متابعة — مجموعة سمنان القابضة · للعرض فقط
        </p>
      </div>
    </div>
  )
}
