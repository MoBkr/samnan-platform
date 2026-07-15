export type UserRole = 'coordinator' | 'sales_engineer' | 'installation' | 'admin'
export type ProjectStatus = 'active' | 'completed' | 'cancelled' | 'on_hold'
export type PaymentType = 'upfront' | 'materials' | 'installation' | 'final' | 'custom'
export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled'
export type MaterialStatus = 'pending' | 'preparing' | 'ready' | 'delivered' | 'partial'
export type SupplyOrderStatus = 'scheduled' | 'in_progress' | 'completed' | 'failed' | 'rescheduled'
export type InstallationStatus = 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'delayed' | 'rescheduled'
export type DocumentType = 'contract' | 'invoice' | 'receipt' | 'delivery_note' | 'completion_photo' | 'other' | 'materials_request'
export type BrStage = 'create' | 'manager_approval' | 'inventory' | 'release' | 'finance' | 'logistics' | 'completed'
export type BrPriority = 'important' | 'medium'

export interface Profile {
  id: string
  full_name: string
  role: UserRole
  is_active: boolean
  avatar_url: string | null
  phone: string | null
  created_at: string
}

export interface Project {
  id: string
  client_name: string
  location: string | null
  project_name: string
  customer_account_no: string | null
  has_installation: boolean
  coordinator_id: string | null
  sales_engineer_id: string | null
  installation_id: string | null
  contract_url: string | null
  cr_url: string | null
  vat_url: string | null
  national_address_url: string | null
  public_token: string | null
  status: ProjectStatus
  total_amount: number | null
  start_date: string | null
  expected_end_date: string | null
  cancellation_reason: string | null
  created_at: string
  updated_at: string
  coordinator?: Profile
  sales_engineer?: Profile
  installation_person?: Profile
}

export interface Payment {
  id: string
  project_id: string
  type: PaymentType
  name: string | null
  order_no: number | null
  invoice_number: string | null
  invoice_date: string | null
  seller_name: string | null
  customer_account: string | null
  sales_invoice_sent: boolean
  sales_payment_confirmed: boolean
  percentage: number | null
  amount: number
  due_date: string | null
  // Letter of Credit (خطاب اعتماد): optional, with pay date + tenor in days
  lc_enabled: boolean
  lc_date: string | null
  lc_days: number | null
  status: PaymentStatus
  paid_amount: number
  paid_at: string | null
  receipt_url: string | null
  notes: string | null
  created_at: string
}

export interface MaterialItem {
  // Procurement columns — SAP No · Description · Qty · STO No · Item Status · Note · Attachment
  sap_no?: string
  description?: string
  quantity?: number
  sto_no?: string
  status?: string                       // حالة الصنف: مكتمل / قيد المعالجة / لم يطلب ...
  notes?: string
  attachments?: { url: string; name: string }[]
  // Legacy fields (older records) — kept optional for backward compatibility
  name?: string
  unit?: string
  unit_price?: number
}

export interface Material {
  id: string
  project_id: string
  requested_by: string | null
  status: MaterialStatus
  items: MaterialItem[]
  requested_at: string
  ready_at: string | null
  notes: string | null
  project?: Project
  requester?: Profile
}

export interface SupplyOrder {
  id: string
  project_id: string
  material_id: string | null
  scheduled_date: string | null
  confirmed_by_client: boolean
  status: SupplyOrderStatus
  completion_receipt_url: string | null
  completed_at: string | null
  issues: string | null
  created_at: string
  project?: Project
  material?: Material
}

// A file attached to an installation stage. `slot` identifies the
// sub-section (e.g. MIR: mechanical/electrical; IRS: tank/pipe/…).
export interface InstallAttachment {
  url: string
  name: string
  slot?: string
}

