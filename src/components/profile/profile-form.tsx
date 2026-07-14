'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Camera, Trash2, Lock, User, ShieldAlert, Check, Mail, Phone, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateMyProfile, changeMyPassword } from '@/lib/actions/profile'
import { uploadFileDirect } from '@/lib/upload-client'
import { ROLE_LABELS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types/database'

const ROLE_COLOR: Record<string, string> = {
  coordinator: 'bg-brand-600',
  sales_engineer: 'bg-emerald-600',
  installation: 'bg-purple-600',
  admin: 'bg-rose-600',
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('')
}

export function ProfileForm({ profile, email }: { profile: Profile; email: string }) {
  const router = useRouter()
  const [fullName, setFullName] = useState(profile.full_name)
  const [phone, setPhone] = useState(profile.phone ?? '')
  const [avatar, setAvatar] = useState(profile.avatar_url)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()

  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [pwPending, startPw] = useTransition()

  const infoDirty = fullName.trim() !== profile.full_name || (phone.trim() || '') !== (profile.phone ?? '')

  async function pickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('اختر صورة'); return }

    setUploading(true)
    const up = await uploadFileDirect(file, `avatars/${profile.id}`)
    setUploading(false)
    if ('error' in up) { toast.error(up.error); return }

    startTransition(async () => {
      const r = await updateMyProfile({ avatarUrl: up.url })
      if (r?.error) toast.error(r.error)
      else { setAvatar(up.url); toast.success('تم تحديث الصورة'); router.refresh() }
    })
  }

  function removeAvatar() {
    startTransition(async () => {
      const r = await updateMyProfile({ avatarUrl: null })
      if (r?.error) toast.error(r.error)
      else { setAvatar(null); toast.success('تم حذف الصورة'); router.refresh() }
    })
  }

  function saveInfo() {
    startTransition(async () => {
      const r = await updateMyProfile({ fullName, phone })
      if (r?.error) toast.error(r.error)
      else { toast.success('تم حفظ البيانات — وأُبلغت الإدارة بالتعديل'); router.refresh() }
    })
  }

  function savePassword() {
    if (!current) { toast.error('أدخل كلمة المرور الحالية'); return }
    if (next.length < 6) { toast.error('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل'); return }
    if (next !== confirm) { toast.error('تأكيد كلمة المرور غير مطابق'); return }

    startPw(async () => {
      const r = await changeMyPassword(current, next)
      if (r?.error) toast.error(r.error)
      else {
        setCurrent(''); setNext(''); setConfirm('')
        toast.success('تم تغيير كلمة المرور — وأُبلغت الإدارة')
      }
    })
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Identity card */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-1">
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt={profile.full_name}
                className="h-28 w-28 rounded-full border-4 border-white object-cover shadow-md" />
            ) : (
              <div className={cn(
                'flex h-28 w-28 items-center justify-center rounded-full border-4 border-white text-3xl font-bold text-white shadow-md',
                ROLE_COLOR[profile.role] ?? 'bg-gray-500',
              )}>
                {initials(profile.full_name)}
              </div>
            )}

            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading || isPending}
              className="absolute -bottom-1 -start-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-brand-600 text-white shadow-md transition-colors hover:bg-brand-700 disabled:opacity-60"
              title="تغيير الصورة"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickAvatar} />
          </div>

          <h2 className="mt-4 text-lg font-bold text-gray-900">{profile.full_name}</h2>
          <span className={cn('mt-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white', ROLE_COLOR[profile.role] ?? 'bg-gray-500')}>
            {ROLE_LABELS[profile.role]}
          </span>

          <p className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
            <Mail className="h-3.5 w-3.5" />
            {email}
          </p>

          {avatar && (
            <button onClick={removeAvatar} disabled={isPending}
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-red-500">
              <Trash2 className="h-3.5 w-3.5" />
              حذف الصورة
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4 lg:col-span-2">
        {/* Personal info */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <User className="h-4 w-4 text-brand-600" />
            <h3 className="text-sm font-bold text-gray-900">البيانات الشخصية</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>الاسم الكامل</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>رقم الجوال</Label>
              <div className="relative">
                <Phone className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" placeholder="05xxxxxxxx" className="pe-9" />
              </div>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>البريد الإلكتروني</Label>
              <Input value={email} disabled dir="ltr" className="bg-gray-50 text-gray-500" />
              <p className="text-[11px] text-gray-400">لتغيير البريد أو الدور، راجع الإدارة.</p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3 border-t border-gray-100 pt-4">
            <Button size="sm" onClick={saveInfo} loading={isPending} disabled={!infoDirty}>
              <Check className="h-4 w-4" />
              حفظ التعديلات
            </Button>
            {infoDirty && <span className="text-xs text-amber-600">لديك تعديلات غير محفوظة</span>}
          </div>
        </div>

        {/* Password */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Lock className="h-4 w-4 text-brand-600" />
            <h3 className="text-sm font-bold text-gray-900">تغيير كلمة المرور</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>كلمة المرور الحالية</Label>
              <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} dir="ltr" autoComplete="current-password" />
            </div>
            <div className="space-y-1.5">
              <Label>كلمة المرور الجديدة</Label>
              <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} dir="ltr" autoComplete="new-password" />
            </div>
            <div className="space-y-1.5">
              <Label>تأكيد كلمة المرور</Label>
              <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} dir="ltr" autoComplete="new-password" />
            </div>
          </div>

          <div className="mt-4 border-t border-gray-100 pt-4">
            <Button size="sm" onClick={savePassword} loading={pwPending} disabled={!current || !next || !confirm}>
              <Lock className="h-4 w-4" />
              تغيير كلمة المرور
            </Button>
          </div>
        </div>

        {/* The rule, stated plainly */}
        <div className="flex items-start gap-2.5 rounded-2xl border border-amber-100 bg-amber-50/60 px-4 py-3">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <p className="text-xs leading-relaxed text-amber-800">
            تغيير كلمة المرور أو الاسم أو رقم الجوال يُسجَّل في سجل التدقيق ويصل إشعار به إلى الإدارة العليا.
            تغيير الصورة الشخصية لا يُبلَّغ عنه.
          </p>
        </div>
      </div>
    </div>
  )
}
