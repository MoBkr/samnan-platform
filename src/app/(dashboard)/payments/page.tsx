import Link from 'next/link'
import { getAllOverduePayments } from '@/lib/actions/payments'
import { getCurrentProfile } from '@/lib/actions/auth'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { PaymentStatusBadge } from '@/components/shared/status-badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import { PAYMENT_TYPE_LABELS } from '@/lib/constants'
import { redirect } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'

export default async function PaymentsPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')
  if (!['coordinator', 'admin'].includes(profile.role)) redirect('/dashboard')

  const overduePayments = await getAllOverduePayments()

  return (
    <div className="space-y-6">
      <PageHeader
        title="متابعة المدفوعات"
        description="المدفوعات المتأخرة والمعلقة"
      />

      {overduePayments.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4" />
          يوجد {overduePayments.length} مدفوعة متأخرة تحتاج إلى متابعة
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>المشروع</TableHead>
              <TableHead>العميل</TableHead>
              <TableHead>نوع الدفعة</TableHead>
              <TableHead>المبلغ</TableHead>
              <TableHead>المحصّل</TableHead>
              <TableHead>تاريخ الاستحقاق</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {overduePayments.length === 0 ? (
              <TableEmpty message="لا توجد مدفوعات متأخرة ✓" />
            ) : (
              overduePayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">{payment.project.project_name}</TableCell>
                  <TableCell>{payment.project.client_name}</TableCell>
                  <TableCell>{PAYMENT_TYPE_LABELS[payment.type]}</TableCell>
                  <TableCell>{formatCurrency(payment.amount)}</TableCell>
                  <TableCell>{formatCurrency(payment.paid_amount)}</TableCell>
                  <TableCell className="text-red-600">{formatDateShort(payment.due_date)}</TableCell>
                  <TableCell><PaymentStatusBadge status="overdue" /></TableCell>
                  <TableCell>
                    <Link href={`/projects/${payment.project.id}`}>
                      <Button size="sm" variant="ghost">عرض</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {overduePayments.length === 0 && (
        <EmptyState
          message="لا توجد مدفوعات متأخرة"
          description="جميع المدفوعات في الوقت المحدد"
        />
      )}
    </div>
  )
}
