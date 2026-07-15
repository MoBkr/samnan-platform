'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Printer, ArrowRight, Building2, MapPin, Wallet, Package, Hammer, Users, FileText, Clock, HardHat, Eye, Globe,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PrintHeader } from '@/components/shared/print-header'
import { Dialog, DialogHeader, DialogTitle, DialogClose, DialogContent } from '@/components/ui/dialog'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import {
  STATUS_LABELS, PAYMENT_TYPE_LABELS, PAYMENT_STATUS_LABELS, INSTALLATION_STATUS_LABELS, INSTALL_STAGES, DOCUMENT_TYPE_LABELS,
} from '@/lib/constants'
import type {
  Project, Payment, Material, Installation, Document, ActivityLog, TechnicianAssignment, Technician,
} from '@/types/database'

type Lang = 'ar' | 'en'

const MAT_STATUS_AR: Record<string, string> = {
  pending: 'قيد الانتظار', preparing: 'قيد التجهيز', ready: 'جاهزة', delivered: 'تم التوريد', partial: 'توريد جزئي',
}
const MAT_STATUS_EN: Record<string, string> = {
  pending: 'Pending', preparing: 'In Preparation', ready: 'Ready', delivered: 'Delivered', partial: 'Partial',
}
const PROJ_STATUS_EN: Record<string, string> = {
  active: 'Active', completed: 'Completed', cancelled: 'Cancelled', on_hold: 'On Hold',
}
const PAY_STATUS_EN: Record<string, string> = {
  pending: 'Pending', partial: 'Partially Paid', paid: 'Paid', overdue: 'Overdue', cancelled: 'Cancelled',
}
const PAY_TYPE_EN: Record<string, string> = {
  upfront: 'Upfront Payment', materials: 'Materials Payment', installation: 'Installation Payment', final: 'Final Payment', custom: 'Payment',
}
const INSTALL_STATUS_EN: Record<string, string> = {
  scheduled: 'Scheduled', confirmed: 'Confirmed', in_progress: 'In Progress', completed: 'Completed', delayed: 'Delayed', rescheduled: 'Rescheduled',
}
const DOC_TYPE_EN: Record<string, string> = {
  contract: 'Contract', invoice: 'Invoice', receipt: 'Receipt', delivery_note: 'Delivery Note',
  completion_photo: 'Completion Photo', materials_request: 'Materials Request', other: 'Document',
}

const PAY_CLS: Record<string, string> = {
  paid: 'bg-emerald-100 text-emerald-700', partial: 'bg-amber-100 text-amber-700',
  pending: 'bg-gray-100 text-gray-500', overdue: 'bg-red-100 text-red-700', cancelled: 'bg-gray-100 text-gray-400',
}

const isImage = (url: string) => /\.(png|jpe?g|webp|gif|bmp|svg)(\?|$)/i.test(url)

