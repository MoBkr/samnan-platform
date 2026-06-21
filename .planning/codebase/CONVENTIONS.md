# Coding Conventions

**Analysis Date:** 2026-06-18

## Naming Patterns

**Files:**
- **Components:** PascalCase, descriptive (e.g., `ProjectsList.tsx`, `PaymentCard.tsx`, `AuthShell.tsx`)
- **Utilities/Hooks:** camelCase (e.g., `utils.ts`, `upload-client.ts`, `constants.ts`)
- **Actions (Server):** camelCase (e.g., `auth.ts`, `payments.ts`, `projects.ts`)
- **Types:** `database.ts` contains all TypeScript interfaces and type aliases
- **Test files:** Match source with `.test.ts` or `.spec.ts` suffix (e.g., `utils.test.ts`, `auth.spec.ts`)

**Functions:**
- Server actions: camelCase, action-oriented verbs (e.g., `signIn`, `createPayment`, `recordPayment`, `getProjectPayments`)
- React components: PascalCase, match filename (e.g., `export function ProjectsList`)
- Utility functions: camelCase, descriptive (e.g., `formatCurrency`, `isOverdue`, `getInitials`, `cn`)
- Internal helpers: camelCase, prefix with verb or adjective (e.g., `projectTeam`, `makePayment`, `validateAttachment`)

**Variables:**
- State variables: camelCase (e.g., `view`, `statusFilter`, `selectedCities`, `limit`)
- Constants: UPPER_SNAKE_CASE (e.g., `MAX_FILE_SIZE`, `ALLOWED_MIMES`, `SA_TZ`)
- Readonly records/arrays: UPPER_SNAKE_CASE (e.g., `STATUS_LABELS`, `PAYMENT_TYPE_LABELS`, `ROLE_REDIRECTS`)
- React refs: camelCase (e.g., `searchInputRef`)
- Booleans: prefix with `is`, `has`, or `can` (e.g., `isAdmin`, `hasInstallation`, `canCreate`, `confirmed_by_client`)

**Types:**
- Interfaces: PascalCase, descriptive (e.g., `Project`, `Payment`, `Profile`, `MaterialItem`)
- Type aliases: PascalCase (e.g., `UserRole`, `ProjectStatus`, `PaymentType`)
- Database column names: snake_case (e.g., `project_id`, `created_at`, `paid_amount`, `sales_engineer_id`)
- Type unions: PascalCase literal values (e.g., `type UserRole = 'coordinator' | 'sales_engineer'`)

## Code Style

**Formatting:**
- **Indentation:** 2 spaces (enforced by project setup)
- **Line length:** No hard limit, but aim for readability
- **Trailing commas:** Used in arrays and objects
- **Semicolons:** Present on all statements
- **Quotes:** Single quotes for JS strings, double quotes for JSX attributes

**No Prettier config found** — formatting follows Next.js defaults with ESLint.

**Linting:**
- ESLint with `eslint.config.mjs` (flat config format)
- Extends `next/core-web-vitals` and `next/typescript`
- Run: `npm run lint`

## Import Organization

**Order:**
1. External dependencies (React, Next, third-party libs)
2. Internal absolute imports using `@/` alias
3. Type imports at the top of each group (`import type { ... }`)

**Path Aliases:**
- `@/*` resolves to `./src/*` (configured in `tsconfig.json`)
- Always use `@/` for internal imports, never relative paths

**Examples:**
```typescript
import { useState } from 'react'
import Link from 'next/link'
import { Plus, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import type { Project, Payment } from '@/types/database'
```

## Error Handling

**Server Actions:**
- Return objects: `{ error: string }` for failures, `{ success: true }` or `{ redirectTo: string }` for success
- Always check for null/undefined before operations
- Return localized Arabic error messages
- Example from `auth.ts`:
  ```typescript
  if (!email || !password) {
    return { error: 'يرجى إدخال البريد الإلكتروني وكلمة المرور' }
  }
  if (error) {
    return { error: 'حدث خطأ أثناء تسجيل الدخول. حاول مرة أخرى' }
  }
  ```

