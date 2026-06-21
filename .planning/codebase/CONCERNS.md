# Codebase Concerns

**Analysis Date:** 2026-06-18

## Tech Debt

### Widespread Type Casting with `as unknown` and `as never`

**Issue:** Nearly every server action casts Supabase query results to `unknown` first, then to a specific type. This bypasses TypeScript safety and hides potential type mismatches.

**Files:** 
- `src/lib/actions/payments.ts` (lines 87, 123, 143, 178, 185, 221, 242, 295, 305, 340)
- `src/lib/actions/installation.ts` (lines 18, 41, 89, 118, 140, 163, 183, 206, 222, 243, 287)
- `src/lib/actions/materials.ts` (lines 17, 33, 43)
- `src/lib/actions/auth.ts` (lines 113, 139, 156, 200)
- `src/lib/actions/audit.ts`, `src/lib/actions/projects.ts`

**Impact:** 
- Runtime type errors not caught at compile time
- Supabase schema changes won't trigger TypeScript warnings
- Makes refactoring risky — no guarantee types still match DB

**Fix approach:** 
- Invest in proper Supabase type generation (`@supabase/supabase-js` with TypeScript inference)
- Replace `as unknown as { ... }` chains with proper type predicates or schemas (Zod)
- Create type guards for common query patterns
- Consider extracting a type-safe query layer

### Unvalidated Form Input Parsing

**Issue:** Numeric values are parsed with `parseFloat()` and `parseInt()` without always validating non-NaN results before arithmetic operations.

**Files:**
- `src/lib/actions/payments.ts` (lines 79, 81, 108, 207, 211) — parseFloat/parseInt for amounts, percentages
- `src/lib/actions/projects.ts` — total_amount parsing

**Impact:**
- Silent NaN propagation if form input is malformed
- Payment amounts could be silently set to NaN in DB
- Calculation errors when summing/comparing amounts

**Fix approach:**
- Create a strict `parseAmount(str): number | Error` helper that validates non-NaN result
- Use Zod schemas for all FormData parsing instead of manual extraction
- Add unit tests for edge cases (empty string, "abc", null, undefined)

### Installation Stages State Mutation Pattern

**Issue:** Stage data is stored as JSONB in Supabase and reassembled entirely on each mutation. No atomic field-level updates.

**Files:**
- `src/lib/actions/installation.ts` (lines 135–222) — `getStages()`, mutate, update entire record

**Impact:**
- **Race condition:** Two concurrent stage edits can lose data (last write wins)
- **Inefficiency:** Entire JSON structure rewritten for single file addition
- **Fragile:** Complex nested object mutations error-prone

**Fix approach:**
- Create dedicated installation-stage-mutation functions (e.g., `addStageFileAtomic()`) that batch operations
- Consider normalizing stages into separate `installation_stage_files` table for atomic file operations
- Add optimistic locking or version stamps to detect conflicts
- Cache stage data in component state to reduce redundant DB reads

### Error Handling Lacks Granularity

**Issue:** Most server actions return generic error messages (Arabic strings) without error categorization or structured logging.

**Files:**
- All `src/lib/actions/*.ts` files — return `{ error: 'فشل...' }` without error type

**Impact:**
- Client UI can't distinguish constraint errors, auth errors, network errors, validation errors
- Impossible to audit which operations failed and why
- Hard to debug production issues

**Fix approach:**
- Create `ErrorCode` enum: `AUTH_FAILED | VALIDATION_FAILED | DB_CONSTRAINT | NETWORK_ERROR | NOT_FOUND | UNAUTHORIZED`
- Return `{ error: { code, message, details } }` instead of plain strings
- Log all errors server-side with context (user ID, project ID, timestamp)
- Client component maps error codes to UX (retry UI, clear message, etc.)

## Known Bugs

### Payment Amount Overflow / Overpayment Not Blocked at Editing

**Issue:** When editing a payment, if the `amount` is reduced below `paid_amount`, status becomes "paid" retroactively. This can create inconsistent records where more money was collected than the payment amount requested.

