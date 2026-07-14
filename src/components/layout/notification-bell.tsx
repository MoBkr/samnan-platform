'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, CheckCheck, Hammer, HardHat, Wallet, Package, FolderKanban, Info, MessageSquare } from 'lucide-react'
import { getMyNotifications, markNotificationRead, markAllNotificationsRead } from '@/lib/actions/notifications'
import type { AppNotification } from '@/types/database'

const TYPE_ICON: Record<string, React.ReactNode> = {
  installation: <Hammer className="h-4 w-4 text-purple-600" />,
  technician: <HardHat className="h-4 w-4 text-purple-600" />,
  payment: <Wallet className="h-4 w-4 text-emerald-600" />,
  materials: <Package className="h-4 w-4 text-amber-600" />,
  project: <FolderKanban className="h-4 w-4 text-brand-600" />,
  note: <MessageSquare className="h-4 w-4 text-blue-600" />,
  info: <Info className="h-4 w-4 text-gray-500" />,
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'الآن'
  if (m < 60) return `منذ ${m} د`
  const h = Math.floor(m / 60)
  if (h < 24) return `منذ ${h} س`
  const d = Math.floor(h / 24)
  return `منذ ${d} يوم`
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<AppNotification[]>([])
  const [unread, setUnread] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const load = useCallback(async () => {
    try {
      const { items, unread } = await getMyNotifications()
      setItems(items)
      setUnread(unread)
    } catch { /* ignore transient errors */ }
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 30000) // poll every 30s
    // Refresh the moment the user comes back to the tab — feels instant
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      clearInterval(t)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [load])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  async function openItem(n: AppNotification) {
    setOpen(false)
    if (!n.is_read) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)))
      setUnread((u) => Math.max(0, u - 1))
      markNotificationRead(n.id).catch(() => {})
    }
    if (n.link) router.push(n.link)
  }

  async function markAll() {
    setItems((prev) => prev.map((x) => ({ ...x, is_read: true })))
    setUnread(0)
    await markAllNotificationsRead().catch(() => {})
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        aria-label="الإشعارات"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -end-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 top-full mt-2 w-80 rounded-2xl border border-gray-100 bg-white shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-50 px-4 py-3">
            <p className="text-sm font-bold text-gray-900">الإشعارات</p>
            {unread > 0 && (
              <button onClick={markAll} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">
                <CheckCheck className="h-3.5 w-3.5" /> تعليم الكل كمقروء
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <Bell className="h-7 w-7 text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">لا توجد إشعارات</p>
              </div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => openItem(n)}
                  className={`flex w-full items-start gap-3 border-b border-gray-50 px-4 py-3 text-start transition-colors hover:bg-gray-50 ${n.is_read ? '' : 'bg-brand-50/40'}`}
                >
                  <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 shrink-0">
                    {TYPE_ICON[n.type] ?? TYPE_ICON.info}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm leading-snug ${n.is_read ? 'text-gray-700' : 'font-semibold text-gray-900'}`}>{n.title}</p>
                    {n.body && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>}
                    <p className="text-[10px] text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.is_read && <span className="mt-1.5 h-2 w-2 rounded-full bg-brand-500 shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