const TT = {
  ar: {
    back: 'رجوع للمشروع', print: 'طباعة', switch: 'English',
    summaryTitle: 'ملخص المشروع', overviewFor: 'نظرة عامة سريعة للإدارة',
    completion: 'نسبة الإنجاز', collection: 'التحصيل', materials: 'المواد', installation: 'التركيب',
    clientProject: 'العميل والمشروع', client: 'العميل', location: 'الموقع', accountNo: 'رقم حساب العميل',
    type: 'النوع', withInstall: 'مع تركيب', withoutInstall: 'بدون تركيب', startDate: 'تاريخ البدء', expectedEnd: 'الانتهاء المتوقع',
    financial: 'المالي والدفعات', projectValue: 'قيمة المشروع', collected: 'المحصّل', remaining: 'المتبقي',
    collectionRate: 'نسبة التحصيل', invoice: 'فاتورة', view: 'عرض', noPayments: 'لا توجد دفعات',
    matInstall: 'المواد والتركيب', none: 'لا يوجد', items: 'صنف', completed: 'مكتملة', inProcess: 'قيد المعالجة',
    notScheduled: 'لم يُجدول', startOn: 'موعد البدء', expectedDuration: 'المدة المتوقعة', stagesProgress: 'تقدّم المراحل',
    technicians: 'الفنيون', noInstall: 'المشروع بدون تركيب',
    teamDocs: 'الفريق والمرفقات', coordinator: 'الكوردنيتر', salesEngineer: 'مهندس المبيعات', installManager: 'مدير التركيب',
    docsCount: 'عدد المستندات', keyDocs: 'أهم المرفقات', lastActivity: 'آخر نشاط',
    viewDoc: 'عرض المستند', openNewTab: 'فتح في تبويب جديد',
  },
  en: {
    back: 'Back to project', print: 'Print', switch: 'عربي',
    summaryTitle: 'Project Summary', overviewFor: 'Quick overview for management',
    completion: 'Completion', collection: 'Collection', materials: 'Materials', installation: 'Installation',
    clientProject: 'Client & Project', client: 'Client', location: 'Location', accountNo: 'Customer Account No.',
    type: 'Type', withInstall: 'With Installation', withoutInstall: 'Without Installation', startDate: 'Start Date', expectedEnd: 'Expected End',
    financial: 'Financials & Payments', projectValue: 'Project Value', collected: 'Collected', remaining: 'Remaining',
    collectionRate: 'Collection rate', invoice: 'Invoice', view: 'View', noPayments: 'No payments',
    matInstall: 'Materials & Installation', none: 'None', items: 'items', completed: 'Completed', inProcess: 'In Process',
    notScheduled: 'Not scheduled', startOn: 'Start date', expectedDuration: 'Expected duration', stagesProgress: 'Stages progress',
    technicians: 'Technicians', noInstall: 'This project has no installation',
    teamDocs: 'Team & Attachments', coordinator: 'Coordinator', salesEngineer: 'Sales Engineer', installManager: 'Installation Manager',
    docsCount: 'Documents', keyDocs: 'Key attachments', lastActivity: 'Last activity',
    viewDoc: 'View document', openNewTab: 'Open in new tab',
  },
}

interface Props {
  project: Project
  payments: Payment[]
  material: Material | null
  installations: Installation[]
  attachments: Document[]
  activityLog: ActivityLog[]
  technicianAssignments: (TechnicianAssignment & { technician?: Technician })[]
}

