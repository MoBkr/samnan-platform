'use client'

import { useState, useTransition, useRef, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import {
  MessageSquare, Send, Trash2, Calendar, Clock, CheckSquare, Square,
  AtSign, AlarmClock, ListTodo, Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { addProjectNote, toggleProjectNoteDone, deleteProjectNote } from '@/lib/actions/notes'
import { ROLE_LABELS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { ProjectNote, NoteKind, Profile } from '@/types/database'

type Member = Pick<Profile, 'id' | 'full_name' | 'role'>

const KINDS: { key: NoteKind; label: string; icon: React.ReactNode; color: string }[] = [
  { key: 'note', label: 'ملاحظة', icon: <MessageSquare className="h-3.5 w-3.5" />, color: 'border-gray-300 bg-gray-50 text-gray-700' },
  { key: 'schedule', label: 'موعد', icon: <Calendar className="h-3.5 w-3.5" />, color: 'border-blue-400 bg-blue-50 text-blue-700' },
  { key: 'reminder', label: 'تذكير', icon: <AlarmClock className="h-3.5 w-3.5" />, color: 'border-amber-400 bg-amber-50 text-amber-700' },
  { key: 'todo', label: 'مهمة', icon: <ListTodo className="h-3.5 w-3.5" />, color: 'border-emerald-400 bg-emerald-50 text-emerald-700' },
]

const ROLE_COLOR: Record<string, string> = {
  coordinator: 'bg-blue-500',
  sales_engineer: 'bg-emerald-500',
  installation: 'bg-purple-500',
  supply: 'bg-orange-500',
  admin: 'bg-rose-500',
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('')
}

function fmtDateTime(iso: string) {
  return new Intl.DateTimeFormat('ar-SA', {
    timeZone: 'Asia/Riyadh', dateStyle: 'medium', timeStyle: 'short', numberingSystem: 'latn',
  }).format(new Date(iso))
}

function fmtTime(iso: string) {
  return new Intl.DateTimeFormat('ar-SA', {
    timeZone: 'Asia/Riyadh', hour: '2-digit', minute: '2-digit', numberingSystem: 'latn',
  }).format(new Date(iso))
}

function dayLabel(iso: string) {
  const d = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh' }).format(new Date(iso))
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh' }).format(new Date())
  const yesterday = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh' })
    .format(new Date(Date.now() - 86400000))
  if (d === today) return 'اليوم'
  if (d === yesterday) return 'أمس'
  return new Intl.DateTimeFormat('ar-SA', {
    timeZone: 'Asia/Riyadh', dateStyle: 'full', numberingSystem: 'latn',
  }).format(new Date(iso))
}

/** Render @names in the body as highlighted chips. */
function Body({ text, members }: { text: string; members: Member[] }) {
  const names = members.map((m) => m.full_name).sort((a, b) => b.length - a.length)
  if (!names.length) return <>{text}</>
  const parts: React.ReactNode[] = []
  let rest = text
  let key = 0
  while (rest.length) {
    const hit = names
      .map((n) => ({ n, i: rest.indexOf(`@${n}`) }))
      .filter((h) => h.i !== -1)
      .sort((a, b) => a.i - b.i)[0]
    if (!hit) { parts.push(rest); break }
    if (hit.i > 0) parts.push(rest.slice(0, hit.i))
    parts.push(
      <span key={key++} className="rounded bg-brand-50 px-1 font-semibold text-brand-700">@{hit.n}</span>,
    )
    rest = rest.slice(hit.i + hit.n.length + 1)
  }
  return <>{parts}</>
}

export function ProjectBoard({
  projectId, notes, members, currentProfile,
}: {
  projectId: string
  notes: ProjectNote[]
  members: Member[]
  currentProfile: Profile
}) {
  const [kind, setKind] = useState<NoteKind>('note')
  const [body, setBody] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [isPending, startTransition] = useTransition()
  const [mentionOpen, setMentionOpen] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const feedRef = useRef<HTMLDivElement>(null)

  const isMember = members.some((m) => m.id === currentProfile.id)

  // Anything with a time on it, still open — the reason the panel exists.
  const upcoming = useMemo(
    () => notes
      .filter((n) => n.kind !== 'note' && !n.done && n.due_at)
      .sort((a, b) => (a.due_at! < b.due_at! ? -1 : 1)),
    [notes],
  )

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight })
  }, [notes.length])

  const mentionMatches = members.filter((m) =>
    m.id !== currentProfile.id && m.full_name.includes(mentionQuery),
  ).slice(0, 6)

  function onBodyChange(v: string) {
    setBody(v)
    const upto = v.slice(0, inputRef.current?.selectionStart ?? v.length)
    const at = upto.lastIndexOf('@')
    // Open the picker only while typing the token right after an "@"
    if (at !== -1 && !/\s/.test(upto.slice(at + 1))) {
      setMentionQuery(upto.slice(at + 1))
      setMentionOpen(true)
    } else {
      setMentionOpen(false)
    }
  }

  function pickMention(m: Member) {
    const pos = inputRef.current?.selectionStart ?? body.length
    const before = body.slice(0, pos)
    const at = before.lastIndexOf('@')
    const next = `${body.slice(0, at)}@${m.full_name} ${body.slice(pos)}`
    setBody(next)
    setMentionOpen(false)
    inputRef.current?.focus()
  }

  function send() {
    if (!body.trim()) return
    if (kind !== 'note' && !dueAt) { toast.error('حدد التاريخ والوقت'); return }

    // Mentions are resolved from the text — what you see is what gets notified.
    const mentions = members.filter((m) => body.includes(`@${m.full_name}`)).map((m) => m.id)

    startTransition(async () => {
      try {
        const r = await addProjectNote({
          projectId, kind, body,
          dueAt: kind === 'note' ? null : new Date(dueAt).toISOString(),
          mentions,
        })
        if (r?.error) toast.error(r.error)
        else {
          setBody(''); setDueAt(''); setKind('note')
          if (mentions.length) toast.success(`تم الإرسال — ونُبّه ${mentions.length} شخص`)
        }
      } catch { toast.error('حدث خطأ غير متوقع') }
    })
  }

  function toggleDone(n: ProjectNote) {
    startTransition(async () => {
      const r = await toggleProjectNoteDone(n.id, projectId, !n.done)
      if (r?.error) toast.error(r.error)
    })
  }

  function remove(id: string) {
    if (!confirm('حذف هذه الرسالة؟')) return
    startTransition(async () => {
      const r = await deleteProjectNote(id, projectId)
      if (r?.error) toast.error(r.error)
      else toast.success('تم الحذف')
    })
  }

  if (!isMember) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-8 text-center">
        <MessageSquare className="mx-auto h-8 w-8 text-gray-300 mb-2" />
        <p className="text-sm text-gray-500">مدونة المشروع متاحة لفريق المشروع فقط.</p>
      </div>
    )
  }

  let lastDay = ''

  return (
    <div className="space-y-4">
      {/* Upcoming — so a task never gets buried in the chat */}
      {upcoming.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-brand-600" />
            <h3 className="text-sm font-bold text-gray-900">مواعيد ومهام قادمة</h3>
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-700">{upcoming.length}</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {upcoming.map((n) => {
              const k = KINDS.find((x) => x.key === n.kind)!
              const overdue = n.due_at! < new Date().toISOString()
              return (
                <div key={n.id} className={cn(
                  'flex items-start gap-2.5 rounded-xl border px-3 py-2.5',
                  overdue ? 'border-red-200 bg-red-50/50' : 'border-gray-100 bg-gray-50/60',
                )}>
                  <button onClick={() => toggleDone(n)} disabled={isPending}
                    className="mt-0.5 text-gray-400 hover:text-emerald-600 transition-colors">
                    <Square className="h-4 w-4" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-800 leading-snug line-clamp-2">
                      <Body text={n.body} members={members} />
                    </p>
                    <p className={cn('mt-1 flex items-center gap-1.5 text-[11px] font-medium',
                      overdue ? 'text-red-600' : 'text-gray-500')}>
                      <span className={cn('inline-flex items-center gap-1 rounded border px-1.5 py-0.5', k.color)}>
                        {k.icon} {k.label}
                      </span>
                      {fmtDateTime(n.due_at!)}
                      {overdue && ' — متأخر'}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* The board */}
      <div className="flex flex-col rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-brand-600" />
            <h3 className="text-sm font-bold text-gray-900">مدونة المشروع</h3>
          </div>
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <Users className="h-3.5 w-3.5" />
            {members.length} أعضاء
          </span>
        </div>

        {/* Feed */}
        <div ref={feedRef} className="max-h-[55vh] min-h-[220px] space-y-3 overflow-y-auto bg-gray-50/60 px-4 py-4">
          {notes.length === 0 ? (
            <div className="py-10 text-center">
              <MessageSquare className="mx-auto h-8 w-8 text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">لا توجد رسائل بعد — ابدأ النقاش مع الفريق</p>
            </div>
          ) : notes.map((n) => {
            const mine = n.author_id === currentProfile.id
            const k = KINDS.find((x) => x.key === n.kind)!
            const day = dayLabel(n.created_at)
            const showDay = day !== lastDay
            lastDay = day
            const mentionsMe = n.mentions?.includes(currentProfile.id)

            return (
              <div key={n.id}>
                {showDay && (
                  <div className="my-3 flex items-center gap-3">
                    <div className="h-px flex-1 bg-gray-200" />
                    <span className="text-[11px] font-medium text-gray-400">{day}</span>
                    <div className="h-px flex-1 bg-gray-200" />
                  </div>
                )}
                <div className={cn('flex items-start gap-2.5', mine && 'flex-row-reverse')}>
                  <div className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white',
                    ROLE_COLOR[n.author?.role ?? ''] ?? 'bg-gray-400',
                  )}>
                    {initials(n.author?.full_name ?? '؟')}
                  </div>

                  <div className={cn('max-w-[80%] min-w-0', mine && 'text-end')}>
                    <div className={cn('mb-0.5 flex items-center gap-2 text-[11px] text-gray-500', mine && 'flex-row-reverse')}>
                      <span className="font-semibold text-gray-700">{mine ? 'أنت' : n.author?.full_name}</span>
                      {!mine && n.author?.role && <span>{ROLE_LABELS[n.author.role]}</span>}
                      <span>{fmtTime(n.created_at)}</span>
                    </div>

                    <div className={cn(
                      'group relative inline-block rounded-2xl border px-3.5 py-2.5 text-start shadow-sm',
                      mentionsMe ? 'border-brand-300 bg-brand-50/70 ring-1 ring-brand-200'
                        : mine ? 'border-brand-100 bg-brand-50' : 'border-gray-100 bg-white',
                    )}>
                      {n.kind !== 'note' && (
                        <div className="mb-1.5 flex flex-wrap items-center gap-2">
                          <span className={cn('inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-bold', k.color)}>
                            {k.icon} {k.label}
                          </span>
                          {n.due_at && (
                            <span className="text-[11px] font-medium text-gray-600">{fmtDateTime(n.due_at)}</span>
                          )}
                        </div>
                      )}

                      <div className={cn('flex items-start gap-2', n.done && 'opacity-60')}>
                        {n.kind === 'todo' && (
                          <button onClick={() => toggleDone(n)} disabled={isPending}
                            className="mt-0.5 shrink-0 text-gray-400 hover:text-emerald-600 transition-colors">
                            {n.done ? <CheckSquare className="h-4 w-4 text-emerald-600" /> : <Square className="h-4 w-4" />}
                          </button>
                        )}
                        <p className={cn(
                          'whitespace-pre-wrap break-words text-sm text-gray-800 leading-relaxed',
                          n.done && 'line-through',
                        )}>
                          <Body text={n.body} members={members} />
                        </p>
                      </div>

                      {(mine || currentProfile.role === 'admin') && (
                        <button onClick={() => remove(n.id)} disabled={isPending}
                          className="absolute -top-2 -start-2 hidden rounded-full border border-gray-200 bg-white p-1 text-gray-300 shadow-sm hover:text-red-500 group-hover:block">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Composer */}
        <div className="border-t border-gray-100 bg-white px-4 py-3">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
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

          <div className="relative flex items-end gap-2">
            {mentionOpen && mentionMatches.length > 0 && (
              <div className="absolute bottom-full mb-2 start-0 z-20 w-64 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                <p className="border-b border-gray-100 px-3 py-1.5 text-[11px] font-semibold text-gray-400">منشن — سيصله إشعار</p>
                {mentionMatches.map((m) => (
                  <button key={m.id} onClick={() => pickMention(m)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-start hover:bg-gray-50">
                    <span className={cn('flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white', ROLE_COLOR[m.role] ?? 'bg-gray-400')}>
                      {initials(m.full_name)}
                    </span>
                    <span className="text-sm text-gray-800">{m.full_name}</span>
                    <span className="ms-auto text-[11px] text-gray-400">{ROLE_LABELS[m.role]}</span>
                  </button>
                ))}
              </div>
            )}

            <textarea
              ref={inputRef}
              value={body}
              onChange={(e) => onBodyChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !mentionOpen) { e.preventDefault(); send() }
              }}
              rows={1}
              placeholder="اكتب رسالة… اكتب @ لمنشن أحد أعضاء الفريق"
              className="max-h-32 min-h-[42px] flex-1 resize-none rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/15"
            />
            <Button size="sm" onClick={send} loading={isPending} disabled={!body.trim()} className="h-[42px] px-4">
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-1.5 flex items-center gap-1 text-[11px] text-gray-400">
            <AtSign className="h-3 w-3" />
            المنشن والمواعيد والمهام ترسل إشعاراً — الرسائل العادية لا ترسل، حتى لا يزعج الجرس أحداً.
          </p>
        </div>
      </div>
    </div>
  )
}
