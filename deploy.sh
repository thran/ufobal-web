#!/bin/sh
# deployment script run on deploy

echo "Starting deploy script"
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

cd $DIR

#requirements
poetry install

# database
python $DIR/manage.py migrate

# static files
python $DIR/manage.py collectstatic --noinput
