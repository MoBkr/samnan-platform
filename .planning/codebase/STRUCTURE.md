# Codebase Structure

**Analysis Date:** 2026-06-18

## Directory Layout

```
samnan-platform/
├── src/
│   ├── app/
│   │   ├── (auth)/                    # Auth routes (no layout shell)
│   │   │   ├── login/
│   │   │   ├── signup/
│   │   │   ├── forgot-password/
│   │   │   └── reset-password/
│   │   ├── (dashboard)/               # Protected routes (dashboard shell)
│   │   │   ├── layout.tsx             # Dashboard shell (sidebar + header)
│   │   │   ├── dashboard/
│   │   │   ├── projects/
│   │   │   ├── projects/new/
│   │   │   ├── projects/[id]/
│   │   │   ├── payments/
│   │   │   ├── supply/
│   │   │   ├── installation/
│   │   │   ├── technicians/
│   │   │   ├── users/                 # Admin only
│   │   │   ├── audit-log/
│   │   │   ├── purchase-requests/
│   │   │   └── reports/
│   │   ├── track/                     # Public tracking
│   │   │   └── [token]/
│   │   ├── layout.tsx                 # Root layout (RTL, font, Toaster)
│   │   ├── globals.css
│   │   └── page.tsx                   # (Redirect to /login or /dashboard)
│   ├── components/
│   │   ├── layout/                    # Shell & header
│   │   │   ├── dashboard-shell.tsx
│   │   │   ├── sidebar.tsx
│   │   │   ├── header.tsx
│   │   │   ├── auth-shell.tsx
│   │   │   └── notification-bell.tsx
│   │   ├── projects/                  # Project pages & tabs
│   │   │   ├── projects-list.tsx
│   │   │   ├── project-detail.tsx
│   │   │   ├── new-project-form.tsx
│   │   │   ├── activity-tab.tsx
│   │   │   ├── materials-tab.tsx
│   │   │   ├── attachments-tab.tsx
│   │   │   └── project-status-dialog.tsx
│   │   ├── payments/
│   │   │   └── payments-tab.tsx
│   │   ├── installation/
│   │   │   ├── installation-tab.tsx
│   │   │   ├── project-technicians.tsx
│   │   │   └── stage-*.tsx
│   │   ├── supply/                    # Supply workflow
│   │   │   └── materials-tab.tsx
│   │   ├── dashboard/                 # Role-specific dashboards
│   │   │   ├── coordinator-dashboard.tsx
│   │   │   ├── sales-engineer-dashboard.tsx
│   │   │   ├── installation-dashboard.tsx
│   │   │   ├── admin-dashboard.tsx
│   │   │   ├── progress-overview.tsx
│   │   │   ├── action-center.tsx
│   │   │   └── revenue-breakdown-card.tsx
│   │   ├── technicians/
│   │   │   └── technicians-manager.tsx
│   │   ├── purchase/                  # Purchase requests (BR)
│   │   │   └── purchase-board.tsx
│   │   ├── audit/
│   │   │   └── audit-log-view.tsx
│   │   ├── reports/
│   │   │   └── reports-view.tsx
│   │   ├── users/
│   │   │   └── users-manager.tsx
│   │   ├── shared/                    # Reusable UI components
│   │   │   ├── status-badge.tsx
│   │   │   ├── page-header.tsx
│   │   │   ├── empty-state.tsx
│   │   ├── ui/                        # shadcn/ui base components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── select.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── table.tsx
│   │   │   └── skeleton.tsx
│   │   └── auth/
│   │       └── auth-shell.tsx
│   ├── lib/
│   │   ├── actions/                   # Server actions (business logic)
│   │   │   ├── projects.ts
│   │   │   ├── payments.ts
│   │   │   ├── materials.ts
│   │   │   ├── installation.ts
│   │   │   ├── technicians.ts
│   │   │   ├── purchase-requests.ts
│   │   │   ├── auth.ts
│   │   │   ├── notifications.ts
│   │   │   ├── upload.ts
│   │   │   ├── attachments.ts
│   │   │   ├── share.ts
│   │   │   ├── audit.ts
│   │   │   ├── reports.ts
│   │   │   └── index.ts                # (Re-exports)
│   │   ├── supabase/
│   │   │   ├── client.ts               # Browser client (anon key)
│   │   │   ├── server.ts               # Server client (ssr cookies)
│   │   │   ├── service.ts              # Service client (service role)
│   │   │   └── typed.ts                # QueryResult/QueryResultMany types
│   │   ├── constants.ts                # Labels, stage configs
│   │   ├── utils.ts                    # formatCurrency, formatDate, cn()
│   │   └── upload-client.ts            # File upload helpers
│   ├── types/
│   │   └── database.ts                 # All DB types & enums
│   └── middleware.ts                   # Auth guard for protected routes
├── public/
│   ├── logo.png
│   └── ...
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
├── postcss.config.js
└── .eslintrc.json
```

