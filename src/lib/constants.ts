import type { UserRole, ProjectStatus, PaymentType, PaymentStatus, InstallationStatus, BrStage, BrPriority } from '@/types/database'

export const BR_STAGES: BrStage[] = ['create', 'manager_approval', 'inventory', 'release', 'finance', 'logistics', 'completed']

export const BR_STAGE_LABELS: Record<BrStage, string> = {
  create: 'إنشاء الطلب',
  manager_approval: 'موافقة المدير',
  inventory: 'إدارة المخزون',
  release: 'Release / تعميد',
  finance: 'المالية',
  logistics: 'Logistic',
  completed: 'تم الاستلام',
}

export const BR_PRIORITY_LABELS: Record<BrPriority, string> = {
  important: 'مهم',
  medium: 'متوسط',
}

export const ROLE_LABELS: Record<UserRole, string> = {
  coordinator: 'الكوردنيتر',
  sales_engineer: 'مهندس المبيعات',
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
  materials: 'دفعة المواد',
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
  delivery_note: 'وصل الاستلام',
  completion_photo: 'صورة إتمام',
  materials_request: 'طلب المواد',
  other: 'أخرى',
}

export const ROLE_REDIRECTS: Record<UserRole, string> = {
  coordinator: '/dashboard',
  sales_engineer: '/dashboard',
  installation: '/installation',
  admin: '/dashboard',
}
