#!/usr/bin/env bash
# ---------------------------------------------------------------
# SCOPE Egypt — تجهيز البيئة (بيشتغل مرة واحدة عند إنشاء الـ Codespace)
# ---------------------------------------------------------------
set -e
cd "$(dirname "$0")/.."
ROOT="$(pwd)"

echo "════════════════════════════════════════════"
echo "  SCOPE Egypt — جارٍ تجهيز المشروع…"
echo "════════════════════════════════════════════"

# ---------- 1) ملف البيئة ----------
if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
  SECRET="$(python3 -c 'import secrets;print(secrets.token_urlsafe(48))')"
  python3 - "$SECRET" <<'PY'
import re, sys, pathlib
p = pathlib.Path("backend/.env")
t = p.read_text()
t = re.sub(r"^JWT_SECRET=.*$", f"JWT_SECRET={sys.argv[1]}", t, flags=re.M)
p.write_text(t)
PY
  echo "✓ اتعمل backend/.env"
fi

# ---------- 2) باكدچات البايثون ----------
echo "→ تنصيب مكتبات Python…"
pip install --upgrade pip -q
pip install -r backend/requirements.txt -q
echo "✓ مكتبات Python تمام"

# ---------- 3) انتظار قاعدة البيانات ----------
echo "→ في انتظار PostgreSQL…"
DB_OK=0
for i in $(seq 1 40); do
  if python3 - <<'PY' 2>/dev/null
import os, psycopg2
url = os.environ.get("DATABASE_URL", "postgresql+psycopg2://scope:scope123@db:5432/scopedb")
psycopg2.connect(url.replace("postgresql+psycopg2", "postgresql")).close()
PY
  then echo "✓ PostgreSQL جاهزة"; DB_OK=1; break; fi
  sleep 2
done

if [ "$DB_OK" -eq 0 ]; then
  echo "⚠️  PostgreSQL غير متاحة — سيتم استخدام SQLite للتجربة"
fi

# ---------- 4) الجداول + البيانات التجريبية ----------
echo "→ إنشاء الجداول وتعبئة البيانات…"
if [ "$DB_OK" -eq 1 ]; then
  cd backend && python -m app.seed && cd "$ROOT" || echo "⚠️ seed فشل — جربي: cd backend && python -m app.seed --reset"
else
  echo "→ استخدام SQLite مؤقتاً…"
  cd backend && DATABASE_URL="sqlite:///./scope.db" python -m app.seed --reset && cd "$ROOT" || true
fi
echo "✓ البيانات التجريبية اتحطت"

# ---------- 5) باكدچات الفرونت ----------
echo "→ تنصيب مكتبات Node (ممكن تاخد دقيقتين)…"
cd mobile && npm install --no-audit --no-fund && cd "$ROOT"
echo "✓ مكتبات Node تمام"

echo ""
echo "════════════════════════════════════════════"
echo "  ✅ خلص التجهيز!"
echo ""
echo "  شغّل المشروع بالأمر:   bash run.sh"
echo ""
echo "  👤 أدمن:  admin@scope-eg.com / Admin@123"
echo "  👤 عميل:  ahmed@clinic-eg.com / Customer@123"
echo "════════════════════════════════════════════"