**Files:** `src/lib/actions/payments.ts` (lines 227–230)

**Trigger:**
1. Payment: amount 1000 SAR, paid_amount 800 SAR → status "partial"
2. Edit: change amount to 500 SAR
3. System sets status to "paid" because 800 >= 500, but this is nonsensical business logic

**Workaround:** Don't allow amount edits after payment has started. Block in UI, validate on server.

**Fix approach:**
- Validate: `newAmount >= payment.paid_amount` before accepting edit
- If attempt to reduce below paid, return error "لا يمكن تقليل المبلغ عن المبلغ المسدد"
- Add unit test: `editPayment` with `paid_amount > new_amount` should fail

### Missing Deletion Cascade for Installations

**Issue:** When a project with an active installation is deleted (soft-delete via status change), the installation record is orphaned but still appears in coordinator's installation dashboard.

**Files:** 
- `src/lib/actions/projects.ts` — deleteProject() sets status='cancelled'
- No corresponding cleanup of installation records

**Impact:**
- Installation card appears in list without parent project → confusing
- Can't click through to project (404 on `/projects/[id]`)

**Fix approach:**
- When project status → 'cancelled', also set all related installation records to a terminal status or mark as archived
- Add DB trigger or explicit cascade in `deleteProject()` action
- Test: delete project, verify installation doesn't appear on /installation page

### No Idempotency for Notification Creation

**Issue:** `notify()` function inserts notifications without checking if they already exist. Calling `notify()` twice with same parameters creates duplicates.

**Files:** `src/lib/actions/notifications.ts` (lines 21–31)

**Impact:**
- If a server action retries on network error, user sees duplicate notifications
- Coordinator sees 2 "payment received" bells for the same payment

**Fix approach:**
- Add idempotency key: hash(actor_id, project_id, notification_type, timestamp_rounded_to_minute)
- Check uniqueness constraint before insert
- Or deduplicate in frontend notification bell poll

## Security Considerations

### Service Role Key Exposed in Browser

**Issue:** The codebase correctly uses `createServiceClient()` on server-side only, but if accidentally imported in a client component, it would leak the key.

**Files:** All action files correctly guard this, but no eslint rule to prevent accidental browser import

**Risk:** 
- If service role key is leaked, attacker can bypass all RLS rules
- Developer accidentally adds service client to client component without realizing

**Current mitigation:** 
- Server actions are marked `'use server'`
- Service client module doesn't export from layout/shared components

**Recommendations:**
- Add ESLint rule to forbid importing from `@/lib/supabase/service` outside `src/lib/actions/`
- Rotate service role key immediately if ever committed to public repo
- Document in CLAUDE.md that service key must NEVER be in client code

### Missing CSRF Protection on State-Changing Actions

**Issue:** All server actions accept FormData but lack explicit CSRF token verification.

**Files:** All `src/lib/actions/*.ts` — no `csrf` field validation

**Risk:**
- Low severity (Next.js has built-in CSRF for cross-site forms), but explicit verification preferred
- Malicious site could trigger payment or project deletion if user is logged in

**Current mitigation:** 
- Next.js middleware validates origin headers and SameSite cookies
- Forms use `<form action={serverAction}>` (safe default)

**Recommendations:**
- Explicitly document that all actions assume CSRF is handled by Next.js
- Consider adding explicit token for high-risk actions (payments, user deletion)

### Installation ID Can Be Set to Arbitrary User in Project Edit

**Issue:** `updateProjectTeam()` allows setting `installation_id` to any active user, but no validation that the user has `role === 'installation'`.

**Files:** `src/lib/actions/projects.ts` — updateProjectTeam() (line ~150)

**Impact:**
- Coordinator can assign a payment-person to installation role (role mismatch)
- No constraint preventing wrong role assignment

**Fix approach:**
- In `updateProjectTeam()`, validate each assigned ID has the correct role before updating
- Query profile roles, compare against expected roles before INSERT/UPDATE
- Return error if role mismatch

### Deactivated Users Can Still Be Assigned to Projects

**Issue:** When assigning a user to a project (coordinator/sales/installation), no check for `is_active` status.

