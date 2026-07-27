'use client'

import { useState } from 'react'
import Image from 'next/image'
import { CheckCircle2, Circle, Clock, MapPin, Building2, Hammer, Wallet, Package, FileText, Globe } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { PublicProjectView } from '@/lib/actions/share'

type Lang = 'ar' | 'en'

const T = {
  ar: {
    platform: 'منصة سمنان', follow: 'متابعة المشروع', live: 'تحديث مباشر',
    lifecycle: 'مراحل المشروع', currentStage: 'المرحلة الحالية',
    overview: 'ملخص المشروع', projectValue: 'الإجمالي', remaining: 'المتبقي',
    collectionRate: 'نسبة التحصيل', ofValue: 'من قيمة المشروع',
    payments: 'الدفعات', collected: 'المُحصّل', ofTotal: 'مكتمل',
    materials: 'المواد', completed: 'مكتملة', inProcess: 'قيد المعالجة', items: 'صنف',
    installation: 'التركيب', attachments: 'المرفقات', view: 'عرض',
    footer: 'صفحة متابعة — مجموعة سمنان القابضة · للعرض فقط', switch: 'English',
    projStatus: { active: 'قيد التنفيذ', completed: 'مكتمل', on_hold: 'معلّق', cancelled: 'ملغي' } as Record<string, string>,
    payStatus: {
      paid: { label: 'مدفوعة', cls: 'bg-emerald-100 text-emerald-700' },
      partial: { label: 'مدفوعة جزئياً', cls: 'bg-amber-100 text-amber-700' },
      pending: { label: 'بانتظار السداد', cls: 'bg-gray-100 text-gray-500' },
      overdue: { label: 'متأخرة', cls: 'bg-red-100 text-red-700' },
      cancelled: { label: 'ملغاة', cls: 'bg-gray-100 text-gray-400' },
    } as Record<string, { label: string; cls: string }>,
  },
  en: {
    platform: 'Samnan Platform', follow: 'Project Tracking', live: 'Live',
    lifecycle: 'Project Stages', currentStage: 'Current stage',
    overview: 'Project Overview', projectValue: 'Total', remaining: 'Remaining',
    collectionRate: 'Collection rate', ofValue: 'of project value',
    payments: 'Payments', collected: 'Collected', ofTotal: 'complete',
    materials: 'Materials', completed: 'Completed', inProcess: 'In Process', items: 'items',
    installation: 'Installation', attachments: 'Attachments', view: 'View',
    footer: 'Tracking page — Samnan Holding Group · View only', switch: 'عربي',
    projStatus: { active: 'In Progress', completed: 'Completed', on_hold: 'On Hold', cancelled: 'Cancelled' } as Record<string, string>,
    payStatus: {
      paid: { label: 'Paid', cls: 'bg-emerald-100 text-emerald-700' },
      partial: { label: 'Partially Paid', cls: 'bg-amber-100 text-amber-700' },
      pending: { label: 'Awaiting Payment', cls: 'bg-gray-100 text-gray-500' },
      overdue: { label: 'Overdue', cls: 'bg-red-100 text-red-700' },
      cancelled: { label: 'Cancelled', cls: 'bg-gray-100 text-gray-400' },
    } as Record<string, { label: string; cls: string }>,
  },
}

function fmtDate(iso: string, lang: Lang) {
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'ar-SA', {
    day: 'numeric', month: 'long', year: 'numeric', numberingSystem: 'latn', timeZone: 'Asia/Riyadh',
  }).format(new Date(iso))
}

