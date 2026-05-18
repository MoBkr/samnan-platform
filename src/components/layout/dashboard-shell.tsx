'use client'

import { useState } from 'react'
import { Sidebar } from './sidebar'
import { Header } from './header'
import type { Profile } from '@/types/database'
import { cn } from '@/lib/utils'

interface DashboardShellProps {
  profile: Profile
  children: React.ReactNode
}

export function DashboardShell({ profile, children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'lg:relative lg:block lg:shrink-0',
          sidebarOpen
            ? 'fixed inset-y-0 start-0 z-50 block'
            : 'hidden lg:block'
        )}
      >
        <Sidebar profile={profile} onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header profile={profile} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
