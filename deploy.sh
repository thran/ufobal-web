#!/usr/bin/env bash
# deployment script run on deploy
set -euo pipefail

# Node 22 (unofficial glibc-217 build); /usr/bin/node on the server is too old
export PATH="/opt/node/current/bin:$PATH"

echo "Starting deploy script"
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

cd $DIR

#requirements
poetry install --no-root

# frontend (before migrate, so a failed build stops the deploy before DB changes)
cd $DIR/frontend
npm ci --no-audit --no-fund
bash scripts/build-to-backend.sh $DIR
cd $DIR

# database
python $DIR/manage.py migrate

# static files
python $DIR/manage.py collectstatic --noinput
