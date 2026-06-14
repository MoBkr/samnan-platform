'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Upload, X, FileText, Briefcase, Paperclip } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createProject } from '@/lib/actions/projects'
import { saveDocumentRecord } from '@/lib/actions/attachments'
import { uploadFileDirect } from '@/lib/upload-client'
import type { Profile } from '@/types/database'

interface NewProjectFormProps {
  coordinators: Pick<Profile, 'id' | 'full_name' | 'role'>[]
  salesEngineers: Pick<Profile, 'id' | 'full_name' | 'role'>[]
  installationPersons: Pick<Profile, 'id' | 'full_name' | 'role'>[]
  coordinatorWorkload: Record<string, number>
  salesWorkload: Record<string, number>
  installationWorkload: Record<string, number>
  currentProfile: Profile
}

function workloadLabel(count: number): string {
  if (count === 0) return 'لا مشاريع نشطة'
  if (count === 1) return 'مشروع نشط واحد'
  return `${count} مشاريع نشطة`
}

function WorkloadBadge({ count }: { count: number }) {
  const color = count === 0
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : count <= 2
    ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-red-50 text-red-700 border-red-200'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${color}`}>
      <Briefcase className="h-3 w-3" />
      {workloadLabel(count)}
    </span>
  )
}

export function NewProjectForm({
  coordinators, salesEngineers, installationPersons,
  coordinatorWorkload, salesWorkload, installationWorkload,
  currentProfile,
}: NewProjectFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [contractFile, setContractFile] = useState<File | null>(null)
  const [hasInstallation, setHasInstallation] = useState(true)
  const [extraFiles, setExtraFiles] = useState<{ file: File; label: string }[]>([])
  const extraFilesRef = useRef<HTMLInputElement>(null)
  const [selectedCoordinatorId, setSelectedCoordinatorId] = useState(
    currentProfile.role === 'coordinator' ? currentProfile.id : ''
  )
  const [selectedSalesId, setSelectedSalesId] = useState(
    currentProfile.role === 'sales_engineer' ? currentProfile.id : ''
  )
  const [selectedInstallationId, setSelectedInstallationId] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const isAdmin = currentProfile.role === 'admin'
  const isCoordinator = currentProfile.role === 'coordinator'
  const isSalesEngineer = currentProfile.role === 'sales_engineer'
  const canAssignSales = isAdmin || isCoordinator
  const canAssignTeam = isAdmin || isCoordinator

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const form = e.currentTarget
    startTransition(async () => {
      try {
        const formData = new FormData(form)
        if (contractFile) {
          const upResult = await uploadFileDirect(contractFile, 'contracts')
          if ('error' in upResult) { setError(upResult.error); toast.error(upResult.error); return }
          formData.set('contract_url', upResult.url)
        }
        const result = await createProject(formData)
        if (result?.error) { setError(result.error); toast.error(result.error) }
        else if (result && 'projectId' in result && result.projectId) {
          const projectId = result.projectId
          // Upload extra attachments in background (don't block navigation)
          if (extraFiles.length > 0) {
            for (const { file, label } of extraFiles) {
              const upResult = await uploadFileDirect(file, 'other')
              if ('url' in upResult) {
                await saveDocumentRecord(projectId, 'other', upResult.url, label.trim() || file.name)
              }
            }
          }
          router.push(`/projects/${projectId}`)
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'حدث خطأ أثناء إنشاء المشروع. حاول مرة أخرى'
        setError(msg)
        toast.error(msg)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Project info */}
      <Card>
        <CardHeader><CardTitle>معلومات المشروع</CardTitle></CardHeader>
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
              <Label htmlFor="location">موقع المشروع</Label>
              <Input id="location" name="location" placeholder="الرياض — حي النخيل" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customer_account_no">رقم حساب العميل الداخلي</Label>
              <Input id="customer_account_no" name="customer_account_no" dir="ltr" className="text-start" placeholder="للمحاسبة ومتابعة المدفوعات" />
            </div>
          </div>

          {/* With / without installation */}
          <div className="space-y-1.5">
            <Label>نوع المشروع</Label>
            <input type="hidden" name="has_installation" value={hasInstallation ? 'true' : 'false'} />
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setHasInstallation(true)}
                className={`rounded-xl border p-3 text-sm font-medium transition-all ${hasInstallation ? 'border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-500/15' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}>
                <div className="font-bold">مع تركيب</div>
                <div className="text-xs mt-0.5 opacity-80">دورة كاملة: مواد ← تركيب ← إغلاق</div>
              </button>
              <button type="button" onClick={() => setHasInstallation(false)}
                className={`rounded-xl border p-3 text-sm font-medium transition-all ${!hasInstallation ? 'border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-500/15' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}>
                <div className="font-bold">بدون تركيب</div>
                <div className="text-xs mt-0.5 opacity-80">يتخطّى خطوات التركيب</div>
              </button>
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
        <CardHeader><CardTitle>العقد</CardTitle></CardHeader>
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
              <button type="button" onClick={() => { setContractFile(null); if (fileRef.current) fileRef.current.value = '' }}
                className="rounded-lg p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center gap-2.5 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 py-8 text-center hover:border-brand-300 hover:bg-brand-50/30 transition-colors">
              <Upload className="h-7 w-7 text-gray-400" />
              <div>
                <p className="text-sm font-semibold text-gray-700">ارفع العقد هنا</p>
                <p className="text-xs text-gray-400 mt-1">PDF — حتى 10 ميجابايت</p>
              </div>
            </button>
          )}
          <input ref={fileRef} type="file" accept="application/pdf,image/jpeg,image/png" className="hidden"
            onChange={(e) => setContractFile(e.target.files?.[0] ?? null)} />
        </CardContent>
      </Card>

      {/* Extra attachments */}
      <Card>
        <CardHeader><CardTitle>مرفقات إضافية</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-gray-400">ملفات إضافية تُرفع مع المشروع وتظهر في تاب المرفقات (اختياري)</p>
          {extraFiles.length > 0 && (
            <div className="space-y-2">
              {extraFiles.map(({ file, label }, i) => (
                <div key={i} className="rounded-xl border border-gray-100 bg-gray-50 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                    <span className="flex-1 text-xs text-gray-500 truncate">{file.name}</span>
                    <span className="text-xs text-gray-400">{(file.size / 1024).toFixed(0)} KB</span>
                    <button type="button" onClick={() => setExtraFiles(prev => prev.filter((_, j) => j !== i))}
                      className="rounded-lg p-1 text-gray-400 hover:text-red-500 transition-colors">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <Input
                    placeholder="عنوان المرفق (مثال: صورة الموقع، مخطط المشروع...)"
                    value={label}
                    onChange={e => setExtraFiles(prev =>
                      prev.map((item, j) => j === i ? { ...item, label: e.target.value } : item)
                    )}
                    className="h-8 text-sm"
                  />
                </div>
              ))}
            </div>
          )}
          <button type="button" onClick={() => extraFilesRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 py-4 text-sm text-gray-500 hover:border-brand-300 hover:bg-brand-50/30 transition-colors">
            <Paperclip className="h-4 w-4" />
            إضافة مرفق
          </button>
          <input ref={extraFilesRef} type="file" multiple accept="application/pdf,image/jpeg,image/png,image/webp" className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? [])
              setExtraFiles(prev => [...prev, ...files.map(f => ({ file: f, label: '' }))])
              e.target.value = ''
            }} />
        </CardContent>
      </Card>

      {/* Team */}
      <Card>
        <CardHeader><CardTitle>الفريق</CardTitle></CardHeader>
        <CardContent className="space-y-4">

          {/* Row 1: Coordinator + Sales Engineer */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="coordinator_id">الكوردنيتر</Label>
              {isSalesEngineer ? (
                <>
                  <input type="hidden" name="coordinator_id" value="" />
                  <div className="flex h-10 items-center rounded-lg border border-gray-100 bg-gray-50 px-3 text-sm text-gray-400 italic">سيتم التعيين من الكوردنيتر أو الإدارة</div>
                </>
              ) : (
                <>
                  {/* Admin AND coordinators can assign any coordinator (defaults to self) */}
                  <Select id="coordinator_id" name="coordinator_id" placeholder="اختر الكوردنيتر" defaultValue={selectedCoordinatorId}
                    onChange={(e) => setSelectedCoordinatorId(e.target.value)}>
                    {coordinators.map((c) => (
                      <option key={c.id} value={c.id}>{c.full_name} — {workloadLabel(coordinatorWorkload[c.id] ?? 0)}</option>
                    ))}
                  </Select>
                  {selectedCoordinatorId && <WorkloadBadge count={coordinatorWorkload[selectedCoordinatorId] ?? 0} />}
                </>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sales_engineer_id">مهندس المبيعات</Label>
              {isSalesEngineer ? (
                <>
                  <input type="hidden" name="sales_engineer_id" value={currentProfile.id} />
                  <div className="flex h-10 items-center rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700">{currentProfile.full_name}</div>
                  <WorkloadBadge count={salesWorkload[currentProfile.id] ?? 0} />
                </>
              ) : canAssignSales ? (
                <>
                  <Select id="sales_engineer_id" name="sales_engineer_id" placeholder="اختر المهندس" defaultValue={selectedSalesId}
                    onChange={(e) => setSelectedSalesId(e.target.value)}>
                    {salesEngineers.map((s) => (
                      <option key={s.id} value={s.id}>{s.full_name} — {workloadLabel(salesWorkload[s.id] ?? 0)}</option>
                    ))}
                  </Select>
                  {selectedSalesId && <WorkloadBadge count={salesWorkload[selectedSalesId] ?? 0} />}
                </>
              ) : null}
            </div>
          </div>

          {/* Installation person — only when project has installation */}
          {canAssignTeam && hasInstallation && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="installation_id">مسؤول التركيب</Label>
                <Select id="installation_id" name="installation_id" placeholder="اختر مسؤول التركيب" defaultValue=""
                  onChange={(e) => setSelectedInstallationId(e.target.value)}>
                  {installationPersons.map((i) => (
                    <option key={i.id} value={i.id}>{i.full_name} — {workloadLabel(installationWorkload[i.id] ?? 0)}</option>
                  ))}
                </Select>
                {selectedInstallationId && <WorkloadBadge count={installationWorkload[selectedInstallationId] ?? 0} />}
              </div>
            </div>
          )}

          {isSalesEngineer && (
            <p className="text-xs text-gray-400 border-t border-gray-100 pt-3">
              سيتم تعيين بقية الفريق من قِبل الكوردنيتر أو الإدارة بعد إنشاء المشروع.
            </p>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-700">{error}</div>
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
