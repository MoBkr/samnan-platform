# Samnan Platform — Living Memory

> **Read this file fully at the start of every session.**
> At the end of each session (when human says "done"), update this file:
> - Move today's log to HISTORY
> - Update ARCHITECTURE STATE to reflect reality
> - Write tomorrow's plan in NEXT SESSION
> - Write any messages for Mohamed in the sections below

---

## 📬 MESSAGES TO HUMAN

> *Write here when you need Mohamed's attention. He clears after reading.*

**[ No messages ]**

---

## 🚨 HUMAN ACTIONS NEEDED

> *Clear each item after completing.*

0. **Supabase — Installation stages columns (REQUIRED for new installation workflow):** Run in SQL Editor. Adds the staged-inspection data and expected-duration columns to `installations`:
   ```sql
   ALTER TABLE public.installations
     ADD COLUMN IF NOT EXISTS stages jsonb DEFAULT '{}'::jsonb,
     ADD COLUMN IF NOT EXISTS expected_duration text;
   ```
   Without this, the new التركيب tab (Site Inspection / MIR / IRS / Commissioning / Snag List) and the expected-duration field will fail to save.

0b. **Supabase — Client share token (REQUIRED for client tracking page):** Run in SQL Editor. Adds the public token used by the read-only client tracking page `/track/[token]`:
   ```sql
   ALTER TABLE public.projects
     ADD COLUMN IF NOT EXISTS public_token text UNIQUE;
   ```
   Without this, the "مشاركة مع العميل" button will fail to generate a link.

1. **Supabase — SQL Migration (REQUIRED):** Run this in Supabase SQL Editor. The `documents` table type constraint needs updating to support new document types (`delivery_note`, `materials_request`), and the `installation_id` column needs to exist on `projects`:
   ```sql
   -- Add installation_id to projects (if not already done)
   ALTER TABLE public.projects
     ADD COLUMN IF NOT EXISTS installation_id uuid REFERENCES public.profiles(id);

   -- Update documents type constraint to include new types
   ALTER TABLE public.documents
     DROP CONSTRAINT IF EXISTS documents_type_check;

   ALTER TABLE public.documents
     ADD CONSTRAINT documents_type_check
     CHECK (type IN ('contract','invoice','receipt','delivery_note','completion_photo','other','materials_request'));
   ```
   Without this, file uploads in the Attachments tab will fail.

2. **Supabase — Payments type constraint (REQUIRED if payments of type `materials` fail):** The original DB schema used `'supply'` for payment type, but the app now uses `'materials'`. If creating a materials payment returns a DB constraint error, run:
   ```sql
   ALTER TABLE public.payments
     DROP CONSTRAINT IF EXISTS payments_type_check;

   ALTER TABLE public.payments
     ADD CONSTRAINT payments_type_check
     CHECK (type IN ('upfront','materials','installation','final','custom'));
   ```

3. **Supabase — Profiles FK for safe deletion from dashboard:** If deleting a user from the Supabase Auth dashboard (not from the app) fails with FK error, run:
   ```sql
   ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
   ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey
     FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
   ```

---

## 🗓️ TODAY'S SESSION

**Date:** 2026-05-13
**Status:** Full app built, all features complete, build passing ✓

---

## 📋 NEXT SESSION — Start Here

1. **Verify SQL migration ran** (item 1 in HUMAN ACTIONS above)
2. **Test the app end-to-end** — create a project, add payments, request materials, schedule supply, schedule installation, close project
3. **If bugs are found**, fix them one by one
4. **Optional next features:**
   - Search/filter on projects list (by status, date range, team member)
   - Notifications / email alerts
   - Dashboard improvements (charts, revenue over time)
   - Mobile PWA improvements

---

## 🏗️ ARCHITECTURE STATE

### What exists right now

Full-stack Arabic RTL app deployed on Vercel, connected to Supabase.

