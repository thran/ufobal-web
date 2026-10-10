# Ufo-IS frontend

React SPA for [ufobal-web](../ufobal-web) (Django backend).

## Dev

1. Run Django on :8000 (see backend README).
2. `npm install`
3. `npm run dev` → http://localhost:5173 (proxies API, auth, admin, `/old/` to Django)

Social login (Google/Facebook) does not work in dev unless `http://localhost:5173/complete/<backend>/` is a registered OAuth redirect URI.

## Scripts

- `npm test` — Vitest
- `npm run typecheck`, `npm run lint`, `npm run format`
- `npm run build` — production build with base `/static/spa/`
- `scripts/build-to-backend.sh [backend-dir]` — build and copy into the Django repo
