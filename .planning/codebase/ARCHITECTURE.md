<!-- refreshed: 2026-06-18 -->
# Architecture

**Analysis Date:** 2026-06-18

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                    Next.js App Router                       │
│  Pages, Layouts, Auth Pages, Dashboard, Public Routes       │
│  `src/app/(auth)`, `src/app/(dashboard)`, `src/app/track`   │
└─────────────┬───────────────────────────────────────────────┘
              │
┌─────────────▼───────────────────────────────────────────────┐
│                    Client Components                         │
│   Forms, Dialogs, Tabs, Lists, Charts, UI State            │
│   `src/components` (layout, projects, payments, etc.)       │
└─────────────┬───────────────────────────────────────────────┘
              │
┌─────────────▼───────────────────────────────────────────────┐
│                   Server Actions (RPC)                      │
│   Supabase queries, mutations, business logic               │
│   `src/lib/actions` (projects, payments, installation...)   │
└─────────────┬───────────────────────────────────────────────┘
              │
┌─────────────▼───────────────────────────────────────────────┐
│                  Supabase SDK Clients                        │
│   Browser client (anon key)                                 │
│   Server client (ssr cookies)                               │
│   Service client (service role — bypasses RLS)              │
│   `src/lib/supabase` (client, server, service, typed)       │
└─────────────┬───────────────────────────────────────────────┘
              │
┌─────────────▼───────────────────────────────────────────────┐
│              Supabase (PostgreSQL + Auth)                    │
│   9 tables: profiles, projects, payments, materials,        │
│   supply_orders, installations, documents, activity_log,    │
│   app_notifications, technicians, technician_assignments,   │
│   purchase_requests                                          │
└─────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| **Next.js Pages** | Route definition, async data loading, layout composition | `src/app/**/*.tsx` |
| **Client Components** | User interactions, form state, dialogs, tabs, rendering | `src/components/**/*.tsx` |
| **Server Actions** | Business logic, DB mutations, validation, notifications | `src/lib/actions/**/*.ts` |
| **Supabase Clients** | Database connection, auth, session management | `src/lib/supabase/**/*.ts` |
| **Type Definitions** | Database schema types, unions, enums | `src/types/database.ts` |
| **Utilities** | Formatting (currency, dates), class names | `src/lib/utils.ts` |
| **Constants** | Labels, stage configs, payment types | `src/lib/constants.ts` |
| **Middleware** | Auth guard, route protection | `src/middleware.ts` |

## Pattern Overview

**Overall:** Server-driven Next.js full stack with Server Components + Server Actions

**Key Characteristics:**
- **Server Components by default:** Pages and layouts are Server Components; only UI state requires `'use client'`
- **Server Actions** (RPC-style): Backend logic is defined as `'use server'` functions that can be called from components
- **Supabase auth:** Middleware protects routes; session managed via cookies with ssr client
- **Service role for writes:** Mutations use the service client to bypass row-level security (RLS); reads use anon client
- **Arabic RTL throughout:** `dir="rtl"` on HTML, Cairo font, all labels Arabic
- **Role-based access:** 5 roles (coordinator, sales_engineer, installation, supply, admin) gate routes and features

## Layers

**App Router (Pages & Layouts):**
- Purpose: Define routes, load async data, apply layout shells
- Location: `src/app`
- Contains: Folder-based route definitions (e.g., `/dashboard`, `/projects/[id]`), layout.tsx files
- Depends on: Server Actions, Supabase clients, components
- Used by: Browser navigation, Next.js routing

**Components (UI & State):**
- Purpose: Render UI, handle user interactions, manage client state (forms, dialogs, tabs)
- Location: `src/components`
- Contains: Page components, shared components (buttons, inputs, badges), domain components (projects, payments, etc.)
- Depends on: Server Actions, utilities, shadcn/ui, lucide icons
- Used by: Pages and other components

**Server Actions (Business Logic):**
- Purpose: Database mutations, queries, validation, event notifications
- Location: `src/lib/actions`
- Contains: 13 action files (projects.ts, payments.ts, installation.ts, etc.), each grouped by domain
- Depends on: Supabase clients, type definitions, utilities, notifications
- Used by: Components and pages (called from form submissions, event handlers)

**Supabase Clients (Database Access):**
- Purpose: Connect to Supabase, manage auth, execute queries
- Location: `src/lib/supabase`
- Contains: Browser client (createClient), server client (createClient with ssr), service client (service role)
- Depends on: Environment variables, Supabase SDK
- Used by: Server Actions, middleware

