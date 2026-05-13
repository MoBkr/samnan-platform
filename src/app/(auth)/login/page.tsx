'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signIn } from '@/lib/actions/auth'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const result = await signIn(formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4">
      <div className="w-full max-w-md">
        {/* Logo Card */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-xl">
            <Image
              src="/logo.png"
              alt="سمنان"
              width={56}
              height={56}
              className="object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
              }}
            />
          </div>
          <h1 className="text-3xl font-bold text-white">منصة سمنان</h1>
          <p className="mt-1 text-sm text-blue-300">مجموعة سمنان القابضة</p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl bg-white p-8 shadow-2xl">
          <h2 className="mb-6 text-xl font-semibold text-gray-900">تسجيل الدخول</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                autoComplete="email"
                dir="ltr"
                className="text-start"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                autoComplete="current-password"
                dir="ltr"
                className="text-start"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              {loading ? 'جاري الدخول...' : 'تسجيل الدخول'}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-blue-400">
          بناء بواسطة Thakaa Flow
        </p>
      </div>
    </div>
  )
}
