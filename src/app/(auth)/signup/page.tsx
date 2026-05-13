'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { signUp } from '@/lib/actions/auth'
import { ROLE_LABELS } from '@/lib/constants'

const ROLES = ['coordinator', 'sales_engineer', 'supply', 'installation'] as const

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    if (formData.get('password') !== formData.get('confirm_password')) {
      setError('كلمتا المرور غير متطابقتين')
      return
    }

    setLoading(true)
    const result = await signUp(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* Branding Panel — Right side (RTL) */}
      <div className="hidden lg:flex lg:w-[42%] flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-800 p-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 right-20 h-72 w-72 rounded-full bg-blue-500 blur-3xl" />
          <div className="absolute bottom-20 left-10 h-56 w-56 rounded-full bg-indigo-500 blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="mb-8 flex h-28 w-28 items-center justify-center rounded-3xl bg-white/10 shadow-2xl backdrop-blur-sm border border-white/20">
            <Image
              src="/logo.png"
              alt="سمنان"
              width={72}
              height={72}
              className="object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          </div>

          <h1 className="text-4xl font-bold text-white mb-3">منصة سمنان</h1>
          <p className="text-blue-300 text-lg mb-8">مجموعة سمنان القابضة</p>

          <div className="w-16 h-px bg-blue-500/50 mb-8" />

          <p className="text-slate-300 text-sm leading-relaxed max-w-xs">
            نظام إدارة المشاريع الداخلي لمتابعة المبيعات، التوريد، والتركيبات من مكان واحد
          </p>

          {/* Feature list */}
          <div className="mt-10 space-y-3 text-right w-full max-w-xs">
            {['إدارة كاملة لدورة المشاريع', 'متابعة الدفعات والمستحقات', 'تنسيق التوريد والتركيبات'].map((f) => (
              <div key={f} className="flex items-center gap-3">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />
                <span className="text-slate-300 text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form Panel — Left side (RTL) */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 lg:p-12">
        {/* Mobile logo */}
        <div className="mb-8 flex flex-col items-center lg:hidden">
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 shadow-lg">
            <Image src="/logo.png" alt="سمنان" width={44} height={44} className="object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          </div>
          <h1 className="text-xl font-bold text-gray-900">منصة سمنان</h1>
        </div>

        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900">إنشاء حساب جديد</h2>
            <p className="mt-2 text-gray-500">سجّل بياناتك للوصول إلى المنصة</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="full_name">الاسم الكامل</Label>
              <Input
                id="full_name"
                name="full_name"
                type="text"
                placeholder="محمد أحمد"
                required
                autoComplete="name"
              />
            </div>

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
                className="text-start"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="role">الدور الوظيفي</Label>
              <Select name="role" required placeholder="اختر دورك في الشركة">
                {ROLES.map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="password">كلمة المرور</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                  dir="ltr"
                  className="text-start"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm_password">تأكيد كلمة المرور</Label>
                <Input
                  id="confirm_password"
                  name="confirm_password"
                  type="password"
                  placeholder="••••••••"
                  required
                  dir="ltr"
                  className="text-start"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full h-12 text-base" loading={loading}>
              {loading ? 'جاري إنشاء الحساب...' : 'إنشاء الحساب'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            لديك حساب بالفعل؟{' '}
            <Link href="/login" className="font-semibold text-blue-600 hover:underline">
              تسجيل الدخول
            </Link>
          </p>

          <p className="mt-8 text-center text-xs text-gray-400">
            بناء بواسطة{' '}
            <span className="font-medium text-gray-600">Thakaa Flow</span>
          </p>
        </div>
      </div>
    </div>
  )
}
