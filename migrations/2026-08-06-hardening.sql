-- =============================================================================
-- Samnan Platform — Hardening migration
-- Date: 2026-08-06
--
-- Brings an EXISTING database up to the hardened state. Contains only the
-- deltas — no CREATE TABLE. For a fresh environment run supabase-schema.sql
-- instead (which already includes the indexes below, but NOT the uniqueness /
-- exclusion constraints added here).
--
-- Every statement is idempotent and may be re-run safely.
--
-- Pre-flight verified against the live database on 2026-08-06:
--   * materials              — 30 rows, 30 distinct project_id → 0 duplicates,
--                              so the UNIQUE constraint applies cleanly.
--   * technician_assignments — 10 active rows, 0 overlapping date ranges,
--                              so the exclusion constraint applies cleanly.
--   * installations          — 6 distinct project_id across 7 rows (ONE project
--                              has two installation rows). Do NOT add a unique
--                              constraint on installations(project_id) without
--                              first merging that duplicate.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Extensions
-- btree_gist lets a GiST exclusion constraint mix an equality column (uuid)
-- with a range overlap operator.
-- -----------------------------------------------------------------------------
create extension if not exists btree_gist;

-- -----------------------------------------------------------------------------
-- 1. One materials record per project
-- The app already treats materials as a single per-project record (it reads
-- .single() and updates items in place); this makes the database enforce it.
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.materials'::regclass
      and conname  = 'materials_project_id_key'
  ) then
    alter table public.materials
      add constraint materials_project_id_key unique (project_id);
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 2. Idempotency keys
-- A nullable text column plus a UNIQUE index that only covers non-null values,
-- so every pre-existing row (idempotency_key IS NULL) remains valid and any
-- number of them can coexist. A client that supplies a key twice — a double
-- submit, a retried server action — gets a duplicate-key error instead of a
-- second row.
-- -----------------------------------------------------------------------------
alter table public.projects          add column if not exists idempotency_key text;
alter table public.payments          add column if not exists idempotency_key text;
alter table public.purchase_requests add column if not exists idempotency_key text;
alter table public.custody_entries   add column if not exists idempotency_key text;
alter table public.installations     add column if not exists idempotency_key text;

create unique index if not exists projects_idempotency_key_uidx
  on public.projects (idempotency_key)          where idempotency_key is not null;
create unique index if not exists payments_idempotency_key_uidx
  on public.payments (idempotency_key)          where idempotency_key is not null;
create unique index if not exists purchase_requests_idempotency_key_uidx
  on public.purchase_requests (idempotency_key) where idempotency_key is not null;
create unique index if not exists custody_entries_idempotency_key_uidx
  on public.custody_entries (idempotency_key)   where idempotency_key is not null;
create unique index if not exists installations_idempotency_key_uidx
  on public.installations (idempotency_key)     where idempotency_key is not null;

-- -----------------------------------------------------------------------------
-- 3. No double-booking a technician
-- Two ACTIVE assignments for the same technician may not have overlapping date
-- ranges. daterange(..., '[]') is inclusive at both ends, so an assignment
-- ending 2026-08-10 conflicts with one starting 2026-08-10. Rows whose status
-- is 'done' or 'removed' are exempt, which lets a booking be cancelled and the
-- same dates re-booked.
--
-- This replaces the application-level conflict check in
-- src/lib/actions/technicians.ts with a guarantee that survives races.
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.technician_assignments'::regclass
      and conname  = 'technician_assignments_no_overlap'
  ) then
    alter table public.technician_assignments
      add constraint technician_assignments_no_overlap
      exclude using gist (
        technician_id with =,
        daterange(start_date, end_date, '[]') with &&
      )
      where (status = 'active');
  end if;
end $$;

-- Sanity guard: an assignment must not end before it starts, otherwise
-- daterange() raises "range lower bound must be less than or equal to upper".
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.technician_assignments'::regclass
      and conname  = 'technician_assignments_date_order_check'
  ) then
    alter table public.technician_assignments
      add constraint technician_assignments_date_order_check
      check (end_date >= start_date);
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 4. Missing indexes
-- Every foreign key and every column the app filters (.eq) or sorts (.order)
-- on. CREATE INDEX IF NOT EXISTS is a no-op where the index already exists.
-- -----------------------------------------------------------------------------

-- profiles
create index if not exists profiles_role_idx      on public.profiles (role);
create index if not exists profiles_is_active_idx on public.profiles (is_active);

-- projects
create index if not exists projects_coordinator_idx    on public.projects (coordinator_id);
create index if not exists projects_sales_engineer_idx on public.projects (sales_engineer_id);
create index if not exists projects_installation_idx   on public.projects (installation_id);
create index if not exists projects_supply_idx         on public.projects (supply_id);
create index if not exists projects_status_idx         on public.projects (status);
create index if not exists projects_created_at_idx     on public.projects (created_at desc);
create unique index if not exists projects_public_token_key
  on public.projects (public_token) where public_token is not null;

-- payments
create index if not exists payments_project_idx  on public.payments (project_id);
create index if not exists payments_due_date_idx on public.payments (due_date);
create index if not exists payments_status_idx   on public.payments (status);
create index if not exists payments_order_no_idx on public.payments (project_id, order_no);
create index if not exists payments_due_pending_idx
  on public.payments (due_date) where due_reminded_at is null;
create index if not exists payments_lc_pending_idx
  on public.payments (lc_date) where lc_enabled and lc_reminded_at is null;

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
create index if not exists technicians_is_active_idx on public.technicians (is_active);
create index if not exists technicians_name_idx      on public.technicians (name);
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

-- =============================================================================
-- Verification (optional — run manually after applying)
-- =============================================================================
-- select conname, contype from pg_constraint
--  where conname in ('materials_project_id_key',
--                    'technician_assignments_no_overlap',
--                    'technician_assignments_date_order_check');
--
-- select indexname from pg_indexes
--  where schemaname = 'public' and indexname like '%idempotency_key%';
