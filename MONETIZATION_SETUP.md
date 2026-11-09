# نظام العضوية والنقاط والدفع — بوابة سورية الوطنية

## البنية الحالية
- Supabase Auth لتسجيل الحسابات وتسجيل الدخول.
- Supabase Postgres لتخزين الملفات الشخصية والاشتراكات والصلاحيات والنقاط والمخزون والقيود المحاسبية.
- سياسات Row Level Security على جميع جداول public؛ كل مستخدم يرى بياناته فقط.
- Supabase Edge Function باسم `membership-api` لخدمة الخطط والملف والرصيد وسجل النقاط.
- واجهة الموقع تستخدم مفتاح Supabase Publishable فقط؛ لا توجد مفاتيح سرية داخل HTML.
- إصدار النقاط وتفعيل الاشتراكات غير متاحين للمتصفح. يجب أن يتمّا عبر خدمات خادمية موثوقة.

## إعداد Supabase المنشأ
- Project ref: `elzquyehghuxhswogsch`
- Region: `eu-central-1`
- API URL: `https://elzquyehghuxhswogsch.supabase.co`
- Membership API: `https://elzquyehghuxhswogsch.supabase.co/functions/v1/membership-api`
- الجداول: profiles, membership_plans, subscriptions, entitlements, points_ledger, inventory_items, inventory_movements, accounting_accounts, journal_entries, journal_lines.
- العرض الآمن: points_balances.
- Edge Function: `membership-api` (نسخة 2، نشطة).

## واجهات API
- GET /api/health — فحص الخدمة.
- GET /api/plans — الخطط المتاحة.
- GET /api/me — الملف والصلاحيات والرصيد والاشتراكات (Bearer user JWT).
- GET /api/points — الرصيد وآخر 100 حركة (Bearer user JWT).
- POST /api/checkout — متوقف بأمان حتى إعداد Stripe.
- POST /api/stripe/webhook — لا يقبل أحداثاً قبل تهيئة التوقيع السري.

## ما تبقى قبل تفعيل الإيرادات
1. إنشاء حساب Stripe وتحديد الأسعار الشهرية النهائية لكل باقة.
2. إضافة Stripe secret وwebhook signing secret إلى أسرار Edge Functions (لا توضع في GitHub أو الواجهة).
3. تنفيذ معالجة موثقة لأحداث checkout.session.completed وsubscription.updated وsubscription.deleted، مع idempotency والاستردادات والنزاعات.
4. اختبار الدفع في Stripe Test Mode، ثم التحقق من منح وسحب الصلاحيات آلياً.
5. تحديد سياسة النقاط ومصادر منحها ومعدلاتها وحدود إساءة الاستخدام قبل تشغيلها.
6. ضبط إعدادات تأكيد البريد الإلكتروني وروابط إعادة التوجيه لنطاق الموقع المنشور.

## ملاحظات أمان
- لا تستخدم service_role أو secret key في المتصفح أو المستودع.
- مفتاح Publishable الموجود في HTML عام بطبيعته، وتعتمد حماية البيانات على RLS.
- لا تعتمد على success_url لتفعيل الاشتراك؛ Webhook موثّق هو مصدر الحقيقة.
- لا تُمنح نقاط من المتصفح، ولا تُفعّل VIP بمجرد العودة من صفحة الدفع.
- بيانات المخزون والحسابات معزولة لكل مستخدم؛ حركات المخزون تحفظ كسجل، وترحيل القيد المحاسبي يشترط توازن المدين والدائن.
