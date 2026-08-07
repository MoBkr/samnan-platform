-- =============================================================================
-- Samnan Platform — Full Database Schema
--
-- REGENERATED FROM THE LIVE DATABASE ON 2026-08-06.
--
-- Source of truth: the live Supabase project, introspected via the PostgREST
-- OpenAPI definition (column names / types / nullability) plus constraint-
-- violation probes (defaults, physical column order, CHECK value sets), then
-- cross-referenced against src/types/database.ts and every .insert()/.update()
-- call in src/lib/actions/*.ts.
--
-- Running this file against an empty database provisions an environment that
-- the application can run on unmodified. It supersedes the original 9-table
-- schema, which was missing 7 tables and ~30 columns.
--
-- Run in: Supabase SQL Editor.
-- =============================================================================

create extension if not exists pgcrypto;   -- gen_random_uuid()

-- =============================================================================
-- 1. profiles
-- Note: the role CHECK still accepts 'supply' at the database level even though
-- the application no longer offers that role (constants.ts ROLE_LABELS lists 4).
-- Kept as-is so existing rows and projects.supply_id stay valid.
-- =============================================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  role        text not null check (role in ('coordinator','sales_engineer','supply','installation','admin')),
  is_active   boolean default true,
  created_at  timestamptz default now(),
  avatar_url  text,
  phone       text
);

-- =============================================================================
-- 2. projects
-- =============================================================================
create table if not exists public.projects (
  id                   uuid primary key default gen_random_uuid(),
  client_name          text not null,
  project_name         text not null,
  coordinator_id       uuid references public.profiles(id),
  sales_engineer_id    uuid references public.profiles(id),
  contract_url         text,
  status               text default 'active' check (status in ('active','completed','cancelled','on_hold')),
  total_amount         numeric(12,2),
  start_date           date,
  expected_end_date    date,
  cancellation_reason  text,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now(),
  supply_id            uuid references public.profiles(id),
  installation_id      uuid references public.profiles(id),
  location             text,
  has_installation     boolean default true,
  customer_account_no  text,
  cr_url               text,
  vat_url              text,
  national_address_url text,
  public_token         text
);

-- =============================================================================
-- 3. payments
-- 'materials' replaced the original 'supply' payment type.
-- invoice_date is TEXT in the live database (not date) — reproduced faithfully.
-- =============================================================================
create table if not exists public.payments (
  id                      uuid primary key default gen_random_uuid(),
  project_id              uuid not null references public.projects(id),
  type                    text not null check (type in ('upfront','materials','installation','final','custom')),
  percentage              numeric(5,2),
  amount                  numeric(12,2) not null,
  due_date                date,
  status                  text default 'pending' check (status in ('pending','partial','paid','overdue','cancelled')),
  paid_amount             numeric(12,2) default 0,
  paid_at                 timestamptz,
  receipt_url             text,
  notes                   text,
  created_at              timestamptz default now(),
  name                    text,
  order_no                integer,
  invoice_number          text,
  invoice_date            text,
  seller_name             text,
  customer_account        text,
  sales_invoice_sent      boolean default false,
  sales_payment_confirmed boolean default false,
  -- خطاب الاعتماد (Letter of Credit): pay date + tenor in days
  lc_enabled              boolean default false,
  lc_date                 date,
  lc_days                 integer,
  -- reminder bookkeeping (due-date + LC-maturity alerts to the coordinator)
  due_reminded_at         timestamptz,
  lc_reminded_at          timestamptz,
  -- حالة الفوترة والتحصيل: collected | invoiced | both (no CHECK live; '' occurs)
  billing_status          text
);

-- =============================================================================
-- 4. materials
-- =============================================================================
create table if not exists public.materials (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects(id),
  requested_by  uuid references public.profiles(id),
  status        text default 'pending' check (status in ('pending','preparing','ready','delivered','partial')),
  items         jsonb not null default '[]'::jsonb,
  requested_at  timestamptz default now(),
  ready_at      timestamptz,
  notes         text
);

-- =============================================================================
-- 5. supply_orders
-- =============================================================================
create table if not exists public.supply_orders (
  id                     uuid primary key default gen_random_uuid(),
  project_id             uuid not null references public.projects(id),
  material_id            uuid references public.materials(id),
  scheduled_date         date,
  confirmed_by_client    boolean default false,
  status                 text default 'scheduled' check (status in ('scheduled','in_progress','completed','failed','rescheduled')),
  completion_receipt_url text,
  completed_at           timestamptz,
  issues                 text,
  created_at             timestamptz default now()
);

-- =============================================================================
-- 6. installations
-- `stages` holds the 5-stage inspection workflow (Site Inspection / MIR / IRS /
-- Commissioning / Snag List) with per-slot state and attachments.
-- =============================================================================
create table if not exists public.installations (
  id                          uuid primary key default gen_random_uuid(),
  project_id                  uuid not null references public.projects(id),
  scheduled_date              date,
  installation_team_confirmed boolean default false,
  client_notified             boolean default false,
  status                      text default 'scheduled' check (status in ('scheduled','confirmed','in_progress','completed','delayed','rescheduled')),
  completion_photos           text[] default '{}',
  completed_at                timestamptz,
  delay_reason                text,
  created_at                  timestamptz default now(),
  stages                      jsonb default '{}'::jsonb,
  expected_duration           text,
  expected_end_date           date
);

-- =============================================================================
-- 7. documents
-- 'delivery_receipt' from the original schema is NOT valid live; the live set is
-- the one below (delivery_note + materials_request were added).
-- =============================================================================
create table if not exists public.documents (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id),
  type         text not null check (type in ('contract','invoice','receipt','delivery_note','completion_photo','other','materials_request')),
  url          text not null,
  uploaded_by  uuid references public.profiles(id),
  uploaded_at  timestamptz default now(),
  description  text,
  payment_id   uuid references public.payments(id)
);

-- =============================================================================
-- 8. activity_log
-- =============================================================================
create table if not exists public.activity_log (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references public.projects(id),
  user_id     uuid references public.profiles(id),
  action      text not null,
  details     jsonb default '{}'::jsonb,
  created_at  timestamptz default now()
);

-- =============================================================================
-- 9. notifications (legacy outbound queue — superseded by app_notifications)
-- =============================================================================
create table if not exists public.notifications (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid references public.projects(id),
  recipient_type  text check (recipient_type in ('internal','client')),
  channel         text check (channel in ('email','whatsapp','in_app')),
  status          text default 'pending' check (status in ('pending','sent','failed','retrying')),
  message         text,
  sent_at         timestamptz,
  retry_count     integer default 0,
  created_at      timestamptz default now()
);

-- =============================================================================
-- 10. purchase_requests — طلبات الشراء (BR board)
-- =============================================================================
create table if not exists public.purchase_requests (
  id              uuid primary key default gen_random_uuid(),
  br_number       text,
  release_number  text,
  project_name    text,
  supplier_name   text,
  engineer_id     uuid references public.profiles(id),
  location        text,
  stage           text not null default 'create'
                    check (stage in ('create','manager_approval','inventory','release','finance','logistics','completed')),
  status          text not null default 'not_started' check (status in ('not_started','started')),
  progress        integer not null default 0,
  priority        text not null default 'medium' check (priority in ('important','medium')),
  due_date        date,
  started_at      date,
  notes           text,
  attachments     jsonb not null default '[]'::jsonb,
  created_by      uuid references public.profiles(id),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  materials       jsonb not null default '[]'::jsonb,
  stage_history   jsonb not null default '{}'::jsonb
);

-- =============================================================================
-- 11. technicians — shared company pool (records, not logins)
-- =============================================================================
create table if not exists public.technicians (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  employee_no  text,
  phone        text,
  is_active    boolean default true,
  created_at   timestamptz default now()
);

-- =============================================================================
-- 12. technician_assignments — date-range booking of a technician to a project
-- =============================================================================
create table if not exists public.technician_assignments (
  id             uuid primary key default gen_random_uuid(),
  technician_id  uuid not null references public.technicians(id),
  project_id     uuid not null references public.projects(id),
  start_date     date not null,
  end_date       date not null,
  status         text not null default 'active' check (status in ('active','done','removed')),
  created_by     uuid references public.profiles(id),
  created_at     timestamptz default now(),
  ended_at       timestamptz
);

-- =============================================================================
-- 13. custody_entries — العهد المالية
-- 'advance' = money handed over as custody; 'expense' = money spent from it.
-- =============================================================================
create table if not exists public.custody_entries (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects(id),
  kind            text not null default 'expense' check (kind in ('advance','expense')),
  category        text,
  description     text not null,
  amount          numeric(12,2) not null,
  entry_date      date,
  recipient       text,
  attachments     jsonb default '[]'::jsonb,
  notes           text,
  created_by      uuid references public.profiles(id),
  created_at      timestamptz default now(),
  invoice_number  text
);

-- =============================================================================
-- 14. project_notes — مدونة المشروع (WhatsApp-like group per project)
-- =============================================================================
create table if not exists public.project_notes (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id),
  author_id    uuid references public.profiles(id),
  kind         text not null default 'note' check (kind in ('note','schedule','reminder','todo')),
  body         text not null,
  due_at       timestamptz,
  done         boolean default false,
  mentions     uuid[] default '{}',
  reminded_at  timestamptz,
  created_at   timestamptz default now()
);

-- =============================================================================
-- 15. personal_notes — مدونتي (private to the owner; admins may read)
-- =============================================================================
create table if not exists public.personal_notes (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references public.profiles(id),
  kind         text not null default 'note' check (kind in ('note','schedule','reminder','todo')),
  body         text not null,
  due_at       timestamptz,
  done         boolean default false,
  reminded_at  timestamptz,
  created_at   timestamptz default now()
);

-- =============================================================================
-- 16. app_notifications — in-app bell notifications
-- =============================================================================
create table if not exists public.app_notifications (
  id            uuid primary key default gen_random_uuid(),
  recipient_id  uuid not null references public.profiles(id),
  title         text not null,
  body          text,
  link          text,
  type          text default 'info',
  project_id    uuid references public.projects(id),
  is_read       boolean default false,
  created_at    timestamptz default now()
);

-- =============================================================================
-- 17. password_reset_requests
-- Present in the live database but not referenced anywhere in src/. Included so
-- a fresh environment matches production exactly.
-- =============================================================================
create table if not exists public.password_reset_requests (
  id           uuid primary key default gen_random_uuid(),
  email        text not null,
  full_name    text,
  status       text not null default 'pending',
  created_at   timestamptz default now(),
  resolved_at  timestamptz,
  resolved_by  uuid references public.profiles(id)
);

-- =============================================================================
-- Indexes
-- Covers every foreign key plus every column the app filters (.eq) or sorts
-- (.order) on.
-- =============================================================================

-- profiles
create index if not exists profiles_role_idx        on public.profiles (role);
create index if not exists profiles_is_active_idx   on public.profiles (is_active);

-- projects
create index if not exists projects_coordinator_idx      on public.projects (coordinator_id);
create index if not exists projects_sales_engineer_idx   on public.projects (sales_engineer_id);
create index if not exists projects_installation_idx     on public.projects (installation_id);
create index if not exists projects_supply_idx           on public.projects (supply_id);
create index if not exists projects_status_idx           on public.projects (status);
create index if not exists projects_created_at_idx       on public.projects (created_at desc);
create unique index if not exists projects_public_token_key on public.projects (public_token) where public_token is not null;

-- payments
create index if not exists payments_project_idx    on public.payments (project_id);
create index if not exists payments_due_date_idx   on public.payments (due_date);
create index if not exists payments_status_idx     on public.payments (status);
create index if not exists payments_order_no_idx   on public.payments (project_id, order_no);
-- reminder sweeps: only rows that have not been reminded yet
create index if not exists payments_due_pending_idx on public.payments (due_date) where due_reminded_at is null;
create index if not exists payments_lc_pending_idx  on public.payments (lc_date) where lc_enabled and lc_reminded_at is null;

-- materials
create index if not exists materials_project_idx      on public.materials (project_id);
create index if not exists materials_requested_by_idx on public.materials (requested_by);
create index if not exists materials_status_idx       on public.materials (status);

-- supply_orders
create index if not exists supply_orders_project_idx  on public.supply_orders (project_id);
create index if not exists supply_orders_material_idx on public.supply_orders (material_id);

-- installations
create index if not exists installations_project_idx   on public.installations (project_id);
create index if not exists installations_scheduled_idx on public.installations (scheduled_date);

-- documents
create index if not exists documents_project_idx     on public.documents (project_id);
create index if not exists documents_payment_idx     on public.documents (payment_id);
create index if not exists documents_uploaded_by_idx on public.documents (uploaded_by);
create index if not exists documents_type_idx        on public.documents (type);

-- activity_log
create index if not exists activity_log_project_idx    on public.activity_log (project_id);
create index if not exists activity_log_created_at_idx on public.activity_log (created_at desc);
create index if not exists activity_log_user_idx       on public.activity_log (user_id);

-- notifications (legacy)
create index if not exists notifications_project_idx on public.notifications (project_id);

-- purchase_requests
create index if not exists purchase_requests_stage_idx      on public.purchase_requests (stage);
create index if not exists purchase_requests_engineer_idx   on public.purchase_requests (engineer_id);
create index if not exists purchase_requests_created_by_idx on public.purchase_requests (created_by);
create index if not exists purchase_requests_created_at_idx on public.purchase_requests (created_at desc);

-- technicians / assignments
create index if not exists technicians_is_active_idx  on public.technicians (is_active);
create index if not exists technicians_name_idx       on public.technicians (name);
create index if not exists technician_assignments_technician_idx on public.technician_assignments (technician_id);
create index if not exists technician_assignments_project_idx    on public.technician_assignments (project_id);
create index if not exists technician_assignments_status_idx     on public.technician_assignments (status);
create index if not exists technician_assignments_range_idx      on public.technician_assignments (technician_id, start_date, end_date);

-- custody_entries
create index if not exists custody_entries_project_idx    on public.custody_entries (project_id);
create index if not exists custody_entries_entry_date_idx on public.custody_entries (entry_date);
create index if not exists custody_entries_created_by_idx on public.custody_entries (created_by);

-- project_notes / personal_notes
create index if not exists project_notes_project_idx on public.project_notes (project_id);
create index if not exists project_notes_author_idx  on public.project_notes (author_id);
create index if not exists project_notes_due_idx     on public.project_notes (due_at) where reminded_at is null;
create index if not exists personal_notes_owner_idx  on public.personal_notes (owner_id);
create index if not exists personal_notes_due_idx    on public.personal_notes (due_at) where reminded_at is null;

-- app_notifications
create index if not exists app_notifications_recipient_idx  on public.app_notifications (recipient_id, is_read);
create index if not exists app_notifications_created_at_idx on public.app_notifications (created_at desc);

-- password_reset_requests
create index if not exists password_reset_requests_status_idx on public.password_reset_requests (status);

-- =============================================================================
-- Row Level Security
-- Enabled on every table. The app performs all writes through the service-role
-- client, which bypasses RLS — the read policies below are a safety net.
-- =============================================================================
alter table public.profiles                enable row level security;
alter table public.projects                enable row level security;
alter table public.payments                enable row level security;
alter table public.materials               enable row level security;
alter table public.supply_orders           enable row level security;
alter table public.installations           enable row level security;
alter table public.documents               enable row level security;
alter table public.activity_log            enable row level security;
alter table public.notifications           enable row level security;
alter table public.purchase_requests       enable row level security;
alter table public.technicians             enable row level security;
alter table public.technician_assignments  enable row level security;
alter table public.custody_entries         enable row level security;
alter table public.project_notes           enable row level security;
alter table public.personal_notes          enable row level security;
alter table public.app_notifications       enable row level security;
alter table public.password_reset_requests enable row level security;

-- Authenticated read policies. Tables not listed here (custody_entries,
-- purchase_requests, project_notes, personal_notes, app_notifications,
-- technicians, technician_assignments, password_reset_requests) intentionally
-- have RLS on with NO policies — they are reached only via the service client.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'Authenticated users can read all') then
    create policy "Authenticated users can read all" on public.profiles      for select using (auth.role() = 'authenticated');
    create policy "Authenticated users can read all" on public.projects      for select using (auth.role() = 'authenticated');
    create policy "Authenticated users can read all" on public.payments      for select using (auth.role() = 'authenticated');
    create policy "Authenticated users can read all" on public.materials     for select using (auth.role() = 'authenticated');
    create policy "Authenticated users can read all" on public.supply_orders for select using (auth.role() = 'authenticated');
    create policy "Authenticated users can read all" on public.installations for select using (auth.role() = 'authenticated');
    create policy "Authenticated users can read all" on public.documents     for select using (auth.role() = 'authenticated');
    create policy "Authenticated users can read all" on public.activity_log  for select using (auth.role() = 'authenticated');
    create policy "Authenticated users can read all" on public.notifications for select using (auth.role() = 'authenticated');
  end if;
end $$;

-- =============================================================================
-- Auto-create a profile row whenever an auth user is created
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'coordinator')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =============================================================================
-- updated_at maintenance
-- =============================================================================
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists projects_updated_at on public.projects;
create trigger projects_updated_at
  before update on public.projects
  for each row execute procedure public.update_updated_at();

drop trigger if exists purchase_requests_updated_at on public.purchase_requests;
create trigger purchase_requests_updated_at
  before update on public.purchase_requests
  for each row execute procedure public.update_updated_at();

-- =============================================================================
-- Storage
-- Create a PUBLIC bucket named `documents` in the Supabase dashboard
-- (Storage → New bucket → name: documents, Public bucket: on).
-- All contracts, receipts, CR/VAT files, purchase-request and custody
-- attachments, and installation stage files are stored there.
-- =============================================================================
