import type { UserRole, ProjectStatus, PaymentType, PaymentStatus, MaterialStatus, SupplyOrderStatus, InstallationStatus } from '@/types/database'

export const ROLE_LABELS: Record<UserRole, string> = {
  coordinator: 'الكوردنيتر',
  sales_engineer: 'مهندس المبيعات',
  supply: 'التوريد',
  installation: 'التركيبات',
  admin: 'الإدارة',
}

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  active: 'نشط',
  completed: 'مكتمل',
  cancelled: 'ملغي',
  on_hold: 'معلق',
}

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  upfront: 'دفعة أولى',
  supply: 'دفعة توريد',
  installation: 'دفعة تركيب',
  final: 'دفعة نهائية',
  custom: 'دفعة مخصصة',
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'معلقة',
  partial: 'مدفوعة جزئياً',
  paid: 'مدفوعة',
  overdue: 'متأخرة',
  cancelled: 'ملغاة',
}

export const MATERIAL_STATUS_LABELS: Record<MaterialStatus, string> = {
  pending: 'في الانتظار',
  preparing: 'جاري التجهيز',
  ready: 'جاهز',
  delivered: 'تم التوريد',
  partial: 'جزئي',
}

export const SUPPLY_STATUS_LABELS: Record<SupplyOrderStatus, string> = {
  scheduled: 'مجدول',
  in_progress: 'جاري',
  completed: 'مكتمل',
  failed: 'فشل',
  rescheduled: 'أُعيد الجدولة',
}

export const INSTALLATION_STATUS_LABELS: Record<InstallationStatus, string> = {
  scheduled: 'مجدول',
  confirmed: 'مؤكد',
  in_progress: 'جاري التركيب',
  completed: 'مكتمل',
  delayed: 'متأخر',
  rescheduled: 'أُعيد الجدولة',
}

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  contract: 'عقد',
  invoice: 'فاتورة',
  receipt: 'إيصال',
  delivery_receipt: 'وصل استلام',
  completion_photo: 'صورة إتمام',
  other: 'أخرى',
}

export const ROLE_REDIRECTS: Record<UserRole, string> = {
  coordinator: '/dashboard',
  sales_engineer: '/dashboard',
  supply: '/supply',
  installation: '/installation',
  admin: '/dashboard',
}
