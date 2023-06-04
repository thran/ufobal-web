## Installation

### Setup backend environment

#### With [conda](https://docs.conda.io/en/latest/miniconda.html) (recommended)

```bash
conda env create
poetry install
```

#### Without conda

requirements:
- python ^3.10
- [poetry](https://python-poetry.org/) ^1.3.2

```bash
poetry install
```

### Setup backend

#### Requirements

You probably need `memcached` running

#### DB
1. Create mysql database and user.
2. Set environment variable `DATABASE_URL='mysql://username:password@localhost/db_name` (if you have db `ufobal` with user and password `ufobal`, you can skip this step) 
3. Migrate database `python manage.py migrate`

### Frontend stuff

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
`python manage.py runserver`

#### run tests
`pytest`