### Folder structure
```
src/
  app/
    (auth)/
      login/page.tsx          # Login page
      signup/page.tsx         # Signup with role select (coordinator/SE/supply/installation/admin)
    (dashboard)/
      layout.tsx              # Dashboard shell (sidebar + header)
      dashboard/page.tsx      # Role-specific dashboard
      projects/
        page.tsx              # Projects list (tab: مشاريعي / كل المشاريع)
        new/page.tsx          # New project form
        [id]/page.tsx         # Project detail
      payments/page.tsx       # Payments overview
      supply/page.tsx         # Supply overview
      installation/page.tsx   # Installation overview
      users/page.tsx          # User management (admin only)
  components/
    layout/
      dashboard-shell.tsx     # Overall layout with sidebar + mobile drawer
      sidebar.tsx             # Navigation sidebar
      header.tsx              # Top header with user dropdown
    projects/
      projects-list.tsx       # Card grid view (مشاريعي/كل المشاريع tabs)
      project-detail.tsx      # Full project detail with tabs
      new-project-form.tsx    # Create project form (role-aware team assignment)
      activity-tab.tsx        # Activity log tab
    payments/
      payments-tab.tsx        # Payment cards with progress bars
    supply/
      materials-tab.tsx       # Material requests + supply orders
    installation/
      installation-tab.tsx    # Installation scheduling
    dashboard/
      coordinator-dashboard.tsx
      sales-engineer-dashboard.tsx
      supply-dashboard.tsx
      installation-dashboard.tsx
      admin-dashboard.tsx
    shared/
      page-header.tsx
      status-badge.tsx        # All status badge components
      empty-state.tsx
    ui/                       # Base UI components (button, input, dialog, etc.)
  lib/
    actions/
      auth.ts                 # getCurrentProfile, signOut
      projects.ts             # getProject, createProject, updateProjectStatus, updateProjectTeam
      payments.ts             # createPayment, recordPayment
      materials.ts            # createMaterialRequest, updateMaterialStatus, scheduleSupplyOrder, completeSupplyOrder
      installation.ts         # scheduleInstallation, updateInstallationStatus
      upload.ts               # uploadFile (Supabase Storage)
    supabase/
      client.ts               # Browser client
      server.ts               # Server client (cookies)
      service.ts              # Service role client (bypasses RLS)
      typed.ts                # QueryResult/QueryResultMany type helpers
    constants.ts              # STATUS_LABELS, PAYMENT_TYPE_LABELS, ROLE_LABELS, etc.
    utils.ts                  # formatCurrency, formatDateShort, isOverdue, cn
  types/
    database.ts               # All DB types: Profile, Project, Payment, Material, etc.
  middleware.ts               # Route guard: redirects unauthenticated users to /login
```

### Database
9 tables in Supabase:
- `profiles` — user roles (coordinator, sales_engineer, supply, installation, admin)
- `projects` — **has supply_id and installation_id columns (requires SQL migration above)**
- `payments` — per-project payment schedule
- `materials` — material requests with jsonb items array
- `supply_orders` — supply delivery scheduling
- `installations` — installation scheduling
- `documents` — file references
- `activity_log` — all status changes
- `notifications` — (created but not yet used)

RLS is enabled on all tables. The app uses the service role client for writes.

### Routes
| Route | Role access |
|-------|-------------|
| `/login` | All |
| `/signup` | All |
| `/dashboard` | coordinator, sales_engineer, admin |
| `/projects` | coordinator, sales_engineer, supply, installation, admin |
| `/projects/new` | coordinator, sales_engineer, admin |
| `/projects/[id]` | All |
| `/payments` | coordinator, admin |
| `/supply` | supply, coordinator, admin |
| `/installation` | installation, coordinator, admin |
| `/users` | admin only |

### Environment
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### Live URLs
- **App:** https://samnan-platform.vercel.app
- **GitHub:** https://github.com/MoBkr/samnan-platform
- **Supabase:** https://supabase.com/dashboard/project/vkkyawhqwnlgpztaqqjq

---

## 📊 PROJECT STATUS TRACKER

| Feature | Status | Notes |
|---------|--------|-------|
| Auth + roles | ✅ | Login, signup, role-based redirect, middleware guard |
| Project creation | ✅ | Full form with team assignment + workload display |
| Project list | ✅ | Card grid, مشاريعي/كل المشاريع tabs |
| Project detail | ✅ | Header with role chips, lifecycle progress, tabs |
| Project status actions | ✅ | Close, hold, reactivate, cancel with dialogs |
| Team edit from detail | ✅ | Admin/coordinator can change all 4 team members |
| Payment tracking | ✅ | Cards with progress bars, receipt upload, overdue detection |
| Materials & supply | ✅ | Request form, status updates, supply order scheduling |
| Installation | ✅ | Schedule, confirm, in-progress, complete |
| Supply/Installation person assignment | ✅ | supply_id + installation_id columns added to projects |
| Final payment bypass | ✅ | If final payment paid, skip supply/install payment prereqs |
| Dashboard | ✅ | Role-specific dashboards for all 5 roles |
| User management | ✅ | Admin can create/edit/deactivate users |
| Notifications | ⬜ | Not started (not needed for prototype) |

