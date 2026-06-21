'use client'

import { Printer, Building2, MapPin, Wallet, Package, Hammer, Users, FileText, Clock, HardHat } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogHeader, DialogTitle, DialogClose, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import {
  STATUS_LABELS, PAYMENT_TYPE_LABELS, PAYMENT_STATUS_LABELS, INSTALLATION_STATUS_LABELS, INSTALL_STAGES,
} from '@/lib/constants'
import type {
  Project, Payment, Material, Installation, Document, ActivityLog, TechnicianAssignment, Technician,
} from '@/types/database'

const MAT_STATUS: Record<string, string> = {
  pending: 'قيد الانتظار', preparing: 'قيد التجهيز', ready: 'جاهزة', delivered: 'تم التوريد', partial: 'توريد جزئي',
}
const PAY_CLS: Record<string, string> = {
  paid: 'bg-emerald-100 text-emerald-700', partial: 'bg-amber-100 text-amber-700',
  pending: 'bg-gray-100 text-gray-500', overdue: 'bg-red-100 text-red-700', cancelled: 'bg-gray-100 text-gray-400',
}

function paymentLabel(p: Payment) {
  return p.name || PAYMENT_TYPE_LABELS[p.type] || 'دفعة'
}

interface Props {
  open: boolean
  onClose: () => void
  project: Project
  payments: Payment[]
  material: Material | null
  installations: Installation[]
  attachments: Document[]
  activityLog: ActivityLog[]
  technicianAssignments: (TechnicianAssignment & { technician?: Technician })[]
}

