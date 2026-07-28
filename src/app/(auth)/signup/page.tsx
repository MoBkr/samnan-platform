'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Clock3, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { AuthShell } from '@/components/auth/auth-shell'
import { signUp } from '@/lib/actions/auth'
import { ROLE_LABELS } from '@/lib/constants'

const ROLES = ['coordinator', 'sales_engineer', 'installation', 'admin'] as const

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [pending, setPending] = useState(false)

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
    setLoading(false)
    if (result?.error) {
      setError(result.error)
    } else if (result?.pending) {
      setPending(true)
    }
  }

  return (
    <AuthShell
      heading={pending ? 'تم إنشاء الحساب' : 'إنشاء حساب'}
      subheading={pending ? 'حسابك قيد مراجعة الإدارة' : 'سجّل بياناتك للبدء في استخدام المنصة'}
      brandTitle="انضم إلى"
      brandTitleAccent="فريق سمنان"
      brandText="سجّل حسابك للوصول إلى منصة إدارة المشاريع الداخلية"
    >
      {pending ? (
        <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 border border-amber-100">
            <Clock3 className="h-7 w-7 text-amber-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">حسابك قيد المراجعة</h2>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">
            تم إنشاء حسابك بنجاح. لحماية المنصة، يجب أن توافق الإدارة على حسابك أولاً.
            سيتم تفعيله بعد التأكد من بياناتك، ثم يمكنك تسجيل الدخول.
          </p>
          <Link href="/login" className="block mt-6">
            <Button variant="outline" className="w-full h-11 rounded-xl gap-1.5">
              <ArrowRight className="h-4 w-4" />
              العودة لتسجيل الدخول
            </Button>
          </Link>
        </div>
      ) : (
        <>
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
                  placeholder="you@samnan.sa" required dir="ltr" className="h-11 text-start" />
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
                  <PasswordInput id="password" name="password"
                    placeholder="••••••••" required className="h-11" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm_password">تأكيد كلمة المرور</Label>
                  <PasswordInput id="confirm_password" name="confirm_password"
                    placeholder="••••••••" required className="h-11" />
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
        </>
      )}
    </AuthShell>
  )
}