---

## 📅 HISTORY LOG

### Session 1 — 2026-05-13
Built the entire app from scratch:
- Auth, roles, middleware
- Project CRUD with contract upload
- Payment tracking (all types)
- Materials & supply flow
- Installation scheduling
- Role-specific dashboards
- User management

### Session 2 — 2026-05-13 (continued)
- Added admin role to signup
- Role-based team assignment with workload display (WorkloadBadge)
- Project status actions (close/hold/reactivate/cancel dialogs)
- My Projects / All Projects tab switcher
- Team edit dialog from project detail page
- Final payment bypass for supply/installation requirements
- Fixed payment logic bugs (inverted guard, over-payment, missing prerequisites)
- Added supply_id + installation_id to projects (DB migration pending)
- Comprehensive UI/UX overhaul:
  - Projects list: table → card grid
  - Project detail: role-colored team chips instead of flat list
  - Materials tab: better cards with numbered item list + progress bar
  - Installation tab: better cards with progress steps + confirmation badges
  - Payments tab: collection summary bar + improved card design
  - Input component: brand color focus rings

---
---
---

# PROJECT REFERENCE — DO NOT MODIFY

---

## What We're Building

**Samnan Platform** is an internal Arabic web app for **Samnan Holding Group** (Saudi contracting company).

**The problem today:** Everything is managed manually — Excel files, WhatsApp groups, scattered Google Sheets. Data gets lost, payments are missed, no one has a clear picture.

**The solution:** One centralized platform where each team member sees exactly what they need to do, nothing more.

---

## The #1 Priority

**Working product delivered to the client.** This is a prototype — it must look professional, feel smooth, and actually work end to end. UI/UX quality is not optional: the client will judge by how it looks and feels. Speed matters — no over-engineering, no premature optimization.

---

## Stack — Use What Works Best

Choose the most stable, widely-supported versions of each tool. Avoid bleeding-edge releases that introduce breaking changes. The goal is to ship, not to experiment.

Recommended approach (adjust if you know something better):
- **Frontend:** Next.js (App Router) + TypeScript
- **UI:** Tailwind CSS + shadcn/ui — RTL Arabic throughout
- **Backend:** Next.js Server Actions or API Routes
- **Database:** Supabase (PostgreSQL + Auth + Storage)
- **Hosting:** Vercel (prototype) → later AWS Bahrain (production)
- **Font:** Cairo (Google Fonts) — best Arabic font for web

If any library version causes problems, downgrade or switch immediately. Don't fight the tooling.

---

## User Roles

| Role | Arabic | What They Do |
|------|--------|--------------|
| `coordinator` | الكوردنيتر | Manages the full project lifecycle: creation, payments, follow-up, closure |
| `sales_engineer` | مهندس المبيعات | Sees only their own clients' projects, sends payment requests |
| `supply` | التوريد | Receives material requests, schedules supply delivery |
| `installation` | التركيبات | Sees installation schedule, confirms completion |
| `admin` | الإدارة | Full read access + user management |

---

## Full Project Lifecycle

Every project goes through this sequence:

```
1. CONTRACT SIGNED
   - Sales engineer creates project in system
   - Uploads signed contract PDF
   - Defines payment schedule (upfront / supply / installation / final)

2. UPFRONT PAYMENT
   - Coordinator requests first payment from client
   - Client pays → coordinator uploads receipt
   - System marks payment as paid

3. MATERIAL REQUEST
   - Coordinator submits material list to supply team
   - Supply team reviews, prepares, marks as ready

4. SUPPLY PAYMENT
   - Client pays supply payment before delivery
   - Receipt uploaded, status updated

5. SUPPLY DELIVERY
   - Supply team schedules delivery date
   - Delivery confirmed → completion receipt uploaded

6. INSTALLATION PAYMENT
   - Client pays before installation begins
   - Receipt uploaded, status updated

7. INSTALLATION
   - Installation team scheduled
   - Team confirms date → client notified
   - Work completed → photos uploaded

8. FINAL PAYMENT + PROJECT CLOSURE
   - Final payment collected
   - All receipts in system
   - Project marked complete
```

