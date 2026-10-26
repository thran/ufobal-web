# AGENTS.md

Ufo-IS: information system for ufobal tournaments (players, teams, matches, stats, live match recording).
Django backend + React SPA in `frontend/`. The old AngularJS app is still served under `/old/`.

## Layout

- `ufobal/` – Django project (settings, root urls)
- `ufobalapp/` – main app: models, JSON API (`views.py`, `views_auth.py`), tests in `ufobalapp/tests/`
- `managestats/` – staff management pages (Django templates)
- `templates/`, `static/` – Django templates and static files; `templates/index.html` + `ufobalapp/static/` = legacy AngularJS app
- `frontend/` – React SPA (Vite, TypeScript, Tailwind), own `package.json`, see `frontend/README.md`
  - `src/api/` HTTP client, endpoints, DTO types
  - `src/queries/` TanStack Query data hooks and mutations
  - `src/domain/` pure logic (graph of players/teams, groups, match clock, match events, recorder storage)
  - `src/pages/`, `src/components/`, `src/auth/`, `src/hooks/`
  - `e2e/` Playwright tests, `scripts/build-to-backend.sh` build + copy into Django
  - `docs/superpowers/` specs and plans of the React rewrite (historical, paths may be outdated)

## Commands

Backend (Python env `~/miniconda3/envs/ufobal_web`, poetry deps):

- Tests: `pytest`
- Run with sqlite (no MySQL needed):
  ```bash
  DATABASE_URL=sqlite:////tmp/ufobal.sqlite3 python manage.py migrate
  DATABASE_URL=sqlite:////tmp/ufobal.sqlite3 python manage.py seed_e2e --out /tmp/seed.json
  DATABASE_URL=sqlite:////tmp/ufobal.sqlite3 python manage.py runserver
  ```
  Login `e2e` / `e2e`.

Frontend (run in `frontend/`):

- `npm run dev` – Vite on :5173, proxies API/auth/admin/`/old/` to Django on :8000
- `npm test`, `npm run typecheck`, `npm run lint`, `npm run format`
- `npm run build` – production build (base `/static/spa/`)
- `npm run e2e` – builds into Django, fresh sqlite + `seed_e2e`, runserver :8123, Playwright with system Chrome
- `scripts/build-to-backend.sh` – build into `static/spa/` and `templates/spa.html` (both git-ignored)

Before finishing a change: `pytest` for backend changes; `npm test`, `npm run typecheck`, `npm run lint` for frontend changes; `npm run e2e` for changes crossing both.

## Architecture

- Django serves the SPA at `/` from `templates/spa.html` and injects initial data (`user`, `liveTournamentPk`, `test`) as a JSON `<script id="initial-data">`. Without a build `/` returns 503.
- The SPA talks to Django JSON endpoints (`/api_frontend/…`, auth endpoints); types in `frontend/src/api/types.ts` mirror backend `to_json()` output.
- Server state lives in TanStack Query; mutations invalidate the affected query keys.
- Old Czech URLs of the AngularJS app redirect client-side (`src/routes/legacyRedirects.tsx`).
- Live match recording: events stored in localStorage (`src/domain/recorderStorage.ts`) and sent through an ordered sync queue with retry, timeout and poison handling (`src/hooks/useMatchSync.ts`); `client_id` makes event creation idempotent on the backend.
- Permissions are intentionally loose: any user paired with a player can edit rosters, register teams and add matches; `closed_edit` is not enforced server-side.
- Roles: **managers** have the `ufobalapp.manage` permission (`ufobalapp/permissions.py:is_manager`; superusers pass automatically) and get `managestats`, birthdates, editing any player and recording in closed tournaments. **Admins** are `is_staff` users, i.e. those who can enter Django `/admin/`. `/user_profile` exposes both as `is_manager` / `is_admin`. Grant the permission in Django admin on the user.

## Conventions

- UI text is Czech; code, comments, identifiers and commit messages are English.
- Python: black, line length 120, no string normalization.
- TypeScript: prettier (single quotes, width 110), ESLint, 2-space indent.
- Comments only for non-obvious things.
- Tests: Vitest + Testing Library next to the code (`*.test.ts(x)`); pytest in `ufobalapp/tests/`. Write a failing test first for bug fixes and new logic.
- Commits: conventional prefixes (`feat:`, `fix:`, `refactor:`, `chore:`, `test:`, `docs:`).

## Gotchas

- Never render a Headless UI `Dialog` inside a `<form>`: submit events bubble through the React tree.
- Locally Django uses LocMemCache (memcached only when `ON_VIPER` is set); sqlite works via `DATABASE_URL=sqlite:///<abs path>`.
- Django sends `X-Frame-Options: DENY`; to test narrow viewports in a browser, use an iframe served by a Vite dev server, not Django.
- Social login does not work on the Vite dev server unless its redirect URI is registered.
- The legacy app (`/old/`, AngularJS + Grunt + Bower) is kept until the new frontend is deployed; don't refactor it.

## Deploy

- `git push production master` → server hook runs `deploy.sh`: `poetry install`, frontend `npm ci` + build into `static/spa/` + `templates/spa.html`, `migrate`, `collectstatic`, then restarts the app.
- The server builds the frontend, so it needs Node `^20.19.0 || >=22.12.0` (Vite 7). On the server (CentOS 7) it is the unofficial glibc-217 build in `/opt/node/current`; `deploy.sh` puts it first in `PATH`.
- The legacy app's build (`static/dist/`) is committed; rebuild it locally with `grunt` when changing it.
