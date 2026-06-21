# External Integrations

**Analysis Date:** 2026-06-18

## APIs & External Services

**None configured** - This is a closed-loop internal platform. No third-party APIs for payments, SMS, or email are integrated (yet).

## Data Storage

**Primary Database:**
- Supabase (PostgreSQL)
  - Connection: Via environment variable `NEXT_PUBLIC_SUPABASE_URL`
  - Client: `@supabase/supabase-js` 2.50.0 + `@supabase/ssr` 0.6.0
  - Authentication: Service role client (`SUPABASE_SERVICE_ROLE_KEY` for writes), anon client for reads
  - Schema: 11 tables (profiles, projects, payments, materials, supply_orders, installations, documents, activity_log, app_notifications, technicians, technician_assignments, purchase_requests)
  - RLS: Enabled on all tables
  - Location: Accessed from `src/lib/supabase/client.ts` (browser), `src/lib/supabase/server.ts` (server), `src/lib/supabase/service.ts` (privileged writes)

**File Storage:**
- Supabase Storage
  - Bucket: `documents`
  - Max file size: 10 MB
  - Allowed types: JPEG, PNG, WebP, PDF
  - Access: Signed URLs for browser uploads, public URLs for viewing
  - Uploads: `src/lib/actions/upload.ts` handles upload URL generation and legacy server-side uploads

**Caching:**
- Next.js built-in caching only (no Redis, Memcached, or similar)
- Tag-based revalidation via `revalidatePath()` in Server Actions

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (native, no third-party OAuth yet)
  - Implementation: Email + password only
  - Features:
    - Sign-up with role selection (5 roles: coordinator, sales_engineer, installation, admin)
    - Sign-in with email verification
    - Password reset with magic link
    - Session via HTTP-only cookies (7-day expiry)
    - Auto-profile creation on signup
  - Code: `src/lib/actions/auth.ts`
  - Middleware: `src/middleware.ts` guards protected routes and refreshes session

**User Roles:**
- 5 roles stored in `profiles` table:
  - `coordinator` - مهندس منسق — manages full lifecycle
  - `sales_engineer` - مهندس المبيعات — client-specific projects
  - `installation` - فريق التركيبات — installation scheduling + technician assignments
  - `admin` - الإدارة — system admin, user management
  - `supply` - التوريد — materials + supply orders

**Access Control:**
- Role-based route guards in middleware
- Row-Level Security (RLS) policies in PostgreSQL (not exposed in frontend)
- Service role client bypasses RLS for writes (safe within trusted server code)

## Monitoring & Observability

**Error Tracking:**
- Console.error() only (no Sentry, Rollbar, or similar)
- GitHub Actions captures CI/CD failures

**Logs:**
- Browser console (dev)
- Vercel logs (prod) - accessible via Vercel dashboard
- Activity log table (`activity_log`) for domain-specific audit trail

**Performance Monitoring:**
- None configured (no Datadog, New Relic, etc.)
- Web Vitals monitoring available via Vercel Analytics (optional dashboard feature)

## CI/CD & Deployment

**Hosting:**
- Vercel
  - URL: https://samnan-platform.vercel.app
  - Environment: Node 20.x runtime
  - Deployment: Automatic on push to `main` branch

**CI Pipeline (GitHub Actions):**
- Location: `.github/workflows/ci.yml`
- Triggers: On push to `main` and PRs
- Jobs:
  1. **Type check & Lint** - TypeScript compiler + ESLint (all branches)
  2. **Unit Tests** - Vitest with coverage (all branches)
  3. **Build** - Next.js production build (all branches)
  4. **E2E Tests** - Playwright (main branch only, post-merge)

**Environment Variables:**
- Secrets stored in GitHub Settings
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `E2E_COORDINATOR_EMAIL`, `E2E_COORDINATOR_PASSWORD`
  - `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`
  - `E2E_INSTALLATION_EMAIL`, `E2E_INSTALLATION_PASSWORD`