## Directory Purposes

**`src/app`:**
- Purpose: Next.js App Router — defines all routes and page layouts
- Contains: Folders for each route, layout.tsx for shared layouts, page.tsx for route components
- Key files: `layout.tsx` (root), `(dashboard)/layout.tsx` (dashboard shell), pages under each route

**`src/app/(auth)`:**
- Purpose: Authentication pages (login, signup, password reset)
- Contains: No dashboard shell; clean minimal layout
- Key files: `login/page.tsx`, `signup/page.tsx`

**`src/app/(dashboard)`:**
- Purpose: Protected app routes requiring authentication
- Contains: Shared `layout.tsx` that loads profile + renders DashboardShell, then each page
- Key files: `dashboard/page.tsx` (role-specific dashboards), `projects/page.tsx`, `projects/[id]/page.tsx`, etc.

**`src/app/track`:**
- Purpose: Public project tracking page (no auth required)
- Contains: `[token]/page.tsx` — accepts public_token from URL, displays read-only project status
- Key files: `[token]/page.tsx`

**`src/components`:**
- Purpose: React components organized by domain/feature
- Contains: Page components, form components, tab components, shared UI base components
- Convention: Each route has a corresponding domain folder (`projects/`, `payments/`, etc.)

**`src/components/layout`:**
- Purpose: Shell, header, sidebar, navigation
- Key files: `dashboard-shell.tsx` (flex layout), `sidebar.tsx` (nav menu), `header.tsx` (top bar with user), `notification-bell.tsx` (polls for notifications)

**`src/components/projects`:**
- Purpose: Project-related UI (list, detail, forms, tabs)
- Key files: 
  - `projects-list.tsx` — card grid with mشاريعي/كل المشاريع tabs
  - `project-detail.tsx` — full project view with status header + 5 tabs
  - `new-project-form.tsx` — create project form with team assignment
  - `activity-tab.tsx`, `materials-tab.tsx`, `attachments-tab.tsx` — tab content

**`src/components/payments`, `src/components/installation`, `src/components/supply`:**
- Purpose: Domain-specific tab/page content
- Key files: `payments-tab.tsx`, `installation-tab.tsx`, `materials-tab.tsx`

**`src/components/dashboard`:**
- Purpose: Role-specific dashboard layouts and widgets
- Key files: 
  - `coordinator-dashboard.tsx`, `sales-engineer-dashboard.tsx`, `installation-dashboard.tsx`, `admin-dashboard.tsx`
  - `progress-overview.tsx` — KPI cards (collection %, materials %, installation %)
  - `revenue-breakdown-card.tsx` — active vs. on_hold vs. cancelled split

**`src/components/ui`:**
- Purpose: Base UI components from shadcn/ui (Button, Input, Dialog, etc.)
- Convention: Never modify these directly; import and use in domain components

**`src/components/shared`:**
- Purpose: Reusable helpers (status badges, page headers, empty states)
- Key files: `status-badge.tsx` (ProjectStatusBadge, PaymentStatusBadge), `empty-state.tsx`

**`src/lib/actions`:**
- Purpose: Server actions — backend business logic callable from components
- Contains: 13 action files, one per domain
- Convention: Each file groups related async functions (e.g., createProject, getProject, updateProjectStatus)

**`src/lib/supabase`:**
- Purpose: Supabase SDK instantiation and helpers
- Key files:
  - `client.ts` — createClient() browser client (anon key, reused singleton)
  - `server.ts` — createClient() server client (ssr, cookies)
  - `service.ts` — createServiceClient() service role (bypasses RLS)
  - `typed.ts` — QueryResult/QueryResultMany type helpers

**`src/types`:**
- Purpose: TypeScript type definitions for database entities
- Key files: `database.ts` — Profile, Project, Payment, Material, Installation, Installation, Technician, AppNotification, etc.

