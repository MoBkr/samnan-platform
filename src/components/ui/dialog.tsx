'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DialogProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
}

function Dialog({ open, onClose, children, className }: DialogProps) {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative z-10 my-4 max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl',
          className
        )}
      >
        {children}
      </div>
    </div>
  )
}

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mb-4 flex items-start justify-between', className)} {...props} />
  )
}

function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={cn('text-lg font-semibold text-gray-900', className)} {...props} />
  )
}

function DialogClose({ onClose }: { onClose: () => void }) {
  return (
    <button
      onClick={onClose}
      className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
    >
      <X className="h-5 w-5" />
    </button>
  )
}

function DialogContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('', className)} {...props} />
}

function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('mt-5 flex justify-end gap-3 border-t border-gray-100 pt-4', className)}
      {...props}
    />
  )
}

export { Dialog, DialogHeader, DialogTitle, DialogClose, DialogContent, DialogFooter }
