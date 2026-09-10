#!/usr/bin/env bash
# ---------------------------------------------------------------
# SCOPE Egypt — تشغيل الباك إند + الفرونت إند مع بعض
#   الاستخدام:  bash run.sh
#   للإيقاف:    Ctrl+C
#   يدعم PostgreSQL (Docker/Codespaces) + fallback SQLite
# ---------------------------------------------------------------
set -e
cd "$(dirname "$0")"
ROOT="$(pwd)"

RED='\033[0;31m'; GRN='\033[0;32m'; CYN='\033[0;36m'; YLW='\033[1;33m'; NC='\033[0m'

# --- محاولة تشغيل PostgreSQL لو محلي ---
if ! pg_isready -q 2>/dev/null && command -v pg_ctlcluster >/dev/null 2>&1; then
  echo -e "${YLW}→ تشغيل PostgreSQL…${NC}"
  sudo pg_ctlcluster 17 main start 2>/dev/null || true
fi

# --- تحديد DATABASE_URL (postgres أو sqlite) ---
USE_SQLITE=0
if ! python3 -c "import os, psycopg2; url=os.environ.get('DATABASE_URL') or open('backend/.env').read().split('DATABASE_URL=')[1].split()[0].strip(); url=url.replace('postgresql+psycopg2','postgresql'); psycopg2.connect(url).close()" 2>/dev/null; then
  # جرّب قراءة .env
  DB_FROM_ENV=$(grep -E "^DATABASE_URL=" backend/.env 2>/dev/null | cut -d= -f2- | tr -d '"' | tr -d "'" || echo "")
  if [ -n "$DB_FROM_ENV" ]; then
    if ! python3 -c "import psycopg2; psycopg2.connect('${DB_FROM_ENV}'.replace('postgresql+psycopg2','postgresql')).close()" 2>/dev/null; then
      USE_SQLITE=1
    fi
  else
    USE_SQLITE=1
  fi
fi

if [ "$USE_SQLITE" -eq 1 ]; then
  echo -e "${YLW}⚠️  PostgreSQL غير متاحة — سيتم التشغيل بـ SQLite (scope.db)${NC}"
  export DATABASE_URL="sqlite:///./scope.db"
  # إنشاء البيانات لو مش موجودة
  if [ ! -f backend/scope.db ]; then
    echo -e "${YLW}→ إنشاء قاعدة SQLite وتعبئة البيانات…${NC}"
    (cd backend && DATABASE_URL="sqlite:///./scope.db" python -m app.seed --reset) || true
  fi
fi

if [ ! -f backend/.env ]; then
  echo -e "${RED}✗ ملف backend/.env مش موجود — شغّل: bash .devcontainer/setup.sh${NC}"
  echo -e "${YLW}→ سيتم إنشاؤه تلقائياً…${NC}"
  cp backend/.env.example backend/.env
  SECRET="$(python3 -c 'import secrets;print(secrets.token_urlsafe(48))')"
  python3 - "$SECRET" <<'PY'
import re, sys, pathlib
p = pathlib.Path("backend/.env")
t = p.read_text()
t = re.sub(r"^JWT_SECRET=.*$", f"JWT_SECRET={sys.argv[1]}", t, flags=re.M)
p.write_text(t)
PY
fi

cleanup() {
  echo -e "\n${YLW}→ جارٍ الإيقاف…${NC}"
  kill $(jobs -p) 2>/dev/null || true
  wait 2>/dev/null || true
  echo -e "${GRN}✓ اتقفل${NC}"
}
trap cleanup EXIT INT TERM

echo -e "${CYN}════════════════════════════════════════════${NC}"
echo -e "${CYN}  SCOPE Egypt — ${USE_SQLITE:+SQLite}${USE_SQLITE:-PostgreSQL}${NC}"
echo -e "${CYN}════════════════════════════════════════════${NC}"

# --- الباك إند ---
echo -e "${GRN}→ الـ API على البورت 8000${NC}"
if [ "$USE_SQLITE" -eq 1 ]; then
  ( cd "$ROOT/backend" && DATABASE_URL="sqlite:///./scope.db" uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload ) &
else
  ( cd "$ROOT/backend" && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload ) &
fi

sleep 4

# --- الفرونت إند ---
echo -e "${GRN}→ الموقع على البورت 8081${NC}"
( cd "$ROOT/mobile" && npx expo start --web --port 8081 --host lan ) &

echo ""
echo -e "${CYN}────────────────────────────────────────────${NC}"
echo -e "  🌐 الموقع :  ${GRN}http://localhost:8081${NC}"
echo -e "  ⚙️  الـ API :  ${GRN}http://localhost:8000/docs${NC}"
if [ "$USE_SQLITE" -eq 1 ]; then
  echo -e "  🗄️  DB     :  ${YLW}SQLite (backend/scope.db)${NC}"
fi
echo ""
echo -e "  👤 أدمن  :  admin@scope-eg.com / Admin@123"
echo -e "  👤 عميل  :  ahmed@clinic-eg.com / Customer@123"
echo -e "${CYN}────────────────────────────────────────────${NC}"
echo -e "  ${YLW}في Codespaces: افتح تبويب PORTS واضغط على 8081${NC}"
echo ""

wait
