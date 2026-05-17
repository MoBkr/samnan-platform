'use client'

import { useState, useTransition } from 'react'
import { Trash2, FileText, ImageIcon, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogFooter } from '@/components/ui/dialog'
import { uploadAttachment, deleteAttachment } from '@/lib/actions/attachments'
import { DOCUMENT_TYPE_LABELS } from '@/lib/constants'
import { toast } from 'sonner'
import type { Document } from '@/types/database'

interface AttachmentsTabProps {
  attachments: Document[]
  projectId: string
}

const DOC_TYPES = ['contract', 'receipt', 'delivery_note', 'materials_request'] as const

function getDocumentIcon(url: string) {
  const isPdf = url.toLowerCase().endsWith('.pdf')
  return isPdf ? <FileText className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })
}

export function AttachmentsTab({ attachments, projectId }: AttachmentsTabProps) {
  const [uploadDialog, setUploadDialog] = useState(false)
  const [selectedType, setSelectedType] = useState<string>('contract')
  const [isPending, startTransition] = useTransition()

  function handleFileUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set('project_id', projectId)
    formData.set('type', selectedType)

    startTransition(async () => {
      const result = await uploadAttachment(formData)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success('تم رفع الملف بنجاح')
        setUploadDialog(false)
        ;(e.currentTarget as HTMLFormElement).reset()
      }
    })
  }

  function handleDelete(docId: string) {
    if (!confirm('هل تريد حذف هذا الملف؟')) return

    startTransition(async () => {
      const result = await deleteAttachment(docId, projectId)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success('تم حذف الملف بنجاح')
      }
    })
  }

  return (
    <div className="space-y-6 p-6">
      {/* Upload Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => setUploadDialog(true)}
          className="gap-2"
        >
          <Upload className="h-4 w-4" />
          رفع ملف
        </Button>
      </div>

      {/* File Type Sections */}
      {DOC_TYPES.map((type) => {
        const typeAttachments = attachments.filter((a) => a.type === type)
        const typeLabel = DOCUMENT_TYPE_LABELS[type] || type

        return (
          <div key={type} className="border rounded-xl p-5 bg-gray-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">{typeLabel}</h3>
              <span className="text-sm text-gray-500">
                {typeAttachments.length} / 5
              </span>
            </div>

            {typeAttachments.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">لا توجد ملفات</p>
            ) : (
              <div className="space-y-2">
                {typeAttachments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="text-gray-400 shrink-0">
                        {getDocumentIcon(doc.url)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {doc.description || 'ملف بدون اسم'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {doc.uploader?.full_name} • {formatDate(doc.uploaded_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ms-3">
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-600 hover:text-brand-700 text-sm font-medium"
                      >
                        عرض
                      </a>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        disabled={isPending}
                        className="text-red-600 hover:text-red-700 disabled:text-gray-400 p-1"
                        title="حذف"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {/* Upload Dialog */}
      <Dialog open={uploadDialog} onClose={() => setUploadDialog(false)}>
        <DialogHeader>
          <DialogTitle>رفع ملف</DialogTitle>
          <DialogClose onClose={() => setUploadDialog(false)} />
        </DialogHeader>
        <DialogContent>
          <form onSubmit={handleFileUpload} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">نوع الملف</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                {DOC_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {DOCUMENT_TYPE_LABELS[type] || type}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">الملف</label>
              <input
                type="file"
                name="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp,application/pdf"
                required
                className="w-full text-sm"
              />
              <p className="text-xs text-gray-500">الحد الأقصى: 10 ميجابايت • PDF أو صورة</p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setUploadDialog(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={isPending} loading={isPending}>
                رفع
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
