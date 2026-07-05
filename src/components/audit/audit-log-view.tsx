'use client'

import { useMemo, useState } from 'react'
import { Search, Printer, FolderKanban, ShoppingCart, Shield, ClipboardList, X } from 'lucide-react'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { ROLE_LABELS } from '@/lib/constants'
import type { AuditEntry, AuditBr } from '@/lib/actions/audit'
import type { Profile } from '@/types/database'

type Scope = 'all' | 'project' | 'br' | 'admin'

interface Props {
  logs: AuditEntry[]
  brs: AuditBr[]
  users: Pick<Profile, 'id' | 'full_name' | 'role'>[]
}

export function AuditLogView({ logs, brs }: Props) {
  const [search, setSearch] = useState('')
  const [scope, setScope] = useState<Scope>('all')
  const [projectId, setProjectId] = useState('')
  const [brId, setBrId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const brMap = useMemo(() => new Map(brs.map((b) => [b.id, b])), [brs])

  // unique projects appearing in logs
  const projects = useMemo(() => {
    const m = new Map<string, string>()
    logs.forEach((l) => { if (l.project) m.set(l.project.id, l.project.project_name) })
    return Array.from(m, ([id, name]) => ({ id, name }))
  }, [logs])

  function contextOf(e: AuditEntry): { type: Scope; label: string; brId?: string } {
    if (e.project) return { type: 'project', label: e.project.project_name }
    const bid = (e.details as { br_id?: string } | null)?.br_id
    if (bid) {
      const b = brMap.get(bid)
      return { type: 'br', label: b ? `${b.project_name ?? 'طلب شراء'}${b.br_number ? ` — ${b.br_number}` : ''}` : 'طلب شراء', brId: bid }
    }
    return { type: 'admin', label: 'إجراء إداري / نظام' }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return logs.filter((e) => {
      const ctx = contextOf(e)
      if (scope !== 'all' && ctx.type !== scope) return false
      if (projectId && e.project?.id !== projectId) return false
      if (brId && ctx.brId !== brId) return false
      if (from && e.created_at < from) return false
      if (to && e.created_at > to + 'T23:59:59') return false
      if (q) {
        const hay = `${e.action} ${e.user?.full_name ?? ''} ${ctx.label}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logs, search, scope, projectId, brId, from, to])

  const hasFilter = search || scope !== 'all' || projectId || brId || from || to

  function printLog() {
    const rows = filtered.map((e) => {
      const ctx = contextOf(e)
      return `<tr>
        <td>${formatDateTime(e.created_at)}</td>
        <td>${e.user?.full_name ?? 'غير معروف'}</td>
        <td>${e.action}</td>
        <td>${ctx.label}</td>
      </tr>`
    }).join('')
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>سجل التدقيق — منصة سمنان</title>
      <style>
        body{font-family:Tahoma,Arial,sans-serif;padding:24px;color:#111}
        h2{color:#1841A0;margin:0 0 4px} .sub{color:#666;font-size:12px;margin-bottom:16px}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th,td{border:1px solid #ddd;padding:7px 9px;text-align:right;vertical-align:top}
        th{background:#1841A0;color:#fff}
        tr:nth-child(even) td{background:#f7f9fc}
        .brand{display:flex;align-items:center;justify-content:center;gap:10px;border-bottom:2px solid #1841A0;padding-bottom:10px;margin-bottom:6px}
        .brand img{width:46px;height:46px;border-radius:8px;object-fit:cover}
        .brand b{color:#1841A0;font-size:17px;display:block}
        .brand .en{color:#1841A0;font-size:9px;font-weight:700;letter-spacing:2px}
      </style></head><body>
      <div class="brand"><img src="${window.location.origin}/samnan.jpg" alt="سمنان" /><div style="text-align:center"><b>سمنان للخدمات البترولية</b><span class="en">SAMNAN PETROLEUM SERVICES</span></div></div>
      <div class="sub" style="text-align:center">سجل التدقيق</div>
      <div class="sub">عدد السجلات: ${filtered.length} · طُبع في ${formatDateTime(new Date().toISOString())} (توقيت السعودية)</div>
      <table><thead><tr><th>التاريخ والوقت</th><th>المستخدم</th><th>الإجراء</th><th>السياق</th></tr></thead>
      <tbody>${rows}</tbody></table></body></html>`)
    w.document.close()
    setTimeout(() => w.print(), 300)
  }

  function clearFilters() { setSearch(''); setScope('all'); setProjectId(''); setBrId(''); setFrom(''); setTo('') }

  const SCOPES: { v: Scope; label: string; icon: React.ReactNode }[] = [
    { v: 'all', label: 'الكل', icon: <ClipboardList className="h-3.5 w-3.5" /> },
    { v: 'project', label: 'المشاريع', icon: <FolderKanban className="h-3.5 w-3.5" /> },
    { v: 'br', label: 'طلبات الشراء', icon: <ShoppingCart className="h-3.5 w-3.5" /> },
    { v: 'admin', label: 'إداري / نظام', icon: <Shield className="h-3.5 w-3.5" /> },
  ]

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm space-y-3">
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-gray-400 pointer-events-none" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث في الإجراءات أو المستخدمين..."
              className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50/50 ps-10 pe-3 text-sm focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/15" />
          </div>
          <Button variant="outline" onClick={printLog} className="h-11 gap-2 shrink-0">
            <Printer className="h-4 w-4" /> طباعة
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {SCOPES.map((s) => (
            <button key={s.v} onClick={() => setScope(s.v)}
              className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all',
                scope === s.v ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300')}>
              {s.icon} {s.label}
            </button>
          ))}
        </div>

        <div className="grid gap-2.5 sm:grid-cols-4">
          <Select value={projectId} onChange={(e) => setProjectId(e.target.value)} placeholder="كل المشاريع">
            <option value="">كل المشاريع</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          <Select value={brId} onChange={(e) => setBrId(e.target.value)} placeholder="كل طلبات الشراء">
            <option value="">كل طلبات الشراء</option>
            {brs.map((b) => <option key={b.id} value={b.id}>{b.project_name}{b.br_number ? ` — ${b.br_number}` : ''}</option>)}
          </Select>
          <input type="date" dir="ltr" value={from} onChange={(e) => setFrom(e.target.value)}
            className="h-10 rounded-lg border border-gray-200 px-3 text-sm focus:border-brand-500 focus:outline-none" title="من تاريخ" />
          <input type="date" dir="ltr" value={to} onChange={(e) => setTo(e.target.value)}
            className="h-10 rounded-lg border border-gray-200 px-3 text-sm focus:border-brand-500 focus:outline-none" title="إلى تاريخ" />
        </div>

        {hasFilter && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500"><span className="font-bold text-gray-700">{filtered.length}</span> سجل</p>
            <button onClick={clearFilters} className="inline-flex items-center gap-1 text-xs font-medium text-red-500 hover:underline"><X className="h-3 w-3" /> مسح الفلاتر</button>
          </div>
        )}
      </div>

      {/* Log list */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-14 text-center">
          <ClipboardList className="mx-auto mb-3 h-9 w-9 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">لا توجد سجلات مطابقة</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <ul className="divide-y divide-gray-50">
            {filtered.map((e) => {
              const ctx = contextOf(e)
              return (
                <li key={e.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50/50 transition-colors">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                    {e.user?.full_name?.[0] ?? '؟'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">{e.action}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500">
                      <span className="font-medium text-gray-600">{e.user?.full_name ?? 'غير معروف'}</span>
                      {e.user?.role && <span className="text-gray-300">·</span>}
                      {e.user?.role && <span>{ROLE_LABELS[e.user.role as keyof typeof ROLE_LABELS] ?? e.user.role}</span>}
                      <span className="text-gray-300">·</span>
                      <span>{formatDateTime(e.created_at)}</span>
                    </div>
                  </div>
                  <span className={cn('shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium max-w-[45%] truncate',
                    ctx.type === 'project' ? 'bg-blue-50 text-blue-700'
                      : ctx.type === 'br' ? 'bg-teal-50 text-teal-700'
                      : 'bg-gray-100 text-gray-500')}>
                    {ctx.type === 'project' ? <FolderKanban className="h-3 w-3 shrink-0" /> : ctx.type === 'br' ? <ShoppingCart className="h-3 w-3 shrink-0" /> : <Shield className="h-3 w-3 shrink-0" />}
                    <span className="truncate">{ctx.label}</span>
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
