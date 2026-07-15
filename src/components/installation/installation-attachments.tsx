'use client'

import { FileText, ImageIcon, Paperclip } from 'lucide-react'
import { DOCUMENT_TYPE_LABELS } from '@/lib/constants'
import type { Document } from '@/types/database'

// The installation team may VIEW the project's general attachments — the files
// coordinators upload in the installation section, notes, problems, materials
// paperwork. Financial documents (receipts, invoices, contract) are excluded:
// the installation role never sees the project's money.
const HIDDEN_TYPES = new Set(['receipt', 'invoice', 'contract'])

function icon(url: string) {
  const lower = url.toLowerCase()
  const isPdf = lower.endsWith('.pdf') || lower.includes('application/pdf')
  return isPdf ? <FileText className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />
}

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Riyadh',
  })
}

export function InstallationAttachments({ attachments }: { attachments: Document[] }) {
  const visible = attachments.filter((a) => !HIDDEN_TYPES.has(a.type))

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Paperclip className="h-4 w-4 text-brand-600" />
        <h3 className="text-sm font-bold text-gray-900">مرفقات المشروع</h3>
        {visible.length > 0 && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-600">{visible.length}</span>
        )}
        <span className="ms-auto text-[11px] text-gray-400">عرض فقط</span>
      </div>

      {visible.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">لا توجد مرفقات على هذا المشروع بعد</p>
      ) : (
        <div className="space-y-2">
          {visible.map((doc) => (
            <div key={doc.id} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/60 p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-gray-400 shrink-0 border border-gray-100">
                {icon(doc.url)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">
                  {doc.description || doc.url.split('/').pop() || 'ملف'}
                </p>
                <p className="text-xs text-gray-500">
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
                    {DOCUMENT_TYPE_LABELS[doc.type] ?? doc.type}
                  </span>
                  {' · '}
                  {doc.uploader?.full_name ? `${doc.uploader.full_name} · ` : ''}
                  {fmtDate(doc.uploaded_at)}
                </p>
              </div>
              <a href={doc.url} target="_blank" rel="noopener noreferrer"
                className="shrink-0 text-sm font-medium text-brand-600 hover:text-brand-700">
                عرض
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
