-- =============================================
-- Samnan Platform — Full Database Schema
-- Run this in Supabase SQL Editor
-- =============================================

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

-- =============================================
-- Enable Row Level Security (RLS)
-- =============================================
alter table public.profiles      enable row level security;
alter table public.projects      enable row level security;
alter table public.payments      enable row level security;
alter table public.materials     enable row level security;
alter table public.supply_orders enable row level security;
alter table public.installations enable row level security;
alter table public.documents     enable row level security;
alter table public.activity_log  enable row level security;
alter table public.notifications enable row level security;

-- =============================================
-- RLS Policies (allow authenticated users full access)
-- The app uses service role for writes — RLS is a safety net
-- =============================================
create policy "Authenticated users can read all" on public.profiles for select using (auth.role() = 'authenticated');
create policy "Authenticated users can read all" on public.projects for select using (auth.role() = 'authenticated');
create policy "Authenticated users can read all" on public.payments for select using (auth.role() = 'authenticated');
create policy "Authenticated users can read all" on public.materials for select using (auth.role() = 'authenticated');
create policy "Authenticated users can read all" on public.supply_orders for select using (auth.role() = 'authenticated');
create policy "Authenticated users can read all" on public.installations for select using (auth.role() = 'authenticated');
create policy "Authenticated users can read all" on public.documents for select using (auth.role() = 'authenticated');
create policy "Authenticated users can read all" on public.activity_log for select using (auth.role() = 'authenticated');
create policy "Authenticated users can read all" on public.notifications for select using (auth.role() = 'authenticated');

-- =============================================
-- Auto-create profile on signup
-- =============================================
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

-- =============================================
-- updated_at trigger for projects
-- =============================================
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger projects_updated_at
  before update on public.projects
  for each row execute procedure update_updated_at();

-- =============================================
-- Storage bucket for documents
-- Run this AFTER creating the bucket in dashboard
-- =============================================
-- CREATE BUCKET named: documents (public)
-- Then enable public read in bucket settings
