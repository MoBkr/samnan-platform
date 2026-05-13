'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createProject } from '@/lib/actions/projects'
import type { Profile } from '@/types/database'

interface NewProjectFormProps {
  coordinators: Pick<Profile, 'id' | 'full_name' | 'role'>[]
  salesEngineers: Pick<Profile, 'id' | 'full_name' | 'role'>[]
  currentProfile: Profile
}

export function NewProjectForm({ coordinators, salesEngineers, currentProfile }: NewProjectFormProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await createProject(formData)
      if (result?.error) {
        setError(result.error)
        toast.error(result.error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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

      <Card>
        <CardHeader>
          <CardTitle>الفريق</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="coordinator_id">الكوردنيتر</Label>
              <Select
                id="coordinator_id"
                name="coordinator_id"
                placeholder="اختر الكوردنيتر"
                defaultValue={currentProfile.role === 'coordinator' ? currentProfile.id : ''}
              >
                {coordinators.map((c) => (
                  <option key={c.id} value={c.id}>{c.full_name}</option>
                ))}
              </Select>
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
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => history.back()}>
          إلغاء
        </Button>
        <Button type="submit" loading={isPending}>
          إنشاء المشروع
        </Button>
      </div>
    </form>
  )
}
