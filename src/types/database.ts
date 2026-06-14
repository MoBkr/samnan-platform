export type UserRole = 'coordinator' | 'sales_engineer' | 'installation' | 'admin'
export type ProjectStatus = 'active' | 'completed' | 'cancelled' | 'on_hold'
export type PaymentType = 'upfront' | 'materials' | 'installation' | 'final' | 'custom'
export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled'
export type MaterialStatus = 'pending' | 'preparing' | 'ready' | 'delivered' | 'partial'
export type SupplyOrderStatus = 'scheduled' | 'in_progress' | 'completed' | 'failed' | 'rescheduled'
export type InstallationStatus = 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'delayed' | 'rescheduled'
export type DocumentType = 'contract' | 'invoice' | 'receipt' | 'delivery_note' | 'completion_photo' | 'other' | 'materials_request'

export interface Profile {
  id: string
  full_name: string
  role: UserRole
  is_active: boolean
  created_at: string
}

export interface Project {
  id: string
  client_name: string
  location: string | null
  project_name: string
  coordinator_id: string | null
  sales_engineer_id: string | null
  installation_id: string | null
  contract_url: string | null
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
  percentage: number | null
  amount: number
  due_date: string | null
  status: PaymentStatus
  paid_amount: number
  paid_at: string | null
  receipt_url: string | null
  notes: string | null
  created_at: string
}

export interface MaterialItem {
  name: string
  quantity: number
  unit: string
  notes?: string
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

export interface Installation {
  id: string
  project_id: string
  scheduled_date: string | null
  installation_team_confirmed: boolean
  client_notified: boolean
  status: InstallationStatus
  completion_photos: string[]
  completed_at: string | null
  delay_reason: string | null
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
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
