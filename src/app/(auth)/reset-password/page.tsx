'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, CheckCircle2, Eye, EyeOff, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthShell } from '@/components/auth/auth-shell'
import { createClient } from '@/lib/supabase/client'
import { completePasswordReset } from '@/lib/actions/auth'

type Status = 'verifying' | 'ready' | 'invalid' | 'done'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [status, setStatus] = useState<Status>('verifying')
  const [tokenHash, setTokenHash] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)

    // Server callback couldn't establish a session.
    if (params.get('error')) { setStatus('invalid'); return }

    // Preferred flow: email link carries a token_hash. Show the form WITHOUT
    // verifying yet — we verify on submit (scanner-proof, works any device).
    const th = params.get('token_hash')
    if (th) { setTokenHash(th); setStatus('ready'); return }

    // Fallback: PKCE/session flow (came via /auth/callback which set a session).
    const supabase = createClient()
    let resolved = false
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (session && event === 'SIGNED_IN')) { resolved = true; setStatus('ready') }
    })
    supabase.auth.getSession().then(({ data }) => { if (data.session) { resolved = true; setStatus('ready') } })
    const timer = setTimeout(() => { if (!resolved) setStatus('invalid') }, 3500)
    return () => { subscription.unsubscribe(); clearTimeout(timer) }
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
      return
    }
    if (password !== confirm) {
      setError('كلمتا المرور غير متطابقتين')
      return
    }

    setLoading(true)

    // token_hash flow → verify + update on the server in one step
    if (tokenHash) {
      const result = await completePasswordReset(tokenHash, password)
      setLoading(false)
      if (result?.error) {
        if (result.error.includes('انتهت')) setStatus('invalid')
        else setError(result.error)
        return
      }
      setStatus('done')
      return
    }

    // Fallback: session already established (PKCE)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (updateError) {
      if (updateError.message.includes('New password should be different')) {
        setError('كلمة المرور الجديدة يجب أن تكون مختلفة عن القديمة')
      } else if (updateError.message.toLowerCase().includes('session')) {
        setStatus('invalid')
      } else {
        setError('تعذّر تحديث كلمة المرور. حاول مرة أخرى')
      }
      return
    }
    setStatus('done')
  }

  // ── Verifying ──
  if (status === 'verifying') {
    return (
      <AuthShell heading="جارٍ التحقق" subheading="نتحقق من رابط إعادة التعيين">
        <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100 flex flex-col items-center gap-4 py-12">
          <svg className="h-8 w-8 animate-spin text-brand-600" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-gray-500">لحظات من فضلك...</p>
        </div>
      </AuthShell>
    )
  }

  // ── Invalid / expired link ──
  if (status === 'invalid') {
    return (
      <AuthShell heading="رابط غير صالح" subheading="انتهت صلاحية الرابط أو أنه غير صحيح">
        <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 border border-red-100">
            <ShieldAlert className="h-7 w-7 text-red-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">الرابط منتهي الصلاحية</h2>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">
            رابط إعادة التعيين صالح لفترة محدودة فقط. اطلب رابطاً جديداً للمتابعة.
          </p>
          <div className="mt-6 space-y-2">
            <Link href="/forgot-password" className="block">
              <Button className="w-full h-11 rounded-xl">طلب رابط جديد</Button>
            </Link>
            <Link href="/login" className="block">
              <Button variant="ghost" className="w-full h-11 rounded-xl gap-1.5">
                <ArrowRight className="h-4 w-4" />
                العودة لتسجيل الدخول
              </Button>
            </Link>
          </div>
        </div>
      </AuthShell>
    )
  }

  // ── Success ──
  if (status === 'done') {
    return (
      <AuthShell heading="تم بنجاح" subheading="تم تحديث كلمة المرور">
        <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-green-50 border border-green-100">
            <CheckCircle2 className="h-7 w-7 text-green-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">تم تحديث كلمة المرور</h2>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">
            يمكنك الآن استخدام كلمة المرور الجديدة للدخول إلى المنصة.
          </p>
          <Button className="mt-6 w-full h-11 rounded-xl" onClick={() => router.push('/dashboard')}>
            الدخول إلى المنصة
          </Button>
        </div>
      </AuthShell>
    )
  }

  // ── Ready: set new password ──
  return (
    <AuthShell heading="كلمة مرور جديدة" subheading="اختر كلمة مرور قوية لحسابك">
      <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="password">كلمة المرور الجديدة</Label>
            <div className="relative">
              <Input id="password" name="password" type={show ? 'text' : 'password'}
                placeholder="••••••••" required autoComplete="new-password" dir="ltr"
                className="h-12 text-start pe-11"
                value={password} onChange={(e) => setPassword(e.target.value)} />
              <button type="button" onClick={() => setShow((s) => !s)}
                className="absolute inset-y-0 end-0 flex items-center pe-3 text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1} aria-label={show ? 'إخفاء' : 'إظهار'}>
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-400">6 أحرف على الأقل</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm">تأكيد كلمة المرور</Label>
            <Input id="confirm" name="confirm" type={show ? 'text' : 'password'}
              placeholder="••••••••" required autoComplete="new-password" dir="ltr"
              className="h-12 text-start"
              value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>

          {error && (
            <div className="flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-700">
              <span className="mt-px shrink-0">⚠</span>
              <span>{error}</span>
            </div>
          )}

          <Button type="submit" className="w-full h-12 text-base font-semibold rounded-xl" loading={loading}>
            {loading ? 'جاري الحفظ...' : 'حفظ كلمة المرور'}
          </Button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-gray-500">
        <Link href="/login" className="font-semibold text-brand-600 hover:underline">العودة لتسجيل الدخول</Link>
      </p>
    </AuthShell>
  )
}
