'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[dashboard error]', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 border border-red-100">
        <AlertTriangle className="h-8 w-8 text-red-500" />
      </div>
      <h2 className="text-lg font-bold text-gray-900">حدث خطأ غير متوقع</h2>
      <p className="mt-2 max-w-md text-sm text-gray-500 leading-relaxed">
        نعتذر، حدث خطأ أثناء تحميل هذه الصفحة. جرّب إعادة المحاولة، وإذا استمر المشكلة تواصل مع الدعم.
      </p>
      {error?.message && (
        <pre className="mt-4 max-w-md overflow-x-auto rounded-xl bg-gray-50 border border-gray-100 p-3 text-start text-xs text-gray-600 whitespace-pre-wrap" dir="ltr">
          {error.message}
        </pre>
      )}
      {error?.digest && <p className="mt-2 text-xs text-gray-400">رمز الخطأ: {error.digest}</p>}
      <Button onClick={reset} className="mt-6 gap-2">
        <RotateCcw className="h-4 w-4" />
        إعادة المحاولة
      </Button>
    </div>
  )
}
