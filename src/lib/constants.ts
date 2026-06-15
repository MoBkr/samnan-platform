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

// ── Installation inspection stages ──────────────────────────────────────
// Fixed dropdown of stages shared by every project that has installation.
export interface InstallSlot { key: string; label: string }
export interface InstallStageConfig {
  key: string
  label: string        // Arabic
  en: string           // English subtitle
  desc: string
  requiresStart?: boolean   // needs team start confirmation (Site Inspection)
  optional?: boolean        // not required to finish (Snag List)
  slots?: InstallSlot[]     // sub-sections, each with its own file(s)
  singleFile?: boolean      // expects one comprehensive file
}

export const INSTALL_STAGES: InstallStageConfig[] = [
  {
    key: 'site_inspection',
    label: 'فحص الموقع',
    en: 'Site Inspection',
    desc: 'عادةً قبل التوريد بأسبوع/أسبوعين للتأكد من جاهزية الموقع. تتطلب تأكيد بدء من الفريق.',
    requiresStart: true,
    singleFile: true,
  },
  {
    key: 'mir',
    label: 'معاينة المواد',
    en: 'MIR — Material Inspection Request',
    desc: 'تنقسم إلى ميكانيكا وكهرباء — ملف لكل قسم، أو ملف شامل واحد.',
    slots: [
      { key: 'mechanical', label: 'ميكانيكا (Mechanical)' },
      { key: 'electrical', label: 'كهرباء (Electrical)' },
      { key: 'general', label: 'ملف شامل' },
    ],
  },
  {
    key: 'irs',
    label: 'معاينة التركيب',
    en: 'IRS — Inspection Requests',
    desc: 'كل بند ملف منفصل. بعض البنود قد لا تنطبق على كل مشروع.',
    slots: [
      { key: 'tank', label: 'Tank — الخزان' },
      { key: 'pipe', label: 'Pipe — المواسير' },
      { key: 'pressure_test', label: 'Pressure Test — اختبار الضغط' },
      { key: 'conduit', label: 'Conduit — المجاري' },
      { key: 'control_panel', label: 'Control Panel — لوحة التحكم' },
      { key: 'connection_generator', label: 'Connection Generator — توصيل المولد' },
      { key: 'cable_pulling', label: 'Cable Pulling — سحب الكابلات' },
    ],
  },
  {
    key: 'commissioning',
    label: 'التشغيل والصيانة',
    en: 'Commissioning',
    desc: 'اختبارات تشغيل للنظام كامل — ملف واحد شامل.',
    singleFile: true,
  },
  {
    key: 'snag_list',
    label: 'قائمة الملاحظات',
    en: 'Snag List',
    desc: 'ملاحظات الاستشاري أو العميل (إيجابية أو سلبية). مرفق واحد اختياري عند وجود ملاحظات.',
    optional: true,
    singleFile: true,
  },
]

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