**Database Queries:**
- Cast Supabase responses using `as QueryResult<Type>` or `as QueryResultMany<Type>` (see `lib/supabase/typed.ts`)
- Always check `result.data` before using
- Default to empty arrays on null: `return result.data ?? []`
- Example from `payments.ts`:
  ```typescript
  const result = (await supabase
    .from('payments')
    .select('*')
    .eq('project_id', projectId)) as QueryResultMany<Payment>
  return result.data ?? []
  ```

**Client-side Forms:**
- Use React Hook Form + Zod for validation
- Show toast notifications (via `sonner`) for feedback
- Disable buttons during submission
- Display inline field errors where relevant

## Logging

**Framework:** `console` (no structured logging library)

**Patterns:**
- Debug logs in test files and development utilities only
- No console logs in production code
- Use descriptive messages if logging is necessary (rare)
- Example: Test setup uses `vi.useFakeTimers()` / `vi.setSystemTime()` for controlled testing

## Comments

**When to Comment:**
- Complex business logic that isn't self-documenting (e.g., payment validation, stage calculations)
- Workarounds for Supabase quirks or type-casting hacks
- Section separators for long files (dashes with labels)
- Do NOT comment obvious code

**JSDoc/TSDoc:**
- Used on component props (interfaces)
- Example from `auth-shell.tsx`:
  ```typescript
  interface AuthShellProps {
    /** Heading shown above the form card (right panel) */
    heading: string
    /** Subtitle under the heading */
    subheading: string
  }
  ```

**Section Markers:**
- Used to organize long files: `// ─── [Section Name] ──────────────────────────────────────`
- Visible in test files and action files (e.g., `business-logic.test.ts`)

## Function Design

**Size:**
- Prefer small, focused functions
- Complex validation extracted to separate functions (e.g., `canRecordPayment`, `isDuplicateType`, `validateAttachment`)
- Server actions typically 30–80 lines (input validation → DB query → revalidation → return result)

**Parameters:**
- Use destructuring in destructured parameters
- Server actions accept FormData and destructure values
- Component props use typed interface
- Example:
  ```typescript
  export async function createPayment(formData: FormData) {
    const projectId = formData.get('project_id') as string
    const type = formData.get('type') as PaymentType
    // ...
  }
  ```

**Return Values:**
- Server actions return `{ error?: string } | { success?: boolean } | { redirectTo?: string }` union
- Utility functions return typed values (e.g., `string`, `boolean`, `number`)
- Validation functions return `{ ok: boolean; error?: string }`

## Module Design

**Exports:**
- One named export per component file (matches filename)
- Multiple exports per utility file (e.g., `utils.ts` exports `cn`, `formatCurrency`, `formatDate`, `isOverdue`, `getInitials`)
- Server action files export multiple action functions (e.g., `auth.ts` exports `signIn`, `signOut`, `requestPasswordReset`)

**Barrel Files:**
- Not used in this codebase — import directly from source files
- Prefer explicit imports over barrel files

**Server vs Client:**
- Server actions marked with `'use server'` at the top
- Client components marked with `'use client'` at the top
- Mix in same file requires careful organization (rare in this codebase)

## Arab-specific Conventions

**Localization:**
- All UI labels, error messages, validation text in Arabic only
- No English text in user-facing messages (except brand names, acronyms)
- Use `LABEL` constants from `lib/constants.ts` for all enum display strings
- Examples: `STATUS_LABELS`, `PAYMENT_TYPE_LABELS`, `ROLE_LABELS`, `INSTALLATION_STATUS_LABELS`

**RTL Layout:**
- `dir="rtl"` must be set on `<html>` in layout
- Use `text-end` / `text-start` instead of `text-right` / `text-left`
- Use Tailwind's RTL-aware utilities (`end`, `start`, `me`, `ms`, `pe`, `ps`)
- Component `auth-shell.tsx` has detailed RTL comments and pattern examples

**Date/Currency Formatting:**
- Dates: English numerals (no Arabic-Indic digits)
- Currency: formatted via `formatCurrency()` utility → "SAR" suffix, English digits, thousands separators
- Timezone: Asia/Riyadh for all date operations

---

*Convention analysis: 2026-06-18*
