'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  NotebookPen, Plus, Trash2, CheckSquare, Square, Calendar, AlarmClock,
  ListTodo, MessageSquare, ShieldAlert, Eye,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { addPersonalNote, togglePersonalNoteDone, deletePersonalNote } from '@/lib/actions/notes'
import { ROLE_LABELS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { PersonalNote, NoteKind, Profile } from '@/types/database'

const ROLE_COLOR: Record<string, string> = {
  coordinator: 'bg-blue-500',
  sales_engineer: 'bg-emerald-500',
  installation: 'bg-purple-500',
  admin: 'bg-rose-500',
}

const KINDS: { key: NoteKind; label: string; icon: React.ReactNode; color: string }[] = [
  { key: 'note', label: 'ملاحظة', icon: <MessageSquare className="h-3.5 w-3.5" />, color: 'border-gray-300 bg-gray-50 text-gray-700' },
  { key: 'todo', label: 'مهمة', icon: <ListTodo className="h-3.5 w-3.5" />, color: 'border-emerald-400 bg-emerald-50 text-emerald-700' },
  { key: 'reminder', label: 'تذكير', icon: <AlarmClock className="h-3.5 w-3.5" />, color: 'border-amber-400 bg-amber-50 text-amber-700' },
  { key: 'schedule', label: 'موعد', icon: <Calendar className="h-3.5 w-3.5" />, color: 'border-blue-400 bg-blue-50 text-blue-700' },
]

function fmtDateTime(iso: string) {
  return new Intl.DateTimeFormat('ar-SA', {
    timeZone: 'Asia/Riyadh', dateStyle: 'medium', timeStyle: 'short', numberingSystem: 'latn',
  }).format(new Date(iso))
}

export function PersonalNotebook({
  notes, currentProfile, users, viewingId,
}: {
  notes: PersonalNote[]
  currentProfile: Profile
  users: Pick<Profile, 'id' | 'full_name' | 'role'>[]   // admins only
  viewingId: string
}) {
  const router = useRouter()
  const [kind, setKind] = useState<NoteKind>('todo')
  const [body, setBody] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [isPending, startTransition] = useTransition()

  const isOwnNotebook = viewingId === currentProfile.id
  const isAdmin = currentProfile.role === 'admin'
  const viewingUser = users.find((u) => u.id === viewingId)

  const open = notes.filter((n) => !n.done)
  const done = notes.filter((n) => n.done)

  function add() {
    if (!body.trim()) { toast.error('اكتب الملاحظة'); return }
    if (kind !== 'note' && !dueAt) { toast.error('حدد التاريخ والوقت'); return }
    startTransition(async () => {
      try {
        const r = await addPersonalNote({
          kind, body,
          dueAt: kind === 'note' ? null : new Date(dueAt).toISOString(),
        })
        if (r?.error) toast.error(r.error)
        else { setBody(''); setDueAt(''); toast.success('تم الحفظ') }
      } catch { toast.error('حدث خطأ غير متوقع') }
    })
  }

  function toggle(n: PersonalNote) {
    startTransition(async () => {
      const r = await togglePersonalNoteDone(n.id, !n.done)
      if (r?.error) toast.error(r.error)
    })
  }

  function remove(id: string) {
    if (!confirm('حذف هذه الملاحظة؟')) return
    startTransition(async () => {
      const r = await deletePersonalNote(id)
      if (r?.error) toast.error(r.error)
      else toast.success('تم الحذف')
    })
  }

  function NoteRow({ n }: { n: PersonalNote }) {
    const k = KINDS.find((x) => x.key === n.kind)!
    const overdue = !n.done && n.due_at && n.due_at < new Date().toISOString()
    return (
      <div className={cn(
        'group flex items-start gap-3 rounded-xl border px-4 py-3 transition-colors',
        n.done ? 'border-gray-100 bg-gray-50/60' : overdue ? 'border-red-200 bg-red-50/40' : 'border-gray-100 bg-white hover:border-gray-200',
      )}>
        {isOwnNotebook ? (
          <button onClick={() => toggle(n)} disabled={isPending}
            className="mt-0.5 shrink-0 text-gray-400 transition-colors hover:text-emerald-600">
            {n.done ? <CheckSquare className="h-4.5 w-4.5 text-emerald-600" /> : <Square className="h-4.5 w-4.5" />}
          </button>
        ) : (
          <span className="mt-0.5 shrink-0">
            {n.done ? <CheckSquare className="h-4.5 w-4.5 text-emerald-600" /> : <Square className="h-4.5 w-4.5 text-gray-300" />}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <p className={cn('whitespace-pre-wrap break-words text-sm text-gray-800 leading-relaxed', n.done && 'line-through text-gray-400')}>
            {n.body}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className={cn('inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-bold', k.color)}>
              {k.icon} {k.label}
            </span>
            {n.due_at && (
              <span className={cn('text-[11px] font-medium', overdue ? 'text-red-600' : 'text-gray-500')}>
                {fmtDateTime(n.due_at)}{overdue ? ' — متأخر' : ''}
              </span>
            )}
          </div>
        </div>

        {isOwnNotebook && (
          <button onClick={() => remove(n.id)} disabled={isPending}
            className="rounded-lg p-1.5 text-gray-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Admin: pick whose notebook to read — visible, not buried in a dropdown */}
      {isAdmin && users.length > 0 && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Eye className="h-4 w-4 text-rose-500" />
            <span className="text-sm font-bold text-rose-900">مدونات الموظفين — اطلاع الإدارة (قراءة فقط)</span>
            <span className="text-xs text-rose-600">كل اطلاع يُسجَّل في سجل التدقيق</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => router.push('/notebook')}
              className={cn(
                'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                isOwnNotebook ? 'border-brand-300 bg-brand-600 text-white' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
              )}
            >
              <NotebookPen className="h-3.5 w-3.5" />
              مدونتي
            </button>
            {users.filter((u) => u.id !== currentProfile.id).map((u) => (
              <button
                key={u.id}
                onClick={() => router.push(`/notebook?user=${u.id}`)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                  viewingId === u.id ? 'border-rose-400 bg-rose-600 text-white' : 'border-gray-200 bg-white text-gray-600 hover:border-rose-300',
                )}
              >
                <span className={cn(
                  'flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white',
                  viewingId === u.id ? 'bg-white/25' : ROLE_COLOR[u.role] ?? 'bg-gray-400',
                )}>
                  {u.full_name.split(' ').slice(0, 2).map((n) => n[0]).join('')}
                </span>
                {u.full_name}
                <span className={cn('text-[10px]', viewingId === u.id ? 'text-rose-100' : 'text-gray-400')}>
                  {ROLE_LABELS[u.role]}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Privacy notice — the employee always knows the rule */}
      {isOwnNotebook && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-3">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
          <p className="text-xs leading-relaxed text-gray-500">
            هذه مدونتك الخاصة — لا يراها أي زميل. الإدارة العليا فقط يمكنها الاطلاع عليها (قراءة، دون تعديل أو حذف)،
            ويُسجَّل كل اطلاع في سجل التدقيق.
          </p>
        </div>
      )}

      {/* Composer — only in your own notebook */}
      {isOwnNotebook && (
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
            {KINDS.map((k) => (
              <button key={k.key} onClick={() => setKind(k.key)}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition-all',
                  kind === k.key ? k.color + ' ring-2 ring-offset-1 ring-gray-200' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300',
                )}>
                {k.icon} {k.label}
              </button>
            ))}
            {kind !== 'note' && (
              <Input type="datetime-local" dir="ltr" value={dueAt} onChange={(e) => setDueAt(e.target.value)}
                className="h-8 w-auto text-xs" />
            )}
          </div>

          <div className="flex items-end gap-2">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); add() } }}
              rows={1}
              placeholder="اكتب مهمة أو تذكيراً أو ملاحظة…"
              className="max-h-32 min-h-[42px] flex-1 resize-none rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/15"
            />
            <Button size="sm" onClick={add} loading={isPending} disabled={!body.trim()} className="h-[42px] px-4">
              <Plus className="h-4 w-4" />
              إضافة
            </Button>
          </div>
          <p className="mt-1.5 text-[11px] text-gray-400">
            المهام والتذكيرات والمواعيد يصلك عنها إشعار في المنصة عند حلول موعدها.
          </p>
        </div>
      )}

      {!isOwnNotebook && viewingUser && (
        <h2 className="text-sm font-bold text-gray-700">مدونة {viewingUser.full_name}</h2>
      )}

      {/* Open items */}
      {notes.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm">
          <NotebookPen className="mx-auto mb-2 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-400">
            {isOwnNotebook ? 'دفترك فاضي — ابدأ بإضافة مهمة أو تذكير' : 'لا توجد ملاحظات'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {open.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500">قيد التنفيذ ({open.length})</p>
              {open.map((n) => <NoteRow key={n.id} n={n} />)}
            </div>
          )}
          {done.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400">منجز ({done.length})</p>
              {done.map((n) => <NoteRow key={n.id} n={n} />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
