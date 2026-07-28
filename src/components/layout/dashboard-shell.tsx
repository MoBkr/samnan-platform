'use client'

import { useState } from 'react'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { LangProvider } from '@/lib/i18n'
import type { Profile } from '@/types/database'
import { cn } from '@/lib/utils'

interface DashboardShellProps {
  profile: Profile
  children: React.ReactNode
}

export function DashboardShell({ profile, children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <LangProvider>
    <div className="flex h-screen overflow-hidden">
      {/* Overlay — all screen sizes */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-brand-900/40 backdrop-blur-[3px] animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — always overlay, never pushes content */}
      <aside
        className={cn(
          'fixed inset-y-0 start-0 z-50 transition-transform duration-300 will-change-transform',
          sidebarOpen ? 'translate-x-0' : 'translate-x-full rtl:translate-x-full ltr:-translate-x-full pointer-events-none'
        )}
        style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        <Sidebar profile={profile} onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header profile={profile} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {/* Opacity-only entrance: a transform here would become a containing
              block and trap every fixed-position Dialog under the header. */}
          <div className="animate-fade-in mx-auto max-w-[1400px]">
            {children}
          </div>
        </main>
      </div>
    </div>
    </LangProvider>
  )
}
