'use client'

import { useState, useTransition, useRef } from 'react'
import { toast } from 'sonner'
import { Upload, X, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createProject } from '@/lib/actions/projects'
import { uploadFile } from '@/lib/actions/upload'
import type { Profile } from '@/types/database'

interface NewProjectFormProps {
  coordinators: Pick<Profile, 'id' | 'full_name' | 'role'>[]
  salesEngineers: Pick<Profile, 'id' | 'full_name' | 'role'>[]
  currentProfile: Profile
}

export function NewProjectForm({ coordinators, salesEngineers, currentProfile }: NewProjectFormProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [contractFile, setContractFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Coordinators can only assign themselves; admins/others see everyone
  const visibleCoordinators = currentProfile.role === 'coordinator'
    ? coordinators.filter((c) => c.id === currentProfile.id)
    : coordinators

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const form = e.currentTarget

    startTransition(async () => {
      const formData = new FormData(form)

      // Upload contract if provided
      if (contractFile) {
        const upForm = new FormData()
        upForm.set('file', contractFile)
        upForm.set('folder', 'contracts')
        const upResult = await uploadFile(upForm)
        if ('error' in upResult) {
          setError(upResult.error)
          toast.error(upResult.error)
          return
        }
        formData.set('contract_url', upResult.url)
      }

      const result = await createProject(formData)
      if (result?.error) {
        setError(result.error)
        toast.error(result.error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Project info */}
      <Card>
        <CardHeader>
          <CardTitle>معلومات المشروع</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="project_name">اسم المشروع *</Label>
              <Input id="project_name" name="project_name" placeholder="مشروع المطبخ" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="client_name">اسم العميل *</Label>
              <Input id="client_name" name="client_name" placeholder="أحمد محمد" required />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="total_amount">القيمة الإجمالية (ريال)</Label>
              <Input id="total_amount" name="total_amount" type="number" min="0" step="0.01" placeholder="0.00" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="start_date">تاريخ البداية</Label>
              <Input id="start_date" name="start_date" type="date" dir="ltr" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expected_end_date">التاريخ المتوقع للانتهاء</Label>
              <Input id="expected_end_date" name="expected_end_date" type="date" dir="ltr" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contract upload */}
      <Card>
        <CardHeader>
          <CardTitle>العقد</CardTitle>
        </CardHeader>
        <CardContent>
          <input type="hidden" name="contract_url" />
          {contractFile ? (
            <div className="flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 shrink-0">
                <FileText className="h-5 w-5 text-brand-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{contractFile.name}</p>
                <p className="text-xs text-gray-500">{(contractFile.size / 1024).toFixed(0)} KB</p>
              </div>
              <button
                type="button"
                onClick={() => { setContractFile(null); if (fileRef.current) fileRef.current.value = '' }}
                className="rounded-lg p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center gap-2.5 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 py-8 text-center hover:border-brand-300 hover:bg-brand-50/30 transition-colors"
            >
              <Upload className="h-7 w-7 text-gray-400" />
              <div>
                <p className="text-sm font-semibold text-gray-700">ارفع العقد هنا</p>
                <p className="text-xs text-gray-400 mt-1">PDF — حتى 10 ميجابايت</p>
              </div>
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            className="hidden"
            onChange={(e) => setContractFile(e.target.files?.[0] ?? null)}
          />
        </CardContent>
      </Card>

      {/* Team */}
      <Card>
        <CardHeader>
          <CardTitle>الفريق</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="coordinator_id">الكوردنيتر</Label>
              {currentProfile.role === 'coordinator' ? (
                <>
                  <input type="hidden" name="coordinator_id" value={currentProfile.id} />
                  <div className="flex h-10 items-center rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700">
                    {currentProfile.full_name}
                  </div>
                </>
              ) : (
                <Select
                  id="coordinator_id"
                  name="coordinator_id"
                  placeholder="اختر الكوردنيتر"
                  defaultValue=""
                >
                  {visibleCoordinators.map((c) => (
                    <option key={c.id} value={c.id}>{c.full_name}</option>
                  ))}
                </Select>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sales_engineer_id">مهندس المبيعات</Label>
              <Select
                id="sales_engineer_id"
                name="sales_engineer_id"
                placeholder="اختر المهندس"
                defaultValue={currentProfile.role === 'sales_engineer' ? currentProfile.id : ''}
              >
                {salesEngineers.map((s) => (
                  <option key={s.id} value={s.id}>{s.full_name}</option>
                ))}
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => history.back()}>إلغاء</Button>
        <Button type="submit" loading={isPending}>
          {isPending ? 'جاري الإنشاء...' : 'إنشاء المشروع'}
        </Button>
      </div>
    </form>
  )
}
