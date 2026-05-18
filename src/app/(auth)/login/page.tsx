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
    <div className="flex min-h-screen">
      {/* === Form Panel (Right in RTL — shown first) === */}
      <div className="flex flex-1 flex-col items-center justify-center bg-gray-50 p-6 lg:p-16">
        {/* Mobile logo */}
        <div className="mb-10 lg:hidden">
          <div className="bg-white rounded-2xl px-6 py-4 shadow-md border border-gray-100">
            <Image src="/logo.png" alt="سمنان" width={180} height={65} className="object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          </div>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8 text-end">
            <h1 className="text-3xl font-bold text-gray-900">أهلاً بك</h1>
            <p className="mt-1.5 text-gray-500">سجّل دخولك للوصول إلى منصة سمنان</p>
          </div>

          <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input id="email" name="email" type="email" placeholder="you@samnan.sa"
                  required autoComplete="email" dir="ltr" className="h-12 text-start" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">كلمة المرور</Label>
                <Input id="password" name="password" type="password" placeholder="••••••••"
                  required autoComplete="current-password" dir="ltr" className="h-12 text-start" />
              </div>
              {error && (
                <div className="flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-700">
                  <span className="mt-px shrink-0">⚠</span>
                  <span>{error}</span>
                </div>
              )}
              <Button type="submit" className="w-full h-12 text-base font-semibold rounded-xl" loading={loading}>
                {loading ? 'جاري التحقق...' : 'تسجيل الدخول'}
              </Button>
            </form>
          </div>

          <p className="mt-6 text-center text-sm text-gray-500">
            موظف جديد؟{' '}
            <Link href="/signup" className="font-semibold text-brand-600 hover:underline">إنشاء حساب</Link>
          </p>
        </div>

        <p className="mt-12 text-center text-xs text-gray-400">
          تصميم وتطوير بواسطة{' '}
          <a href="https://tfco.sa/" target="_blank" rel="noreferrer" className="font-medium text-gray-500 hover:text-gray-700 transition-colors">Thakaa Flow</a>
        </p>
      </div>

      {/* === Brand Panel (Left in RTL — shown second) === */}
      <div className="hidden lg:flex lg:w-[45%] flex-col items-center justify-between bg-brand-700 p-12 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-brand-600/40 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-brand-800/60 blur-2xl" />
          <div className="absolute top-1/2 right-1/2 h-56 w-56 rounded-full bg-white/5 blur-2xl" />
          {/* Hex grid pattern */}
          <svg className="absolute inset-0 h-full w-full opacity-5" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="hexgrid" width="60" height="52" patternUnits="userSpaceOnUse">
                <polygon points="30,2 58,17 58,47 30,62 2,47 2,17" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hexgrid)"/>
          </svg>
        </div>

        {/* Top: Main logo */}
        <div className="relative z-10 w-full">
          <div className="flex justify-center">
            <div className="bg-white rounded-2xl px-8 py-5 shadow-2xl">
              <Image
                src="/logo.png"
                alt="مجموعة سمنان القابضة"
                width={220}
                height={80}
                className="object-contain"
                priority
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            </div>
          </div>
        </div>

        {/* Center: Title + stats */}
        <div className="relative z-10 text-center">
          <div className="mb-8">
            <h2 className="text-4xl font-bold text-white leading-tight">منصة الإدارة</h2>
            <h2 className="text-4xl font-bold text-brand-300 leading-tight">الداخلية</h2>
          </div>
          <p className="text-brand-200 text-base leading-relaxed max-w-xs mx-auto">
            نظام متكامل لإدارة دورة حياة المشاريع — من التعاقد حتى التسليم النهائي
          </p>

          {/* Stats row */}
          <div className="mt-10 flex items-center justify-center gap-6">
            {[
              { n: '4', label: 'أدوار وظيفية' },
              { n: '5', label: 'مراحل تنفيذ' },
              { n: '100%', label: 'رقمي' },
            ].map(({ n, label }) => (
              <div key={label} className="text-center">
                <p className="text-3xl font-bold text-white">{n}</p>
                <p className="text-xs text-brand-300 mt-1 whitespace-nowrap">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom: subsidiary logos strip */}
        <div className="relative z-10 w-full">
          <div className="border-t border-white/10 pt-6">
            <Image
              src="/logo2.jpg"
              alt="مجموعات سمنان"
              width={340}
              height={60}
              className="object-contain opacity-70 mx-auto rounded-lg"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          </div>
        </div>
      </div>

    </div>
  )
}
