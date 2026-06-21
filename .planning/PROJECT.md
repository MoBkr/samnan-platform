# منصة سمنان (Samnan Platform)

## What This Is

منصة داخلية عربية (RTL) لإدارة مشاريع مجموعة سمنان القابضة (شركة مقاولات سعودية) — تتابع دورة حياة المشروع كاملة (تعاقد → دفعات → مواد → تركيب → إغلاق) في مكان واحد، وكل عضو فريق يرى ما يخصّه فقط. تحل محل إدارة العمل اليدوية على إكسل وواتساب.

## Core Value

منتج شغّال واحترافي يُسلَّم للعميل — يبدو احترافيًا، سلس، ويعمل end-to-end. جودة الـUI/UX غير قابلة للتفاوض (العميل يحكم على المنتج بشكله وإحساسه).

## Business Context

- **Customer**: مجموعة سمنان القابضة (عميل داخلي) — يبنيه Thakaa Flow (ai@tfco.sa)
- **Revenue model**: مشروع تطوير لعميل
- **Success metric**: اعتماد الفريق للمنصة بدل إكسل/واتساب، ورضا العميل في العرض

## Requirements

### Validated

<!-- Shipped and confirmed valuable — built across v1.0 (tracked in CLAUDE.md). -->

- ✓ المصادقة والأدوار + middleware + موافقة الإدارة على الحسابات — v1.0
- ✓ إنشاء/قائمة/تفاصيل المشاريع + خيار «مع/بدون تركيب» — v1.0
- ✓ تتبّع الدفعات (ترقيم، متبقّي/نسبة تحصيل، بيانات فاتورة + نسخ SAP، تأكيد مزدوج من المبيعات) — v1.0
- ✓ المواد (قائمة بأسعار، جاهزة/توريد، فاتورة، قفل التسليم حتى الدفع) — v1.0
- ✓ التركيب بمراحل معاينة (Site Inspection / MIR / IRS / Commissioning / Snag List) + IRS ديناميكي من المواد + مدة متوقعة + رجوع خطوة — v1.0
- ✓ الفنيون (قائمة مشتركة، حجز بفترة مع منع تعارض، سجل) — v1.0
- ✓ صفحة متابعة العميل (رابط عام للعرض فقط) — v1.0
- ✓ الإشعارات داخل المنصة (جرس + أحداث) — v1.0
- ✓ طلبات الشراء (BR) بلوحة مراحل — v1.0
- ✓ سجل تدقيق شامل بالتوقيت السعودي — v1.0
- ✓ لوحات تحكم لكل دور + إدارة المستخدمين — v1.0

### Active

<!-- Current scope (v1.1). -->

- [ ] اسم الفاتورة Bold وبارز عند الإنشاء/العرض
- [ ] زر «ملخص المشروع» — نافذة منبثقة قابلة للطباعة بنظرة شاملة (للكوردنيتر/الإدارة)

### Out of Scope

- إشعارات إيميل/واتساب — العميل اختار داخل المنصة فقط (حاليًا)
- التوريد المستعجل من السوق (تصوير الفني للمواد والفاتورة) — أجّله العميل لمرحلة مستقبلية
- حسابات دخول لكل فني — الفنيون سجلات مشتركة لا تسجّل دخول (مبرر في [[project_technicians_model]])

## Context

- ستاك: Next.js 15 (App Router) + TypeScript + Tailwind + shadcn، Supabase (Postgres/Auth/Storage)، نشر على Vercel. عربي RTL بخط Cairo.
- service client يتخطّى RLS للقراءة والكتابة على الجداول الجديدة (RLS مفعّل بدون policies).
- كل التواريخ بتوقيت `Asia/Riyadh`. رفع الملفات مباشرة Browser→Supabase حتى 10MB.
- خريطة الكود في `.planning/codebase/`. الذاكرة الحية وتاريخ الجلسات في `CLAUDE.md`.
- v1.0 اتبنى خارج إطار GSD؛ هذا أول milestone مُدار بـGSD.

## Constraints

- **Tech stack**: Next.js + Supabase + Vercel — ثابت، لا تغيير في الستاك لهذا الـmilestone
- **UI/UX**: عربي RTL دائمًا، جودة عالية — العميل يحكم بالشكل
- **DB**: تعديلات v1.1 عرض/UI فقط — لا migrations جديدة
- **Scope**: milestone صغير (لمسة) — فيه تعديلات أخرى ستأتي في milestones لاحقة

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| زر «ملخص المشروع» للكوردنيتر/الإدارة فقط | معلومات شاملة (مالية + فريق) تخص الإدارة التشغيلية | — Pending |
| الملخص نافذة منبثقة قابلة للطباعة | قراءة سريعة + إمكانية طباعة/تسليم | — Pending |

## Current Milestone: v1.1 ملخص المشروع ووضوح الفاتورة

**Goal:** تحسين وضوح المعلومات في صفحة المشروع — اسم فاتورة بارز، وزر «ملخص المشروع» يعطي نظرة شاملة سريعة قابلة للطباعة.

**Target features:**
- اسم الفاتورة Bold وبارز
- زر «ملخص المشروع» (نافذة منبثقة قابلة للطباعة، 4 أقسام: العميل والمشروع · المالي والدفعات · المواد والتركيب · الفريق والمرفقات)

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-21 after starting milestone v1.1*
