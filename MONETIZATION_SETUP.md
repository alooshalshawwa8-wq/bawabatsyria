# نظام العضوية والنقاط والدفع — بوابة سورية الوطنية

## ما يتضمنه هذا الأساس
- API مستقل على Cloudflare Workers مع قاعدة Cloudflare D1.
- تحقق من JWT عبر مفاتيح JWKS (RS256/ES256) قبل قراءة الحساب أو بدء الدفع.
- خطط احترافية وVIP وأعمال، وأسعار Stripe Price IDs قابلة للتهيئة دون وضع مفاتيح سرية في الواجهة.
- إنشاء Stripe Checkout للاشتراكات فقط، وتفعيل الصلاحيات عبر Webhook موثّق بتوقيع Stripe.
- سجل نقاط (ledger) وقراءة الرصيد وسجل آخر 100 حركة.
- لا يمنح المتصفح نفسه نقاطاً أو اشتراكاً. لا تُقبل أحداث الدفع إلا من Stripe webhook.

## ما يتطلب إعداداً خارج المستودع
1. مشروع Supabase Auth (أو موفر OIDC متوافق) لإصدار رموز دخول المستخدمين.
2. مشروع Cloudflare Worker وD1، ثم وضع معرف قاعدة البيانات في wrangler.toml وتشغيل schema.sql.
3. حساب Stripe مع إنشاء أسعار اشتراكات شهرية، ثم إضافة Price IDs ومفاتيح Stripe إلى Worker secrets.
4. إعداد عنوان الموقع المسموح وAUTH_ISSUER وAUTH_JWKS_URL وALLOWED_ORIGIN.
5. ربط تسجيل الدخول في الواجهة وإرسال رمز المستخدم إلى /api/me و/api/checkout.
6. إعداد سياسات الاسترداد والضرائب والفواتير والامتثال قبل فتح الدفع للجمهور.

## متغيرات Worker
- AUTH_ISSUER: جهة إصدار JWT الدقيقة.
- AUTH_JWKS_URL: رابط مفاتيح JWKS للموفر.
- AUTH_AUDIENCE: الافتراضي authenticated.
- ALLOWED_ORIGIN: أصل الواجهة فقط، مثل https://OWNER.github.io.
- PUBLIC_SITE_URL: رابط العودة بعد الدفع.
- STRIPE_SECRET_KEY وSTRIPE_WEBHOOK_SECRET: أسرار Worker فقط.
- STRIPE_PRICE_PRO_MONTHLY وSTRIPE_PRICE_VIP_MONTHLY وSTRIPE_PRICE_BUSINESS_MONTHLY: معرفات أسعار Stripe.

## واجهات API
- GET /api/health — فحص الخدمة.
- GET /api/plans — الخطط وحالة تهيئة الدفع.
- GET /api/me — الملف والصلاحيات والرصيد والاشتراكات (Bearer JWT).
- GET /api/points — سجل النقاط (Bearer JWT).
- POST /api/checkout — إنشاء جلسة اشتراك (Bearer JWT).
- POST /api/stripe/webhook — استقبال أحداث Stripe والتحقق من التوقيع.

## ملاحظات أمان قبل الإنتاج
- لا تضع أي سر في ملفات HTML أو المستودع.
- لا تعتمد على success_url لتفعيل الاشتراك؛ الـWebhook وحده مصدر الحقيقة.
- لا تنشئ واجهة لإضافة النقاط من المتصفح. إصدار النقاط يحتاج وظيفة خادمية موثقة وحدوداً ومراجعة احتيال.
- راجع معالجة الإلغاء والفشل والاسترداد والنزاعات قبل الإطلاق التجاري.
- اختبر كل خطة وصلاحية وWebhook في وضع Stripe التجريبي قبل الإطلاق.