**Type Definitions:**
- Purpose: TypeScript types for database entities and enums
- Location: `src/types/database.ts`
- Contains: Profile, Project, Payment, Material, Installation, and 10+ more types
- Used by: Components, Server Actions, type checking

## Data Flow

### Primary Request Path: Project Creation

1. **User submits form** (`src/components/projects/new-project-form.tsx`)
   - Client component with form state, validation via zod
   - Submit calls `createProject` server action

2. **Server Action validates & inserts** (`src/lib/actions/projects.ts:createProject()`)
   - Reads current user from auth
   - Validates required fields (client_name, project_name)
   - Calls service client to insert into `projects` table
   - Logs activity to `activity_log`
   - Calls `notify()` to send notifications

3. **Database mutation succeeds**
   - Row inserted with status='active'
   - Activity log records the creation

4. **Cache invalidated, UI updates** (`revalidatePath('/projects')`)
   - Next.js revalidates the `/projects` page
   - User redirected to `/projects` or project detail page
   - Toast confirms success

### Secondary Flow: Payment Recording

1. **Coordinator uploads receipt** (`src/components/payments/payments-tab.tsx`)
   - Opens dialog to record payment
   - Calls `recordPayment` server action with receipt file

2. **Server Action processes** (`src/lib/actions/payments.ts:recordPayment()`)
   - Validates payment amount
   - Uploads receipt to Supabase Storage
   - Updates payment row: status, paid_amount, receipt_url, paid_at
   - Checks if all payments paid → notifies sales engineer + coordinator
   - If final payment → notifies installation manager

3. **Activity logged, notifications sent**
   - `app_notifications` table receives notification rows
   - Coordinator sees notification bell in header

### State Management

**Per-page state:**
- Forms: React Hook Form + zod validation (no external state manager)
- Dialogs/tabs: useState for UI visibility/selection
- Async data: Loaded server-side; revalidatePath refreshes

**Shared state:**
- Authentication: Supabase auth (session in cookies, read via middleware/server client)
- User profile: Loaded once in dashboard layout, passed via props
- Project data: Fetched fresh on each page load; no client-side caching

## Key Abstractions

**Server Action Pattern (RPC-style):**
- Purpose: Encapsulate backend logic callable from the frontend
- Examples: `src/lib/actions/projects.ts` (createProject, updateProjectStatus, etc.)
- Pattern: `async function name(formData or params) { ... return { data?, error? } }`
- Error handling: Return error object; throw on unrecoverable failures; let caller handle toast/redirect

**Role-based Access Control:**
- Purpose: Restrict features/pages to specific roles
- Examples: 
  - Route guard: middleware checks `/dashboard` → redirects unauthenticated to `/login`
  - Feature gate: only coordinators see `/users` page
  - Data filtering: `getProjects()` filters by sales_engineer_id if user is sales_engineer
- Location: `src/middleware.ts`, page components, server actions

**Notification System:**
- Purpose: Send in-app notifications to users when events occur
- Examples: Payment recorded, technician assigned, installation scheduled
- Pattern: Call `notify(recipientId, title, body, link, type, projectId)` from server action
- Storage: `app_notifications` table; frontend polls every 60s

**Installation Stages (JSONB Workflow):**
- Purpose: Track multi-step inspection process (Site Inspection → MIR → IRS → Commissioning → Snag List)
- Storage: `installations.stages` column holds JSON object keyed by stage name
- Each stage: `{ done?: boolean, started?: boolean, files?: InstallAttachment[], customSlots?: { key, label }[] }`
- Pattern: Defined in `src/lib/constants.ts` (INSTALL_STAGES array); stages can be reopened

**Technician Pool (Shared Records):**
- Purpose: Company-wide pool of installation technicians (not auth users)
- Pattern: `technicians` table (name, employee_no, phone, is_active) + `technician_assignments` (date-range booking, status)
- Usage: Coordinator/installation manager assigns technicians to projects; conflict prevention via date-range check

## Entry Points

**Web App Entry:**
- Location: `src/app/layout.tsx` (root layout with RTL, font, Toaster)
- Triggers: Browser navigation to https://samnan-platform.vercel.app

**Protected Dashboard Entry:**
- Location: `src/app/(dashboard)/layout.tsx`
- Triggers: User navigates to `/dashboard` or any `/dashboard/*` route
- Responsibilities: Load current user profile, render DashboardShell (sidebar + header), role check