export function TrackView({ data }: { data: PublicProjectView }) {
  const [lang, setLang] = useState<Lang>('ar')
  const t = T[lang]
  const isEn = lang === 'en'

  return (
    <div dir={isEn ? 'ltr' : 'rtl'} className="min-h-screen bg-gradient-to-b from-brand-50/40 to-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="mx-auto max-w-2xl px-5 py-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 border border-brand-100 p-1.5">
            <Image src="/logo.png" alt="Samnan" width={28} height={28} className="object-contain" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 leading-tight">{t.platform}</p>
            <p className="text-xs text-gray-400 leading-tight">{t.follow}</p>
          </div>
          <div className="ms-auto flex items-center gap-2">
            <button onClick={() => setLang(isEn ? 'ar' : 'en')}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-600 hover:border-brand-300 hover:text-brand-700 transition-colors">
              <Globe className="h-3.5 w-3.5" /> {t.switch}
            </button>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-1 text-[11px] font-medium text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {t.live}
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-5 py-6 space-y-5">
        {/* Header card */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <h1 className="text-xl font-bold text-gray-900">{data.project_name}</h1>
            <span className="rounded-full bg-brand-50 text-brand-700 px-3 py-1 text-xs font-semibold border border-brand-100">
              {t.projStatus[data.status] ?? data.status}
            </span>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1.5"><Building2 className="h-4 w-4 text-gray-400" />{data.client_name}</span>
            {data.location && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-gray-400" />{data.location}</span>}
            {data.start_date && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-gray-400" />
                {fmtDate(data.start_date, lang)}{data.expected_end_date && ` — ${fmtDate(data.expected_end_date, lang)}`}
              </span>
            )}
          </div>
        </div>

        {/* Overview — figures + percentages */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900 mb-4">{t.overview}</h2>
          <div className="grid grid-cols-3 gap-2.5 mb-4">
            <Figure label={t.collected} value={formatCurrency(data.collection.paid)} tone="green" />
            <Figure label={t.remaining} value={formatCurrency(Math.max(0, data.collection.total - data.collection.paid))} tone="amber" />
            <Figure label={t.projectValue} value={formatCurrency(data.collection.total)} tone="gray" />
          </div>
          <div className={`grid gap-2.5 ${data.installPct !== null ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <Meter label={t.collectionRate} pct={data.collection.pct} />
            <Meter label={t.materials} pct={data.materialsPct} />
            {data.installPct !== null && <Meter label={t.installation} pct={data.installPct} />}
          </div>
          <p className="text-[11px] text-gray-400 mt-2">{data.collection.pct}% {t.ofValue}</p>
        </div>

        {/* Lifecycle timeline */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900 mb-4">{t.lifecycle}</h2>
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
                  <div className="pb-4">
                    <p className={`text-sm font-semibold ${step.state === 'current' ? 'text-brand-700' : step.state === 'done' ? 'text-gray-900' : 'text-gray-400'}`}>
                      {isEn ? step.label_en : step.label}
                    </p>
                    {step.state === 'current' && <p className="text-xs text-brand-500 mt-0.5">{t.currentStage}</p>}
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
            <h2 className="text-sm font-bold text-gray-900">{t.payments}</h2>
          </div>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5 text-sm">
              <span className="text-gray-500">{t.collected}</span>
              <span className="font-bold text-gray-900" dir="ltr">{formatCurrency(data.collection.paid)} / {formatCurrency(data.collection.total)}</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${data.collection.pct}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-1">{data.collection.pct}% {t.ofTotal}</p>
          </div>
          {data.payments.length > 0 && (
            <div className="space-y-2">
              {data.payments.map((p, i) => {
                const s = t.payStatus[p.status] ?? { label: p.status, cls: 'bg-gray-100 text-gray-500' }
                return (
                  <div key={i} className="flex items-center justify-between rounded-xl border border-gray-100 px-3.5 py-2.5">
                    <span className="text-sm text-gray-700">{isEn ? p.label_en : p.label}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.cls}`}>{s.label}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Materials */}
        {data.materials && (
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50"><Package className="h-4 w-4 text-amber-600" /></div>
                <h2 className="text-sm font-bold text-gray-900">{t.materials}</h2>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold border ${data.materials.allDone ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                {data.materials.allDone ? t.completed : t.inProcess} · {data.materials.pct}%
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden my-3">
              <div className={`h-full rounded-full ${data.materials.allDone ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${data.materials.pct}%` }} />
            </div>
            <p className="text-xs text-gray-400 mb-3">{data.materials.total} {t.items}</p>
            <div className="space-y-1.5">
              {data.materials.items.map((it, i) => (
                <div key={i} className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2 text-sm">
                  <span className="text-gray-700 truncate">{it.description}</span>
                  {it.quantity != null && (
                    <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600" dir="ltr">
                      {it.quantity}{it.unit ? ` ${it.unit}` : ''}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Installation */}
        {data.installation && (
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50"><Hammer className="h-4 w-4 text-purple-600" /></div>
                <h2 className="text-sm font-bold text-gray-900">{t.installation}</h2>
              </div>
              {data.installation.scheduled_date && (
                <span className="text-xs text-gray-500">{fmtDate(data.installation.scheduled_date, lang)}</span>
              )}
            </div>
            <div className="space-y-2">
              {data.installation.stages.map((s, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  {s.done ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> : <Circle className="h-4 w-4 text-gray-300 shrink-0" />}
                  <span className={`text-sm ${s.done ? 'text-gray-900' : 'text-gray-400'}`}>{isEn ? s.label_en : s.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Attachments */}
        {data.attachments.length > 0 && (
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50"><FileText className="h-4 w-4 text-blue-600" /></div>
              <h2 className="text-sm font-bold text-gray-900">{t.attachments}</h2>
            </div>
            <div className="space-y-2">
              {data.attachments.map((a, i) => (
                <a key={i} href={a.url} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2.5 rounded-xl border border-gray-100 px-3.5 py-2.5 hover:bg-gray-50 transition-colors">
                  <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                  <span className="flex-1 text-sm text-gray-700 truncate">{a.name}</span>
                  <span className="text-xs font-medium text-brand-600">{t.view}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 py-2">{t.footer}</p>
      </div>
    </div>
  )
}

function Figure({ label, value, tone }: { label: string; value: string; tone: 'green' | 'amber' | 'gray' }) {
  const cls = tone === 'green' ? 'bg-emerald-50 text-emerald-700' : tone === 'amber' ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-700'
  return (
    <div className={`rounded-xl px-2 py-2.5 text-center ${cls}`}>
      <p className="text-sm font-bold leading-tight" dir="ltr">{value}</p>
      <p className="text-[11px] mt-0.5 opacity-80">{label}</p>
    </div>
  )
}

function Meter({ label, pct }: { label: string; pct: number }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-2.5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-medium text-gray-600">{label}</span>
        <span className={`text-[11px] font-bold ${pct >= 100 ? 'text-emerald-600' : 'text-gray-700'}`}>{pct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
        <div className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : 'bg-brand-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  )
}