// Per-item (slot) state inside a stage — each WIR item (Tank, Pipe, …) is
// approved / rejected on its own, with its own note and attachments.
export interface InstallSlotState {
  done?: boolean
  na?: boolean                   // not applicable to this project
  rejected?: boolean
  rejection_note?: string
  rejection_files?: { url: string; name: string }[]
  rejected_by?: string
  rejected_at?: string
}

export interface InstallStageData {
  done?: boolean
  started?: boolean              // Site Inspection: team start confirmation
  files?: InstallAttachment[]
  slotStates?: Record<string, InstallSlotState>   // per-item approval/rejection
  customSlots?: { key: string; label: string }[]  // IRS: manually-added inspection items not in the materials list
  // Inspection rejection (e.g. materials rejected during MIR) with a reason.
  rejected?: boolean
  rejection_note?: string
  rejection_files?: { url: string; name: string }[]   // evidence attached to the rejection
  rejected_at?: string
  rejected_by?: string           // full name of the person who rejected
}

export type InstallationStages = Record<string, InstallStageData>

// ── Project board (مدونة المشروع) — a WhatsApp-like group per project, with
// smart entries: schedule / reminder / to-do, @mentions and due reminders.
export type NoteKind = 'note' | 'schedule' | 'reminder' | 'todo'

export interface ProjectNote {
  id: string
  project_id: string
  author_id: string | null
  kind: NoteKind
  body: string
  due_at: string | null
  done: boolean
  mentions: string[]
  reminded_at: string | null
  created_at: string
  author?: Pick<Profile, 'id' | 'full_name' | 'role'>
}

// ── Personal notebook (مدونتي) — private to the owner and to admins.
export interface PersonalNote {
  id: string
  owner_id: string
  kind: NoteKind
  body: string
  due_at: string | null
  done: boolean
  reminded_at: string | null
  created_at: string
  owner?: Pick<Profile, 'id' | 'full_name' | 'role'>
}

// ── In-app notifications ──
export interface AppNotification {
  id: string
  recipient_id: string
  title: string
  body: string | null
  link: string | null
  type: string
  project_id: string | null
  is_read: boolean
  created_at: string
}

// ── العهد المالية (custody / advances for the installation team) ──
// 'advance' = money handed over as custody; 'expense' = money spent from it.
export type CustodyKind = 'advance' | 'expense'

export interface CustodyEntry {
  id: string
  project_id: string
  kind: CustodyKind
  category: string | null          // مواد خاصة / سكن الفنيين / مواصلات / أخرى
  description: string
  amount: number
  entry_date: string | null
  recipient: string | null         // من استلم العهدة / من صرف
  attachments: { url: string; name: string }[]
  notes: string | null
  created_by: string | null
  created_at: string
  creator?: Pick<Profile, 'id' | 'full_name'>
}

// ── Technicians (shared company pool) ──
export interface Technician {
  id: string
  name: string
  employee_no: string | null
  phone: string | null
  is_active: boolean
  created_at: string
}

export type TechnicianAssignmentStatus = 'active' | 'done' | 'removed'

export interface TechnicianAssignment {
  id: string
  technician_id: string
  project_id: string
  start_date: string
  end_date: string
  status: TechnicianAssignmentStatus
  created_by: string | null
  created_at: string
  ended_at: string | null
  technician?: Technician
  project?: Pick<Project, 'id' | 'project_name' | 'client_name'>
}

// A technician plus their current active assignment (for availability views)
export interface TechnicianWithStatus extends Technician {
  current: (TechnicianAssignment & { project?: Pick<Project, 'id' | 'project_name' | 'client_name'> }) | null
}

export interface Installation {
  id: string
  project_id: string
  scheduled_date: string | null
  expected_end_date: string | null   // expected finish date (editable later)
  expected_duration: string | null   // expected installation time (entered by installation manager)
  installation_team_confirmed: boolean
  client_notified: boolean
  status: InstallationStatus
  completion_photos: string[]
  completed_at: string | null
  delay_reason: string | null
  stages: InstallationStages
  created_at: string
  project?: Project
}