**Public Tracking Page Entry:**
- Location: `src/app/track/[token]/page.tsx`
- Triggers: Client opens link from coordinator (e.g., /track/abc123)
- Responsibilities: Fetch project by public_token, display read-only project status

**Authentication Flow:**
- Entry: `src/app/(auth)/login/page.tsx` or `/signup/page.tsx`
- Middleware redirects unauthenticated users here
- Signs in via Supabase auth → sets session cookie → redirects to `/dashboard`

## Architectural Constraints

- **Threading:** Next.js 15 runs on Vercel (serverless); each request is single-threaded; heavy async operations (DB queries) are awaited sequentially
- **Global state:** No Redux/Zustand; shared state is read-only (auth, profile) passed via props; UI state is component-local
- **Circular imports:** None detected; import hierarchy is clean (pages → components → actions → clients)
- **Database:** Supabase PostgreSQL; RLS enabled on all tables; service client bypasses RLS for server-side mutations (safe because server actions are trusted)
- **File storage:** Supabase Storage bucket `documents`; images served via Next.js Image component with Supabase origin
- **Session:** 7-day cookie-based session; refreshed on each server action
- **Deployment:** Vercel (serverless); environment variables for Supabase URLs/keys stored in Vercel settings

## Anti-Patterns

### Hard-Deleting Active Projects

**What happens:** Old code might call DELETE on projects table
**Why it's wrong:** Data is lost forever; audit trail is incomplete; clients cannot reference past projects
**Do this instead:** Set `status = 'cancelled'` with a `cancellation_reason`; keep row in DB for history (`src/lib/actions/projects.ts:deleteProject()` soft-deletes)

### Forgetting to Log Activity

**What happens:** Status changes occur without writing to `activity_log`
**Why it's wrong:** No audit trail; coordinator cannot track who did what and when
**Do this instead:** Every mutation that changes project/payment/installation state calls `logActivity()` from the service client (`src/lib/actions/projects.ts:logActivity()`)

### Mixing Business Logic into Components

**What happens:** Component tries to call Supabase directly with `useClient` + browser client + no permissions
**Why it's wrong:** Race conditions, auth failures, RLS denials
**Do this instead:** Move logic to server action (in `src/lib/actions/*`); call from component via form submission or event handler

### Hardcoding Role Checks in UI

**What happens:** Component checks `profile.role === 'coordinator'` to show a button
**Why it's wrong:** Frontend check is cosmetic; unauthorized users can still call the server action if they know the URL
**Do this instead:** Check role in the server action too; return early with error if unauthorized (`src/lib/actions/installation.ts:requireInstallEditor()`)

## Error Handling

**Strategy:** Graceful degradation with user-friendly Arabic messages

**Patterns:**
- **Validation errors:** Return `{ error: 'Arabic message' }` from server action; component toasts the error
- **Auth failures:** Middleware redirects to `/login`; server actions return error if no user
- **Database errors:** Catch error, return `{ error: 'فشل العملية' }`; never expose DB error details to UI
- **Async operations:** Wrap in try-catch; show loading state during mutation; disable button during submit
- **Missing data:** Return empty array `[]` instead of null; show empty state component

**Examples:**
- `src/lib/actions/projects.ts:createProject()`: Validates client_name/project_name, catches insert error
- `src/lib/actions/payments.ts:recordPayment()`: Checks payment exists, validates amount, shows error toast on fail
- `src/components/projects/new-project-form.tsx`: Disables submit button during loading, shows error in form

## Cross-Cutting Concerns

**Logging:** No external logging service; activity_log table records all status changes (who, what, when, details)

**Validation:** 
- Frontend: React Hook Form + zod for client-side UX
- Backend: Always re-validate in server action before DB write (never trust client)
- Example: `src/lib/actions/payments.ts` checks if payment_type is valid, amount > 0

**Authentication:**
- Supabase auth handles login/signup
- Middleware checks session, redirects unauthenticated users
- Role-based gates in server actions and components

**Authorization:**
- Role enum: 5 types (coordinator, sales_engineer, installation, supply, admin)
- Route guards: Middleware + page redirects
- Data filtering: Server actions filter results by user.id and role
- Feature flags: Some features only for certain roles (e.g., users page = admin only)

---

*Architecture analysis: 2026-06-18*
