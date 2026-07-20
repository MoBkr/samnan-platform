'use client'

import { useState, useMemo } from 'react'
import { Printer, Package, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LETTERHEAD_CSS, letterheadOpenHtml, letterheadCloseHtml } from '@/lib/print-letterhead'
import { cn } from '@/lib/utils'
import type { MaterialItem } from '@/types/database'

type Lang = 'ar' | 'en'

// Per-item status (حالة الصنف) → English, for the foreign-client printout.
const STATUS_EN: Record<string, string> = {
  'مكتمل': 'Completed',
  'قيد المعالجة': 'In Process',
  'لم يطلب': 'Not Requested',
}
function statusEn(s?: string) {
  const t = (s || '').trim()
  return STATUS_EN[t] || (t || '—')
}
function statusClass(s?: string) {
  const t = (s || '').trim()
  if (t === 'مكتمل') return 'bg-emerald-100 text-emerald-700'
  if (t === 'قيد المعالجة') return 'bg-amber-100 text-amber-700'
  return 'bg-gray-100 text-gray-500'
}

const T = {
  ar: {
    title: 'حالة المواد', project: 'المشروع', client: 'العميل', date: 'التاريخ',
    overall: 'الحالة العامة', completed: 'مكتملة', inProcess: 'قيد المعالجة',
    total: 'إجمالي الأصناف', done: 'مكتمل', processing: 'قيد المعالجة', notReq: 'لم يطلب',
    no: '#', sap: 'رقم SAP', desc: 'الوصف', qty: 'الكمية', status: 'الحالة', note: 'ملاحظة',
    empty: 'لا توجد أصناف', print: 'طباعة', switch: 'English',
  },
  en: {
    title: 'Materials Status', project: 'Project', client: 'Client', date: 'Date',
    overall: 'Overall Status', completed: 'Completed', inProcess: 'In Process',
    total: 'Total Items', done: 'Completed', processing: 'In Process', notReq: 'Not Requested',
    no: '#', sap: 'SAP No.', desc: 'Description', qty: 'Qty', status: 'Status', note: 'Note',
    empty: 'No items', print: 'Print', switch: 'عربي',
  },
}