export function ProjectSummaryDialog({
  open, onClose, project, payments, material, installations, attachments, activityLog, technicianAssignments,
}: Props) {
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
  const itemsTotal = items.reduce((s, it) => s + it.quantity * (it.unit_price ?? 0), 0)
  const activeTechs = technicianAssignments.filter((a) => a.status === 'active')
  const last = activityLog[0] ?? null

  function handlePrint() {
    document.body.classList.add('printing-summary')
    const cleanup = () => {
      document.body.classList.remove('printing-summary')
      window.removeEventListener('afterprint', cleanup)
    }
    window.addEventListener('afterprint', cleanup)
    window.print()
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>ملخص المشروع</DialogTitle>
        <DialogClose onClose={onClose} />
      </DialogHeader>
      <DialogContent>
        <div id="project-summary-print" className="space-y-4">
          {/* Print-only header */}
          <div className="hidden print:block border-b border-gray-200 pb-3 mb-2">
            <h1 className="text-xl font-bold">ملخص المشروع — {project.project_name}</h1>
            <p className="text-sm text-gray-500">منصة سمنان · {formatDateShort(new Date().toISOString())}</p>
          </div>

          {/* 1) Client & project */}
          <Section icon={<Building2 className="h-4 w-4" />} title="العميل والمشروع">
            <Grid>
              <Row label="المشروع" value={project.project_name} />
              <Row label="العميل" value={project.client_name} />
              <Row label="الموقع" value={project.location || '—'} icon={<MapPin className="h-3 w-3" />} />
              <Row label="رقم حساب العميل" value={project.customer_account_no || '—'} ltr />
              <Row label="النوع" value={project.has_installation ? 'مع تركيب' : 'بدون تركيب'} />
              <Row label="الحالة" value={STATUS_LABELS[project.status] ?? project.status} />
              <Row label="تاريخ البدء" value={project.start_date ? formatDateShort(project.start_date) : '—'} />
              <Row label="الانتهاء المتوقع" value={project.expected_end_date ? formatDateShort(project.expected_end_date) : '—'} />
            </Grid>
          </Section>

          {/* 2) Financial */}
          <Section icon={<Wallet className="h-4 w-4" />} title="المالي والدفعات">
            <div className="grid grid-cols-3 gap-2 mb-3">
              <Stat label="قيمة المشروع" value={formatCurrency(projectValue)} />
              <Stat label="المحصّل" value={formatCurrency(totalPaid)} tone="green" />
              <Stat label="المتبقي" value={formatCurrency(remaining)} tone="amber" />
            </div>
            <div className="mb-3">
              <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
              <p className="text-xs text-gray-400 mt-1">نسبة التحصيل: {pct}%</p>
            </div>
            {active.length > 0 ? (
              <div className="space-y-1.5">
                {active.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2 text-sm">
                    <span className="text-gray-700 truncate">{paymentLabel(p)}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-semibold text-gray-800">{formatCurrency(p.amount)}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${PAY_CLS[p.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {PAYMENT_STATUS_LABELS[p.status] ?? p.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-xs text-gray-400">لا توجد دفعات</p>}
          </Section>

          {/* 3) Materials & installation */}
          <Section icon={<Package className="h-4 w-4" />} title="المواد والتركيب">
            <div className="rounded-lg border border-gray-100 px-3 py-2.5 mb-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-gray-600"><Package className="h-3.5 w-3.5 text-amber-500" /> المواد</span>
                <span className="font-medium text-gray-800">{material ? (MAT_STATUS[material.status] ?? material.status) : 'لا يوجد'}</span>
              </div>
              {items.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">{items.length} صنف{itemsTotal > 0 ? ` · إجمالي ${formatCurrency(itemsTotal)}` : ''}</p>
              )}
            </div>
            {project.has_installation ? (
              <div className="rounded-lg border border-gray-100 px-3 py-2.5 space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-gray-600"><Hammer className="h-3.5 w-3.5 text-purple-500" /> التركيب</span>
                  <span className="font-medium text-gray-800">{installation ? (INSTALLATION_STATUS_LABELS[installation.status] ?? installation.status) : 'لم يُجدول'}</span>
                </div>
                {installation && (
                  <>
                    {installation.scheduled_date && <p className="text-xs text-gray-500">موعد البدء: {formatDateShort(installation.scheduled_date)}</p>}
                    {installation.expected_duration && <p className="text-xs text-gray-500">المدة المتوقعة: {installation.expected_duration}</p>}
                    <p className="text-xs text-gray-500">تقدّم المراحل: {doneStages} / {reqStages.length}</p>
                  </>
                )}
                <div className="flex items-center gap-1.5 pt-1">
                  <HardHat className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-xs text-gray-600">
                    الفنيون: {activeTechs.length > 0 ? activeTechs.map((a) => a.technician?.name ?? 'فني').join('، ') : 'لا يوجد'}
                  </span>
                </div>
              </div>
            ) : <p className="text-xs text-gray-400">المشروع بدون تركيب</p>}
          </Section>

          {/* 4) Team & attachments */}
          <Section icon={<Users className="h-4 w-4" />} title="الفريق والمرفقات">
            <Grid>
              <Row label="الكوردنيتر" value={project.coordinator?.full_name || '—'} />
              <Row label="مهندس المبيعات" value={project.sales_engineer?.full_name || '—'} />
              <Row label="مدير التركيب" value={project.installation_person?.full_name || '—'} />
              <Row label="عدد المستندات" value={String(attachments.length)} icon={<FileText className="h-3 w-3" />} />
            </Grid>
            {last && (
              <p className="flex items-center gap-1.5 text-xs text-gray-400 mt-2 pt-2 border-t border-gray-50">
                <Clock className="h-3 w-3" /> آخر نشاط: {last.action} — {formatDateShort(last.created_at)}
              </p>
            )}
          </Section>
        </div>
      </DialogContent>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>إغلاق</Button>
        <Button onClick={handlePrint}><Printer className="h-4 w-4" /> طباعة</Button>
      </DialogFooter>
    </Dialog>
  )
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 print:break-inside-avoid">
      <div className="flex items-center gap-2 mb-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-700">{icon}</span>
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
      </div>
      {children}
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