**Files:** `src/lib/actions/projects.ts` — updateProjectTeam()

**Impact:**
- Admin deactivates a user, but they remain assigned to active projects
- User can't log in but their projects still reference them (confusing in dashboard)

**Fix approach:**
- When fetching users for role dropdowns, filter `WHERE is_active = true`
- When updating project team, validate all assigned IDs are `is_active = true`
- Add DB trigger to NULL out deactivated user assignments? (Risky, use caution)

## Performance Bottlenecks

### No Pagination on Activity Log Queries

**Issue:** `getMyNotifications()` limits to 30, but audit log queries have no limit or pagination.

**Files:** 
- `src/lib/actions/audit.ts` (line 30) — `.limit(1500)` hardcoded
- Activity tab component loads all activity for a project without limit

**Impact:**
- Large projects with years of history load 1500+ activity records
- Page slowdown, high memory usage, slow rendering

**Fix approach:**
- Add `limit(50)` + `offset` pagination to activity queries
- Implement cursor-based pagination in activity tab component
- Add "Load more" button to lazy-load older records
- Add indexes on `activity_log(project_id, created_at DESC)`

### No Index on Installation Status Queries

**Issue:** `getAllInstallations()` filters by `status != 'completed'` with no obvious DB index.

**Files:** `src/lib/actions/installation.ts` (line 62) — `.not('status', 'eq', 'completed')`

**Impact:**
- As installation count grows, coordinator dashboard slows
- Full table scan on every page load

**Fix approach:**
- Add DB index: `CREATE INDEX installations_status_date ON installations(status, scheduled_date DESC)`
- Monitor query performance with Supabase Analytics

### Notification Bell Polls Every 60s Without Backoff

**Issue:** `notification-bell.tsx` polls `getMyNotifications()` every 60 seconds regardless of whether user is active or idle.

**Files:** `src/components/layout/notification-bell.tsx` (lines ~30-50, estimated)

**Impact:**
- 1440 requests/day per user even if browser is inactive
- Unnecessary database load and Vercel function invocations

**Fix approach:**
- Implement visibility detection (stop polling when tab is hidden)
- Exponential backoff if user hasn't interacted for 5+ minutes
- Consider WebSocket/real-time subscription (if Supabase realtime used)

## Fragile Areas

### Material List Mutation Race Condition

**Issue:** `updateMaterialsItems()` reads existing materials, decides to UPDATE or INSERT, then commits. No atomic check.

**Files:** `src/lib/actions/materials.ts` (lines 27–44)

**Why fragile:** 
Two coordinators editing materials simultaneously:
1. Both call `getProjectMaterials()` → both get `existing`
2. Both call `update()` → first wins, second overwrites

**Safe modification:** 
- Use Supabase upsert with conflict handling
- Or fetch-for-update locking (not available in Supabase)
- Or add optimistic concurrency (version field, check on update)

**Test coverage gap:** 
- No test for concurrent material edits
- No test for simultaneous update/insert conflict

### Payment Status Recomputation on Every Edit

**Issue:** `editPayment()` recalculates status based on paid_amount every time ANY field changes. This can flip status unexpectedly.

**Files:** `src/lib/actions/payments.ts` (lines 227–230)

**Why fragile:**
- Admin edits payment due_date
- System recomputes status, might change from 'pending' to 'paid'
- Audit log shows status changed, but admin didn't intend that
- Coordinator gets confused by unexpected status change

**Safe modification:**
- Only recompute status if `amount` or `paid_amount` explicitly changed
- Preserve status if unrelated fields (notes, due_date) changed
- Add audit log detail: "status changed from X to Y due to amount edit"

### Installation Stage Files Stored as JSONB — No Orphan Cleanup

**Issue:** Files are stored as objects with URLs in `installations.stages[stage].files[]`. If URL is deleted from storage, orphan record remains in DB.

**Files:** `src/lib/actions/installation.ts` — addInstallStageFile(), removeInstallStageFile()

