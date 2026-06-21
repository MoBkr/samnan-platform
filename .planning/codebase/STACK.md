# Technology Stack

**Analysis Date:** 2026-06-18

## Languages

**Primary:**
- TypeScript 5.x - All source code (`src/**/*.ts`, `src/**/*.tsx`)

**Secondary:**
- JavaScript - Configuration files (ESLint, PostCSS, Vite, Playwright configs)

## Runtime

**Environment:**
- Node.js 20.x (specified in `.github/workflows/ci.yml` and `.npmrc` lockfile)

**Package Manager:**
- npm 10.x (LTS)
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- Next.js 15.3.1 - Full-stack framework (App Router, TypeScript)
- React 19.0.0 - UI library and component model

**Styling & UI:**
- Tailwind CSS 3.4.17 - Utility-first CSS framework
- PostCSS 8.x - CSS transformations (via `postcss.config.mjs`)
- Autoprefixer 10.4.20 - Browser compatibility for CSS
- Cairo (Google Fonts) - Arabic font rendering at weights 400/500/600/700

**UI Component Library:**
- Custom shadcn/ui-style components (`src/components/ui/`) with:
  - class-variance-authority 0.7.1 - Component variant management
  - clsx 2.1.1 - Conditional CSS class merging
  - tailwind-merge 2.6.0 - Tailwind class conflict resolution
  - lucide-react 0.511.0 - Icon library (SVG icons)

**Form Handling:**
- React Hook Form 7.55.0 - Efficient form state management
- @hookform/resolvers 3.10.0 - Form validation adapters
- Zod 3.24.4 - TypeScript-first schema validation

**Notifications:**
- sonner 1.7.4 - Toast notifications (RTL-aware)

## Database

**Primary:**
- PostgreSQL (via Supabase) - Relational data storage
- Supabase 2.50.0 - Backend as a Service (auth, database, storage)
- @supabase/ssr 0.6.0 - Server-side auth session handling
- @supabase/supabase-js 2.50.0 - JavaScript client library

**Schema:**
- 11 tables: `profiles`, `projects`, `payments`, `materials`, `supply_orders`, `installations`, `documents`, `activity_log`, `app_notifications`, `technicians`, `technician_assignments`, `purchase_requests`
- Row-Level Security (RLS) enabled on all tables
- JSONB columns for complex data (materials items, installation stages)
- Auto-generated UUIDs for primary keys

## File Storage

**Service:**
- Supabase Storage - Bucket: `documents` (10 MB file limit)
- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`
- Signed upload URLs for direct browser-to-storage uploads

## Authentication

**Provider:**
- Supabase Auth (PostgreSQL-based)
- Email + password authentication
- Password reset flow with signed URLs
- Session management via HTTP-only cookies (7-day max age)
- Profile auto-creation on signup via trigger

**Credentials:**
- 5 roles stored in `profiles.role`: coordinator, sales_engineer, installation, admin (see `CLAUDE.md` for role descriptions)
- Account deactivation/approval flow via `is_active` flag

## Testing

**Unit Tests:**
- Vitest 4.1.7 - Fast unit test runner
- @testing-library/react 16.3.2 - React component testing utilities
- @testing-library/jest-dom 6.9.1 - DOM matchers
- @testing-library/user-event 14.6.1 - User interaction simulation
- jsdom 29.1.1 - DOM environment for tests
- @vitest/coverage-v8 4.1.7 - Code coverage reporting
- Config: `vitest.config.ts`
- Run: `npm run test` or `npm run test:watch`

**E2E Tests:**
- @playwright/test 1.60.0 - Browser automation testing
- Config: `playwright.config.ts`
- Browsers: Chromium, Pixel 5 (mobile)
- Locale: ar-SA (Arabic Saudi Arabia)
- Timezone: Asia/Riyadh
- Run: `npm run test:e2e`

## Code Quality

**Linting:**
- ESLint 9.x - JavaScript/TypeScript linting
- eslint-config-next 15.3.1 - Next.js recommended rules + Web Vitals
- Flat config format (ESLint v9)
- Config: `eslint.config.mjs`
- Run: `npm run lint`

**Formatting:**
- Prettier configured (no explicit `.prettierrc` — uses Next.js defaults)

**Type Checking:**
- TypeScript 5.x compiler
- Strict mode enabled (`"strict": true` in `tsconfig.json`)
- Target: ES2017
- Module resolution: bundler (for ESM + CommonJS interop)

## Build & Dev Tools

**Build:**
- Next.js built-in bundler (Webpack internally)
- Run: `npm run build`

**Development:**
- Next.js dev server with Fast Refresh
- Run: `npm run dev`

**Path Aliases:**
- `@/*` → `./src/*` (configured in `tsconfig.json`)

## Deployment

**Hosting:**
- Vercel - Primary deployment platform (samnan-platform.vercel.app)
- CI/CD: GitHub Actions (`.github/workflows/ci.yml`)
- Environment variables injected at build time and runtime via GitHub Secrets

**CI/CD Pipeline:**
1. Type check & Lint (on push/PR)
2. Unit tests with coverage (on push/PR)
3. Build (on push/PR)
4. E2E tests (on merge to main only)

**Node Version in CI:**
- 20.x (explicitly set in GitHub Actions workflow)

## Environment Configuration

**Required env vars (for runtime):**
```
NEXT_PUBLIC_SUPABASE_URL         # Supabase project URL (public)
NEXT_PUBLIC_SUPABASE_ANON_KEY    # Supabase anon key (public)
SUPABASE_SERVICE_ROLE_KEY        # Supabase service role (secret — server-side only)
```

**Optional env vars:**
- `BASE_URL` - For E2E tests (defaults to `https://samnan-platform.vercel.app`)
- `NODE_ENV` - Controls secure cookie flag (`production` vs development)

**Build Config:**
- `next.config.ts` - Next.js configuration
- Remote image patterns allowed from `*.supabase.co` (Supabase Storage)

## Key Features (Enabled by Stack)

- **Server Actions** - Form submission + data mutation (Next.js 13+)
- **Middleware** - Request-level auth guard and session refresh
- **API Routes** - Optional REST endpoints (not heavily used; Server Actions preferred)
- **Image Optimization** - Next.js Image component (configured for Supabase URLs)
- **RTL Support** - Cairo font + Tailwind + Sonner RTL config for Arabic
- **Direct Browser Uploads** - Signed URLs to Supabase Storage (bypass 4.5 MB Node limit)

## Performance & Limits

**Database:**
- Supabase Free tier: Auto-pause after 1 week inactivity (not suitable for production)
- Supabase Pro: Recommended for production ($25/month ~94 SAR/month)

**File Storage:**
- Max file size: 10 MB (enforced client-side + server-side)
- Bucket: Single `documents` bucket for all project files

**Build:**
- Static exports disabled (server-side rendering required)
- API routes support real-time subscriptions (not yet implemented)

---

*Stack analysis: 2026-06-18*
