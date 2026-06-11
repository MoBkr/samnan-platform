'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, MailCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthShell } from '@/components/auth/auth-shell'
import { requestPasswordReset } from '@/lib/actions/auth'

export default function ForgotPasswordEmailPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [sentTo, setSentTo] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const email = (formData.get('email') as string) ?? ''
    const result = await requestPasswordReset(formData)
    setLoading(false)
    if (result?.error) {
      setError(result.error)
    } else {
      setSentTo(email)
      setSent(true)
    }
  }

  return (
    <AuthShell
      heading={sent ? 'تحقّق من بريدك' : 'الاستعادة عبر البريد'}
      subheading={sent ? 'أرسلنا لك رابط إعادة التعيين' : 'أدخل بريدك وسنرسل لك رابطاً لإعادة التعيين'}
      brandTitleAccent="الداخلية"
    >
      {sent ? (
        <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-green-50 border border-green-100">
            <MailCheck className="h-7 w-7 text-green-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">تم إرسال رابط إعادة التعيين</h2>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">
            تحقّق من البريد الإلكتروني الخاص بك
            <br />
            <span className="font-semibold text-gray-700" dir="ltr">{sentTo}</span>
          </p>
          <p className="mt-3 text-xs text-gray-400 leading-relaxed">
            افتح الرابط في الرسالة لتعيين كلمة مرور جديدة. لم تصلك؟ تحقّق من مجلد البريد المزعج (Spam).
          </p>
          <div className="mt-6 space-y-2">
            <Button variant="outline" className="w-full h-11 rounded-xl"
              onClick={() => { setSent(false); setError(null) }}>
              إرسال إلى بريد آخر
            </Button>
            <Link href="/login" className="block">
              <Button variant="ghost" className="w-full h-11 rounded-xl gap-1.5">
                <ArrowRight className="h-4 w-4" />
                العودة لتسجيل الدخول
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input id="email" name="email" type="email" placeholder="you@samnan.sa"
                  required autoComplete="email" dir="ltr" className="h-12 text-start" />
              </div>
              {error && (
                <div className="flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-700">
                  <span className="mt-px shrink-0">⚠</span>
                  <span>{error}</span>
                </div>
              )}
              <Button type="submit" className="w-full h-12 text-base font-semibold rounded-xl" loading={loading}>
                {loading ? 'جاري الإرسال...' : 'إرسال رابط الاستعادة'}
              </Button>
            </form>
          </div>

          <p className="mt-6 text-center text-sm text-gray-500">
            <Link href="/forgot-password" className="inline-flex items-center gap-1.5 font-semibold text-brand-600 hover:underline">
              <ArrowRight className="h-4 w-4" />
              طريقة أخرى للاستعادة
            </Link>
          </p>
        </>
      )}
    </AuthShell>
  )
}