**Deployment Workflow:**
1. Developer pushes to branch → GitHub Actions runs checks
2. PR approved → merge to main
3. CI pipeline runs all checks
4. If build succeeds → Vercel auto-deploys to production
5. E2E tests run on production URL
6. Coverage reports archived (7-day retention)

## Webhooks & Callbacks

**Incoming:**
- None configured

**Outgoing:**
- None configured (future: could add email/WhatsApp notifications via Twilio or similar)

**Planned (deferred):**
- Client notifications: Email or WhatsApp for payment requests, technician assignments
- Currently: In-app notifications only (polled every 60 seconds in header bell)

## In-App Notifications

**System:**
- Table: `app_notifications`
- Polling: 60-second interval from header component
- Features:
  - Recipients by role (installation_manager, coordinator, sales_engineer)
  - Types: `installation_scheduled`, `technician_assigned`, `assigned_as_manager`, `materials_ready`, `payment_recorded`, `sales_confirmed`
  - Status: `is_read` flag
  - Actions: Click notification links to relevant project/flow
- Code: `src/lib/actions/notifications.ts`

## Public Sharing & Client Access

**Feature:**
- `/track/[token]` - Read-only client tracking page
- Uses `projects.public_token` (UUID-based)
- Coordinator/sales engineer can generate token via "مشاركة مع العميل" button
- No login required for client

**Implementation:**
- Code: `src/lib/actions/share.ts`
- Route: `src/app/track/[token]/page.tsx`

## Cross-Platform Access

**Supported Platforms:**
- Desktop (Chrome, Firefox, Safari, Edge)
- Mobile (Chromium, tested on Pixel 5 size)
- RTL locale: ar-SA (Arabic, Saudi Arabia)
- Timezone: Asia/Riyadh

**No Mobile Apps:**
- Responsive web app only (no native iOS/Android apps)

## Integration Patterns

**Server Actions (Primary):**
- All data mutations via Next.js Server Actions
- Files: `src/lib/actions/*.ts`
- Examples: `signIn()`, `createProject()`, `uploadFile()`
- Benefits: Type-safe, no API layer needed, RLS-aware

**Client Queries:**
- Read-only client-side queries via Supabase JS SDK
- Used in: Dashboard stats, project lists, notifications
- Service role client for privileged server-side reads

**Direct Storage Access:**
- Signed upload URLs from `createUploadSignedUrl()` → browser direct-to-Supabase upload
- No file buffering through Vercel Node runtime

## Missing Integrations (By Design)

**Not Configured:**
- Payment processors (Stripe, Tap, 2Checkout) — handled manually via receipt upload
- Email service (SendGrid, AWS SES) — planned for future; currently in-app only
- SMS/WhatsApp (Twilio, AfaqSMS) — deferred per client decision
- Analytics (Mixpanel, Amplitude) — not implemented
- Error reporting (Sentry, Rollbar) — not implemented
- Real-time subscriptions (Supabase realtime, Firebase) — not implemented (polling for notifications instead)
- CDN (Cloudflare, Akamai) — Vercel provides default CDN
- Search engine (Elasticsearch, Algolia) — not needed (small dataset)

## Database Migration & Sync

**Schema Management:**
- Manual SQL migrations (referenced in `CLAUDE.md` as blockers)
- No migration tool (Migrate, Liquibase, Hasura, etc.)
- Blockout (as of 2026-06-15):
  - ✅ `installations.stages` (jsonb) + `expected_duration` columns added
  - ✅ `projects.installation_id` + `public_token` columns added
  - ✅ `technicians` + `technician_assignments` tables created
  - ✅ `app_notifications` table created
  - ✅ `documents.type` constraint updated for new doc types
  - ✅ `payments.type` constraint updated for 'materials' type
  - ⚠️ `profiles` FK for cascade delete (optional safety improvement)

---

*Integration audit: 2026-06-18*
