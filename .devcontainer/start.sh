#!/usr/bin/env bash
# بيشتغل كل مرة تفتح فيها الـ Codespace — بيشغّل السيرفرين في الخلفية
cd "$(dirname "$0")/.."
if [ -f backend/.env ]; then
  nohup bash run.sh > /tmp/scope.log 2>&1 &
  echo "🚀 SCOPE شغّال — شوف تبويب PORTS وافتح بورت 8081"
fi
