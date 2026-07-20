'use client'

import { useState, useTransition, useRef } from 'react'
import { toast } from 'sonner'
import {
  Package, Upload, FileText, CheckCircle2, Truck, Plus, Trash2, Save, Clock, Paperclip, X, Printer,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogHeader, DialogTitle, DialogClose, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { MATERIAL_ITEM_STATUSES } from '@/lib/constants'
import { saveDocumentRecord, deleteAttachment } from '@/lib/actions/attachments'
import { updateMaterialsStatus, updateMaterialsItems } from '@/lib/actions/materials'
import { createPayment } from '@/lib/actions/payments'
import { uploadFileDirect } from '@/lib/upload-client'
import { PrintHeader } from '@/components/shared/print-header'
import { LETTERHEAD_CSS, letterheadHeaderHtml, letterheadFooterHtml } from '@/lib/print-letterhead'
import { MaterialsStatusView } from '@/components/projects/materials-status-view'
import type { Material, Document, MaterialItem, Payment } from '@/types/database'

interface MaterialsTabProps {
  material: Material | null
  attachments: Document[]
  projectId: string
  canManage: boolean
  payments: Payment[]
  projectName?: string
  clientName?: string
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Riyadh' })
}

// Parse clipboard TSV from Excel respecting quoted fields, doubled quotes ("")
// and newlines INSIDE quoted cells — so descriptions with " or line breaks
// don't shift the columns.
function parseClipboardTable(text: string): string[][] {
  const s = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (inQuotes) {
      if (ch === '"') {
        if (s[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = false
      } else field += ch
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === '\t') {
      row.push(field); field = ''
    } else if (ch === '\n') {
      row.push(field); rows.push(row); row = []; field = ''
    } else {
      field += ch
    }
  }
  row.push(field)
  rows.push(row)
  // Drop fully-empty rows
  return rows.filter((r) => r.some((c) => c.trim() !== ''))
}

// Map common English Excel statuses to the Arabic options used in the dropdown.
function normalizeStatus(v: string): string {
  const s = v.trim().toLowerCase()
  if (!s) return ''
  if (s === 'completed' || s === 'complete' || s === 'done') return 'مكتمل'
  if (s === 'in progress' || s === 'inprogress' || s === 'in-progress' || s === 'processing') return 'قيد المعالجة'
  if (s === 'not requested' || s === 'pending' || s === 'not ordered') return 'لم يطلب'
  return v.trim()  // keep as-is (already Arabic or custom)
}

function DocRow({ doc, onDelete }: { doc: Document; onDelete?: (id: string) => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 shrink-0">
        <FileText className="h-4 w-4 text-gray-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{doc.description || 'ملف'}</p>
        <p className="text-xs text-gray-400">
          {doc.uploader?.full_name && `${doc.uploader.full_name} • `}{formatDate(doc.uploaded_at)}
        </p>
      </div>
      <a href={doc.url} target="_blank" rel="noopener noreferrer"
        className="shrink-0 text-sm font-medium text-brand-600 hover:text-brand-700">
        عرض
      </a>
      {onDelete && (
        <button type="button" onClick={() => onDelete(doc.id)} title="حذف الملف"
          className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

const STATUS_PILL: Record<string, string> = {
  'مكتمل': 'bg-emerald-100 text-emerald-700',
  'قيد المعالجة': 'bg-amber-100 text-amber-700',
  'لم يطلب': 'bg-gray-200 text-gray-500',
}

// The materials journey, shown as a horizontal stepper
const MAT_STEPS = [
  { n: 1, label: 'طلب المواد', en: 'Request' },
  { n: 2, label: 'جاهزة للتوريد', en: 'Ready' },
  { n: 3, label: 'التوريد والتسليم', en: 'Delivery' },
  { n: 4, label: 'تم الاستلام', en: 'Received' },
] as const

function MatStep({ step, done, current, selected, onClick }: {
  step: { n: number; label: string; en: string }
  done: boolean
  current: boolean
  selected: boolean
  onClick: () => void
}) {
  return (
    <button onClick={onClick} className="group flex w-24 sm:w-28 shrink-0 flex-col items-center gap-1.5 px-1">
      <span className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold transition-all
        ${done ? 'border-emerald-500 bg-emerald-500 text-white'
          : selected ? 'border-amber-600 bg-amber-600 text-white'
          : current ? 'border-amber-500 bg-amber-100 text-amber-700'
          : 'border-gray-300 bg-white text-gray-500 group-hover:border-amber-400 group-hover:text-amber-600'}
        ${selected ? 'ring-4 ring-amber-200' : ''}`}>
        {done ? <CheckCircle2 className="h-5 w-5" /> : step.n}
      </span>
      <span className={`text-[11px] font-bold leading-tight text-center ${
        selected ? 'text-amber-700' : done ? 'text-emerald-700' : 'text-gray-600'
      }`}>
        {step.label}
      </span>
      <span className="text-[10px] text-gray-400" dir="ltr">{step.en}</span>
    </button>
  )
}

// Fallback completion % when no item-level statuses exist yet
const MAT_STATUS_PCT: Record<string, number> = {
  delivered: 100, ready: 60, partial: 50, preparing: 30, pending: 10,
}
const MAT_STATUS_LABEL: Record<string, string> = {
  pending: 'قيد الانتظار', preparing: 'قيد التجهيز', ready: 'جاهزة للتسليم',
  delivered: 'تم الاستلام', partial: 'استلام جزئي',
}

function ItemsTable({ items }: { items: MaterialItem[] }) {
  if (items.length === 0) return null
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100">
      <table className="w-full text-sm whitespace-nowrap">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
            <th className="px-3 py-2.5 text-start font-medium">#</th>
            <th className="px-3 py-2.5 text-start font-medium" dir="ltr">SAP No</th>
            <th className="px-3 py-2.5 text-start font-medium">الوصف</th>
            <th className="px-3 py-2.5 text-start font-medium">الكمية</th>
            <th className="px-3 py-2.5 text-start font-medium" dir="ltr">STO No</th>
            <th className="px-3 py-2.5 text-start font-medium">حالة الصنف</th>
            <th className="px-3 py-2.5 text-start font-medium">ملاحظات</th>
            <th className="px-3 py-2.5 text-start font-medium">مرفقات</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-50">
          {items.map((item, i) => (
            <tr key={i}>
              <td className="px-3 py-2.5 text-gray-400">{i + 1}</td>
              <td className="px-3 py-2.5 text-gray-700" dir="ltr">{item.sap_no || '—'}</td>
              <td className="px-3 py-2.5 font-medium text-gray-900 whitespace-normal">{item.description || item.name || '—'}</td>
              <td className="px-3 py-2.5 text-gray-700">{item.quantity ?? '—'}</td>
              <td className="px-3 py-2.5 text-gray-700" dir="ltr">{item.sto_no || '—'}</td>
              <td className="px-3 py-2.5">
                {item.status
                  ? <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_PILL[item.status] ?? 'bg-gray-100 text-gray-600'}`}>{item.status}</span>
                  : <span className="text-gray-400">—</span>}
              </td>
              <td className="px-3 py-2.5 text-gray-400 italic whitespace-normal">{item.notes || '—'}</td>
              <td className="px-3 py-2.5">
                {item.attachments && item.attachments.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {item.attachments.map((a, j) => (
                      <a key={j} href={a.url} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border border-brand-100 bg-brand-50 px-1.5 py-0.5 text-[11px] text-brand-700 hover:bg-brand-100">
                        <FileText className="h-3 w-3" /> {j + 1}
                      </a>
                    ))}
                  </div>
                ) : <span className="text-gray-400">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function MaterialsTab({ material, attachments, projectId, canManage, payments, projectName, clientName }: MaterialsTabProps) {
  const [isPending, startTransition] = useTransition()
  const [view, setView] = useState<'manage' | 'status'>('manage')

  const requestDocs = attachments.filter((a) => a.type === 'materials_request')
  const deliveryDocs = attachments.filter((a) => a.type === 'delivery_note')

  const status = material?.status ?? 'pending'
  const items: MaterialItem[] = material?.items ?? []
  const isDelivered = status === 'delivered'
  const isReady = status === 'ready'

  // Only non-cancelled materials payments block the "create payment" button
  // There can be more than one materials payment now — aggregate them.
  const materialsPayments = payments.filter((p) => p.type === 'materials' && p.status !== 'cancelled')
  const hasMaterialsPayment = materialsPayments.length > 0
  const materialsHasCollection = materialsPayments.some((p) => (p.paid_amount ?? 0) > 0)

  // Items editor state — draftItems is the single source of truth for display.
  // The whole table is editable inline: add / edit / delete, saved in one go.
  const [editingItems, setEditingItems] = useState(false)
  const [draftItems, setDraftItems] = useState<MaterialItem[]>(() => material?.items ?? [])

  // Mark-ready dialog
  const [readyDialog, setReadyDialog] = useState(false)
  const [readyFile, setReadyFile] = useState<File | null>(null)
  const [uploadingReady, setUploadingReady] = useState(false)

  // Delivery note upload (post-delivery)
  const [deliveryNoteUploading, setDeliveryNoteUploading] = useState(false)

  // Create payment dialog
  const [paymentDialog, setPaymentDialog] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')

  // draftItems is always the display source — no flicker after save.
  // (Legacy price total — only meaningful for old records that carried unit_price.)
  const itemsTotal = draftItems.reduce((sum, item) => sum + ((item.quantity ?? 0) * (item.unit_price ?? 0)), 0)

  // Materials completion — share of items marked مكتمل, else derived from the record status.
  const completedItemsCount = draftItems.filter((it) => it.status === 'مكتمل').length
  const materialsPct = draftItems.length > 0
    ? Math.round((completedItemsCount / draftItems.length) * 100)
    : material ? (MAT_STATUS_PCT[status] ?? 0) : 0

  // ── Materials journey (horizontal stepper) ──
  const hasAnyContent = draftItems.length > 0 || requestDocs.length > 0
  const stepDone: Record<number, boolean> = {
    1: hasAnyContent,
    2: isReady || isDelivered,
    3: isDelivered,
    4: isDelivered && deliveryDocs.length > 0,
  }
  const currentStep = isDelivered ? 4 : isReady ? 3 : hasAnyContent ? 2 : 1
  const [selectedStep, setSelectedStep] = useState<number>(currentStep)

  // Count rows that repeat an earlier SAP No (to offer a dedupe button).
  const sapDupCount = (() => {
    const seen = new Set<string>()
    let dups = 0
    for (const it of draftItems) {
      const s = (it.sap_no ?? '').trim()
      if (!s) continue
      if (seen.has(s)) dups++
      else seen.add(s)
    }
    return dups
  })()

  const [rowUploading, setRowUploading] = useState<number | null>(null)
  const [importingExcel, setImportingExcel] = useState(false)
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const excelInputRef = useRef<HTMLInputElement>(null)

  function rowEmpty(it: MaterialItem) {
    return !(it.description?.trim() || it.name?.trim() || it.sap_no?.trim() || it.sto_no?.trim() || it.notes?.trim() || it.quantity)
  }

  function handleSaveItems() {
    // Drop fully-empty rows; keep anything with at least a description / SAP / qty.
    const cleaned = draftItems
      .map((it) => ({
        ...it,
        sap_no: it.sap_no?.trim() || undefined,
        description: (it.description ?? it.name ?? '').trim(),
        sto_no: it.sto_no?.trim() || undefined,
        notes: it.notes?.trim() || undefined,
      }))
      .filter((it) => !rowEmpty(it))
    if (cleaned.length === 0) {
      toast.error('أضف صنفًا واحدًا على الأقل')
      return
    }
    startTransition(async () => {
      try {
        const result = await updateMaterialsItems(projectId, cleaned)
        if (result?.error) toast.error(result.error)
        else {
          setDraftItems(cleaned)        // reflect cleaned list immediately
          toast.success('تم حفظ قائمة المواد')
          setEditingItems(false)
        }
      } catch { toast.error('حدث خطأ غير متوقع') }
    })
  }

  function handleAddItem() {
    setDraftItems((prev) => [...prev, { sap_no: '', description: '', quantity: undefined, sto_no: '', status: 'قيد المعالجة', notes: '', attachments: [] }])
  }

  function updateDraftItem(idx: number, patch: Partial<MaterialItem>) {
    setDraftItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }

  function handleRemoveItem(idx: number) {
    setDraftItems((prev) => prev.filter((_, i) => i !== idx))
    setSelectedRows(new Set())
  }

  // ── Multi-select delete ──
  function toggleRow(i: number) {
    setSelectedRows((prev) => {
      const n = new Set(prev)
      if (n.has(i)) n.delete(i); else n.add(i)
      return n
    })
  }
  function toggleAllRows() {
    setSelectedRows((prev) => prev.size === draftItems.length ? new Set() : new Set(draftItems.map((_, i) => i)))
  }
  function deleteSelectedRows() {
    if (selectedRows.size === 0) return
    const removed = selectedRows.size
    setDraftItems((prev) => prev.filter((_, i) => !selectedRows.has(i)))
    setSelectedRows(new Set())
    toast.success(`تم حذف ${removed} صنف`)
  }
  function deleteAllRows() {
    if (draftItems.length === 0) return
    if (!confirm(`حذف كل الأصناف (${draftItems.length})؟`)) return
    setDraftItems([])
    setSelectedRows(new Set())
  }

  // Remove rows that repeat an earlier SAP No, keeping the first of each.
  function dedupeBySap() {
    const seen = new Set<string>()
    const next = draftItems.filter((it) => {
      const s = (it.sap_no ?? '').trim()
      if (!s) return true               // rows without SAP are left untouched
      if (seen.has(s)) return false
      seen.add(s); return true
    })
    const removed = draftItems.length - next.length
    if (removed === 0) { toast.info('لا يوجد تكرار في رقم SAP'); return }
    setDraftItems(next)
    setSelectedRows(new Set())
    toast.success(`تم حذف ${removed} صنف مكرر بنفس رقم SAP`)
  }

  // Upload an Excel/CSV file and parse it with a real spreadsheet reader —
  // far more reliable than pasting (reads actual cells, any column order).
  async function handleExcelFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setImportingExcel(true)
    try {
      // 1) ALWAYS upload & save the original file first — this is the main goal,
      //    and it never depends on parsing succeeding.
      let savedFile = false
      const up = await uploadFileDirect(file, 'materials_request')
      if ('error' in up) { toast.error(up.error) }
      else {
        const rec = await saveDocumentRecord(projectId, 'materials_request', up.url, file.name)
        savedFile = !('error' in rec)
      }

      // 2) Best-effort extraction to also fill the editable table (never blocks).
      let imported = 0
      try {
        const XLSX = await import('xlsx')
        const buf = await file.arrayBuffer()
        const wb = XLSX.read(buf, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const grid = (XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, blankrows: false, defval: '' }) ?? [])
          .map((r) => (r ?? []).map((c) => String(c ?? '')))
        const items: MaterialItem[] = []

        // (a) Header-based mapping (maps by column name, any order)
        const isHeaderCell = (v: string) => /sap|sto|desc|qty|quant|status|note|الوصف|الصنف|الكمية|كمية|الحالة|ملاحظ|بيان/i.test(v)
        const headerIdx = grid.findIndex((r) => r.some(isHeaderCell))
        const headers = headerIdx >= 0 ? grid[headerIdx].map((h) => h.trim()) : []
        const find = (re: RegExp) => headers.findIndex((h) => re.test(h))
        const iSap = find(/sap|ساب/i), iDesc = find(/desc|الوصف|الصنف|بيان/i), iQty = find(/qty|quant|الكمية|كمية|العدد/i),
          iSto = find(/sto/i), iStatus = find(/status|الحالة|^حالة/i), iNote = find(/note|ملاحظ/i)
        if (headerIdx >= 0 && (iSap >= 0 || iDesc >= 0)) {
          for (const row of grid.slice(headerIdx + 1)) {
            const cell = (i: number) => (i >= 0 ? (row[i] ?? '').trim() : '')
            const description = cell(iDesc), sap = cell(iSap)
            if (!description && !sap) continue
            const qty = parseFloat(cell(iQty).replace(/[^\d.]/g, ''))
            items.push({ sap_no: sap || undefined, description, quantity: isNaN(qty) ? undefined : qty, sto_no: cell(iSto) || undefined, status: normalizeStatus(cell(iStatus)) || 'قيد المعالجة', notes: cell(iNote) || undefined, attachments: [] })
          }
        }

        // (b) Fallback: anchor on the SAP column (5–8 digit) and map positionally
        if (items.length === 0) {
          let base = -1, firstData = -1
          for (let ri = 0; ri < grid.length; ri++) {
            const idx = grid[ri].findIndex((c) => /^\d{5,8}$/.test(c.trim()))
            if (idx >= 0) { base = idx; firstData = ri; break }
          }
          if (base >= 0) {
            for (let ri = firstData; ri < grid.length; ri++) {
              const c = grid[ri]
              const sap = (c[base] ?? '').trim(), description = (c[base + 1] ?? '').trim()
              if (!sap && !description) continue
              const qty = parseFloat((c[base + 2] ?? '').replace(/[^\d.]/g, ''))
              items.push({ sap_no: sap || undefined, description, quantity: isNaN(qty) ? undefined : qty, sto_no: (c[base + 3] ?? '').trim() || undefined, status: normalizeStatus((c[base + 4] ?? '').trim()) || 'قيد المعالجة', notes: (c[base + 5] ?? '').trim() || undefined, attachments: [] })
            }
          }
        }

        if (items.length) { setDraftItems((prev) => [...prev, ...items]); setEditingItems(true); imported = items.length }
      } catch { /* extraction is best-effort — the file is already saved */ }

      if (savedFile && imported) toast.success(`تم رفع الملف واستيراد ${imported} صنف`)
      else if (savedFile) toast.success('تم رفع الملف وحفظه في «ملفات الطلب» (بدون استخلاص تلقائي)')
      else if (imported) toast.success(`تم استيراد ${imported} صنف`)
      else toast.error('تعذّر رفع الملف')
    } finally {
      setImportingExcel(false)
    }
  }

  function printMaterials() {
    document.body.classList.add('printing-materials')
    const cleanup = () => {
      document.body.classList.remove('printing-materials')
      window.removeEventListener('afterprint', cleanup)
    }
    window.addEventListener('afterprint', cleanup)
    window.print()
  }

  // Bilingual delivery note — generated in a clean print window (AR or EN).
  // Item descriptions stay as entered; only labels/statuses are translated.
  function printDeliveryNote(lang: 'ar' | 'en') {
    const en = lang === 'en'
    const L = en
      ? { title: 'Materials Delivery Note', project: 'Project', client: 'Client', date: 'Date',
          no: '#', sap: 'SAP No.', desc: 'Description', qty: 'Qty', status: 'Status',
          delivered: 'Delivered by', received: 'Received by (Client)', sign: 'Signature', empty: 'No items',
          brand: 'SAMNAN PETROLEUM SERVICES', sub: 'سمنان للخدمات البترولية' }
      : { title: 'مذكرة تسليم مواد', project: 'المشروع', client: 'العميل', date: 'التاريخ',
          no: '#', sap: 'رقم SAP', desc: 'الوصف', qty: 'الكمية', status: 'الحالة',
          delivered: 'المُسلِّم', received: 'المُستلِم (العميل)', sign: 'التوقيع', empty: 'لا توجد أصناف',
          brand: 'سمنان للخدمات البترولية', sub: 'SAMNAN PETROLEUM SERVICES' }
    const statusTxt = (s?: string) => {
      const v = (s || '').trim()
      if (!en) return v || '—'
      return ({ 'مكتمل': 'Completed', 'قيد المعالجة': 'In Process', 'لم يطلب': 'Not Requested' } as Record<string, string>)[v] || (v || '—')
    }
    const today = new Intl.DateTimeFormat(en ? 'en-GB' : 'ar-SA', {
      day: 'numeric', month: 'long', year: 'numeric', numberingSystem: 'latn', timeZone: 'Asia/Riyadh',
    }).format(new Date())
    const rows = draftItems.map((it, i) => `<tr>
      <td>${i + 1}</td><td dir="ltr">${it.sap_no || '—'}</td>
      <td>${(it.description || it.name || '—').replace(/</g, '&lt;')}</td>
      <td dir="ltr">${it.quantity ?? '—'}</td><td>${statusTxt(it.status)}</td></tr>`).join('')
    const html = `<!DOCTYPE html><html dir="${en ? 'ltr' : 'rtl'}" lang="${lang}"><head><meta charset="utf-8">
      <title>${L.title} — ${projectName ?? ''}</title>
      <style>
        ${LETTERHEAD_CSS}
        body{font-family:${en ? 'Arial,sans-serif' : 'Tahoma,Arial,sans-serif'};padding:24px;color:#111}
        h2{color:#1841A0;margin:0 0 4px;text-align:center}
        .meta{color:#555;font-size:12px;margin-bottom:12px;text-align:${en ? 'left' : 'right'}}
        .meta b{color:#111}
        table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px}
        th,td{border:1px solid #ddd;padding:7px 9px;text-align:${en ? 'left' : 'right'};vertical-align:top}
        th{background:#1841A0;color:#fff}
        tr:nth-child(even) td{background:#f7f9fc}
        .sign{display:flex;justify-content:space-between;margin-top:48px;gap:40px}
        .sign div{flex:1;border-top:1px solid #333;padding-top:6px;font-size:12px;color:#333}
      </style></head><body>
      ${letterheadHeaderHtml(window.location.origin)}
      <h2>${L.title}</h2>
      <div class="meta">
        <div><b>${L.project}:</b> ${projectName ?? ''}</div>
        ${clientName ? `<div><b>${L.client}:</b> ${clientName}</div>` : ''}
        <div><b>${L.date}:</b> ${today}</div>
      </div>
      <table><thead><tr><th>${L.no}</th><th>${L.sap}</th><th>${L.desc}</th><th>${L.qty}</th><th>${L.status}</th></tr></thead>
      <tbody>${rows || `<tr><td colspan="5" style="text-align:center;color:#999">${L.empty}</td></tr>`}</tbody></table>
      <div class="sign"><div>${L.delivered} — ${L.sign}</div><div>${L.received} — ${L.sign}</div></div>
      ${letterheadFooterHtml(window.location.origin)}
      </body></html>`
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(html); w.document.close()
    setTimeout(() => w.print(), 300)
  }

  // Paste multiple rows from Excel: TSV (tab between columns, newline between rows).
  // Column order matches the client's sheet: Legal Study · SAP No · Description · Qty · STO No · Item Status · Note · Attachment
  function handlePasteRows(e: React.ClipboardEvent, startIdx: number) {
    const text = e.clipboardData.getData('text/plain')
    if (!text || !/[\t\n]/.test(text)) return  // single value → let default paste happen
    e.preventDefault()
    let rows = parseClipboardTable(text)
    if (rows.length === 0) return
    // Skip an Excel header row if present (works for Arabic or English headers).
    const HEADER_HINT = /legal|study|sap|sto|qty|quant|desc|status|note|attach|الوصف|كمية|الحالة|ملاحظ|الكمية|قانون|مرفق/i
    if (rows.length > 1) {
      const firstJoined = rows[0].join(' ')
      const low = firstJoined.toLowerCase()
      const looksHeader = (low.includes('sap') || low.includes('sto') || HEADER_HINT.test(firstJoined)) && !/\d{3,}/.test(firstJoined)
      if (looksHeader) rows = rows.slice(1)
    }
    // Anchor on the SAP column: the first cell that looks like a SAP code
    // (5–8 digit number; STO codes are ~10 digits and excluded). This makes
    // paste robust to leading columns like "#" / "No" / "Legal Study" that
    // would otherwise shift every field by one (the reported "skipped cells").
    // Then map from that anchor: SAP · Description · Qty · STO · Status · Note.
    let base = -1
    for (const r of rows) {
      const idx = r.findIndex((c) => /^\d{5,8}$/.test((c ?? '').trim()))
      if (idx >= 0) { base = idx; break }
    }
    if (base < 0) {
      const STATUS_WORDS = /^(completed|complete|done|in[\s-]?progress|processing|not[\s-]?requested|pending|مكتمل|قيد|لم\s)/i
      base = STATUS_WORDS.test((rows[0][0] ?? '').trim()) ? 1 : 0
    }
    const parsed: MaterialItem[] = rows.map((c) => {
      const qty = parseFloat((c[base + 2] ?? '').replace(/[^\d.]/g, ''))
      return {
        sap_no: (c[base] ?? '').trim() || undefined,
        description: (c[base + 1] ?? '').trim(),
        quantity: isNaN(qty) ? undefined : qty,
        sto_no: (c[base + 3] ?? '').trim() || undefined,
        status: normalizeStatus((c[base + 4] ?? '').trim()) || 'قيد المعالجة',
        notes: (c[base + 5] ?? '').trim() || undefined,
        attachments: [],
      }
    })
    setDraftItems((prev) => {
      const next = [...prev]
      // Replace the current (target) row with the first pasted row, then insert the rest after it.
      next.splice(startIdx, 1, ...parsed)
      return next
    })
    toast.success(`تم لصق ${parsed.length} صنف من Excel`)
  }

  async function handleRowAttach(idx: number, e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length) return
    setRowUploading(idx)
    const itemName = draftItems[idx]?.description || draftItems[idx]?.sap_no || `صنف ${idx + 1}`
    const added: { url: string; name: string }[] = []
    for (const file of files) {
      const up = await uploadFileDirect(file, `materials/${projectId}`)
      if ('error' in up) { toast.error(up.error); continue }
      added.push({ url: up.url, name: file.name })
      // Also register it in the project's Attachments tab + audit log
      await saveDocumentRecord(projectId, 'other', up.url, `المواد — ${itemName}: ${file.name}`)
    }
    setRowUploading(null)
    if (added.length) {
      setDraftItems((prev) => prev.map((it, i) => i === idx ? { ...it, attachments: [...(it.attachments ?? []), ...added] } : it))
    }
  }

  function handleRequestFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    startTransition(async () => {
      try {
        const upResult = await uploadFileDirect(file, 'materials_request')
        if ('error' in upResult) { toast.error(upResult.error); return }
        const result = await saveDocumentRecord(projectId, 'materials_request', upResult.url, file.name)
        if ('error' in result) toast.error(result.error)
        else toast.success('تم رفع الملف')
      } catch { toast.error('حدث خطأ غير متوقع') }
    })
  }

  function handleDeleteDoc(id: string) {
    if (!confirm('حذف هذا الملف نهائياً؟')) return
    startTransition(async () => {
      try {
        const r = await deleteAttachment(id, projectId)
        if (r && 'error' in r) toast.error(r.error)
        else toast.success('تم حذف الملف')
      } catch { toast.error('حدث خطأ غير متوقع') }
    })
  }

  function handleMarkReady() {
    setReadyDialog(true)
    setReadyFile(null)
  }

  function handleConfirmReady() {
    setUploadingReady(true)
    startTransition(async () => {
      try {
        if (readyFile) {
          const upResult = await uploadFileDirect(readyFile, 'materials_request')
          if ('error' in upResult) { toast.error(upResult.error); setUploadingReady(false); return }
          const saveResult = await saveDocumentRecord(projectId, 'materials_request', upResult.url, `قائمة المواد الجاهزة — ${readyFile.name}`)
          if ('error' in saveResult) { toast.error(saveResult.error); setUploadingReady(false); return }
        }
        const result = await updateMaterialsStatus(projectId, 'ready')
        setUploadingReady(false)
        if (result?.error) toast.error(result.error)
        else { toast.success('تم تحديد المواد كجاهزة'); setReadyDialog(false) }
      } catch { toast.error('حدث خطأ غير متوقع') }
    })
  }

  function handleConfirmDelivery() {
    startTransition(async () => {
      try {
        const result = await updateMaterialsStatus(projectId, 'delivered')
        if (result?.error) toast.error(result.error)
        else toast.success('تم تأكيد الاستلام')
      } catch { toast.error('حدث خطأ غير متوقع') }
    })
  }

  function handleDeliveryNoteUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    setDeliveryNoteUploading(true)
    startTransition(async () => {
      try {
        const upResult = await uploadFileDirect(file, 'delivery_note')
        if ('error' in upResult) { setDeliveryNoteUploading(false); toast.error(upResult.error); return }
        const result = await saveDocumentRecord(projectId, 'delivery_note', upResult.url, file.name)
        setDeliveryNoteUploading(false)
        if ('error' in result) toast.error(result.error)
        else toast.success('تم رفع وصل الاستلام')
      } catch { toast.error('حدث خطأ غير متوقع') }
    })
  }

  function handleCreatePayment() {
    const amount = parseFloat(paymentAmount)
    if (isNaN(amount) || amount <= 0) { toast.error('يرجى إدخال مبلغ صحيح'); return }
    startTransition(async () => {
      try {
        const formData = new FormData()
        formData.set('project_id', projectId)
        formData.set('type', 'materials')
        formData.set('amount', amount.toString())
        const result = await createPayment(formData)
        if (result?.error) toast.error(result.error)
        else { toast.success('تم إنشاء دفعة المواد في تاب الدفعات'); setPaymentDialog(false) }
      } catch { toast.error('حدث خطأ غير متوقع') }
    })
  }

  const hasContent = requestDocs.length > 0 || items.length > 0

  // Delivery locked until at least partial payment received (on any materials payment)
  const isDeliveryLocked = !materialsHasCollection

  return (
    <div className="space-y-5">

      {/* ── Sub-tabs: manage vs. client-facing status ── */}
      <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1">
        <button
          onClick={() => setView('manage')}
          className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${view === 'manage' ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          إدارة المواد
        </button>
        <button
          onClick={() => setView('status')}
          className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${view === 'status' ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          حالة المواد
        </button>
      </div>

      {view === 'status' ? (
        <MaterialsStatusView items={draftItems} projectName={projectName ?? ''} clientName={clientName} />
      ) : (
      <>
      {/* ── Materials completion — first thing in the section ── */}
      <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="flex items-center gap-2 text-sm font-bold text-gray-800">
            <Package className="h-4 w-4 text-amber-600" />
            نسبة إنجاز المواد
          </span>
          <span className="text-2xl font-extrabold text-amber-700">{materialsPct}%</span>
        </div>
        <div className="h-3 w-full rounded-full bg-white overflow-hidden border border-amber-100">
          <div className="h-full rounded-full bg-amber-500 transition-all duration-500" style={{ width: `${materialsPct}%` }} />
        </div>
        <p className="text-xs text-gray-500 mt-1.5">
          {draftItems.length > 0
            ? `${completedItemsCount} من ${draftItems.length} أصناف مكتملة`
            : material ? `الحالة: ${MAT_STATUS_LABEL[status] ?? status}` : 'لم تُدخَل مواد بعد'}
        </p>
      </div>

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
            <Package className="h-4 w-4 text-amber-700" />
          </div>
          <h3 className="text-base font-semibold text-gray-900">المواد</h3>
          {material && <StatusChip status={status} />}
        </div>
      </div>

      {/* ── Materials stepper — the journey, right to left ── */}
      <div className="flex items-start w-full overflow-x-auto sm:overflow-visible pb-1">
        {MAT_STEPS.map((s, idx) => {
          const isLast = idx === MAT_STEPS.length - 1
          return (
            <div key={s.n} className={`flex items-start shrink-0 ${isLast ? '' : 'sm:flex-1 sm:shrink'}`}>
              <MatStep
                step={s}
                done={stepDone[s.n]}
                current={currentStep === s.n}
                selected={selectedStep === s.n}
                onClick={() => setSelectedStep(s.n)}
              />
              {!isLast && (
                <div className={`h-0.5 w-6 sm:w-auto sm:flex-1 mt-[19px] mx-1 rounded shrink-0 sm:shrink ${
                  stepDone[s.n] ? 'bg-emerald-400' : 'bg-gray-200'
                }`} />
              )}
            </div>
          )
        })}
      </div>

      {/* View-only notice for non-managers */}
      {!canManage && (
        <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <Package className="h-5 w-5 text-gray-400 shrink-0" />
          <p className="text-sm text-gray-500">هذا القسم للعرض فقط — إدارة المواد متاحة للكوردنيتر والإدارة</p>
        </div>
      )}

      {/* Delivery lock notice — shown only in ready state without payment */}
      {isReady && isDeliveryLocked && canManage && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <Package className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">في انتظار تسديد دفعة المواد</p>
            <p className="text-xs text-amber-600 mt-0.5">
              {hasMaterialsPayment
                ? 'تم إنشاء الدفعة — المواد لن تُسلَّم حتى يسدد العميل ولو جزءاً منها'
                : 'أضف دفعة المواد للدفعات ثم سجّل استلامها للسماح بالتسليم'}
            </p>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          STEP 1 — طلب المواد
      ══════════════════════════════════════════════ */}
      {selectedStep === 1 && (
        <div className="rounded-2xl border border-gray-100 bg-gray-50/40 p-5 space-y-4">
          <StepLabel number={1} done={hasContent} label="طلب المواد" />

          {/* PDF upload */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">ملفات الطلب</p>
              {canManage && !isReady && (
                <label className="cursor-pointer">
                  <UploadChip loading={isPending && !readyDialog} label="رفع ملف" />
                  <input type="file" accept=".pdf,image/*,application/pdf,.xlsx,.xls,.csv" className="hidden"
                    disabled={isPending} onChange={handleRequestFileUpload} />
                </label>
              )}
            </div>
            {requestDocs.map((d) => <DocRow key={d.id} doc={d} onDelete={canManage ? handleDeleteDoc : undefined} />)}
            {requestDocs.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-2">لا توجد ملفات مرفوعة</p>
            )}
          </div>

          {/* Items list — always editable when canManage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">قائمة المواد يدوياً</p>
              <div className="flex items-center gap-3">
                {!editingItems && draftItems.length > 0 && (
                  <button onClick={printMaterials}
                    className="text-xs text-gray-500 hover:text-brand-700 font-medium flex items-center gap-1">
                    <Printer className="h-3.5 w-3.5" />
                    طباعة
                  </button>
                )}
                {canManage && !editingItems && (
                  <button onClick={() => { if (draftItems.length === 0) setDraftItems([{ sap_no: '', description: '', quantity: undefined, sto_no: '', status: 'قيد المعالجة', notes: '', attachments: [] }]); setEditingItems(true) }}
                    className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
                    <Plus className="h-3 w-3" />
                    {draftItems.length > 0 ? 'تعديل' : 'إضافة مواد'}
                  </button>
                )}
              </div>
            </div>

            {editingItems ? (
              <div className="space-y-3 rounded-xl border border-brand-100 bg-white p-4">
                {draftItems.length > 0 ? (
                  <div className="overflow-x-auto rounded-lg border border-gray-100">
                    <table className="w-full text-sm whitespace-nowrap">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                          <th className="px-2 py-2 w-8 text-center">
                            <input type="checkbox" className="h-4 w-4 accent-brand-600 align-middle"
                              checked={draftItems.length > 0 && selectedRows.size === draftItems.length}
                              onChange={toggleAllRows} title="تحديد الكل" />
                          </th>
                          <th className="px-2 py-2 text-start font-medium" dir="ltr">SAP No</th>
                          <th className="px-2 py-2 text-start font-medium">الوصف *</th>
                          <th className="px-2 py-2 text-start font-medium">الكمية</th>
                          <th className="px-2 py-2 text-start font-medium" dir="ltr">STO No</th>
                          <th className="px-2 py-2 text-start font-medium">حالة الصنف</th>
                          <th className="px-2 py-2 text-start font-medium">ملاحظات</th>
                          <th className="px-2 py-2 text-start font-medium">مرفقات</th>
                          <th className="px-2 py-2" />
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-50">
                        {draftItems.map((item, i) => (
                          <tr key={i} className={selectedRows.has(i) ? 'bg-brand-50/40' : ''}>
                            <td className="px-2 py-1.5 text-center">
                              <input type="checkbox" className="h-4 w-4 accent-brand-600 align-middle"
                                checked={selectedRows.has(i)} onChange={() => toggleRow(i)} />
                            </td>
                            <td className="px-2 py-1.5 w-28">
                              <Input className="h-9" dir="ltr" placeholder="SAP" value={item.sap_no ?? ''}
                                onPaste={(e) => handlePasteRows(e, i)}
                                onChange={(e) => updateDraftItem(i, { sap_no: e.target.value })} />
                            </td>
                            <td className="px-2 py-1.5 min-w-[180px]">
                              <Input className="h-9" placeholder="الوصف" value={item.description ?? item.name ?? ''}
                                onPaste={(e) => handlePasteRows(e, i)}
                                onChange={(e) => updateDraftItem(i, { description: e.target.value })} />
                            </td>
                            <td className="px-2 py-1.5 w-20">
                              <Input className="h-9" type="number" min="0" step="0.01" placeholder="0" dir="ltr"
                                value={item.quantity ?? ''}
                                onPaste={(e) => handlePasteRows(e, i)}
                                onChange={(e) => updateDraftItem(i, { quantity: e.target.value === '' ? undefined : parseFloat(e.target.value) })} />
                            </td>
                            <td className="px-2 py-1.5 w-28">
                              <Input className="h-9" dir="ltr" placeholder="STO" value={item.sto_no ?? ''}
                                onPaste={(e) => handlePasteRows(e, i)}
                                onChange={(e) => updateDraftItem(i, { sto_no: e.target.value })} />
                            </td>
                            <td className="px-2 py-1.5 w-36">
                              <select
                                value={item.status ?? 'قيد المعالجة'}
                                onChange={(e) => updateDraftItem(i, { status: e.target.value })}
                                className="h-9 w-full rounded-lg border border-gray-200 bg-white px-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/15"
                              >
                                {MATERIAL_ITEM_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                                {item.status && !MATERIAL_ITEM_STATUSES.includes(item.status as typeof MATERIAL_ITEM_STATUSES[number]) && (
                                  <option value={item.status}>{item.status}</option>
                                )}
                              </select>
                            </td>
                            <td className="px-2 py-1.5 min-w-[140px]">
                              <Input className="h-9" placeholder="اختياري" value={item.notes ?? ''}
                                onChange={(e) => updateDraftItem(i, { notes: e.target.value })} />
                            </td>
                            <td className="px-2 py-1.5 min-w-[120px]">
                              <div className="flex flex-wrap items-center gap-1">
                                {(item.attachments ?? []).map((a, j) => (
                                  <span key={j} className="inline-flex items-center gap-0.5 rounded border border-brand-100 bg-brand-50 px-1.5 py-0.5 text-[11px] text-brand-700">
                                    <a href={a.url} target="_blank" rel="noreferrer" className="hover:underline">{j + 1}</a>
                                    <button onClick={() => updateDraftItem(i, { attachments: (item.attachments ?? []).filter((_, k) => k !== j) })} className="text-brand-400 hover:text-red-500">
                                      <X className="h-2.5 w-2.5" />
                                    </button>
                                  </span>
                                ))}
                                <label className="cursor-pointer inline-flex items-center gap-1 rounded-md border border-gray-200 px-1.5 py-0.5 text-[11px] text-gray-500 hover:border-brand-300 hover:text-brand-600">
                                  {rowUploading === i ? <Clock className="h-3 w-3 animate-spin" /> : <Paperclip className="h-3 w-3" />}
                                  <input type="file" multiple accept="image/*,application/pdf" className="hidden"
                                    disabled={rowUploading !== null} onChange={(e) => handleRowAttach(i, e)} />
                                </label>
                              </div>
                            </td>
                            <td className="px-2 py-1.5">
                              <button onClick={() => handleRemoveItem(i)} className="text-red-400 hover:text-red-600" title="حذف الصنف">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 text-center py-3">اضغط «إضافة صنف» للإدخال اليدوي، أو الصق صفوف Excel</p>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={handleAddItem} className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    إضافة صنف
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => excelInputRef.current?.click()}
                    disabled={importingExcel} className="gap-1.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50">
                    {importingExcel ? <Clock className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    رفع ملف Excel
                  </Button>
                  <input ref={excelInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleExcelFile} />
                  {sapDupCount > 0 && (
                    <Button type="button" size="sm" variant="outline" onClick={dedupeBySap}
                      className="gap-1.5 text-amber-700 border-amber-200 hover:bg-amber-50">
                      <Trash2 className="h-3.5 w-3.5" />
                      حذف المكرر بنفس SAP ({sapDupCount})
                    </Button>
                  )}
                  {selectedRows.size > 0 && (
                    <Button type="button" size="sm" variant="outline" onClick={deleteSelectedRows}
                      className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50">
                      <Trash2 className="h-3.5 w-3.5" />
                      حذف المحدد ({selectedRows.size})
                    </Button>
                  )}
                  {draftItems.length > 0 && (
                    <Button type="button" size="sm" variant="outline" onClick={deleteAllRows}
                      className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50">
                      <Trash2 className="h-3.5 w-3.5" />
                      حذف الكل
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2 border-t border-gray-100 pt-3">
                  <Button size="sm" loading={isPending} onClick={handleSaveItems} className="gap-1.5">
                    <Save className="h-3.5 w-3.5" />
                    حفظ القائمة
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setDraftItems(material?.items ?? []); setEditingItems(false) }}>إلغاء</Button>
                </div>
              </div>
            ) : (
              <div id="materials-print">
                <PrintHeader title="قائمة المواد" />
                <ItemsTable items={draftItems} />
              </div>
            )}

            {!editingItems && draftItems.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-1">لم تُدخَل مواد يدوياً</p>
            )}
          </div>

          {/* Create / view materials payment */}
          {canManage && draftItems.length > 0 && (
            <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3 mt-1">
              <div className="flex items-center gap-2">
                {itemsTotal > 0 ? (
                  <span className="text-sm text-gray-700">
                    إجمالي المواد: <strong className="text-brand-700">{itemsTotal.toLocaleString('en')} ر.س</strong>
                  </span>
                ) : (
                  <span className="text-sm text-gray-400">لم تُحدَّد أسعار للمواد</span>
                )}
              </div>
              {hasMaterialsPayment ? (
                <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1">
                  تم إنشاء الدفعة ✓
                </span>
              ) : (
                <Button size="sm" variant="outline"
                  onClick={() => { setPaymentAmount(itemsTotal > 0 ? itemsTotal.toString() : ''); setPaymentDialog(true) }}>
                  إضافة للدفعات
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════
          STEP 2 — المواد جاهزة
      ══════════════════════════════════════════════ */}
      {selectedStep === 2 && (
        isReady || isDelivered ? (
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <p className="text-sm font-semibold text-emerald-800">المواد محدَّدة كجاهزة للتوريد ✓</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-100 bg-amber-50/30 p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-gray-800">المواد جاهزة للتوريد؟</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {hasAnyContent
                  ? 'بعد التحديد تظهر مذكرة التسليم للطباعة.'
                  : 'لم تُدخَل مواد بعد — يمكنك التحديد على أي حال أو إضافة الأصناف من خطوة «طلب المواد».'}
              </p>
            </div>
            {canManage && (
              <Button size="sm" onClick={handleMarkReady} className="shrink-0">تحديد كجاهزة</Button>
            )}
          </div>
        )
      )}

      {/* ══════════════════════════════════════════════
          STEP 3 — مذكرة التسليم + التوريد
      ══════════════════════════════════════════════ */}
      {selectedStep === 3 && (
        <div className="space-y-4">

          {/* ── Invoice card ── */}
          {draftItems.length > 0 && (
            <div className="rounded-2xl border border-brand-200 bg-white p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100">
                    <FileText className="h-4 w-4 text-brand-700" />
                  </div>
                  <h4 className="text-sm font-bold text-gray-900">مذكرة تسليم مواد</h4>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => printDeliveryNote('ar')} title="طباعة عربي">
                    <Printer className="h-3.5 w-3.5" /> عربي
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => printDeliveryNote('en')} title="Print English">
                    <Printer className="h-3.5 w-3.5" /> EN
                  </Button>
                  {hasMaterialsPayment ? (
                    <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1">
                      تم إنشاء الدفعة ✓
                    </span>
                  ) : canManage ? (
                    <Button size="sm"
                      onClick={() => { setPaymentAmount(itemsTotal > 0 ? itemsTotal.toString() : ''); setPaymentDialog(true) }}>
                      إضافة للدفعات
                    </Button>
                  ) : null}
                </div>
              </div>

              <ItemsTable items={draftItems} />

              {itemsTotal > 0 && (
                <div className="flex items-center justify-between rounded-xl bg-brand-50 border border-brand-100 px-4 py-3">
                  <span className="text-sm font-semibold text-brand-800">الإجمالي</span>
                  <span className="text-lg font-bold text-brand-700">{itemsTotal.toLocaleString('en')} ر.س</span>
                </div>
              )}
            </div>
          )}

          {/* ── Request docs ── */}
          {requestDocs.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">مستندات الطلب</p>
              {requestDocs.map((d) => <DocRow key={d.id} doc={d} onDelete={canManage ? handleDeleteDoc : undefined} />)}
            </div>
          )}

          {/* ── Delivery action ── */}
          {canManage && (
            <div className="flex items-center justify-between rounded-xl border bg-white p-4 gap-3"
              style={{ borderColor: isDeliveryLocked ? '#fde68a' : '#bfdbfe' }}>
              <div>
                <p className="text-sm font-semibold text-gray-800">تأكيد استلام المواد</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {isDeliveryLocked
                    ? 'مقفول — يجب تسديد ولو جزء من دفعة المواد أولاً'
                    : 'بعد التأكيد ارفع وصل الاستلام الموقّع من العميل'}
                </p>
              </div>
              <Button size="sm" loading={isPending}
                onClick={isDeliveryLocked ? undefined : handleConfirmDelivery}
                disabled={isDeliveryLocked}
                className={`shrink-0 ${isDeliveryLocked ? '' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
                <Truck className="h-3.5 w-3.5" />
                {isDeliveryLocked ? 'مقفول' : 'استلمنا المواد'}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════
          STEP 4 — تم الاستلام
      ══════════════════════════════════════════════ */}
      {selectedStep === 4 && (
        <div className="space-y-4">
          {isDelivered ? (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">تم استلام المواد بنجاح</p>
                {material?.ready_at && (
                  <p className="text-xs text-emerald-600 mt-0.5">بتاريخ: {formatDate(material.ready_at)}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-100 bg-amber-50/40 px-5 py-4">
              <div className="flex items-center gap-3">
                <Truck className="h-5 w-5 text-amber-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">لم يُؤكَّد الاستلام بعد</p>
                  <p className="text-xs text-gray-500 mt-0.5">يمكنك رفع وصل الاستلام هنا في أي وقت، أو تأكيد الاستلام من خطوة «التوريد».</p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="shrink-0" onClick={() => setSelectedStep(3)}>خطوة التوريد</Button>
            </div>
          )}

          {requestDocs.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">مستندات الطلب</p>
              {requestDocs.map((d) => <DocRow key={d.id} doc={d} onDelete={canManage ? handleDeleteDoc : undefined} />)}
            </div>
          )}

          {draftItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">قائمة المواد</p>
              <ItemsTable items={draftItems} />
            </div>
          )}

          <div className="rounded-2xl border border-gray-100 bg-white p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-800">وصل الاستلام (موقّع من العميل)</p>
              {canManage && (
                <label className="cursor-pointer">
                  <UploadChip loading={deliveryNoteUploading} label="رفع الوصل" />
                  <input type="file" accept=".pdf,image/*,application/pdf" className="hidden"
                    disabled={isPending} onChange={handleDeliveryNoteUpload} />
                </label>
              )}
            </div>
            {deliveryDocs.length > 0
              ? deliveryDocs.map((d) => <DocRow key={d.id} doc={d} onDelete={canManage ? handleDeleteDoc : undefined} />)
              : <p className="text-xs text-gray-400 text-center py-2">لم يُرفع وصل الاستلام بعد</p>
            }
          </div>
        </div>
      )}

      {/* ── Mark Ready dialog ── */}
      <Dialog open={readyDialog} onClose={() => setReadyDialog(false)}>
        <DialogHeader>
          <DialogTitle>تحديد المواد كجاهزة</DialogTitle>
          <DialogClose onClose={() => setReadyDialog(false)} />
        </DialogHeader>
        <DialogContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              يمكنك إرفاق مستند قائمة المواد الجاهزة قبل التأكيد (اختياري).
            </p>
            <div className="space-y-1.5">
              <Label>قائمة المواد الجاهزة (اختياري)</Label>
              {readyFile ? (
                <div className="flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 p-3">
                  <FileText className="h-5 w-5 text-brand-600 shrink-0" />
                  <span className="flex-1 text-sm font-medium text-gray-900 truncate">{readyFile.name}</span>
                  <button type="button" onClick={() => setReadyFile(null)} className="text-gray-400 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 py-5 text-center cursor-pointer hover:border-brand-300 hover:bg-brand-50/30 transition-colors">
                  <Upload className="h-5 w-5 text-gray-400" />
                  <p className="text-sm text-gray-500">اضغط لاختيار ملف</p>
                  <input type="file" accept=".pdf,image/*,application/pdf" className="hidden"
                    onChange={(e) => setReadyFile(e.target.files?.[0] ?? null)} />
                </label>
              )}
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setReadyDialog(false)}>إلغاء</Button>
          <Button loading={isPending || uploadingReady} onClick={handleConfirmReady}>
            <CheckCircle2 className="h-4 w-4" />
            تأكيد — المواد جاهزة
          </Button>
        </DialogFooter>
      </Dialog>

      {/* ── Create Materials Payment dialog ── */}
      <Dialog open={paymentDialog} onClose={() => setPaymentDialog(false)}>
        <DialogHeader>
          <DialogTitle>إنشاء دفعة مواد</DialogTitle>
          <DialogClose onClose={() => setPaymentDialog(false)} />

        </DialogHeader>
        <DialogContent>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">سيتم إنشاء دفعة مواد في تاب الدفعات. يمكن تعديل المبلغ قبل الإنشاء.</p>
            {itemsTotal > 0 && (
              <div className="rounded-xl bg-brand-50 border border-brand-100 p-3 text-sm text-brand-700">
                إجمالي المواد المحسوب: <strong>{itemsTotal.toLocaleString('en')} ر.س</strong>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="mat_payment_amount">مبلغ الدفعة (ريال)</Label>
              <Input id="mat_payment_amount" type="number" min="1" step="0.01"
                value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder="0.00" />
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setPaymentDialog(false)}>إلغاء</Button>
          <Button loading={isPending} onClick={handleCreatePayment}>إنشاء الدفعة</Button>
        </DialogFooter>
      </Dialog>
      </>
      )}
    </div>
  )
}

// ── Helper sub-components ──

function StepLabel({ number, done, label }: { number: number; done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold shrink-0 ${done ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
        {done ? '✓' : number}
      </span>
      <p className="text-sm font-semibold text-gray-800">{label}</p>
    </div>
  )
}

function UploadChip({ loading, label }: { loading: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-brand-300 hover:text-brand-700 transition-colors shadow-sm cursor-pointer">
      {loading ? <Clock className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
      {label}
    </span>
  )
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: 'قيد الانتظار', cls: 'bg-gray-100 text-gray-600' },
    preparing: { label: 'قيد التجهيز', cls: 'bg-amber-100 text-amber-700' },
    ready: { label: 'جاهزة للتسليم', cls: 'bg-blue-100 text-blue-700' },
    delivered: { label: 'تم الاستلام', cls: 'bg-emerald-100 text-emerald-700' },
    partial: { label: 'استلام جزئي', cls: 'bg-orange-100 text-orange-700' },
  }
  const { label, cls } = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' }
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>
}
