# SCOPE Egypt — منصة تأجير وبيع المناظير والأجهزة الطبية

[![CI](https://github.com/Menna-tullah-Badawy/scope-egypt/actions/workflows/ci.yml/badge.svg)](https://github.com/Menna-tullah-Badawy/scope-egypt/actions/workflows/ci.yml)
[![Codespaces](https://github.com/codespaces/badge.svg)](https://github.com/codespaces/new?hide_repo_select=true&ref=master&repo=Menna-tullah-Badawy/scope-egypt)

نظام **Full-Stack** كامل ومجاني 100% — من غير أي خدمة مدفوعة. كل الصور الـ 19 محلية في `backend/uploads/p-*.jpg` (مفيش اعتماد على Unsplash).

| الطبقة | التقنية |
|---|---|
| Backend | Python 3.13 · FastAPI · SQLAlchemy · PostgreSQL 17 (أو SQLite للتجربة) |
| Frontend | React Native (Expo 57) + React Native Web — كود واحد للموبايل والويب |
| Auth | Email + Password · JWT |
| PDF | ReportLab + خط Amiri (عربي كامل) + QR |
| العملة | جنيه مصري — بدون ضرائب |
| الدفع | Stripe (تجريبي) + الدفع عند الاستلام |

---

## 🚀 التشغيل بـ GitHub Codespaces (أسهل طريقة - من المتصفح)

> مش محتاجة تنزلي Visual Studio Code ولا أي حاجة على جهازك.

1. اعملي Repository جديد باسم `scope-egypt` على حسابك `Menna-tullah-Badawy` (أو استخدمي الموجود)
2. ارفعي المشروع (شوفي `DEPLOY.md`)
3. دوسي **Code → Codespaces → Create codespace on main**
4. انتظري 3 دقائق → افتحي تبويب **PORTS** واضغطي:
   - المنفذ `8081` → 🌐 **الموقع**
   - المنفذ `8000` → ⚙️ **API Docs** على `/docs`
5. لو احتجتي تشغيل يدوي:
   ```bash
   bash run.sh
   ```

كل البيانات بتتعبّى تلقائياً + كل الصور الـ 19 بتظهر من `backend/uploads`.

> تفاصيل النشر الدائم (Render + Neon + GitHub Pages) في ملف [`DEPLOY.md`](./DEPLOY.md)

---

## 💻 التشغيل المحلي

### بـ Docker/Codespaces (PostgreSQL)
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

### بدون Docker (SQLite — للتجربة السريعة)
```bash
cd scope/backend
DATABASE_URL="sqlite:///./scope.db" python -m app.seed --reset
DATABASE_URL="sqlite:///./scope.db" uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# تيرمنال تاني
cd scope/mobile
npm install
EXPO_PUBLIC_API_URL=http://localhost:8000 npx expo start --web --port 8081
```

إعادة تعبئة البيانات التجريبية:
```bash
cd scope/backend && python -m app.seed          # idempotent (لو فيه بيانات مش هيعيد)
cd scope/backend && python -m app.seed --reset  # مسح وإعادة بناء
```

---

## 🔑 حسابات الدخول

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

## ✨ المميزات

### واجهة العميل
- كتالوج بحث/فلترة (قسم، ماركة، إيجار/بيع، ترتيب) — **19 جهاز في 7 أقسام** (كلهم بصور محلية)
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

## 📦 الصور — مكتملة 19/19 محلياً

كل المنتجات الآن لها صور احترافية محلية (لا حاجة للإنترنت بعد التحميل):

| الملف | الجهاز | القسم |
|---|---|---|
| `p-gastroscope.jpg` | منظار معدة أوليمبوس | مناظير |
| `p-colonoscope.jpg` | منظار قولون بنتاكس | مناظير |
| `p-arthroscope.jpg` | منظار مفاصل ستريكر | مناظير |
| `p-ent-scope.jpg` | منظار أنف وأذن | مناظير |
| `p-tower-4k.jpg` | برج أوليمبوس 4K | أبراج |
| `p-tower-1688.jpg` | برج ستريكر 1688 | أبراج |
| `p-electrosurgery.jpg` | كي جراحي إربي | عمليات |
| `p-anesthesia.jpg` | تخدير دريجر | عمليات |
| `p-patient-monitor.jpg` | مونيتور مايندراي | مراقبة |
| `p-ecg.jpg` | رسم قلب شيلر | مراقبة |
| `p-oxygen-concentrator.jpg` | **مولد أكسجين EverFlo** ✨ جديد | تنفس |
| `p-bipap.jpg` | **جهاز تنفس ResMed Lumis** ✨ جديد | تنفس |
| `p-nebulizer.jpg` | **بخاخة Omron** ✨ جديد | تنفس |
| `p-hospital-bed.jpg` | **سرير طبي كهربائي** ✨ جديد | رعاية منزلية |
| `p-air-mattress.jpg` | **مرتبة هوائية** ✨ جديد | رعاية منزلية |
| `p-wheelchair.jpg` | **كرسي متحرك** ✨ جديد | رعاية منزلية |
| `p-patient-lift.jpg` | **رافعة مرضى** ✨ جديد | رعاية منزلية |
| `p-autoclave.jpg` | **أوتوكلاف 23L** ✨ جديد | تعقيم |
| `p-reprocessor.jpg` | **غسالة مناظير** ✨ جديد | تعقيم |

`seed.py` يربط كل منتج تلقائياً بـ `/uploads/p-*.jpg` و `StaticFiles` في `main.py` يقدّمها على `/uploads`.

---

## 📁 بنية المشروع

```
scope/
├── .devcontainer/              # GitHub Codespaces (Python + Node + Postgres)
│   ├── devcontainer.json
│   ├── docker-compose.yml      # app + db
│   ├── setup.sh                # تجهيز تلقائي + seed
│   └── start.sh
├── .github/workflows/
│   ├── ci.yml                  # اختبار الباك + بناء الفرونت
│   └── pages.yml               # نشر GitHub Pages
├── .vscode/
├── backend/
│   ├── Dockerfile
│   ├── .env.example
│   ├── requirements.txt
│   ├── uploads/p-*.jpg         # 19 صورة محلية ✨
│   └── app/
│       ├── main.py             # FastAPI + CORS + static /uploads
│       ├── config.py database.py models.py security.py
│       ├── pricing.py          # محرك أرخص تركيبة سعر
│       ├── schemas.py serializers.py seed.py  # 19 منتج + 7 أقسام + بيانات تجريبية
│       ├── fonts/              # Amiri (عربي في الـ PDF)
│       └── routers/
│           ├── auth.py catalog.py orders.py maintenance.py
│           └── content.py reports.py payments.py documents.py uploads.py
├── mobile/
│   ├── App.tsx                 # shell: راوتنج + هيدر + سايدبار + تابات + فوتر
│   ├── app.json                # Expo config (web single)
│   └── src/
│       ├── theme.ts api.ts i18n.ts store.tsx ui.tsx components.tsx
│       └── screens/
│           ├── Home.tsx Catalog.tsx Product.tsx Cart.tsx Orders.tsx Misc.tsx
│           └── AdminDash.tsx AdminCatalog.tsx AdminOps.tsx
├── render.yaml                 # نشر Backend على Render
├── DEPLOY.md                   # دليل النشر خطوة بخطوة
└── run.sh                      # تشغيل الباك + الفرونت مع بعض
```

---

## 🔧 ملاحظات

- **Stripe** شغال في وضع تجريبي (`demo_pi_<ORDERCODE>`) لأن مفيش مفاتيح. حط `STRIPE_SECRET_KEY` في `backend/.env` علشان يشتغل حقيقي.
- روابط الـ PDF في المتصفح بتستخدم `?access_token=<JWT>` بدل هيدر Authorization.
- في الـ PDF العربي: تجنّب `ج.م` (الـ bidi بتعكسها) — استخدم `جنيه`.
- الـ API بيحدد عنوانه تلقائياً (Codespaces → Gitpod → e2b → localhost) — أو حدديه بـ `EXPO_PUBLIC_API_URL`.
- `DATABASE_URL` يدعم PostgreSQL و SQLite (للتجربة بدون Docker).

---

## 📤 الرفع على GitHub (حساب Menna-tullah-Badawy)

شوفي [`DEPLOY.md`](./DEPLOY.md) — فيه أوامر جاهزة للنسخ + شرح التوكن المؤقت + النشر على Render/Neon.

```bash
# بعد إنشاء repo فاضي على GitHub باسم scope-egypt:
git remote add origin https://github.com/Menna-tullah-Badawy/scope-egypt.git
git branch -M master
git push -u origin master
```

أو بـ Token مؤقت (يُمسح بعد الرفع):
```bash
git remote add origin https://<TOKEN>@github.com/Menna-tullah-Badawy/scope-egypt.git
git push -u origin master
```