export function ProjectSummaryView({ project, payments, material, installations, attachments, activityLog, technicianAssignments }: Props) {
  const [viewer, setViewer] = useState<{ title: string; url: string } | null>(null)
  const [lang, setLang] = useState<Lang>('ar')
  const isEn = lang === 'en'
  const t = TT[lang]

  const projStatus = isEn ? (PROJ_STATUS_EN[project.status] ?? project.status) : (STATUS_LABELS[project.status] ?? project.status)
  const payTypeLabel = (p: Payment) => p.name || (isEn ? (PAY_TYPE_EN[p.type] ?? 'Payment') : (PAYMENT_TYPE_LABELS[p.type] ?? 'دفعة'))
  const payStatusLabel = (s: string) => isEn ? (PAY_STATUS_EN[s] ?? s) : ((PAYMENT_STATUS_LABELS as Record<string, string>)[s] ?? s)
  const matStatusLabel = (s: string) => isEn ? (MAT_STATUS_EN[s] ?? s) : (MAT_STATUS_AR[s] ?? s)
  const installStatusLabel = (s: string) => isEn ? (INSTALL_STATUS_EN[s] ?? s) : ((INSTALLATION_STATUS_LABELS as Record<string, string>)[s] ?? s)
  const docTypeLabel = (ty: string) => isEn ? (DOC_TYPE_EN[ty] ?? 'Document') : (DOCUMENT_TYPE_LABELS[ty] ?? 'مستند')

  const active = payments.filter((p) => p.status !== 'cancelled')
  const totalPaid = active.reduce((s, p) => s + (p.paid_amount ?? 0), 0)
  const projectValue = project.total_amount && project.total_amount > 0
    ? project.total_amount : active.reduce((s, p) => s + (p.amount ?? 0), 0)
  const remaining = Math.max(0, projectValue - totalPaid)
  const pct = projectValue > 0 ? Math.round((totalPaid / projectValue) * 100) : 0

  const installation = installations[0] ?? null
  const stages = installation?.stages ?? {}
  const reqStages = INSTALL_STAGES.filter((s) => !s.optional)
  const doneStages = reqStages.filter((s) => stages[s.key]?.done).length

  const items = material?.items ?? []
  const activeTechs = technicianAssignments.filter((a) => a.status === 'active')
  const last = activityLog[0] ?? null

  const matStatusCounts = items.reduce<Record<string, number>>((acc, it) => {
    const s = (it.status || '—').trim() || '—'; acc[s] = (acc[s] ?? 0) + 1; return acc
  }, {})

  const MAT_PCT: Record<string, number> = { delivered: 100, ready: 60, partial: 50, preparing: 30, pending: 10 }
  const materialsPct = items.length > 0
    ? Math.round((items.filter((it) => it.status === 'مكتمل').length / items.length) * 100)
    : material ? (MAT_PCT[material.status] ?? 0) : 0
  const materialsAllDone = items.length > 0 && items.every((it) => (it.status || '').trim() === 'مكتمل')
  const installPct = project.has_installation
    ? (reqStages.length > 0 ? Math.round((doneStages / reqStages.length) * 100) : 0)
    : null
  const overallParts = [pct, materialsPct, ...(installPct !== null ? [installPct] : [])]
  const overallPct = Math.round(overallParts.reduce((a, b) => a + b, 0) / overallParts.length)

  const keyDocs: { label: string; url: string }[] = []
  if (project.contract_url) keyDocs.push({ label: isEn ? 'Contract' : 'العقد', url: project.contract_url })
  for (const d of attachments.slice(0, 6)) keyDocs.push({ label: d.description || docTypeLabel(d.type), url: d.url })

  function printPage() {
    document.body.classList.add('printing-summary')
    const cleanup = () => { document.body.classList.remove('printing-summary'); window.removeEventListener('afterprint', cleanup) }
    window.addEventListener('afterprint', cleanup)
    window.print()
  }

  return (
    <div dir={isEn ? 'ltr' : 'rtl'} className="space-y-4 max-w-4xl mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-2 no-print">
        <Link href={`/projects/${project.id}`}>
          <Button variant="ghost" size="sm" className="gap-1.5 text-gray-500 hover:text-gray-900">
            <ArrowRight className="h-4 w-4" /> {t.back}
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setLang(isEn ? 'ar' : 'en')}>
            <Globe className="h-4 w-4" /> {t.switch}
          </Button>
          <Button size="sm" onClick={printPage}><Printer className="h-4 w-4" /> {t.print}</Button>
        </div>
      </div>

      <div id="project-summary-print" className="space-y-4">
        <PrintHeader title={t.summaryTitle} subtitle={project.project_name} />
        {/* Header */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <h1 className="text-xl font-bold text-gray-900">{t.summaryTitle} — {project.project_name}</h1>
            <span className="rounded-full bg-brand-50 text-brand-700 px-3 py-1 text-xs font-semibold border border-brand-100">
              {projStatus}
            </span>
          </div>
          <p className="text-xs text-gray-400">{t.overviewFor} · {formatDateShort(new Date().toISOString())}</p>
        </div>

        {/* Completion percentages */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-900">{t.completion}</h3>
            <span className="text-lg font-extrabold text-brand-700">{overallPct}%</span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden mb-4">
            <div className="h-full rounded-full bg-brand-600" style={{ width: `${Math.min(overallPct, 100)}%` }} />
          </div>
          <div className={`grid gap-3 ${installPct !== null ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <Meter label={t.collection} pct={pct} />
            <Meter label={t.materials} pct={materialsPct} />
            {installPct !== null && <Meter label={t.installation} pct={installPct} />}
          </div>
        </div>

        {/* 1) Client & project */}
        <Section icon={<Building2 className="h-4 w-4" />} title={t.clientProject}>
          <Grid>
            <Row label={t.client} value={project.client_name} />
            <Row label={t.location} value={project.location || '—'} icon={<MapPin className="h-3 w-3" />} />
            <Row label={t.accountNo} value={project.customer_account_no || '—'} ltr />
            <Row label={t.type} value={project.has_installation ? t.withInstall : t.withoutInstall} />
            <Row label={t.startDate} value={project.start_date ? formatDateShort(project.start_date) : '—'} />
            <Row label={t.expectedEnd} value={project.expected_end_date ? formatDateShort(project.expected_end_date) : '—'} />
          </Grid>
        </Section>

        {/* 2) Financial */}
        <Section icon={<Wallet className="h-4 w-4" />} title={t.financial} pct={pct}>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <Stat label={t.projectValue} value={formatCurrency(projectValue)} />
            <Stat label={t.collected} value={formatCurrency(totalPaid)} tone="green" />
            <Stat label={t.remaining} value={formatCurrency(remaining)} tone="amber" />
          </div>
          <div className="mb-3">
            <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-1">{t.collectionRate}: {pct}%</p>
          </div>
          {active.length > 0 ? (
            <div className="space-y-1.5">
              {active.map((p) => {
                const hasDoc = !!p.receipt_url
                return (
                  <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <span className="text-gray-700 font-medium">{payTypeLabel(p)}</span>
                      {p.invoice_number && <span className="text-xs text-gray-400 ms-2" dir="ltr">{t.invoice}: {p.invoice_number}</span>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-semibold text-gray-800">{formatCurrency(p.amount)}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${PAY_CLS[p.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {payStatusLabel(p.status)}
                      </span>
                      {hasDoc && (
                        <button onClick={() => setViewer({ title: `${payTypeLabel(p)} — ${t.invoice}`, url: p.receipt_url! })}
                          className="no-print inline-flex items-center gap-1 rounded-md border border-brand-200 px-2 py-0.5 text-[11px] font-medium text-brand-600 hover:bg-brand-50">
                          <Eye className="h-3 w-3" /> {t.view}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : <p className="text-xs text-gray-400">{t.noPayments}</p>}
        </Section>

        {/* 3) Materials & installation */}
        <Section icon={<Package className="h-4 w-4" />} title={t.matInstall} pct={installPct !== null ? Math.round((materialsPct + installPct) / 2) : materialsPct}>
          <div className="rounded-lg border border-gray-100 px-3 py-2.5 mb-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-gray-600"><Package className="h-3.5 w-3.5 text-amber-500" /> {t.materials}</span>
              {items.length > 0 ? (
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${materialsAllDone ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {materialsAllDone ? t.completed : t.inProcess} · {materialsPct}%
                </span>
              ) : (
                <span className="font-medium text-gray-800">{material ? matStatusLabel(material.status) : t.none}</span>
              )}
            </div>
            {items.length > 0 && (
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-gray-500">{items.length} {t.items}:</span>
                {Object.entries(matStatusCounts).map(([s, n]) => (
                  <span key={s} className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">{s} {n}</span>
                ))}
              </div>
            )}
          </div>
          {project.has_installation ? (
            <div className="rounded-lg border border-gray-100 px-3 py-2.5 space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-gray-600"><Hammer className="h-3.5 w-3.5 text-purple-500" /> {t.installation}</span>
                <span className="font-medium text-gray-800">{installation ? installStatusLabel(installation.status) : t.notScheduled}</span>
              </div>
              {installation && (
                <>
                  {installation.scheduled_date && <p className="text-xs text-gray-500">{t.startOn}: {formatDateShort(installation.scheduled_date)}</p>}
                  {installation.expected_duration && <p className="text-xs text-gray-500">{t.expectedDuration}: {installation.expected_duration}</p>}
                  <p className="text-xs text-gray-500">{t.stagesProgress}: {doneStages} / {reqStages.length}</p>
                </>
              )}
              <div className="flex items-center gap-1.5 pt-1">
                <HardHat className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-xs text-gray-600">{t.technicians}: {activeTechs.length > 0 ? activeTechs.map((a) => a.technician?.name ?? (isEn ? 'Technician' : 'فني')).join(isEn ? ', ' : '، ') : t.none}</span>
              </div>
            </div>
          ) : <p className="text-xs text-gray-400">{t.noInstall}</p>}
        </Section>

        {/* 4) Team & key attachments */}
        <Section icon={<Users className="h-4 w-4" />} title={t.teamDocs}>
          <Grid>
            <Row label={t.coordinator} value={project.coordinator?.full_name || '—'} />
            <Row label={t.salesEngineer} value={project.sales_engineer?.full_name || '—'} />
            <Row label={t.installManager} value={project.installation_person?.full_name || '—'} />
            <Row label={t.docsCount} value={String(attachments.length)} icon={<FileText className="h-3 w-3" />} />
          </Grid>
          {keyDocs.length > 0 && (
            <div className="mt-2.5">
              <p className="text-xs font-semibold text-gray-500 mb-1.5">{t.keyDocs}</p>
              <div className="flex flex-wrap gap-1.5">
                {keyDocs.map((d, i) => (
                  <button key={i} onClick={() => setViewer({ title: d.label, url: d.url })}
                    className="no-print inline-flex items-center gap-1 rounded-lg border border-brand-100 bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100 transition-colors">
                    <Eye className="h-3 w-3" /> <span className="max-w-[160px] truncate">{d.label}</span>
                  </button>
                ))}
                {keyDocs.map((d, i) => (
                  <a key={`p-${i}`} href={d.url} className="print-only text-xs text-gray-700 underline">{d.label}</a>
                ))}
              </div>
            </div>
          )}
          {last && (
            <p className="flex items-center gap-1.5 text-xs text-gray-400 mt-2 pt-2 border-t border-gray-50">
              <Clock className="h-3 w-3" /> {t.lastActivity}: {last.action} — {formatDateShort(last.created_at)}
            </p>
          )}
        </Section>
      </div>

      {/* Document viewer popup */}
      <Dialog open={!!viewer} onClose={() => setViewer(null)}>
        <DialogHeader>
          <DialogTitle>{viewer?.title ?? t.viewDoc}</DialogTitle>
          <DialogClose onClose={() => setViewer(null)} />
        </DialogHeader>
        <DialogContent>
          {viewer && (
            <div className="space-y-3">
              <div className="rounded-xl border border-gray-100 bg-gray-50 overflow-hidden" style={{ height: '70vh' }}>
                {isImage(viewer.url)
                  ? <img src={viewer.url} alt={viewer.title} className="h-full w-full object-contain" />
                  : <iframe src={viewer.url} title={viewer.title} className="h-full w-full" />}
              </div>
              <a href={viewer.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700">
                <FileText className="h-4 w-4" /> {t.openNewTab}
              </a>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Section({ icon, title, pct, children }: { icon: React.ReactNode; title: string; pct?: number; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm print:shadow-none print:break-inside-avoid">
      <div className="flex items-center gap-2 mb-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-700">{icon}</span>
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
        {pct !== undefined && (
          <span className={`ms-auto rounded-full px-2.5 py-0.5 text-xs font-bold ${pct >= 100 ? 'bg-emerald-100 text-emerald-700' : pct > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
            {pct}%
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

function Meter({ label, pct }: { label: string; pct: number }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-gray-600">{label}</span>
        <span className={`text-xs font-bold ${pct >= 100 ? 'text-emerald-600' : 'text-gray-700'}`}>{pct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
        <div className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : 'bg-brand-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  )
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-4 gap-y-2">{children}</div>
}

function Row({ label, value, icon, ltr }: { label: string; value: string; icon?: React.ReactNode; ltr?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm border-b border-gray-50 pb-1.5">
      <span className="flex items-center gap-1 text-gray-500 shrink-0">{icon}{label}</span>
      <span className="font-medium text-gray-800 truncate text-end" dir={ltr ? 'ltr' : undefined}>{value}</span>
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'green' | 'amber' }) {
  const cls = tone === 'green' ? 'bg-emerald-50 text-emerald-700' : tone === 'amber' ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-700'
  return (
    <div className={`rounded-lg px-3 py-2 text-center ${cls}`}>
      <p className="text-sm font-bold leading-tight">{value}</p>
      <p className="text-[11px] mt-0.5 opacity-80">{label}</p>
    </div>
  )
}
