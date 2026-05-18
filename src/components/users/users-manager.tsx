'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { UserPlus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogHeader, DialogTitle, DialogClose, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from '@/components/ui/table'
import { createUser, updateUserRole, deleteUser } from '@/lib/actions/auth'
import { ROLE_LABELS } from '@/lib/constants'
import { formatDateShort } from '@/lib/utils'
import type { Profile, UserRole } from '@/types/database'

interface UsersManagerProps {
  users: Profile[]
  currentUserId: string
}

export function UsersManager({ users, currentUserId }: UsersManagerProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await createUser(formData)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success('تم إنشاء المستخدم بنجاح')
        setShowCreateDialog(false)
      }
    })
  }

  function handleRoleChange(userId: string, role: UserRole) {
    startTransition(async () => {
      const result = await updateUserRole(userId, role)
      if (result?.error) toast.error(result.error)
      else toast.success('تم تحديث الدور')
    })
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return
    startTransition(async () => {
      const result = await deleteUser(deleteTarget.id)
      if (result?.error) toast.error(result.error)
      else { toast.success('تم حذف الحساب'); setDeleteTarget(null) }
    })
  }

  const ROLE_BADGE_VARIANTS: Record<UserRole, 'default' | 'success' | 'warning' | 'danger' | 'secondary' | 'purple'> = {
    coordinator: 'default',
    sales_engineer: 'success',
    installation: 'purple',
    admin: 'danger',
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setShowCreateDialog(true)}>
          <UserPlus className="h-4 w-4" />
          مستخدم جديد
        </Button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الاسم</TableHead>
              <TableHead>الدور</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>تاريخ الإنشاء</TableHead>
              <TableHead>تعديل الدور</TableHead>
            <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableEmpty message="لا يوجد مستخدمون" />
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.full_name}</TableCell>
                  <TableCell>
                    <Badge variant={ROLE_BADGE_VARIANTS[user.role]}>
                      {ROLE_LABELS[user.role]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.is_active ? 'success' : 'secondary'}>
                      {user.is_active ? 'نشط' : 'غير نشط'}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDateShort(user.created_at)}</TableCell>
                  <TableCell>
                    <Select
                      value={user.role}
                      className="h-8 w-44 text-xs"
                      onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                      disabled={isPending}
                    >
                      <option value="coordinator">الكوردنيتر</option>
                      <option value="sales_engineer">مهندس المبيعات</option>
                      <option value="installation">التركيبات</option>
                      <option value="admin">الإدارة</option>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {user.id !== currentUserId && (
                      <button
                        onClick={() => setDeleteTarget(user)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 hover:border-red-300 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        حذف
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete user dialog */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogHeader>
          <DialogTitle>حذف الحساب</DialogTitle>
          <DialogClose onClose={() => setDeleteTarget(null)} />
        </DialogHeader>
        <DialogContent>
          <div className="flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-800">
            <Trash2 className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              سيتم حذف حساب <strong>{deleteTarget?.full_name}</strong> نهائياً ولن يتمكن من الدخول للمنصة.
              <br /><strong>لا يمكن التراجع عن هذا الإجراء.</strong>
            </span>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>إلغاء</Button>
          <Button loading={isPending} onClick={handleDeleteConfirm}
            className="bg-red-600 hover:bg-red-700 text-white">
            <Trash2 className="h-4 w-4" />
            حذف الحساب
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={showCreateDialog} onClose={() => setShowCreateDialog(false)}>
        <DialogHeader>
          <DialogTitle>إنشاء مستخدم جديد</DialogTitle>
          <DialogClose onClose={() => setShowCreateDialog(false)} />
        </DialogHeader>
        <DialogContent>
          <form id="create-user-form" onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label>الاسم الكامل</Label>
              <Input name="full_name" required placeholder="أحمد محمد" />
            </div>
            <div className="space-y-1.5">
              <Label>البريد الإلكتروني</Label>
              <Input name="email" type="email" required placeholder="user@example.com" dir="ltr" />
            </div>
            <div className="space-y-1.5">
              <Label>كلمة المرور</Label>
              <Input name="password" type="password" required placeholder="••••••••" dir="ltr" minLength={6} />
            </div>
            <div className="space-y-1.5">
              <Label>الدور</Label>
              <Select name="role" required placeholder="اختر الدور">
                <option value="coordinator">الكوردنيتر</option>
                <option value="sales_engineer">مهندس المبيعات</option>
                <option value="supply">التوريد</option>
                <option value="installation">التركيبات</option>
                <option value="admin">الإدارة</option>
              </Select>
            </div>
          </form>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowCreateDialog(false)}>إلغاء</Button>
          <Button type="submit" form="create-user-form" loading={isPending}>إنشاء</Button>
        </DialogFooter>
      </Dialog>
    </>
  )
}
