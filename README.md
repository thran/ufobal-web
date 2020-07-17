## Installation

#### backend stuff

`pip install -r requirements.txt`

`python manage.py makemigrations`

`python manage.py migrate`

#### Frontend stuff

`npm install bower`

`npm install -g grunt grunt-cli`

`npm install`

`bower install`

## Development

#### build css and js

`grunt`

#### build automaticaly on file change

`grunt watch`

#### run server
python manage.py runserver

## Windows troubles
Add this into settings.py during development if you encounter encoding errors

```
import sys
reload(sys)
sys.setdefaultencoding('UTF8')
```
