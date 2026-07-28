// ─── AR/EN dictionary ───
// Keys are stable identifiers; values are the two renderings. Grows screen by
// screen — anything missing safely falls back to Arabic.

export const DICT = {
  // ── Shell / navigation ──
  'nav.dashboard': { ar: 'لوحة التحكم', en: 'Dashboard' },
  'nav.projects': { ar: 'المشاريع', en: 'Projects' },
  'nav.payments': { ar: 'المدفوعات', en: 'Payments' },
  'nav.installation': { ar: 'التركيبات', en: 'Installation' },
  'nav.technicians': { ar: 'الفنيون', en: 'Technicians' },
  'nav.purchase': { ar: 'طلبات المشتريات', en: 'Purchase Requests' },
  'nav.notebook': { ar: 'مدونتي', en: 'My Notebook' },
  'nav.reports': { ar: 'التقارير', en: 'Reports' },
  'nav.audit': { ar: 'سجل التدقيق', en: 'Audit Log' },
  'nav.users': { ar: 'إدارة المستخدمين', en: 'User Management' },
  'nav.menu': { ar: 'القائمة', en: 'Menu' },
  'nav.admin': { ar: 'الإدارة', en: 'Administration' },
  'nav.signout': { ar: 'تسجيل الخروج', en: 'Sign out' },
  'nav.home': { ar: 'الرئيسية', en: 'Home' },
  'nav.profile': { ar: 'ملفي الشخصي', en: 'My Profile' },
  'app.name': { ar: 'منصة سمنان', en: 'Samnan Platform' },
  'app.holding': { ar: 'سمنان القابضة', en: 'Samnan Holding' },
  'app.samnan': { ar: 'سمنان', en: 'Samnan' },
  'app.admin_platform': { ar: 'منصة الإدارة', en: 'Management Platform' },

  // ── Roles ──
  'role.coordinator': { ar: 'مهندس إدارة المشاريع', en: 'PM Engineer' },
  'role.sales_engineer': { ar: 'مهندس المبيعات', en: 'Sales Engineer' },
  'role.installation': { ar: 'التركيبات', en: 'Installation' },
  'role.admin': { ar: 'الإدارة', en: 'Administration' },

  // ── Project tabs ──
  'tab.payments': { ar: 'الدفعات', en: 'Payments' },
  'tab.installation': { ar: 'التركيب', en: 'Installation' },
  'tab.materials': { ar: 'المواد', en: 'Materials' },
  'tab.purchase': { ar: 'طلبات الشراء', en: 'Purchase Requests' },
  'tab.board': { ar: 'المدونة', en: 'Board' },
  'tab.attachments': { ar: 'المرفقات', en: 'Attachments' },
  'tab.activity': { ar: 'سجل النشاط', en: 'Activity Log' },

  // ── Project statuses ──
  'status.active': { ar: 'نشط', en: 'Active' },
  'status.completed': { ar: 'مكتمل', en: 'Completed' },
  'status.cancelled': { ar: 'ملغي', en: 'Cancelled' },
  'status.on_hold': { ar: 'معلق', en: 'On Hold' },

  // ── Common actions ──
  'act.save': { ar: 'حفظ', en: 'Save' },
  'act.cancel': { ar: 'إلغاء', en: 'Cancel' },
  'act.add': { ar: 'إضافة', en: 'Add' },
  'act.edit': { ar: 'تعديل', en: 'Edit' },
  'act.delete': { ar: 'حذف', en: 'Delete' },
  'act.print': { ar: 'طباعة', en: 'Print' },
  'act.view': { ar: 'عرض', en: 'View' },
  'act.search': { ar: 'بحث', en: 'Search' },
  'act.close': { ar: 'إغلاق', en: 'Close' },

  // ── Projects list ──
  'projects.mine': { ar: 'مشاريعي', en: 'My Projects' },
  'projects.all': { ar: 'كل المشاريع', en: 'All Projects' },
  'projects.new': { ar: 'مشروع جديد', en: 'New Project' },
  'projects.title': { ar: 'المشاريع', en: 'Projects' },

  // ── Financial ──
  'fin.collected': { ar: 'المحصّل', en: 'Collected' },
  'fin.remaining': { ar: 'المتبقي', en: 'Remaining' },
  'fin.total': { ar: 'الإجمالي', en: 'Total' },
  'fin.project_value': { ar: 'قيمة المشروع', en: 'Project Value' },
} as const

export type DictKey = keyof typeof DICT
