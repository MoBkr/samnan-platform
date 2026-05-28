'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { signUp } from '@/lib/actions/auth'
import { ROLE_LABELS } from '@/lib/constants'

const ROLES = ['coordinator', 'sales_engineer', 'installation', 'admin'] as const

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

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
    } else if (result?.redirectTo) {
      router.push(result.redirectTo)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* === Form Panel (Right in RTL — shown first) === */}
      <div className="flex flex-1 flex-col items-center justify-center bg-gray-50 p-6 lg:p-16">
        <div className="mb-10 lg:hidden">
          <div className="bg-white rounded-2xl px-6 py-4 shadow-md border border-gray-100">
            <Image src="/logo.png" alt="سمنان" width={180} height={65} className="object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          </div>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8 text-end">
            <h1 className="text-3xl font-bold text-gray-900">إنشاء حساب</h1>
            <p className="mt-1.5 text-gray-500">سجّل بياناتك للبدء في استخدام المنصة</p>
          </div>

          <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="full_name">الاسم الكامل</Label>
                <Input id="full_name" name="full_name" type="text"
                  placeholder="محمد أحمد" required autoComplete="name" className="h-11" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input id="email" name="email" type="email"
                  placeholder="you@samnan.sa" required dir="ltr"
                  className="h-11 text-start" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="role">الدور الوظيفي</Label>
                <Select name="role" required placeholder="اختر دورك">
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </Select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="password">كلمة المرور</Label>
                  <Input id="password" name="password" type="password"
                    placeholder="••••••••" required dir="ltr" className="h-11 text-start" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm_password">تأكيد كلمة المرور</Label>
                  <Input id="confirm_password" name="confirm_password" type="password"
                    placeholder="••••••••" required dir="ltr" className="h-11 text-start" />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-700">
                  <span className="mt-px shrink-0">⚠</span>
                  <span>{error}</span>
                </div>
              )}

              <Button type="submit" className="w-full h-12 text-base font-semibold rounded-xl mt-2" loading={loading}>
                {loading ? 'جاري إنشاء الحساب...' : 'إنشاء الحساب'}
              </Button>
            </form>
          </div>

          <p className="mt-6 text-center text-sm text-gray-500">
            لديك حساب؟{' '}
            <Link href="/login" className="font-semibold text-brand-600 hover:underline">
              تسجيل الدخول
            </Link>
          </p>
        </div>

        <p className="mt-12 text-center text-xs text-gray-400">
          تصميم وتطوير بواسطة{' '}
          <a href="https://tfco.sa/" target="_blank" rel="noreferrer" className="font-medium text-gray-500 hover:text-gray-700 transition-colors">Thakaa Flow</a>
        </p>
      </div>

      {/* === Brand Panel (Left in RTL — shown second) === */}
      <div className="hidden lg:flex lg:w-[45%] flex-col items-center justify-between bg-brand-700 p-12 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-brand-600/40 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-brand-800/60 blur-2xl" />
          <svg className="absolute inset-0 h-full w-full opacity-5" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="hexgrid" width="60" height="52" patternUnits="userSpaceOnUse">
                <polygon points="30,2 58,17 58,47 30,62 2,47 2,17" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hexgrid)"/>
          </svg>
        </div>

        <div className="relative z-10 w-full flex justify-center">
          <div className="bg-white rounded-2xl px-8 py-5 shadow-2xl">
            <Image src="/logo.png" alt="مجموعة سمنان القابضة" width={220} height={80}
              className="object-contain" priority
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          </div>
        </div>

        <div className="relative z-10 text-center">
          <h2 className="text-4xl font-bold text-white leading-tight">انضم إلى</h2>
          <h2 className="text-4xl font-bold text-brand-300 leading-tight">فريق سمنان</h2>
          <p className="mt-6 text-brand-200 text-base leading-relaxed max-w-xs mx-auto">
            سجّل حسابك للوصول إلى منصة إدارة المشاريع الداخلية
          </p>
        </div>

        <div className="relative z-10 w-full border-t border-white/10 pt-6">
          <Image src="/logo2.jpg" alt="مجموعات سمنان" width={340} height={60}
            className="object-contain opacity-70 mx-auto rounded-lg"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
        </div>
      </div>
    </div>
  )
}