**`src/lib/constants.ts`:**
- Purpose: Shared constants — labels, stage configs, enums
- Contains: STATUS_LABELS, PAYMENT_STATUS_LABELS, ROLE_LABELS, INSTALL_STAGES array with stage configs

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx` — Root HTML shell (RTL, Cairo font, Toaster)
- `src/app/(auth)/login/page.tsx` — Login entry point
- `src/app/(dashboard)/layout.tsx` — Dashboard shell (loads profile, renders sidebar)
- `src/app/track/[token]/page.tsx` — Public tracking page

**Configuration:**
- `tsconfig.json` — TS config with `@/*` alias to `src/*`
- `next.config.ts` — Image optimization for Supabase origin
- `tailwind.config.ts` — Cairo font, brand color, RTL setup
- `.eslintrc.json` — ESLint rules

**Core Logic:**
- `src/middleware.ts` — Auth guard, route protection
- `src/lib/actions/projects.ts` — Project CRUD, status updates
- `src/lib/actions/payments.ts` — Payment recording, queries
- `src/lib/actions/installation.ts` — Installation stages, file uploads
- `src/lib/supabase/server.ts` — Database connection

**Testing (if present):**
- `vitest.config.ts` (referenced in package.json)
- `*.test.tsx` or `*.spec.tsx` files (not yet created; structure ready)

## Naming Conventions

**Files:**
- Pages: `page.tsx` (Next.js convention)
- Layouts: `layout.tsx` (Next.js convention)
- Components: `PascalCase.tsx` (e.g., `ProjectDetail.tsx`)
- Server actions: `kebab-case.ts` with `'use server'` directive (e.g., `payment-actions.ts`)
- Types: Defined in `src/types/database.ts`
- Constants: `UPPERCASE_NAMES` in `src/lib/constants.ts`

**Directories:**
- Routes: kebab-case matching URL path (e.g., `/projects/new` → `projects/new/`)
- Components: kebab-case, grouped by feature (e.g., `components/payments/`)
- Server actions: `actions/` directory with kebab-case filenames

**Variables & Functions:**
- Functions: camelCase (e.g., `getProject()`, `createPayment()`)
- Constants: UPPERCASE_SNAKE_CASE (e.g., `INSTALL_STAGES`, `PAYMENT_TYPES`)
- Types: PascalCase (e.g., `Profile`, `Payment`, `Installation`)
- Booleans: prefix with `is` or `has` (e.g., `isActive`, `hasInstallation`)

**Styling:**
- Tailwind classes only (no CSS files except `globals.css` for Cairo font)
- RTL-aware classes: use `start` and `end` instead of `left`/`right` (e.g., `ms-2`, `pe-4`)
- Brand color: `bg-brand-600`, `text-brand-700` (defined in tailwind.config.ts)

## Where to Add New Code

**New Feature (e.g., Invoice Management):**
- Page route: `src/app/(dashboard)/invoices/page.tsx`
- Page component: `src/components/invoices/invoices-list.tsx`
- Detail page: `src/app/(dashboard)/invoices/[id]/page.tsx`
- Detail component: `src/components/invoices/invoice-detail.tsx`
- Server actions: `src/lib/actions/invoices.ts`
- Tests: `src/lib/actions/invoices.test.ts` and `src/components/invoices/invoices-list.test.tsx`

**New Component/Module:**
- Implementation: `src/components/[domain]/[component-name].tsx`
- Export: Optional barrel file `src/components/[domain]/index.ts` if multiple related exports
- Props interface: Defined inline in component or in `src/types/database.ts` if shared

**Utilities:**
- Shared helpers (formatting, validation): `src/lib/utils.ts`
- Domain-specific helpers: `src/lib/[domain]-utils.ts` (e.g., `src/lib/payment-utils.ts`)
- Constants (labels, enums): `src/lib/constants.ts` or domain-specific constants file

**Database Query:**
- Read-only queries: Use server client in `src/lib/actions/[domain].ts`
- Mutations: Use service client in `src/lib/actions/[domain].ts`
- Example: `export async function getProject(id: string) { ... }`

**Testing:**
- Unit tests: `src/lib/actions/[domain].test.ts`
- Component tests: `src/components/[domain]/[component-name].test.tsx`
- E2E tests: `e2e/[feature].spec.ts` (Playwright)

## Special Directories

**`public/`:**
- Purpose: Static assets served at root
- Generated: No
- Committed: Yes (contains logo.png, etc.)
- Usage: Images, favicons, downloadable files

**`.next/`:**
- Purpose: Build output directory (Next.js cache)
- Generated: Yes (by `npm run build`)
- Committed: No (.gitignored)

**`node_modules/`:**
- Purpose: Installed dependencies
- Generated: Yes (by `npm install`)
- Committed: No (.gitignored)

**`.planning/codebase/`:**
- Purpose: Codebase analysis documents (this project)
- Generated: Yes (by gsd-map-codebase)
- Committed: Yes

---

*Structure analysis: 2026-06-18*
