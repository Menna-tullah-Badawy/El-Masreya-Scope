# SCOPE Egypt — منصة تأجير وبيع المناظير والأجهزة الطبية

نظام **Full-Stack** كامل ومجاني 100% (مفيش أي خدمة أو API مدفوع).

| الطبقة | التقنية |
|---|---|
| Backend | Python 3.13 · FastAPI · SQLAlchemy · PostgreSQL 17 |
| Frontend | React Native (Expo 57) + React Native Web — كود واحد يطلّع **موبايل + ويب** |
| Auth | Email + Password · JWT |
| PDF | ReportLab + خط Amiri (دعم عربي كامل) + QR |
| العملة | جنيه مصري — بدون ضرائب |
| الدفع | Stripe (وضع تجريبي) + الدفع عند الاستلام |

---

## التشغيل

```bash
# 1) قاعدة البيانات (لو السيرفر اتقفل)
sudo pg_ctlcluster 17 main start

# 2) الباك إند  →  http://localhost:8000   (docs على /docs)
cd scope/backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# 3) الفرونت إند  →  http://localhost:8081
cd scope/mobile
npx expo start --web --port 8081 --host lan
```

إعادة تعبئة البيانات التجريبية:

```bash
cd scope/backend && python -m app.seed          # idempotent
cd scope/backend && python -m app.seed --reset  # مسح وإعادة بناء
```

## حسابات الدخول

| الدور | الإيميل | الباسورد |
|---|---|---|
| أدمن | `admin@scope-eg.com` | `Admin@123` |
| عميل | `ahmed@clinic-eg.com` | `Customer@123` |
| عميل | `mona@dar-elshefa.com` | `Customer@123` |
| عميل | `karim@nilehospital.com` | `Customer@123` |
| عميل | `sara.m@gmail.com` | `Customer@123` |
| عميل | `hisham@ortho-eg.com` | `Customer@123` |
| عميل | `m.raafat@outlook.com` | `Customer@123` |

---

## المميزات

### واجهة العميل
- كتالوج بحث/فلترة (قسم، ماركة، إيجار/بيع، ترتيب) — 19 جهاز في 7 أقسام
- صفحة منتج: معرض صور، مواصفات، تقييمات، أجهزة مشابهة
- **تقويم حجز** بمدى تواريخ + منع التعارض + عرض الأيام المحجوزة
- **تسعير ذكي:** 3 أسعار لكل جهاز (يوم/أسبوع/شهر) والنظام يحسب **أرخص تركيبة** تلقائياً (Dynamic Programming) ويوضّح كام وفّرت
- سلة + Checkout (بيفصل أوامر الإيجار عن أوامر البيع تلقائياً)
- طلباتي: خط زمني 5 مراحل، تحميل الفاتورة والعقد PDF، دفع، إلغاء
- مقارنة أجهزة (حتى 4)، مدونة، إشعارات داخل التطبيق
- روابط واتساب جاهزة بتفاصيل الطلب

### لوحة الإدارة
- Dashboard: KPIs + رسم إيرادات 6 شهور + حالة الأسطول + أعلى الأجهزة إيراداً + مرتجعات قريبة
- الطلبات: موافقة/رفض، تخصيص وحدة بالسيريال (مع اقتراح تلقائي)، تسليم، استرجاع (مع غرامة تأخير + تعقيم)، دفعات، خصم، رسوم توصيل
- المنتجات والوحدات: CRUD + طباعة ملصق QR PDF لكل وحدة
- الصيانة والتعقيم: تذاكر، جدول المعايرة، تنبيهات الصيانة الدورية
- العملاء، التقييمات (موافقة/حذف)، المقالات، التقارير، الإعدادات

### الاثنين
- **عربي + إنجليزي** كامل مع RTL حقيقي
- Responsive: تبويبات سفلية على الموبايل / Sidebar على الديسكتوب

---

## بنية المشروع

```
scope/
├── backend/
│   ├── .env                    # DB / JWT / Stripe / بيانات الشركة
│   └── app/
│       ├── main.py             # FastAPI app + CORS + static
│       ├── config.py database.py models.py security.py
│       ├── pricing.py          # محرك أرخص تركيبة سعر
│       ├── schemas.py serializers.py seed.py
│       ├── fonts/              # Amiri (عربي في الـ PDF)
│       └── routers/
│           ├── auth.py catalog.py orders.py maintenance.py
│           └── content.py reports.py payments.py documents.py uploads.py
└── mobile/
    ├── App.tsx                 # الـ shell: راوتنج + هيدر + سايدبار + تابات + فوتر
    └── src/
        ├── theme.ts api.ts i18n.ts store.tsx ui.tsx components.tsx
        └── screens/
            ├── Home.tsx Catalog.tsx Product.tsx Cart.tsx Orders.tsx Misc.tsx
            └── AdminDash.tsx AdminCatalog.tsx AdminOps.tsx
```

## ملاحظات

- **Stripe** شغال في وضع تجريبي (`demo_pi_<ORDERCODE>`) لأن مفيش مفاتيح. حط `STRIPE_SECRET_KEY` في `.env` علشان يشتغل حقيقي.
- روابط الـ PDF في المتصفح بتستخدم `?access_token=<JWT>` بدل هيدر Authorization.
- في الـ PDF العربي: تجنّب كلمات فيها نقطة زي `ج.م` (مكتبة الـ bidi بتعكسها) — استخدم `جنيه`.
