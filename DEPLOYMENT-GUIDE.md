# دليل النشر على دومين العميل — منصة سمنان

---

## الوضع الحالي

| الجزء | الخدمة | الحالة |
|-------|--------|--------|
| الكود والهوستينج | Vercel (حساب Thakaa Flow) | ✅ شغال |
| قاعدة البيانات | Supabase Free (حساب Thakaa Flow) | ⚠️ مؤقت |
| الدومين | samnan-platform.vercel.app | ⚠️ مؤقت |

---

## أولاً: خيارات قاعدة البيانات

### المقارنة

| | Supabase Free | Supabase Pro | Neon (بديل) | Self-hosted |
|--|--------------|-------------|------------|------------|
| السعر | مجاني | $25/شهر | $19/شهر | تكلفة سيرفر |
| التوقف التلقائي | ✅ بعد أسبوع خمول | ❌ لا يتوقف | ❌ لا يتوقف | ❌ |
| النسخ الاحتياطي | يومي (7 أيام) | يومي (30 يوم) | يومي | يدوي |
| الدعم | Community | Priority | Community | — |
| مناسب للإنتاج | ❌ لا | ✅ نعم | ✅ نعم | ✅ نعم |
| يحتاج تعديل في الكود | — | ❌ لا | ✅ نعم | ✅ نعم |

### التوصية

**الخيار الأمثل: Supabase Pro ($25/شهر)**

- الكود كله مبني على Supabase — لا يحتاج أي تعديل
- لا يتوقف تلقائياً (مشكلة Free tier)
- نسخ احتياطية يومية لمدة 30 يوم
- $25/شهر = ~94 ريال/شهر — معقول لشركة

---

## ثانياً: هل تشترك أنت ولا هم؟

### الأفضل: العميل يملك حساباته

الشركة تمتلك بياناتها وبنيتها بشكل مستقل. أنت فقط تساعدهم في الإعداد.

**الحسابات اللي محتاجين يعملوها:**
1. حساب Supabase باسم الشركة → supabase.com
2. حساب Vercel باسم الشركة → vercel.com
3. دومين (لو مش عندهم) → Namecheap أو GoDaddy أو سعودي مثلاً

**إيهاب Thakaa Flow يظل:**
- وصول Admin على المشاريع بتاعتهم
- مسؤول الصيانة والتطوير

---

## ثالثاً: خطوات النقل (Step by Step)

### الخطوة 1: إنشاء Supabase جديد للعميل

```
1. العميل يعمل حساب على supabase.com
2. ينشئ Project جديد (اسم: samnan-production)
3. يختار Region: Middle East (Bahrain) — ap-south-1
4. يحتفظ بـ:
   - Project URL
   - anon key
   - service_role key
```

### الخطوة 2: ترحيل قاعدة البيانات

```sql
-- على Supabase القديم: اعمل Export
-- Dashboard → Settings → Database → Backups → Download

-- على Supabase الجديد: شغّل السكريبت ده
-- (نفس السكريبت الأصلي في CLAUDE.md)
-- ثم شغّل ملف الـ backup المحمّل
```

**أو الأسهل: اعد إنشاء الجداول يدوياً**
- ارفع سكريبت الـ SQL الموجود في CLAUDE.md على الـ project الجديد
- الداتا الموجودة (مشاريع تجريبية) انقلها يدوياً لو محتاج

### الخطوة 3: نشر الكود على Vercel الخاص بالعميل

**الطريقة الأسهل — Fork أو Transfer:**

```
1. على GitHub: Settings → Transfer repository → حوّله لحساب العميل
   (أو ابقى أنت المالك وأضفهم كـ collaborators)

2. العميل يفتح vercel.com ويعمل حساب
3. New Project → Import من GitHub
4. يختار الـ repo
5. يضيف Environment Variables:
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
6. Deploy
```

### الخطوة 4: ربط الدومين

**على Vercel:**
```
Project → Settings → Domains → Add Domain
اكتب: samnan.com (أو الدومين اللي عندهم)
```

**على مزود الدومين (DNS):**
```
إضافة CNAME record:
  Name: www (أو @ للـ root domain)
  Value: cname.vercel-dns.com

أو A record:
  Name: @
  Value: 76.76.21.21
```

**SSL:** Vercel يعمله تلقائياً خلال دقائق.

---

## رابعاً: لو الشركة تحب تشغله على سيرفرها الخاص

### متى يكون مناسب؟
- عندهم IT team داخلي
- بيانات حساسة جداً لا تخرج للكلاود
- عندهم سيرفر داخلي أو VPS

### التقنيات المطلوبة
```
- Docker + Docker Compose
- PostgreSQL (بدل Supabase)
- Node.js 20+
- Nginx كـ reverse proxy
- SSL عبر Let's Encrypt
```

### ملاحظة مهمة
لو اختاروا self-hosted، الكود يحتاج تعديلات لأن Supabase Auth مدمج. ده يضيف وقت تطوير إضافي (~3-5 أيام عمل).

**التوصية: لا تنصحهم بده إلا لو عندهم IT فريق.**

---

## خامساً: خلاصة التوصية

```
✅ الحل الأمثل والأسهل:

1. Supabase Pro ($25/شهر) — حساب باسم الشركة
2. Vercel Hobby (مجاني) أو Pro ($20/شهر) — حساب باسم الشركة  
3. دومين خاص بهم (نطاق .com.sa مثلاً ~50-100 ريال/سنة)

الإجمالي: ~120-170 ريال/شهر
الوقت اللازم للنقل: 2-4 ساعات
```

---

## سادساً: ملاحظات مهمة قبل التسليم

### تأكد من:
- [ ] تشغيل سكريبت SQL الكامل على الـ project الجديد
- [ ] إضافة Supabase Storage bucket اسمه `documents` (للملفات)
- [ ] تفعيل Email Auth في Supabase → Authentication → Providers
- [ ] إنشاء أول حساب Admin عبر `/signup`
- [ ] اختبار رفع ملف (عقد أو إيصال) للتأكد من Storage
- [ ] اختبار دورة مشروع كاملة قبل التسليم

### Supabase Storage Bucket:
```
Supabase Dashboard → Storage → New Bucket
Name: documents
Public: ✅ (للقراءة)
```

### Environment Variables المطلوبة على Vercel:
```env
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## سابعاً: جدول زمني مقترح

| المهمة | الوقت |
|--------|-------|
| إنشاء Supabase جديد + تشغيل SQL | 30 دقيقة |
| نقل الـ repo وإعداد Vercel | 30 دقيقة |
| ربط الدومين وانتظار DNS | 1-24 ساعة (DNS propagation) |
| اختبار شامل قبل التسليم | 1-2 ساعة |
| **الإجمالي** | **نصف يوم عمل** |

---

*أُعد بواسطة Thakaa Flow — ai@tfco.sa*
