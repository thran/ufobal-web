#!/bin/sh
# deployment script run by Viper server after push

echo "Starting deploy script"
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

cd $DIR

#requirements
pip install -r $DIR/requirements.txt

# database
python $DIR/manage.py migrate


#js
export PATH="$DIR/node_modules/.bin/:$PATH"

npm install
bower install
grunt

# static files
python $DIR/manage.py collectstatic --noinput