---

## Database Schema

9 tables. Use this exact schema:

```sql
-- Profiles
create table public.profiles (
  id          uuid references auth.users(id) primary key,
  full_name   text not null,
  role        text not null check (role in ('coordinator','sales_engineer','supply','installation','admin')),
  is_active   boolean default true,
  created_at  timestamptz default now()
);

-- Projects
create table public.projects (
  id                  uuid primary key default gen_random_uuid(),
  client_name         text not null,
  project_name        text not null,
  coordinator_id      uuid references public.profiles(id),
  sales_engineer_id   uuid references public.profiles(id),
  contract_url        text,
  status              text default 'active' check (status in ('active','completed','cancelled','on_hold')),
  total_amount        numeric(12,2),
  start_date          date,
  expected_end_date   date,
  cancellation_reason text,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- Payments
create table public.payments (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid references public.projects(id) not null,
  type          text not null check (type in ('upfront','supply','installation','final','custom')),
  percentage    numeric(5,2),
  amount        numeric(12,2) not null,
  due_date      date,
  status        text default 'pending' check (status in ('pending','partial','paid','overdue','cancelled')),
  paid_amount   numeric(12,2) default 0,
  paid_at       timestamptz,
  receipt_url   text,
  notes         text,
  created_at    timestamptz default now()
);

-- Materials
create table public.materials (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid references public.projects(id) not null,
  requested_by  uuid references public.profiles(id),
  status        text default 'pending' check (status in ('pending','preparing','ready','delivered','partial')),
  items         jsonb not null default '[]',
  requested_at  timestamptz default now(),
  ready_at      timestamptz,
  notes         text
);

-- Supply Orders
create table public.supply_orders (
  id                     uuid primary key default gen_random_uuid(),
  project_id             uuid references public.projects(id) not null,
  material_id            uuid references public.materials(id),
  scheduled_date         date,
  confirmed_by_client    boolean default false,
  status                 text default 'scheduled' check (status in ('scheduled','in_progress','completed','failed','rescheduled')),
  completion_receipt_url text,
  completed_at           timestamptz,
  issues                 text,
  created_at             timestamptz default now()
);

-- Installations
create table public.installations (
  id                          uuid primary key default gen_random_uuid(),
  project_id                  uuid references public.projects(id) not null,
  scheduled_date              date,
  installation_team_confirmed boolean default false,
  client_notified             boolean default false,
  status                      text default 'scheduled' check (status in ('scheduled','confirmed','in_progress','completed','delayed','rescheduled')),
  completion_photos           text[] default '{}',
  completed_at                timestamptz,
  delay_reason                text,
  created_at                  timestamptz default now()
);

-- Documents
create table public.documents (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid references public.projects(id) not null,
  type         text not null check (type in ('contract','invoice','receipt','delivery_receipt','completion_photo','other')),
  url          text not null,
  uploaded_by  uuid references public.profiles(id),
  uploaded_at  timestamptz default now(),
  description  text
);

-- Activity Log
create table public.activity_log (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references public.projects(id),
  user_id     uuid references public.profiles(id),
  action      text not null,
  details     jsonb default '{}',
  created_at  timestamptz default now()
);

-- Notifications
create table public.notifications (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid references public.projects(id),
  recipient_type  text check (recipient_type in ('internal','client')),
  channel         text check (channel in ('email','whatsapp','in_app')),
  status          text default 'pending' check (status in ('pending','sent','failed','retrying')),
  message         text,
  sent_at         timestamptz,
  retry_count     int default 0,
  created_at      timestamptz default now()
);

-- RLS: enable on all tables
alter table public.profiles      enable row level security;
alter table public.projects      enable row level security;
alter table public.payments      enable row level security;
alter table public.materials     enable row level security;
alter table public.supply_orders enable row level security;
alter table public.installations enable row level security;
alter table public.documents     enable row level security;
alter table public.activity_log  enable row level security;
alter table public.notifications enable row level security;

-- Auto-create profile on signup
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- updated_at trigger for projects
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger projects_updated_at
  before update on public.projects
  for each row execute procedure update_updated_at();
```

