import type { UserRole, ProjectStatus, PaymentType, PaymentStatus, InstallationStatus, BrStage, BrPriority } from '@/types/database'

export const BR_STAGES: BrStage[] = ['create', 'manager_approval', 'inventory', 'release', 'finance', 'logistics', 'completed']

export const BR_STAGE_LABELS: Record<BrStage, string> = {
  create: 'إنشاء الطلب',
  manager_approval: 'موافقة المدير',
  inventory: 'إدارة المخزون',
  release: 'تعميد',
  finance: 'المالية',
  logistics: 'Logistic',
  completed: 'تم الاستلام',
}

export const BR_PRIORITY_LABELS: Record<BrPriority, string> = {
  important: 'مهم',
  medium: 'متوسط',
}

// Product status options for the manual materials table
export const MATERIAL_ITEM_STATUSES = [
  'لم يطلب',
  'قيد المعالجة',
  'مكتمل',
] as const

// ── العهد المالية (custody categories) ──
export const CUSTODY_CATEGORIES: { value: string; label: string }[] = [
  { value: 'materials', label: 'مواد خاصة للمشروع' },
  { value: 'housing', label: 'سكن الفنيين' },
  { value: 'transport', label: 'مواصلات' },
  { value: 'tools', label: 'عدد وأدوات' },
  { value: 'other', label: 'أخرى' },
]
export const CUSTODY_CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CUSTODY_CATEGORIES.map((c) => [c.value, c.label])
)

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
  dynamic?: boolean         // IRS: slots derived from the project's materials + manual additions
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
    key: 'irs',   // key kept for backward compatibility with existing records
    label: 'معاينة التركيب',
    en: 'WIR — Work Inspection Request',
    desc: 'بنود قياسية — كل بند يُعتمد أو يُرفض على حدة بملاحظته ومرفقاته. ليست كل البنود مطلوبة في كل مشروع (استخدم «لا ينطبق»)، ويمكن إضافة بنود أخرى.',
    slots: [
      { key: 'tank', label: 'Tank' },
      { key: 'pipe', label: 'Pipe' },
      { key: 'pressure_test', label: 'Pressure Test' },
      { key: 'conduit', label: 'Conduit' },
      { key: 'control_panel', label: 'Control Panel' },
      { key: 'connection_generator', label: 'Connection Generator' },
      { key: 'cable_pulling', label: 'Cable Pulling' },
      { key: 'cable_termination', label: 'Cable Termination' },
    ],
  },
  {
    key: 'commissioning',
    label: 'الاختبار والتشغيل',
    en: 'Testing & Commissioning',
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
  coordinator: 'مهندس إدارة المشاريع',
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