export function MaterialsStatusView({
  items, projectName, clientName,
}: {
  items: MaterialItem[]
  projectName: string
  clientName?: string
}) {
  const [lang, setLang] = useState<Lang>('ar')
  const t = T[lang]
  const isEn = lang === 'en'

  const counts = useMemo(() => {
    let done = 0, processing = 0, notReq = 0
    for (const it of items) {
      const s = (it.status || '').trim()
      if (s === 'مكتمل') done++
      else if (s === 'قيد المعالجة') processing++
      else notReq++
    }
    return { done, processing, notReq }
  }, [items])

  const allDone = items.length > 0 && counts.done === items.length
  const today = new Intl.DateTimeFormat(isEn ? 'en-GB' : 'ar-SA', {
    day: 'numeric', month: 'long', year: 'numeric', numberingSystem: 'latn', timeZone: 'Asia/Riyadh',
  }).format(new Date())

  function printOut() {
    const rows = items.map((it, i) => `
      <tr>
        <td>${i + 1}</td>
        <td dir="ltr">${it.sap_no || '—'}</td>
        <td>${(it.description || it.name || '—').replace(/</g, '&lt;')}</td>
        <td dir="ltr">${it.quantity ?? '—'}</td>
        <td>${isEn ? statusEn(it.status) : ((it.status || '').trim() || '—')}</td>
      </tr>`).join('')

    const overall = allDone ? t.completed : t.inProcess
    const html = `<!DOCTYPE html><html dir="${isEn ? 'ltr' : 'rtl'}" lang="${lang}"><head><meta charset="utf-8">
      <title>${t.title} — ${projectName}</title>
      <style>
        ${LETTERHEAD_CSS}
        body{font-family:${isEn ? 'Arial,sans-serif' : 'Tahoma,Arial,sans-serif'};color:#111}
        h2{color:#1841A0;margin:0 0 4px;text-align:center}
        .meta{color:#555;font-size:12px;margin-bottom:14px;text-align:${isEn ? 'left' : 'right'}}
        .meta b{color:#111}
        .pill{display:inline-block;padding:3px 10px;border-radius:99px;font-size:12px;font-weight:700;background:${allDone ? '#d1fae5' : '#fef3c7'};color:${allDone ? '#047857' : '#b45309'}}
        table{width:100%;border-collapse:collapse;font-size:12px;margin-top:10px}
        th,td{border:1px solid #ddd;padding:7px 9px;text-align:${isEn ? 'left' : 'right'};vertical-align:top}
        th{background:#1841A0;color:#fff}
        tr:nth-child(even) td{background:#f7f9fc}
      </style></head><body>
      ${letterheadOpenHtml(window.location.origin)}
      <h2>${t.title}</h2>
      <div class="meta">
        <div><b>${t.project}:</b> ${projectName}</div>
        ${clientName ? `<div><b>${t.client}:</b> ${clientName}</div>` : ''}
        <div><b>${t.date}:</b> ${today}</div>
        <div style="margin-top:6px"><b>${t.overall}:</b> <span class="pill">${overall}</span> &nbsp; ${t.total}: ${items.length} · ${t.done}: ${counts.done} · ${t.processing}: ${counts.processing} · ${t.notReq}: ${counts.notReq}</div>
      </div>
      <table><thead><tr><th>${t.no}</th><th>${t.sap}</th><th>${t.desc}</th><th>${t.qty}</th><th>${t.status}</th></tr></thead>
      <tbody>${rows || `<tr><td colspan="5" style="text-align:center;color:#999">${t.empty}</td></tr>`}</tbody></table>
      ${letterheadCloseHtml()}
      </body></html>`

    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(html)
    w.document.close()
    setTimeout(() => w.print(), 300)
  }

  return (
    <div dir={isEn ? 'ltr' : 'rtl'} className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
            <Package className="h-4 w-4 text-amber-700" />
          </div>
          <h3 className="text-base font-semibold text-gray-900">{t.title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setLang(isEn ? 'ar' : 'en')}>
            <Globe className="h-4 w-4" /> {t.switch}
          </Button>
          <Button size="sm" onClick={printOut}>
            <Printer className="h-4 w-4" /> {t.print}
          </Button>
        </div>
      </div>

      {/* Overall */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-sm text-gray-600">{t.overall}:</span>
          <span className={cn('rounded-full px-3 py-1 text-xs font-bold', allDone ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>
            {allDone ? t.completed : t.inProcess}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <StatBox label={t.total} value={items.length} tone="gray" />
          <StatBox label={t.done} value={counts.done} tone="green" />
          <StatBox label={t.processing} value={counts.processing} tone="amber" />
          <StatBox label={t.notReq} value={counts.notReq} tone="gray" />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs">
                <th className="px-3 py-2.5 text-start font-semibold">{t.no}</th>
                <th className="px-3 py-2.5 text-start font-semibold">{t.sap}</th>
                <th className="px-3 py-2.5 text-start font-semibold">{t.desc}</th>
                <th className="px-3 py-2.5 text-start font-semibold">{t.qty}</th>
                <th className="px-3 py-2.5 text-start font-semibold">{t.status}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-8 text-center text-gray-400">{t.empty}</td></tr>
              ) : items.map((it, i) => (
                <tr key={i} className="hover:bg-gray-50/50">
                  <td className="px-3 py-2.5 text-gray-400">{i + 1}</td>
                  <td className="px-3 py-2.5 text-gray-600" dir="ltr">{it.sap_no || '—'}</td>
                  <td className="px-3 py-2.5 text-gray-900 font-medium">{it.description || it.name || '—'}</td>
                  <td className="px-3 py-2.5 text-gray-600" dir="ltr">{it.quantity ?? '—'}</td>
                  <td className="px-3 py-2.5">
                    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', statusClass(it.status))}>
                      {isEn ? statusEn(it.status) : ((it.status || '').trim() || '—')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isEn && (
        <p className="text-xs text-gray-400">
          Note: item descriptions are shown as entered by the team. Translate any free text before printing if needed.
        </p>
      )}
    </div>
  )
}

function StatBox({ label, value, tone }: { label: string; value: number; tone: 'gray' | 'green' | 'amber' }) {
  const cls = tone === 'green' ? 'bg-emerald-50 text-emerald-700' : tone === 'amber' ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-700'
  return (
    <div className={cn('rounded-xl px-2 py-2.5 text-center', cls)}>
      <p className="text-lg font-extrabold leading-none">{value}</p>
      <p className="text-[11px] mt-1 opacity-80">{label}</p>
    </div>
  )
}