---

## UI/UX Requirements

These are non-negotiable — the client will judge the product on how it looks:

- **Arabic RTL always:** `dir="rtl"` on `<html>`, every page, every component
- **Font:** Cairo from Google Fonts, weights 400/500/600/700
- **Clean and modern:** white backgrounds, subtle shadows, clear hierarchy
- **Mobile-friendly:** most users will open on phone
- **Loading states everywhere:** buttons disable during submit, show spinner
- **Clear feedback:** success toast, error messages in Arabic
- **Status badges:** color-coded (green=paid, yellow=pending, red=overdue)
- **Empty states:** friendly Arabic message when no data, not a blank page
- **Consistent spacing:** breathe — don't cram things together

---

## Business Rules — Enforce in Code

```
- Cannot create supply order if supply payment is not 'paid'
- Cannot close project if any payment is 'pending' or 'partial'
- Cannot delete active project — archive only (status = 'cancelled')
- Partial payment: status stays 'partial' until full amount received
- Cancelled project requires cancellation_reason text
- Every status change → write a row to activity_log
- File uploads (contracts, receipts): store in Supabase Storage bucket 'documents'
```

---

## Arabic Labels

```ts
export const STATUS_LABELS: Record<string, string> = {
  active: 'نشط',
  completed: 'مكتمل',
  cancelled: 'ملغي',
  on_hold: 'معلق',
}

export const PAYMENT_TYPE_LABELS: Record<string, string> = {
  upfront: 'دفعة أولى',
  supply: 'دفعة توريد',
  installation: 'دفعة تركيب',
  final: 'دفعة نهائية',
  custom: 'دفعة مخصصة',
}

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'معلقة',
  partial: 'مدفوعة جزئياً',
  paid: 'مدفوعة',
  overdue: 'متأخرة',
  cancelled: 'ملغاة',
}

export const ROLE_LABELS: Record<string, string> = {
  coordinator: 'الكوردنيتر',
  sales_engineer: 'مهندس المبيعات',
  supply: 'التوريد',
  installation: 'التركيبات',
  admin: 'الإدارة',
}
```

---

## Build Order

Build in this exact sequence. Finish each step fully before moving to next.

```
Step 1: Auth & Roles
  - Login page (Arabic, clean design)
  - Session management
  - Role-based redirect after login
  - Middleware guard on all /dashboard routes

Step 2: Project Creation & List
  - Create project form (client, amount, dates, payment schedule)
  - Contract PDF upload
  - Project list page (role-filtered, search, status badge)
  - Project detail page

Step 3: Payment Tracking
  - Payment cards per project
  - Mark as paid + receipt upload
  - Overdue detection
  - Coordinator collection view

Step 4: Materials & Supply
  - Coordinator: request materials form
  - Supply team: see requests, update status
  - Supply order scheduling

Step 5: Installation
  - Schedule installation
  - Team confirmation
  - Photo upload on completion

Step 6: Dashboard
  - Role-specific cards and stats
  - Overdue alerts
  - Recent activity

Step 7: Notifications
  - In-app notifications
  - Email alerts (optional for prototype)
```

---

## Hard Rules

```
1. RTL + Arabic always — no English in the UI
2. Role guard on every /dashboard route
3. Never hard delete — always soft delete or status change
4. Log every status change to activity_log
5. No JS floats for money — use numeric from DB, format for display only
6. Server-side validation on every form submission
7. Show loading state during every async operation
8. Service role client for writes, regular client for reads (bypasses RLS safely)
```

---

## Edge Cases to Handle

```
- User with missing profile → auto-create from auth metadata or show setup page
- Payment already paid → block re-payment button
- No projects yet → friendly empty state, not blank page
- File upload fails → show error, don't block the form
- Session expired → redirect to login with clear Arabic message
- Unauthorized role tries to access page → redirect to their own dashboard
- Duplicate contract upload → warn but allow
- Network error → show retry option, don't lose form data
```

---

## Project Info

- **Client:** Samnan Holding Group — مجموعة سمنان القابضة
- **Built by:** Thakaa Flow — ai@tfco.sa
- **Human engineer:** Mohamed — reviews output, handles external services (Supabase, Vercel, GitHub)
