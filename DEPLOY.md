# دليل النشر — SCOPE Egypt

## 1) GitHub Codespaces (أسهل طريقة للتجربة)

1. افتحي الريبو على GitHub: `https://github.com/Menna-tullah-Badawy/scope-egypt`
2. اضغطي **Code → Codespaces → Create codespace on main**
3. انتظري 3-4 دقائق حتى يكتمل `setup.sh` (بيثبت Python + Node + يعبّي البيانات)
4. افتحي تبويب **PORTS** واضغطي:
   - المنفذ `8081` → **SCOPE Website**
   - المنفذ `8000` → **API Docs** (`/docs`)
5. لو احتجتي تشغيل يدوي:
   ```bash
   bash run.sh
   ```

بيانات الدخول:
```
admin@scope-eg.com / Admin@123   → لوحة الإدارة
ahmed@clinic-eg.com / Customer@123 → عميل
```

---

## 2) نشر دائم مجاني (اختياري)

### Backend على Render
1. ادخلي https://dashboard.render.com → New + → Web Service
2. اربطي الريبو `Menna-tullah-Badawy/scope-egypt`
3. الإعدادات:
   - Root Directory: `backend`
   - Build: `pip install -r requirements.txt`
   - Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. أضيفي متغيرات البيئة:
   ```
   DATABASE_URL=postgresql+psycopg2://user:pass@host/db  (من Neon أو Supabase)
   JWT_SECRET=...  (اضغطي Generate)
   CORS_ORIGINS=*
   ```
5. Deploy → خدي الرابط مثل: `https://scope-api.onrender.com`

### Database مجاني
- **Neon** https://neon.tech → Create Project → انسخي `DATABASE_URL`
- أو **Supabase** https://supabase.com → New Project → Database URL

> بعد إنشاء رابط الـ DB، شغّلي مرة واحدة:
> ```bash
> DATABASE_URL="..." python -m app.seed --reset
> ```

### Frontend على GitHub Pages / Vercel / Netlify
- **GitHub Pages (تلقائي):**
  1. في الريبو → Settings → Pages → Source: **GitHub Actions**
  2. كل Push على `master` يبني `mobile/dist` وينشره.
  3. ضيفي Secret للـ API:
     - Settings → Secrets → New repository secret
     - Name: `API_URL`  Value: `https://scope-api.onrender.com`

- **Vercel (بديل أسرع):**
  1. https://vercel.com → Import Project → حددي `mobile`
  2. Framework: **Other**  Build: `npx expo export -p web`
  3. Output: `dist`  Env: `EXPO_PUBLIC_API_URL=https://scope-api.onrender.com`

---

## 3) تشغيل محلي بدون Docker (SQLite للتجربة السريعة)

لو PostgreSQL مش متاح عندك:

```bash
cd backend
DATABASE_URL="sqlite:///./scope.db" python -m app.seed --reset
DATABASE_URL="sqlite:///./scope.db" uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

ثم في تيرمنال تاني:
```bash
cd mobile
npm install
EXPO_PUBLIC_API_URL=http://localhost:8000 npx expo start --web --port 8081
```

---

## 4) رفع التحديثات

```bash
git add .
git commit -m "تحديث: وصف التغيير"
git push origin master
```

- الـ CI (`ci.yml`) هيشتغل تلقائياً ويتأكد أن الباك والفرونت شغالين.
- الـ Pages (`pages.yml`) هينشر الواجهة لو مفعل GitHub Pages.

---

## 5) الصور

كل المنتجات الـ 19 الآن لها صور محلية في `backend/uploads/p-*.jpg`:

| الملف | الجهاز |
|---|---|
| p-oxygen-concentrator.jpg | مولد أكسجين |
| p-bipap.jpg | BiPAP/VPAP |
| p-nebulizer.jpg | بخاخة |
| p-hospital-bed.jpg | سرير طبي |
| p-air-mattress.jpg | مرتبة هوائية |
| p-wheelchair.jpg | كرسي متحرك |
| p-patient-lift.jpg | رافعة مرضى |
| p-autoclave.jpg | أوتوكلاف |
| p-reprocessor.jpg | غسالة مناظير |

مسموح بنشرها في `.gitignore` عبر `!backend/uploads/p-*.jpg`
