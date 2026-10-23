# Ufo-IS frontend

React SPA for [ufobal-web](..) (Django backend, parent directory).

## Dev

1. Run Django on :8000 (see backend README).
2. `npm install`
3. `npm run dev` → http://localhost:5173 (proxies API, auth, admin, `/old/` to Django). Initial data (user, live tournament) is fetched from Django `/` in dev and injected into `index.html`; if Django is down it is `null`.

Social login (Google/Facebook) does not work in dev unless `http://localhost:5173/complete/<backend>/` is a registered OAuth redirect URI.

## Scripts

- `npm test` — Vitest
- `npm run typecheck`, `npm run lint`, `npm run format`
- `npm run build` — production build with base `/static/spa/`
- `scripts/build-to-backend.sh [backend-dir]` — build and copy into the Django project (`../static/spa`, `../templates/spa.html`)

## E2E

`npm run e2e` (Playwright, system Chrome):

1. `scripts/build-to-backend.sh` builds the SPA into the backend.
2. `e2e/server.sh` creates a fresh sqlite DB in a temp dir, runs `migrate` and `seed_e2e`, and starts `runserver` on http://127.0.0.1:8123.
3. Tests in `e2e/` run against that server (login `e2e`/`e2e`).

Env overrides:

- `UFOBAL_BACKEND` — backend dir (default `..`)
- `UFOBAL_PYTHON` — backend Python (default `~/miniconda3/envs/ufobal_web/bin/python`)

On failure a trace is kept: `npx playwright show-trace test-results/<test-dir>/trace.zip`

## URLs

Routes are defined in `src/router.tsx`. Old Czech URLs are redirected client-side by `src/routes/legacyRedirects.tsx`. The old AngularJS app is served by Django under `/old/`.
