#!/usr/bin/env bash
# ---------------------------------------------------------------
# SCOPE Egypt — تشغيل الباك إند + الفرونت إند مع بعض
#   الاستخدام:  bash run.sh
#   للإيقاف:    Ctrl+C
# ---------------------------------------------------------------
set -e
cd "$(dirname "$0")"
ROOT="$(pwd)"

RED='\033[0;31m'; GRN='\033[0;32m'; CYN='\033[0;36m'; YLW='\033[1;33m'; NC='\033[0m'

# --- تشغيل PostgreSQL لو محلي (مش داخل devcontainer) ---
if ! pg_isready -q 2>/dev/null && command -v pg_ctlcluster >/dev/null 2>&1; then
  echo -e "${YLW}→ تشغيل PostgreSQL…${NC}"
  sudo pg_ctlcluster 17 main start 2>/dev/null || true
fi

if [ ! -f backend/.env ]; then
  echo -e "${RED}✗ ملف backend/.env مش موجود — شغّل: bash .devcontainer/setup.sh${NC}"
  exit 1
fi

cleanup() {
  echo -e "\n${YLW}→ جارٍ الإيقاف…${NC}"
  kill $(jobs -p) 2>/dev/null || true
  wait 2>/dev/null || true
  echo -e "${GRN}✓ اتقفل${NC}"
}
trap cleanup EXIT INT TERM

echo -e "${CYN}════════════════════════════════════════════${NC}"
echo -e "${CYN}  SCOPE Egypt${NC}"
echo -e "${CYN}════════════════════════════════════════════${NC}"

# --- الباك إند ---
echo -e "${GRN}→ الـ API على البورت 8000${NC}"
( cd "$ROOT/backend" && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload ) &

sleep 4

# --- الفرونت إند ---
echo -e "${GRN}→ الموقع على البورت 8081${NC}"
( cd "$ROOT/mobile" && npx expo start --web --port 8081 --host lan ) &

echo ""
echo -e "${CYN}────────────────────────────────────────────${NC}"
echo -e "  🌐 الموقع :  ${GRN}http://localhost:8081${NC}"
echo -e "  ⚙️  الـ API :  ${GRN}http://localhost:8000/docs${NC}"
echo ""
echo -e "  👤 أدمن  :  admin@scope-eg.com / Admin@123"
echo -e "  👤 عميل  :  ahmed@clinic-eg.com / Customer@123"
echo -e "${CYN}────────────────────────────────────────────${NC}"
echo -e "  ${YLW}في Codespaces: افتح تبويب PORTS واضغط على 8081${NC}"
echo ""

wait