export interface Document {
  id: string
  project_id: string
  payment_id: string | null
  type: DocumentType
  url: string
  uploaded_by: string | null
  uploaded_at: string
  description: string | null
  uploader?: Profile
}

export interface ActivityLog {
  id: string
  project_id: string | null
  user_id: string | null
  action: string
  details: Record<string, unknown>
  created_at: string
  user?: Profile
}

export interface Notification {
  id: string
  project_id: string | null
  recipient_type: 'internal' | 'client' | null
  channel: 'email' | 'whatsapp' | 'in_app' | null
  status: 'pending' | 'sent' | 'failed' | 'retrying'
  message: string | null
  sent_at: string | null
  retry_count: number
  created_at: string
}

export interface BrAttachment { url: string; name: string; stage?: BrStage }
export interface BrMaterial { name: string; quantity?: number; unit?: string; notes?: string }

export interface PurchaseRequest {
  id: string
  br_number: string | null
  release_number: string | null
  project_name: string | null
  supplier_name: string | null
  engineer_id: string | null
  location: string | null
  stage: BrStage
  status: 'not_started' | 'started'
  progress: number
  priority: BrPriority
  due_date: string | null
  started_at: string | null
  notes: string | null
  attachments: BrAttachment[]
  materials: BrMaterial[]
  stage_history: Record<string, string>
  created_by: string | null
  created_at: string
  updated_at: string
  engineer?: Profile
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at'> & { created_at?: string }
        Update: Partial<Omit<Profile, 'id'>>
        Relationships: []
      }
      projects: {
        Row: Omit<Project, 'coordinator' | 'sales_engineer' | 'installation_person'>
        Insert: Omit<Project, 'id' | 'created_at' | 'updated_at' | 'coordinator' | 'sales_engineer' | 'installation_person'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Project, 'id' | 'coordinator' | 'sales_engineer' | 'installation_person'>>
        Relationships: []
      }
      payments: {
        Row: Payment
        Insert: Omit<Payment, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Omit<Payment, 'id'>>
        Relationships: []
      }
      materials: {
        Row: Omit<Material, 'project' | 'requester'>
        Insert: Omit<Material, 'id' | 'requested_at' | 'project' | 'requester'> & {
          id?: string
          requested_at?: string
        }
        Update: Partial<Omit<Material, 'id' | 'project' | 'requester'>>
        Relationships: []
      }
      supply_orders: {
        Row: Omit<SupplyOrder, 'project' | 'material'>
        Insert: Omit<SupplyOrder, 'id' | 'created_at' | 'project' | 'material'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Omit<SupplyOrder, 'id' | 'project' | 'material'>>
        Relationships: []
      }
      installations: {
        Row: Omit<Installation, 'project'>
        Insert: Omit<Installation, 'id' | 'created_at' | 'project'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Omit<Installation, 'id' | 'project'>>
        Relationships: []
      }
      documents: {
        Row: Omit<Document, 'uploader'>
        Insert: Omit<Document, 'id' | 'uploaded_at' | 'uploader'> & {
          id?: string
          uploaded_at?: string
        }
        Update: Partial<Omit<Document, 'id' | 'uploader'>>
        Relationships: []
      }
      activity_log: {
        Row: Omit<ActivityLog, 'user'>
        Insert: Omit<ActivityLog, 'id' | 'created_at' | 'user'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Omit<ActivityLog, 'id' | 'user'>>
        Relationships: []
      }
      notifications: {
        Row: Notification
        Insert: Omit<Notification, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Omit<Notification, 'id'>>
        Relationships: []
      }
      purchase_requests: {
        Row: Omit<PurchaseRequest, 'engineer'>
        Insert: Omit<PurchaseRequest, 'id' | 'created_at' | 'updated_at' | 'engineer'> & {
          id?: string; created_at?: string; updated_at?: string
        }
        Update: Partial<Omit<PurchaseRequest, 'id' | 'engineer'>>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
