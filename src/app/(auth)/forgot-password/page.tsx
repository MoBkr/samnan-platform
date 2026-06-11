'use client'

import Link from 'next/link'
import { ArrowRight, Mail, UserCog, ChevronLeft } from 'lucide-react'
import { AuthShell } from '@/components/auth/auth-shell'

export default function ForgotPasswordChoicePage() {
  return (
    <AuthShell
      heading="استعادة كلمة المرور"
      subheading="اختر الطريقة المناسبة لاستعادة حسابك"
      brandTitleAccent="الداخلية"
    >
      <div className="space-y-3">
        {/* Option A — via email */}
        <Link href="/forgot-password/email" className="block group">
          <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100 hover:border-brand-300 hover:shadow-md transition-all flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 border border-brand-100 group-hover:bg-brand-100 transition-colors">
              <Mail className="h-6 w-6 text-brand-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-gray-900">عبر البريد الإلكتروني</h3>
              <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">
                نرسل لك رابطاً على بريدك لتعيين كلمة مرور جديدة بنفسك
              </p>
            </div>
            <ChevronLeft className="h-5 w-5 text-gray-300 group-hover:text-brand-500 transition-colors shrink-0" />
          </div>
        </Link>

        {/* Option B — request from manager */}
        <Link href="/forgot-password/request-admin" className="block group">
          <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100 hover:border-brand-300 hover:shadow-md transition-all flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 border border-amber-100 group-hover:bg-amber-100 transition-colors">
              <UserCog className="h-6 w-6 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-gray-900">طلب من المدير</h3>
              <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">
                يصل طلبك للإدارة، ويتم إرسال كلمة مرور جديدة على بريدك
              </p>
            </div>
            <ChevronLeft className="h-5 w-5 text-gray-300 group-hover:text-brand-500 transition-colors shrink-0" />
          </div>
        </Link>
      </div>

      <p className="mt-6 text-center text-sm text-gray-500">
        <Link href="/login" className="inline-flex items-center gap-1.5 font-semibold text-brand-600 hover:underline">
          <ArrowRight className="h-4 w-4" />
          العودة لتسجيل الدخول
        </Link>
      </p>
    </AuthShell>
  )
}
