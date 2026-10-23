#!/usr/bin/env bash
# Builds the SPA and copies it into the Django project (static/spa + templates/spa.html).
set -euo pipefail

cd "$(dirname "$0")/.."
BACKEND="$(cd "${1:-${UFOBAL_BACKEND:-..}}" && pwd)"

[ -f "$BACKEND/manage.py" ] || { echo "Not a Django repo: $BACKEND" >&2; exit 1; }

npm run build
rm -rf "$BACKEND/static/spa"
mkdir -p "$BACKEND/static/spa"
cp -r dist/assets "$BACKEND/static/spa/"
cp dist/index.html "$BACKEND/templates/spa.html"
echo "Copied build into $BACKEND"
