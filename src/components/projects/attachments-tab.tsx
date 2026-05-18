'use client'

import { useState, useTransition, useRef } from 'react'
import { Trash2, FileText, ImageIcon, Upload, Lock, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  uploadAttachment, deleteAttachment,
  deleteContractUrl, uploadContractUrl,
  deletePaymentReceipt,
} from '@/lib/actions/attachments'
import { DOCUMENT_TYPE_LABELS, PAYMENT_TYPE_LABELS } from '@/lib/constants'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import type { Document, Payment, Project } from '@/types/database'

interface AttachmentsTabProps {
  attachments: Document[]
  projectId: string
  project: Pick<Project, 'contract_url' | 'project_name'>
  payments: Payment[]
  canManage: boolean
}

const UPLOADABLE_TYPES = ['contract', 'receipt', 'other'] as const
const READONLY_MATERIAL_TYPES = ['materials_request', 'delivery_note'] as const

function getDocumentIcon(url: string) {
  const lower = url.toLowerCase()
  const isPdf = lower.endsWith('.pdf') || lower.includes('application/pdf')
  return isPdf ? <FileText className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })
}

/* ── Read-only doc row (contract / receipt) ── */
function ReadOnlyDocRow({
  label, url, sublabel, onDelete, onReplace, canManage, isPending,
}: {
  label: string
  url: string
  sublabel?: string
  onDelete?: () => void
  onReplace?: () => void
  canManage: boolean
  isPending: boolean
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 shrink-0">
        {getDocumentIcon(url)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{label}</p>
        {sublabel && <p className="text-xs text-gray-400">{sublabel}</p>}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {canManage ? (
          <>
            {onReplace && (
              <button
                onClick={onReplace}
                disabled={isPending}
                className="rounded-lg p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors disabled:opacity-50"
                title="استبدال"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                disabled={isPending}
                className="rounded-lg p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                title="حذف"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </>
        ) : (
          <Lock className="h-3 w-3 text-gray-300" aria-label="مستند تلقائي" />
        )}
        <a href={url} target="_blank" rel="noopener noreferrer"
          className="text-brand-600 hover:text-brand-700 text-sm font-medium ms-1">
          عرض
        </a>
      </div>
    </div>
  )
}

/* ── Editable doc row ── */
function EditableDocRow({ doc, onDelete, isPending, canDelete }: {
  doc: Document
  onDelete: () => void
  isPending: boolean
  canDelete: boolean
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition">
      <div className="text-gray-400 shrink-0">{getDocumentIcon(doc.url)}</div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 truncate">{doc.description || 'ملف بدون اسم'}</p>
        <p className="text-xs text-gray-500">
          {doc.uploader?.full_name} • {formatDate(doc.uploaded_at)}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0 ms-3">
        <a href={doc.url} target="_blank" rel="noopener noreferrer"
          className="text-brand-600 hover:text-brand-700 text-sm font-medium">عرض</a>
        {canDelete && (
          <button onClick={onDelete} disabled={isPending}
            className="text-red-600 hover:text-red-700 disabled:text-gray-400 p-1" title="حذف">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}

export function AttachmentsTab({ attachments, projectId, project, payments, canManage }: AttachmentsTabProps) {
  const [uploadDialog, setUploadDialog] = useState(false)
  const [contractDialog, setContractDialog] = useState(false)
  const [selectedType, setSelectedType] = useState<string>('contract')
  const [otherLabel, setOtherLabel] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [contractFile, setContractFile] = useState<File | null>(null)
  const contractInputRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()

  const paymentReceipts = payments.filter((p) => p.receipt_url)

  function handleFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSelectedFiles(Array.from(e.target.files ?? []))
  }

  function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (selectedFiles.length === 0) return

    startTransition(async () => {
      let successCount = 0
      let lastError = ''

      for (const file of selectedFiles) {
        const formData = new FormData()
        formData.set('file', file)
        formData.set('project_id', projectId)
        formData.set('type', selectedType)
        if (selectedType === 'other' && otherLabel.trim()) {
          formData.set('description', otherLabel.trim())
        }

        const result = await uploadAttachment(formData)
        if (result?.error) lastError = result.error
        else successCount++
      }

      if (successCount > 0) toast.success(successCount === 1 ? 'تم رفع الملف بنجاح' : `تم رفع ${successCount} ملفات`)
      if (lastError) toast.error(lastError)

      setUploadDialog(false)
      setSelectedFiles([])
      setOtherLabel('')
    })
  }

  function handleDelete(docId: string) {
    if (!confirm('هل تريد حذف هذا الملف؟')) return
    startTransition(async () => {
      const result = await deleteAttachment(docId, projectId)
      if (result?.error) toast.error(result.error)
      else toast.success('تم حذف الملف بنجاح')
    })
  }

  function handleDeleteContract() {
    if (!confirm('هل تريد حذف العقد الأساسي؟ لن يمكن التراجع عن هذا الإجراء')) return
    startTransition(async () => {
      const result = await deleteContractUrl(projectId)
      if (result?.error) toast.error(result.error)
      else toast.success('تم حذف العقد')
    })
  }

  function handleDeleteReceipt(paymentId: string) {
    if (!confirm('هل تريد حذف هذا الإيصال؟')) return
    startTransition(async () => {
      const result = await deletePaymentReceipt(paymentId, projectId)
      if (result?.error) toast.error(result.error)
      else toast.success('تم حذف الإيصال')
    })
  }

  function handleContractUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!contractFile) return
    startTransition(async () => {
      const formData = new FormData()
      formData.set('file', contractFile)
      formData.set('project_id', projectId)
      const result = await uploadContractUrl(formData)
      if (result?.error) toast.error(result.error)
      else {
        toast.success('تم رفع العقد الجديد')
        setContractDialog(false)
        setContractFile(null)
      }
    })
  }

  function handleDialogClose() {
    setUploadDialog(false)
    setSelectedFiles([])
    setOtherLabel('')
  }

  return (
    <div className="space-y-6 p-6">
      {/* Upload Button */}
      {canManage && (
        <div className="flex justify-end">
          <Button onClick={() => setUploadDialog(true)} className="gap-2">
            <Upload className="h-4 w-4" />
            رفع ملفات
          </Button>
        </div>
      )}

      {/* ── Contract ── */}
      <div className="rounded-xl border border-gray-100 bg-gray-50 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">العقد الأساسي</h3>
          <span className="text-xs text-gray-400 bg-gray-200 rounded-full px-2 py-0.5">تلقائي</span>
        </div>
        {project.contract_url ? (
          <ReadOnlyDocRow
            label={`عقد — ${project.project_name}`}
            url={project.contract_url}
            canManage={canManage}
            isPending={isPending}
            onDelete={handleDeleteContract}
            onReplace={() => setContractDialog(true)}
          />
        ) : (
          <div className="flex items-center justify-between rounded-xl border border-dashed border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-400">لا يوجد عقد مرفق</p>
            {canManage && (
              <Button size="sm" variant="outline" onClick={() => setContractDialog(true)}>
                <Upload className="h-3.5 w-3.5" />
                رفع عقد
              </Button>
            )}
          </div>
        )}
      </div>

      {/* ── Payment Receipts ── */}
      {paymentReceipts.length > 0 && (
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">إيصالات الدفعات</h3>
            <span className="text-xs text-gray-400 bg-gray-200 rounded-full px-2 py-0.5">تلقائي</span>
          </div>
          {paymentReceipts.map((p) => (
            <ReadOnlyDocRow
              key={p.id}
              label={`إيصال — ${PAYMENT_TYPE_LABELS[p.type] ?? p.type}`}
              url={p.receipt_url!}
              sublabel={p.paid_at ? `${formatCurrency(p.paid_amount)} • ${formatDate(p.paid_at)}` : undefined}
              canManage={canManage}
              isPending={isPending}
              onDelete={() => handleDeleteReceipt(p.id)}
            />
          ))}
        </div>
      )}

      {/* ── Read-only: Materials section files ── */}
      {READONLY_MATERIAL_TYPES.map((type) => {
        const typeDocs = attachments.filter((a) => a.type === type)
        if (typeDocs.length === 0) return null
        return (
          <div key={type} className="rounded-xl border border-gray-100 bg-gray-50 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">{DOCUMENT_TYPE_LABELS[type]}</h3>
              <span className="text-xs text-gray-400 bg-gray-200 rounded-full px-2 py-0.5">من المواد</span>
            </div>
            {typeDocs.map((doc) => (
              <ReadOnlyDocRow
                key={doc.id}
                label={doc.description || doc.url.split('/').pop() || 'ملف'}
                url={doc.url}
                sublabel={doc.uploader ? `${doc.uploader.full_name} • ${formatDate(doc.uploaded_at)}` : formatDate(doc.uploaded_at)}
                canManage={canManage}
                isPending={isPending}
                onDelete={() => handleDelete(doc.id)}
              />
            ))}
          </div>
        )
      })}

      {/* ── Uploadable sections ── */}
      {UPLOADABLE_TYPES.map((type) => {
        const typeAttachments = attachments.filter((a) => a.type === type)
        const typeLabel = DOCUMENT_TYPE_LABELS[type] || type

        return (
          <div key={type} className="border rounded-xl p-5 bg-gray-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">{typeLabel}</h3>
              {typeAttachments.length > 0 && (
                <span className="text-sm text-gray-400">{typeAttachments.length} ملف</span>
              )}
            </div>

            {typeAttachments.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">لا توجد ملفات</p>
            ) : (
              <div className="space-y-2">
                {typeAttachments.map((doc) => (
                  <EditableDocRow
                    key={doc.id}
                    doc={doc}
                    isPending={isPending}
                    canDelete={canManage}
                    onDelete={() => handleDelete(doc.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}

      {/* ── Upload Attachments Dialog ── */}
      <Dialog open={uploadDialog} onClose={handleDialogClose}>
        <DialogHeader>
          <DialogTitle>رفع ملفات</DialogTitle>
          <DialogClose onClose={handleDialogClose} />
        </DialogHeader>
        <DialogContent>
          <form onSubmit={handleUpload} className="space-y-4" id="upload-form">
            <div className="space-y-1.5">
              <Label>نوع الملف</Label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                {UPLOADABLE_TYPES.map((type) => (
                  <option key={type} value={type}>{DOCUMENT_TYPE_LABELS[type] || type}</option>
                ))}
              </select>
            </div>

            {selectedType === 'other' && (
              <div className="space-y-1.5">
                <Label>اسم المستند</Label>
                <Input
                  placeholder="مثال: رخصة بناء، تقرير فني..."
                  value={otherLabel}
                  onChange={(e) => setOtherLabel(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label>الملفات</Label>
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp,application/pdf"
                required
                className="w-full text-sm"
                onChange={handleFilesChange}
              />
              <p className="text-xs text-gray-500">الحد الأقصى: 10 ميجابايت لكل ملف • PDF أو صورة</p>
              {selectedFiles.length > 1 && (
                <p className="text-xs text-brand-600 font-medium">تم اختيار {selectedFiles.length} ملفات</p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleDialogClose}>إلغاء</Button>
              <Button type="submit" disabled={isPending || selectedFiles.length === 0} loading={isPending}>
                رفع
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Upload/Replace Contract Dialog ── */}
      <Dialog open={contractDialog} onClose={() => { setContractDialog(false); setContractFile(null) }}>
        <DialogHeader>
          <DialogTitle>{project.contract_url ? 'استبدال العقد' : 'رفع العقد'}</DialogTitle>
          <DialogClose onClose={() => { setContractDialog(false); setContractFile(null) }} />
        </DialogHeader>
        <DialogContent>
          <form onSubmit={handleContractUpload} className="space-y-4" id="contract-form">
            {project.contract_url && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700">
                سيتم استبدال العقد الحالي بالملف الجديد
              </div>
            )}
            <div className="space-y-1.5">
              <Label>ملف العقد (PDF أو صورة)</Label>
              <input
                ref={contractInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp,application/pdf"
                required
                className="w-full text-sm"
                onChange={(e) => setContractFile(e.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-gray-500">الحد الأقصى: 10 ميجابايت</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setContractDialog(false); setContractFile(null) }}>إلغاء</Button>
              <Button type="submit" disabled={isPending || !contractFile} loading={isPending}>
                <Upload className="h-4 w-4" />
                {project.contract_url ? 'استبدال' : 'رفع'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
