#!/usr/bin/env bash
# Fresh sqlite DB + seed + Django runserver for Playwright (started by playwright.config.ts webServer).
set -euo pipefail
cd "$(dirname "$0")/.."
BACKEND_DIR="${UFOBAL_BACKEND:-../ufobal-web}"
[ -d "$BACKEND_DIR" ] || { echo "Backend dir not found: $BACKEND_DIR (set UFOBAL_BACKEND)" >&2; exit 1; }
BACKEND="$(cd "$BACKEND_DIR" && pwd)"
PY="${UFOBAL_PYTHON:-$HOME/miniconda3/envs/ufobal_web/bin/python}"
[ -x "$PY" ] || { echo "Python not found or not executable: $PY (set UFOBAL_PYTHON)" >&2; exit 1; }
TMP="$(mktemp -d)"
PID=""
trap '[ -n "$PID" ] && kill "$PID" 2>/dev/null; rm -rf "$TMP"' EXIT INT TERM
export DATABASE_URL="sqlite:///$TMP/e2e.sqlite3" LOG_FILE="$TMP/django.log"
unset TEST ON_VIPER DJANGO_DEBUG
"$PY" "$BACKEND/manage.py" migrate --noinput >/dev/null
"$PY" "$BACKEND/manage.py" seed_e2e --out "$PWD/e2e/.seed.json"
"$PY" "$BACKEND/manage.py" runserver 127.0.0.1:8123 --noreload &
PID=$!
wait "$PID"
