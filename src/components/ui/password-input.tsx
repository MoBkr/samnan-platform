'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Input, type InputProps } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/**
 * Password field with a show/hide eye toggle.
 * Drop-in replacement for `<Input type="password" />` — same props.
 */
export function PasswordInput({ className, ...props }: Omit<InputProps, 'type'>) {
  const [show, setShow] = useState(false)
  return (
    // dir="ltr" on the wrapper keeps the eye on the field's padded (right)
    // side; without it the RTL page puts `end-0` on the left, over the text.
    <div className="relative" dir="ltr">
      <Input
        {...props}
        type={show ? 'text' : 'password'}
        dir="ltr"
        className={cn('text-start pe-11', className)}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute end-0 top-0 flex h-full items-center pe-3 text-gray-400 transition-colors hover:text-gray-600"
        tabIndex={-1}
        aria-label={show ? 'إخفاء' : 'إظهار'}
        title={show ? 'إخفاء' : 'إظهار'}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}