**Why fragile:**
- User uploads file, gets URL
- URL stored in DB as JSONB
- User deletes from Storage bucket manually (or via different app)
- URL in DB now 404s, but removeInstallStageFile() won't clean it
- If storage URL expires or is replaced, component breaks

**Safe modification:**
- Before returning file list, validate URLs still exist (expensive)
- Or: don't store URLs, store storage_path, generate signed URLs dynamically
- Or: add cleanup job that removes orphaned URLs

### User Deletion Doesn't Null Out All References

**Issue:** `deleteUser()` NULLs out `coordinator_id`, `sales_engineer_id`, `installation_id` on projects, but doesn't touch technician assignments or activity log.

**Files:** `src/lib/actions/auth.ts` (lines 249–251)

**Why fragile:**
- Deleted user still referenced in:
  - `technician_assignments.assigned_by` (who assigned this tech)
  - `activity_log.user_id` (who performed actions)
  - Payment `sales_engineer_id` if payment has that field
- Dashboard tries to JOIN user → 404 or NULL name appears

**Safe modification:**
- Comprehensive cascade: update ALL foreign key references to user_id
- Or: soft-delete users (set `is_active=false` instead of hard delete)
- Add integration test: delete user, verify no dangling refs in queries

## Scaling Limits

### Current Capacity

**Database:**
- 9 tables, Supabase PostgreSQL default tier
- No horizontal scaling until migrating to AWS
- RLS enabled on all tables (slight perf penalty)

**API:**
- Vercel serverless (request timeout 30s)
- No caching layer (every request hits Supabase)

**Files:**
- Supabase Storage used for documents
- No upload size limit enforced (MAX_FILE_SIZE = 10MB defined but not checked on signed URL generation)

### Scaling Breakpoints

**Project Count:** 
- Once >10K projects, audit log and activity queries will be slow
- Need paginated UI + archival strategy

**Concurrent Users:**
- Notification polling (60s intervals) × 1000 users = significant Supabase load
- Need real-time subscriptions or request deduplication

**Large Installations:**
- Technician assignments + stages + files stored as JSONB
- Once >1000 assignments per project, JSON parsing becomes bottleneck
- Need normalization into separate tables

### Scaling Path

1. **Immediate (now):** Add database indexes on common filters (status, project_id, created_at)
2. **Near-term (1-2 weeks):** Implement pagination UI, archive old projects
3. **Medium-term (1-2 months):** Set up Supabase read replicas, add caching layer (Redis)
4. **Long-term (Q3):** Migrate to AWS Bahrain, scale database horizontally, consider message queue for async work

## Dependencies at Risk

### Supabase JavaScript SDK Version Pinning

**Issue:** `@supabase/supabase-js@^2.50.0` allows minor/patch updates. Supabase frequently makes breaking changes.

**Files:** `package.json` (line 18)

**Risk:** 
- Security patch might introduce type incompatibility
- Build breaks after `npm install` on fresh checkout
- No lockfile means different developers get different versions

**Current state:** `package.json` likely has lock file, but version range is loose

**Migration plan:** 
- Pin exact version: `"@supabase/supabase-js": "2.50.0"` (remove `^`)
- Or: test and document minimum version for known issues
- Quarterly review of Supabase changelogs before upgrading

### Next.js 15.3.1 — Relatively New

**Issue:** Next.js 15 is cutting-edge (early 2025). App Router is stable but edge cases exist.

**Files:** `package.json` (line 22)

**Risk:**
- Fewer third-party library patches/compatibility fixes
- Server action semantics may change in 15.4 / 16.0
- Deployment target (Vercel) is tightly coupled

**Migration plan:**
- Stick with 15.3.x until Next.js 16 stable (3-6 months)
- Monitor security advisories
- Test build on Vercel before deploying to production

### shadcn/ui Base Components (Unknown Version)

**Issue:** shadcn/ui components not directly listed in package.json (installed via CLI).

**Files:** Many component files import from `@/components/ui/*`

**Risk:**
- Unclear which version of shadcn is in use
- No update path documented

**Migration plan:**
- Document shadcn version in CLAUDE.md
- Create script to re-generate components if needed
- Or: switch to simple button/input/dialog primitives if maintenance burden increases

