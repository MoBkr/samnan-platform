'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Keeps the public tracking page live: re-fetches the server data on an
// interval and whenever the client returns to the tab — no manual refresh,
// and the same link always shows the latest project status.
export function AutoRefresh({ intervalMs = 30000 }: { intervalMs?: number }) {
  const router = useRouter()
  useEffect(() => {
    const tick = () => { if (document.visibilityState === 'visible') router.refresh() }
    const id = setInterval(tick, intervalMs)
    const onVis = () => { if (document.visibilityState === 'visible') router.refresh() }
    document.addEventListener('visibilitychange', onVis)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVis) }
  }, [router, intervalMs])
  return null
}
