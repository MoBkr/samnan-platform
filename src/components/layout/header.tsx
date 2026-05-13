'use client'

import { Menu, Bell } from 'lucide-react'

interface HeaderProps {
  title?: string
  onMenuClick: () => void
}

export function Header({ title, onMenuClick }: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm lg:px-6">
      <button
        onClick={onMenuClick}
        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {title && (
        <h2 className="text-lg font-semibold text-gray-900 lg:hidden">{title}</h2>
      )}

      <div className="ms-auto flex items-center gap-2">
        <button className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100">
          <Bell className="h-5 w-5" />
        </button>
      </div>
    </header>
  )
}
