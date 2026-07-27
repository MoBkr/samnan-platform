'use client'

import { useState, useTransition, useRef } from 'react'
import { toast } from 'sonner'
import {
  Package, Upload, FileText, CheckCircle2, Truck, Plus, Trash2, Save, Clock, Paperclip, X, Printer, ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogHeader, DialogTitle, DialogClose, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { saveDocumentRecord, deleteAttachment } from '@/lib/actions/attachments'
import { updateMaterialsStatus, updateMaterialsItems } from '@/lib/actions/materials'
import { createPayment } from '@/lib/actions/payments'
import { uploadFileDirect } from '@/lib/upload-client'
import { PrintHeader } from '@/components/shared/print-header'
import { LETTERHEAD_CSS, letterheadOpenHtml, letterheadCloseHtml } from '@/lib/print-letterhead'
import { MaterialsStatusView } from '@/components/projects/materials-status-view'
import { parseWorkbook, applyMapping, FIELD_LABELS, type SheetParse, type ColumnField } from '@/lib/excel-materials'
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

// Columns mirror the client's SAP export:
// Purchasing Document · Material · Short Text · Order Quantity · Order Unit (+ مرفقات)
function ItemsTable({ items }: { items: MaterialItem[] }) {
  if (items.length === 0) return null
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100">
      <table className="w-full text-sm whitespace-nowrap">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
            <th className="px-3 py-2.5 text-start font-medium">#</th>
            <th className="px-3 py-2.5 text-start font-medium" dir="ltr">Purchasing Document</th>
            <th className="px-3 py-2.5 text-start font-medium" dir="ltr">Material</th>
            <th className="px-3 py-2.5 text-start font-medium">Short Text (الوصف)</th>
            <th className="px-3 py-2.5 text-start font-medium">الكمية</th>
            <th className="px-3 py-2.5 text-start font-medium">الوحدة</th>
            <th className="px-3 py-2.5 text-start font-medium">مرفقات</th>
            {/* Hand-check column — print only */}
            <th className="hidden print:table-cell px-3 py-2.5 text-center font-medium" dir="ltr">MARK ✓</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-50">
          {items.map((item, i) => (
            <tr key={i}>
              <td className="px-3 py-2.5 text-gray-400">{i + 1}</td>
              <td className="px-3 py-2.5 text-gray-700" dir="ltr">{item.sto_no || '—'}</td>
              <td className="px-3 py-2.5 text-gray-700" dir="ltr">{item.sap_no || '—'}</td>
              <td className="px-3 py-2.5 font-medium text-gray-900 whitespace-normal">{item.description || item.name || '—'}</td>
              <td className="px-3 py-2.5 text-gray-700">{item.quantity ?? '—'}</td>
              <td className="px-3 py-2.5 text-gray-700" dir="ltr">{item.unit || '—'}</td>
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
              <td className="hidden print:table-cell w-16" />
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

  // Materials completion — derived from the workflow stage (per-item statuses
  // were removed with the SAP column layout, per client decision).
  const materialsPct = material ? (MAT_STATUS_PCT[status] ?? 0) : 0

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
  // Excel import review — nothing enters the table until the user confirms here
  const [excelPreview, setExcelPreview] = useState<null | {
    fileName: string
    primary: SheetParse
    extraItems: MaterialItem[]
    extraSummary: string[]
    includeUnparsed: boolean
  }>(null)
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const excelInputRef = useRef<HTMLInputElement>(null)

  function rowEmpty(it: MaterialItem) {
    return !(it.description?.trim() || it.name?.trim() || it.sap_no?.trim() || it.sto_no?.trim() || it.unit?.trim() || it.quantity)
  }

  function handleSaveItems() {
    // Drop fully-empty rows; keep anything with at least a description / Material / qty.
    const cleaned = draftItems
      .map((it) => ({
        ...it,
        sap_no: it.sap_no?.trim() || undefined,
        description: (it.description ?? it.name ?? '').trim(),
        sto_no: it.sto_no?.trim() || undefined,
        unit: it.unit?.trim() || undefined,
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
    setDraftItems((prev) => [...prev, { sto_no: '', sap_no: '', description: '', quantity: undefined, unit: '', attachments: [] }])
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

      // 2) Parse the workbook (template flow — the adopted approach) and open
      //    the review dialog; nothing imports silently.
      try {
        const XLSX = await import('xlsx')
        const buf = await file.arrayBuffer()
        const parsed = parseWorkbook(XLSX, buf)

        if (parsed.primary) {
          setExcelPreview({ fileName: file.name, ...parsed, primary: parsed.primary, includeUnparsed: true })
        } else if (savedFile) {
          toast.success('تم رفع الملف وحفظه في «ملفات الطلب» — لم يُعثر على بيانات قابلة للاستخلاص')
        }
      } catch (err) {
        console.error('[materials extract]', err)
        if (savedFile) toast.success('تم رفع الملف وحفظه في «ملفات الطلب» (تعذّر الاستخلاص التلقائي)')
        else toast.error('تعذّر قراءة الملف')
      }
      if (!savedFile) toast.error('تعذّر حفظ الملف — راجع الاتصال وحاول مجدداً')
    } finally {
      setImportingExcel(false)
      }
  }

  // Confirm from the review dialog → append to the editable table
  function confirmExcelImport() {
    if (!excelPreview) return
    const { items, unparsed } = applyMapping(
      excelPreview.primary.grid, excelPreview.primary.headerRow, excelPreview.primary.mapping,
    )
    const extra: MaterialItem[] = excelPreview.includeUnparsed
      ? unparsed.map((u) => ({ description: u.text, attachments: [] }))
      : []
    const all = [...items, ...extra, ...excelPreview.extraItems]
    if (all.length === 0) { toast.error('لا توجد أصناف للاستيراد بالإعدادات الحالية'); return }
    setDraftItems((prev) => [...prev, ...all])
    setEditingItems(true)
    setExcelPreview(null)
    toast.success(`تم استيراد ${all.length} صنف — راجع الجدول ثم احفظ`)
  }

  // Download a ready-made template matching the platform's columns
  async function downloadExcelTemplate() {
    const XLSX = await import('xlsx')
    const rows = [
      ['Purchasing Document', 'Material', 'Short Text', 'Order Quantity', 'Order Unit'],
      ['9200043607', '7003027', 'EVO with DISPLAY, PRINTER', 2, 'EA'],
      ['9200043607', '5000674', 'مثال عربي — احذف هذا الصف', 4, 'EA'],
    ]
    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!cols'] = [{ wch: 18 }, { wch: 12 }, { wch: 44 }, { wch: 14 }, { wch: 10 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Materials')
    XLSX.writeFile(wb, 'قالب-مواد-سمنان.xlsx')
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

  // Bilingual delivery note — matches the company's official format:
  // No. · SAP · Description · Qty · Unit · MARK (hand-check box), then the
  // project band and the receiver signature box (DATE/NAME/ID/MOBILE/SIGN.).
  function printDeliveryNote(lang: 'ar' | 'en') {
    const en = lang === 'en'
    const L = en
      ? { title: 'Materials Delivery Note', project: 'Project', client: 'Client', date: 'Date',
          no: 'No.', sap: 'SAP', desc: 'DESCRIPTION', qty: 'QTY.', unit: 'UNIT', mark: 'MARK',
          empty: 'No items',
          boxDate: 'DATE:', boxName: 'NAME:', boxId: 'ID No.:', boxMobile: 'MOBILE:', boxSign: 'SIGN.:' }
      : { title: 'مذكرة تسليم مواد', project: 'المشروع', client: 'العميل', date: 'التاريخ',
          no: 'م', sap: 'SAP', desc: 'الوصف', qty: 'الكمية', unit: 'الوحدة', mark: 'MARK ✓',
          empty: 'لا توجد أصناف',
          boxDate: 'التاريخ:', boxName: 'الاسم:', boxId: 'رقم الهوية:', boxMobile: 'الجوال:', boxSign: 'التوقيع:' }
    const today = new Intl.DateTimeFormat(en ? 'en-GB' : 'ar-SA', {
      day: 'numeric', month: 'long', year: 'numeric', numberingSystem: 'latn', timeZone: 'Asia/Riyadh',
    }).format(new Date())
    const rows = draftItems.map((it, i) => `<tr>
      <td>${i + 1}</td><td dir="ltr">${it.sap_no || '—'}</td>
      <td>${(it.description || it.name || '—').replace(/</g, '&lt;')}</td>
      <td dir="ltr">${it.quantity ?? '—'}</td><td dir="ltr">${it.unit || '—'}</td>
      <td class="mark"></td></tr>`).join('')
    const html = `<!DOCTYPE html><html dir="${en ? 'ltr' : 'rtl'}" lang="${lang}"><head><meta charset="utf-8">
      <title>${L.title} — ${projectName ?? ''}</title>
      <style>
        ${LETTERHEAD_CSS}
        body{font-family:${en ? 'Arial,sans-serif' : 'Tahoma,Arial,sans-serif'};color:#111}
        .doc-title{border:1.5px solid #111;padding:8px 12px;text-align:center;font-weight:800;font-style:italic;
          font-size:16px;margin-bottom:14px}
        .meta{color:#555;font-size:12px;margin-bottom:12px;text-align:${en ? 'left' : 'right'}}
        .meta b{color:#111}
        table.items{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px}
        table.items th,table.items td{border:1px solid #64748b;padding:8px 10px;text-align:${en ? 'left' : 'right'};vertical-align:top}
        table.items th{background:#c9d6e8;color:#111;font-style:italic;font-weight:800;text-align:center}
        table.items td.mark{width:70px}
        /* Project band + receiver signature box — like the official sheet */
        .band{border:1.5px solid #111;text-align:center;font-weight:700;font-size:13px;padding:6px;margin-top:28px}
        table.signbox{border-collapse:collapse;font-size:12px;margin-top:10px;width:60%;max-width:340px}
        table.signbox td{border:1.5px solid #111;padding:8px 10px}
        table.signbox td.l{font-weight:800;width:90px;background:#fff}
        table.signbox td.v{border-bottom:1.5px dotted #333;min-width:200px;color:#999}
      </style></head><body>
      ${letterheadOpenHtml(window.location.origin)}
      <div class="doc-title">${L.title} — ${(projectName ?? '').replace(/</g, '&lt;')}</div>
      <div class="meta">
        ${clientName ? `<div><b>${L.client}:</b> ${clientName}</div>` : ''}
        <div><b>${L.date}:</b> ${today}</div>
      </div>
      <table class="items"><thead><tr><th>${L.no}</th><th>${L.sap}</th><th>${L.desc}</th><th>${L.qty}</th><th>${L.unit}</th><th>${L.mark}</th></tr></thead>
      <tbody>${rows || `<tr><td colspan="6" style="text-align:center;color:#999">${L.empty}</td></tr>`}</tbody></table>
      <div class="band">${(projectName ?? '').replace(/</g, '&lt;')}</div>
      <table class="signbox">
        <tr><td class="l">${L.boxDate}</td><td class="v">&nbsp;</td></tr>
        <tr><td class="l">${L.boxName}</td><td class="v">&nbsp;</td></tr>
        <tr><td class="l">${L.boxId}</td><td class="v">&nbsp;</td></tr>
        <tr><td class="l">${L.boxMobile}</td><td class="v">&nbsp;</td></tr>
        <tr><td class="l">${L.boxSign}</td><td class="v">&nbsp;</td></tr>
      </table>
      ${letterheadCloseHtml()}
      </body></html>`
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(html); w.document.close()
    setTimeout(() => w.print(), 300)
  }

  // Paste multiple rows from Excel: TSV (tab between columns, newline between rows).
  // Column order matches the client's SAP export:
  // Purchasing Document · Material · Short Text · Order Quantity · Order Unit
  function handlePasteRows(e: React.ClipboardEvent, startIdx: number) {
    const text = e.clipboardData.getData('text/plain')
    if (!text || !/[\t\n]/.test(text)) return  // single value → let default paste happen
    e.preventDefault()
    let rows = parseClipboardTable(text)
    if (rows.length === 0) return
    // Skip an Excel header row if present (works for Arabic or English headers).
    const HEADER_HINT = /purchas|material|short|text|unit|sap|sto|qty|quant|desc|الوصف|كمية|الكمية|الوحدة|مستند|مرفق/i
    if (rows.length > 1) {
      const firstJoined = rows[0].join(' ')
      const looksHeader = HEADER_HINT.test(firstJoined) && !/\d{3,}/.test(firstJoined)
      if (looksHeader) rows = rows.slice(1)
    }
    // Anchor on the Material column (5–8 digit code; Purchasing Documents are
    // ~10 digits and excluded), so leading columns never shift the fields.
    // Then map: Material · Short Text · Qty · Unit, with the Purchasing
    // Document picked up from any 9–11 digit cell before the anchor.
    let base = -1
    for (const r of rows) {
      const idx = r.findIndex((c) => /^\d{5,8}$/.test((c ?? '').trim()))
      if (idx >= 0) { base = idx; break }
    }
    if (base < 0) base = 1   // assume [doc, material, ...] layout
    const parsed: MaterialItem[] = rows
      .map((c) => {
        const qty = parseFloat((c[base + 2] ?? '').replace(/,/g, '').replace(/[^\d.]/g, ''))
        const docCell = c.slice(0, base).find((x) => /^\d{9,11}$/.test((x ?? '').trim()))
        return {
          sto_no: (docCell ?? '').trim() || undefined,
          sap_no: (c[base] ?? '').trim() || undefined,
          description: (c[base + 1] ?? '').trim(),
          quantity: isNaN(qty) ? undefined : qty,
          unit: (c[base + 3] ?? '').trim() || undefined,
          attachments: [],
        }
      })
      .filter((it) => it.sap_no || it.description)
    if (parsed.length === 0) { toast.error('لم يتم التعرف على أصناف في المحتوى الملصوق'); return }
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

  // Undo a step done by mistake — drops the status back one stage.
  function handleRevertStatus(to: 'pending' | 'ready', label: string) {
    if (!confirm(`تراجع: ${label} — هل أنت متأكد؟`)) return
    startTransition(async () => {
      try {
        const result = await updateMaterialsStatus(projectId, to)
        if (result?.error) toast.error(result.error)
        else toast.success('تم التراجع')
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

  // Client decision (2026-07-20): delivery may be confirmed BEFORE any materials
  // payment — the old payment gate was removed on request ("نسلم قبل ما ندفع").
  const hasContent = requestDocs.length > 0 || items.length > 0

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
        <MaterialsStatusView items={draftItems} projectName={projectName ?? ''} clientName={clientName} overallStatus={material?.status ?? null} />
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
          {material
            ? `الحالة: ${MAT_STATUS_LABEL[status] ?? status}${draftItems.length ? ` · ${draftItems.length} صنف` : ''}`
            : 'لم تُدخَل مواد بعد'}
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
          <p className="text-sm text-gray-500">هذا القسم للعرض فقط — إدارة المواد متاحة لمهندس إدارة المشاريع والإدارة</p>
        </div>
      )}

      {/* Payment reminder — informational only; delivery is never blocked */}
      {isReady && canManage && !materialsHasCollection && (
        <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
          <Package className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-800">تذكير — دفعة المواد لم تُحصَّل بعد</p>
            <p className="text-xs text-blue-600 mt-0.5">
              {hasMaterialsPayment
                ? 'الدفعة موجودة في تاب الدفعات — يمكن التسليم الآن والتحصيل لاحقاً'
                : 'يمكنك التسليم الآن، وإضافة دفعة المواد وتحصيلها لاحقاً من تاب الدفعات'}
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
                          <th className="px-2 py-2 text-start font-medium" dir="ltr">Purchasing Document</th>
                          <th className="px-2 py-2 text-start font-medium" dir="ltr">Material</th>
                          <th className="px-2 py-2 text-start font-medium">Short Text (الوصف) *</th>
                          <th className="px-2 py-2 text-start font-medium">الكمية</th>
                          <th className="px-2 py-2 text-start font-medium">الوحدة</th>
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
                            <td className="px-2 py-1.5 w-32">
                              <Input className="h-9" dir="ltr" placeholder="9200043607" value={item.sto_no ?? ''}
                                onPaste={(e) => handlePasteRows(e, i)}
                                onChange={(e) => updateDraftItem(i, { sto_no: e.target.value })} />
                            </td>
                            <td className="px-2 py-1.5 w-28">
                              <Input className="h-9" dir="ltr" placeholder="7003027" value={item.sap_no ?? ''}
                                onPaste={(e) => handlePasteRows(e, i)}
                                onChange={(e) => updateDraftItem(i, { sap_no: e.target.value })} />
                            </td>
                            <td className="px-2 py-1.5 min-w-[200px]">
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
                            <td className="px-2 py-1.5 w-24">
                              {/* Entered manually — e.g. EA / M / SET */}
                              <Input className="h-9" dir="ltr" placeholder="EA" value={item.unit ?? ''}
                                onPaste={(e) => handlePasteRows(e, i)}
                                onChange={(e) => updateDraftItem(i, { unit: e.target.value })} />
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
                  <Button type="button" size="sm" variant="outline" onClick={downloadExcelTemplate}
                    className="gap-1.5 text-gray-500 hover:text-gray-700" title="قالب جاهز بالأعمدة الصحيحة — املأه وارفعه يُقرأ 100%">
                    <FileText className="h-3.5 w-3.5" />
                    تحميل قالب Excel
                  </Button>
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
                <PrintHeader title="قائمة المواد" subtitle={projectName} />
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
            <p className="text-sm font-semibold text-emerald-800 flex-1">المواد محدَّدة كجاهزة للتوريد ✓</p>
            {/* Undo a mistaken "ready" — only before delivery is confirmed */}
            {canManage && isReady && !isDelivered && (
              <Button size="sm" variant="outline" onClick={() => handleRevertStatus('pending', 'إلغاء «جاهزة للتوريد» والرجوع لخطوة طلب المواد')}
                className="shrink-0 text-amber-700 border-amber-200 hover:bg-amber-50 gap-1.5">
                <ArrowRight className="h-3.5 w-3.5" />
                تراجع
              </Button>
            )}
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

          {/* ── Delivery action — never blocked by payment (client decision) ── */}
          {canManage && (
            <div className="flex items-center justify-between rounded-xl border bg-white p-4 gap-3"
              style={{ borderColor: '#bfdbfe' }}>
              <div>
                <p className="text-sm font-semibold text-gray-800">تأكيد استلام المواد</p>
                <p className="text-xs text-gray-500 mt-0.5">بعد التأكيد ارفع وصل الاستلام الموقّع من العميل</p>
              </div>
              <Button size="sm" loading={isPending}
                onClick={handleConfirmDelivery}
                className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white">
                <Truck className="h-3.5 w-3.5" />
                استلمنا المواد
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
              <div className="flex-1">
                <p className="text-sm font-semibold text-emerald-800">تم استلام المواد بنجاح</p>
                {material?.ready_at && (
                  <p className="text-xs text-emerald-600 mt-0.5">بتاريخ: {formatDate(material.ready_at)}</p>
                )}
              </div>
              {/* Undo a mistaken delivery confirmation */}
              {canManage && (
                <Button size="sm" variant="outline" onClick={() => handleRevertStatus('ready', 'إلغاء تأكيد الاستلام والرجوع لحالة «جاهزة للتوريد»')}
                  className="shrink-0 text-amber-700 border-amber-200 hover:bg-amber-50 gap-1.5">
                  <ArrowRight className="h-3.5 w-3.5" />
                  تراجع عن الاستلام
                </Button>
              )}
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

      {/* ── Excel import review dialog — nothing is imported before confirm ── */}
      <Dialog open={!!excelPreview} onClose={() => setExcelPreview(null)} className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>مراجعة الاستيراد — {excelPreview?.fileName}</DialogTitle>
          <DialogClose onClose={() => setExcelPreview(null)} />
        </DialogHeader>
        <DialogContent className="max-h-[65vh] overflow-y-auto">
          {excelPreview && (() => {
            const { grid, headerRow, mapping } = excelPreview.primary
            const { items, unparsed } = applyMapping(grid, headerRow, mapping)
            const dataRows = grid.slice(headerRow + 1)
            const previewRows = dataRows.slice(0, 8)
            const width = mapping.length
            const totalToImport = items.length
              + (excelPreview.includeUnparsed ? unparsed.length : 0)
              + excelPreview.extraItems.length
            const setCol = (ci: number, f: ColumnField) => {
              setExcelPreview((p) => {
                if (!p) return p
                // Each field can live in one column only — clear its old position
                const m = [...p.primary.mapping]
                if (f !== 'skip') {
                  const prev = m.indexOf(f)
                  if (prev >= 0) m[prev] = 'skip'
                }
                m[ci] = f
                return { ...p, primary: { ...p.primary, mapping: m } }
              })
            }
            return (
              <div className="space-y-4">
                <p className="text-xs text-gray-500">
                  راجع ربط الأعمدة — غيّر أي عمود اتفهم غلط من القائمة فوقه. لا يدخل أي صنف قبل الضغط على «استيراد».
                </p>

                {/* Column mapping + data preview */}
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50">
                        {Array.from({ length: width }, (_, ci) => (
                          <th key={ci} className="p-1.5 min-w-[110px]">
                            <select
                              value={mapping[ci]}
                              onChange={(e) => setCol(ci, e.target.value as ColumnField)}
                              className={`w-full rounded-lg border px-1.5 py-1 text-xs font-semibold ${mapping[ci] === 'skip' ? 'border-gray-200 text-gray-400 bg-white' : 'border-brand-300 text-brand-700 bg-brand-50'}`}
                            >
                              {(Object.keys(FIELD_LABELS) as ColumnField[]).map((f) => (
                                <option key={f} value={f}>{FIELD_LABELS[f]}</option>
                              ))}
                            </select>
                          </th>
                        ))}
                      </tr>
                      {headerRow >= 0 && (
                        <tr className="bg-gray-100/60 text-gray-500">
                          {Array.from({ length: width }, (_, ci) => (
                            <th key={ci} className="px-2 py-1 text-start font-medium truncate max-w-[140px]">{grid[headerRow]?.[ci] ?? ''}</th>
                          ))}
                        </tr>
                      )}
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {previewRows.map((row, ri) => (
                        <tr key={ri}>
                          {Array.from({ length: width }, (_, ci) => (
                            <td key={ci} className={`px-2 py-1.5 truncate max-w-[140px] ${mapping[ci] === 'skip' ? 'text-gray-300' : 'text-gray-700'}`}>
                              {row[ci] ?? ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {dataRows.length > previewRows.length && (
                  <p className="text-[11px] text-gray-400">+ {dataRows.length - previewRows.length} صفوف أخرى بنفس الربط</p>
                )}

                {/* Unparsed rows — visible, never silently dropped */}
                {unparsed.length > 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
                    <p className="text-xs font-bold text-amber-800">⚠️ {unparsed.length} صف بدون وصف أو رقم SAP بالربط الحالي:</p>
                    <ul className="space-y-1 max-h-24 overflow-y-auto">
                      {unparsed.slice(0, 6).map((u) => (
                        <li key={u.row} className="text-[11px] text-amber-700 truncate">صف {u.row}: {u.text}</li>
                      ))}
                      {unparsed.length > 6 && <li className="text-[11px] text-amber-600">+ {unparsed.length - 6} أخرى…</li>}
                    </ul>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-amber-800">
                      <input type="checkbox" checked={excelPreview.includeUnparsed}
                        onChange={(e) => setExcelPreview((p) => p ? { ...p, includeUnparsed: e.target.checked } : p)}
                        className="h-4 w-4 rounded border-amber-300 text-amber-600" />
                      أضفها كأصناف نصية (الوصف = محتوى الصف) بدل تجاهلها
                    </label>
                  </div>
                )}

                {excelPreview.extraSummary.length > 0 && (
                  <p className="text-xs text-gray-500">
                    أوراق إضافية في الملف: {excelPreview.extraSummary.join(' · ')} — ستُستورد تلقائياً.
                  </p>
                )}

                <div className="rounded-xl bg-brand-50 border border-brand-100 px-4 py-2.5 text-sm font-bold text-brand-700">
                  سيُستورد {totalToImport} صنف
                </div>
              </div>
            )
          })()}
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setExcelPreview(null)}>إلغاء</Button>
          <Button onClick={confirmExcelImport}>
            <CheckCircle2 className="h-4 w-4" />
            استيراد
          </Button>
        </DialogFooter>
      </Dialog>

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
