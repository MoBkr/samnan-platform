'use client'

import { useState } from 'react'
import Link from 'next/link'
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
    <div className="flex min-h-screen bg-white">
      {/* Branding Panel — Right side (RTL) */}
      <div className="hidden lg:flex lg:w-[42%] flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-800 p-12 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute inset-0 overflow-hidden opacity-10">
          <div className="absolute -top-10 -right-10 h-80 w-80 rounded-full bg-blue-500 blur-3xl" />
          <div className="absolute bottom-10 left-0 h-60 w-60 rounded-full bg-indigo-600 blur-3xl" />
          <div className="absolute top-1/2 left-1/4 h-40 w-40 rounded-full bg-sky-400 blur-2xl" />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center">
          {/* Logo container */}
          <div className="mb-8 relative">
            <div className="flex h-32 w-32 items-center justify-center rounded-3xl bg-white/10 shadow-2xl backdrop-blur-sm border border-white/20 p-3">
              <Image
                src="/logo.png"
                alt="سمنان"
                width={88}
                height={88}
                className="object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            </div>
          </div>

          <h1 className="text-4xl font-bold text-white tracking-wide mb-2">منصة سمنان</h1>
          <p className="text-blue-300 text-lg font-medium mb-2">مجموعة سمنان القابضة</p>

          <div className="flex items-center gap-3 mt-4 mb-10">
            <div className="h-px w-16 bg-blue-500/40" />
            <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
            <div className="h-px w-16 bg-blue-500/40" />
          </div>

          {/* Stats or features */}
          <div className="grid grid-cols-3 gap-4 mb-10 w-full max-w-xs">
            {[
              { num: '5', label: 'أدوار' },
              { num: '8', label: 'مراحل' },
              { num: '١٠٠٪', label: 'متكامل' },
            ].map(({ num, label }) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center backdrop-blur-sm">
                <p className="text-2xl font-bold text-white">{num}</p>
                <p className="text-xs text-blue-300 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          <p className="text-slate-400 text-sm leading-relaxed max-w-[260px]">
            نظام إدارة المشاريع الداخلي لمتابعة دورة حياة كل مشروع من التعاقد حتى التسليم
          </p>

          {/* Second logo */}
          <div className="mt-10 opacity-40">
            <Image
              src="/logo-white.jpg"
              alt="سمنان"
              width={100}
              height={40}
              className="object-contain brightness-200"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          </div>
        </div>
      </div>

      {/* Form Panel — Left side (RTL) */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 lg:p-12 bg-gray-50/50">
        {/* Mobile logo */}
        <div className="mb-8 flex flex-col items-center lg:hidden">
          <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-900 shadow-lg p-2">
            <Image src="/logo.png" alt="سمنان" width={60} height={60} className="object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">منصة سمنان</h1>
          <p className="text-sm text-gray-500">مجموعة سمنان القابضة</p>
        </div>

        <div className="w-full max-w-md">
          {/* Form header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900">أهلاً بك</h2>
            <p className="mt-2 text-gray-500">سجّل دخولك للوصول إلى لوحة التحكم</p>
          </div>

          {/* Login card */}
          <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@samnan.sa"
                  required
                  autoComplete="email"
                  dir="ltr"
                  className="text-start h-12"
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
                  className="text-start h-12"
                />
              </div>

              {error && (
                <div className="flex items-start gap-3 rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-700">
                  <span className="mt-0.5 text-red-500">⚠</span>
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full h-12 text-base font-semibold" loading={loading}>
                {loading ? 'جاري التحقق...' : 'تسجيل الدخول'}
              </Button>
            </form>
          </div>

          <p className="mt-6 text-center text-sm text-gray-500">
            موظف جديد؟{' '}
            <Link href="/signup" className="font-semibold text-blue-600 hover:underline">
              إنشاء حساب جديد
            </Link>
          </p>

          <p className="mt-10 text-center text-xs text-gray-400">
            بناء بواسطة{' '}
            <a href="mailto:ai@tfco.sa" className="font-medium text-gray-500 hover:text-gray-700">
              Thakaa Flow
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