## Missing Critical Features

### No Audit Trail for File Uploads

**Issue:** Files are uploaded to Supabase Storage, but `documents` table doesn't track who deleted files or when.

**Files:** `src/lib/actions/attachments.ts` — `deleteAttachment()`, etc.

**Problem:**
- Coordinator can't see who deleted a critical receipt
- Compliance/audit issue for financial records
- No recovery mechanism

**Fix approach:**
- Log file deletes in activity_log: "deleted document: [name], type: [type]"
- Store soft-deleted documents (mark with `deleted_at` instead of hard delete)
- Add admin audit page showing all file operations

### No Two-Factor Authentication

**Issue:** All access is email + password. No MFA or TOTP.

**Files:** Auth system relies on Supabase auth only

**Problem:**
- Single leaked password grants full access
- Especially risky for admin and coordinator accounts

**Fix approach:**
- Enable Supabase TOTP MFA in auth config (low-effort with Supabase)
- Require MFA for admin accounts (high-priority)
- Document in onboarding

### No Role-Based Access Control (RBAC) for Sensitive Operations

**Issue:** All coordinators can perform all coordinator actions. No sub-roles or granular permissions.

**Files:** Auth checks are binary (role exists/doesn't exist), no fine-grained scopes

**Problem:**
- Junior coordinator can delete any project or cancel any payment
- No permission to approve high-value payments before coordinator records them

**Fix approach:**
- Define operation scopes: `create_project`, `approve_payment`, `delete_project`, etc.
- Extend Profile with `permissions` array
- Check before each sensitive action: `if (!user.permissions.includes('approve_payment'))`

## Test Coverage Gaps

### No E2E Tests for Payment Workflow

**Issue:** E2E test exists for payments, but doesn't cover full flow.

**Files:** `src/tests/e2e/payments.spec.ts` (limited coverage)

**What's not tested:**
- Partial payment + full payment completion
- Overdue detection and alerts
- Sales engineer payment confirmation flow
- Multiple payment types on same project

**Risk:** Regression could break payment UX without CI catch

**Priority:** High — payments are core to business

### No E2E Tests for Installation Stages

**Issue:** Installation stage logic is complex (5 stages, file uploads, step-back) but no integration tests.

**Files:** No test file for installation complex workflows

**What's not tested:**
- Full stage progression with file uploads per slot
- Step-back from completed stage
- IRS slot creation and file association
- Concurrent stage editing (race condition)

**Risk:** Highest priority — installation is most complex workflow

**Priority:** High

### No Tests for Notification Routing

**Issue:** Notification system has multiple recipients, types, and project contexts. No tests verify correct recipients get notified.

**Files:** `src/lib/actions/notifications.ts` has no tests

**What's not tested:**
- Multi-recipient notification batching
- Exclude self (excludeId) logic
- Duplicate recipient deduplication
- Notification appears in correct recipient's bell

**Risk:** Coordinators won't know about critical events, or wrong people get alerts

**Priority:** Medium

### No Tests for Concurrent Operations

**Issue:** No test suite for race conditions (concurrent payment edits, material updates, stage mutations).

**Files:** No concurrent test helpers

**What's not tested:**
- Two users edit payment simultaneously
- Two users update materials simultaneously
- Payment status calculation under concurrent changes

**Risk:** Data corruption or loss in concurrent scenarios (rare but destructive)

**Priority:** Medium (test after addressing material/payment concurrency bugs)

### No Tests for Deactivation/Deletion Cascades

**Issue:** User deletion and deactivation have cascading side effects, but no tests verify all cascades happen correctly.

**Files:** `src/lib/actions/auth.ts` deleteUser() / approveUser() untested

**What's not tested:**
- User deactivation revokes active sessions
- User deletion removes all project assignments
- Deleted user doesn't appear in user lists
- Orphaned records are handled (activity log, notifications)

**Risk:** Stale user references cause UI/data inconsistencies

**Priority:** Medium

---

*Concerns audit: 2026-06-18*
