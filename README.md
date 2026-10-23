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

`memcached` is only needed on the server (`ON_VIPER=True`). Locally Django uses an in-memory cache.

#### DB
1. Create mysql database and user.
2. Set environment variable `DATABASE_URL='mysql://username:password@localhost/db_name` (if you have db `ufobal` with user and password `ufobal`, you can skip this step) 
3. Migrate database `python manage.py migrate`

### Quickstart with sqlite (no mysql)

```bash
DATABASE_URL=sqlite:////tmp/ufobal.sqlite3 python manage.py migrate
DATABASE_URL=sqlite:////tmp/ufobal.sqlite3 python manage.py seed_e2e --out /tmp/seed.json
DATABASE_URL=sqlite:////tmp/ufobal.sqlite3 python manage.py runserver
```

Login: `e2e` / `e2e`. (`seed_e2e` refuses non-sqlite databases and already seeded ones — delete the sqlite file before re-seeding.)

## Frontend

- The new React SPA lives in `frontend/` (see `frontend/README.md`). `frontend/scripts/build-to-backend.sh` builds it into `static/spa/` and `templates/spa.html`.
- Without a build, `/` returns 503 "Frontend is not built".
- The old AngularJS app is served under `/old/`.

### Legacy AngularJS frontend stuff

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
