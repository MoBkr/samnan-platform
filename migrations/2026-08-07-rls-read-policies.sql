-- ═══════════════════════════════════════════════════════════════════════════
--  Samnan Platform — Row Level Security: read policies
--  Run once in Supabase → SQL Editor. Safe to re-run (idempotent).
--
--  WHY THIS EXISTS
--  Every table had RLS enabled with a policy granting `authenticated` a full
--  read of every row. That was proven exploitable: an employee signed in to the
--  platform could query the database directly (bypassing the app) and read
--  every project and every payment in the company, including projects they are
--  not assigned to.
--
--  Writes are unaffected — the app performs them with the service-role key,
--  which bypasses RLS by design, and authorization for writes is enforced in
--  the server actions (src/lib/auth/guards.ts).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Helpers ───────────────────────────────────────────────────────────────
-- security definer so they can read profiles/projects without recursing into
-- the very policies being evaluated.

create or replace function public.gsd_current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.gsd_is_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.gsd_current_role() in ('admin', 'coordinator'), false)
$$;

-- A project is visible to admins and coordinators (operational owners of the
-- whole portfolio), and to the sales engineer / installation manager assigned
-- to that specific project.
create or replace function public.gsd_can_access_project(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects p
    where p.id = p_id
      and (
        public.gsd_is_manager()
        or p.sales_engineer_id = auth.uid()
        or p.installation_id  = auth.uid()
      )
  )
$$;

-- ── Drop the permissive "everyone reads everything" policies ──────────────
do $$
declare
  r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and cmd in ('SELECT', 'ALL')
      and tablename in (
        'projects','payments','materials','supply_orders','installations',
        'documents','activity_log','purchase_requests','technicians',
        'technician_assignments','custody_entries','project_notes',
        'personal_notes','app_notifications','notifications'
      )
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- ── profiles ──────────────────────────────────────────────────────────────
-- The staff directory is intentionally readable by signed-in staff: team
-- pickers, board mentions and workload chips all need names and roles.
drop policy if exists "profiles_read" on public.profiles;
create policy "profiles_read" on public.profiles
  for select to authenticated using (true);

-- ── projects ──────────────────────────────────────────────────────────────
create policy "projects_read" on public.projects
  for select to authenticated
  using (
    public.gsd_is_manager()
    or sales_engineer_id = auth.uid()
    or installation_id   = auth.uid()
  );

-- ── Everything hanging off a project follows the project's visibility ─────
create policy "payments_read" on public.payments
  for select to authenticated using (public.gsd_can_access_project(project_id));

create policy "materials_read" on public.materials
  for select to authenticated using (public.gsd_can_access_project(project_id));

create policy "supply_orders_read" on public.supply_orders
  for select to authenticated using (public.gsd_can_access_project(project_id));

create policy "installations_read" on public.installations
  for select to authenticated using (public.gsd_can_access_project(project_id));

create policy "documents_read" on public.documents
  for select to authenticated using (public.gsd_can_access_project(project_id));

create policy "project_notes_read" on public.project_notes
  for select to authenticated using (public.gsd_can_access_project(project_id));

create policy "custody_entries_read" on public.custody_entries
  for select to authenticated using (public.gsd_can_access_project(project_id));

-- activity_log rows may be platform-wide (project_id is null) — those are the
-- audit trail, restricted to managers.
create policy "activity_log_read" on public.activity_log
  for select to authenticated
  using (
    case
      when project_id is null then public.gsd_is_manager()
      else public.gsd_can_access_project(project_id)
    end
  );

create policy "notifications_read" on public.notifications
  for select to authenticated
  using (
    case
      when project_id is null then public.gsd_is_manager()
      else public.gsd_can_access_project(project_id)
    end
  );

-- ── Company-wide operational data — signed-in staff ───────────────────────
create policy "technicians_read" on public.technicians
  for select to authenticated using (true);

create policy "technician_assignments_read" on public.technician_assignments
  for select to authenticated using (true);

-- Purchase requests are a coordinator/admin workflow; sales engineers see the
-- ones attached to a project they own (matched by name, as the app does).
create policy "purchase_requests_read" on public.purchase_requests
  for select to authenticated
  using (
    public.gsd_is_manager()
    or created_by  = auth.uid()
    or engineer_id = auth.uid()
    or exists (
      select 1 from public.projects p
      where p.project_name = purchase_requests.project_name
        and (p.sales_engineer_id = auth.uid() or p.installation_id = auth.uid())
    )
  );

-- ── Strictly personal rows ────────────────────────────────────────────────
-- A personal notebook belongs to its owner. Admins may read it, and every such
-- read is written to the audit log by the application.
create policy "personal_notes_read" on public.personal_notes
  for select to authenticated
  using (owner_id = auth.uid() or public.gsd_current_role() = 'admin');

create policy "app_notifications_read" on public.app_notifications
  for select to authenticated using (recipient_id = auth.uid());

-- ── Make sure RLS is actually on everywhere ───────────────────────────────
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles','projects','payments','materials','supply_orders','installations',
    'documents','activity_log','notifications','purchase_requests','technicians',
    'technician_assignments','custody_entries','project_notes','personal_notes',
    'app_notifications'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;
