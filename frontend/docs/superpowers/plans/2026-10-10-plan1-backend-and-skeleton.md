# Plan 1 — Backend Branch + Frontend Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Old AngularJS frontend works under `/old/`, Django serves a new React SPA at `/`, and the SPA has its complete shell: routing (with Czech→English redirects), API client, TanStack Query, auth (login/signup/logout/social), top bar, error handling, and `RequireAuth`. Pages are placeholders (filled in by plans 2–5).

**Architecture:** Two repos. Backend `~/projects/ufobal-web` (Django) on new branch `new-frontend`. Frontend `~/projects/ufobal-web-frontend` (this repo) on new branch `react-rewrite`: Vite + React 19 + TS SPA. Django renders the Vite-built `index.html` as template `spa.html` and injects initial data as a JSON `<script>`.

**Tech Stack:** React 19, Vite 7, TypeScript 5 (strict), React Router 7, TanStack Query 5, Tailwind CSS 4, Headless UI 2, sonner, Vitest 3 + Testing Library + jsdom, ESLint 9, Prettier. Backend: Django 4.2, pytest-django.

**Spec:** `docs/superpowers/specs/2026-10-10-react-frontend-design.md`

## Global Constraints

- UI text is Czech, hardcoded. Code, comments, identifiers are English.
- Comments only for non-obvious things.
- API calls go only to `/api_frontend/` from the new frontend.
- Old frontend: API namespace `api` mounted at `old/api/`; pages under `/old/`.
- New frontend served at root by Django catch-all `home` rendering `templates/spa.html`.
- Vite build `base` is `/static/spa/`; dev server runs at `/` on port 5173.
- `localStorage` keys of the new frontend are prefixed `ufo:`.
- Backend Python: `~/miniconda3/envs/ufobal_web/bin/python` (Django 4.2, Python 3.10). Backend tests: `cd ~/projects/ufobal-web && ~/miniconda3/envs/ufobal_web/bin/python -m pytest -q`.
- Backend test baseline on master: **4 failed, 1 passed** (`test_get_players`, `test_get_tournaments`, `test_get_teams_on_tournaments`, `test_get_matches` already fail). Do not make the count worse; new tests must pass.
- Built frontend files in the backend (`static/spa/`, `templates/spa.html`) are **gitignored** on the branch for now; plan 5 decides how they are deployed.
- Google Analytics is dropped (user decision); do not port it.
- Ask the user before any commit outside the steps listed in this plan, and before pushing anything.

## Review Focus

1. **Empty DB / no tournament** — `home` and `home_old` must not crash when no tournament exists (currently `[0]` raises IndexError). Tests in Tasks 2 and 4.
2. **Initial-data placeholder in dev** — Vite dev serves `index.html` with the raw `{{ initial_json|safe }}` text; the app must treat it as "no initial data" and fetch `user_profile`. Tests in Tasks 6 and 7.
3. **Anonymous user** — `user_profile` returns JSON `null`; `logout` returns text `ok` with 202. The client must not throw on either. Test in Task 6.
4. **Legacy URLs with Czech slugs** (spaces/diacritics, e.g. `/hrac/12/Pepa%20Nov%C3%A1k`) must redirect with the slug preserved and correctly encoded; ambiguous `/turnaj/...` shapes must pick the right target. Test in Task 8.
5. **Injected JSON containing `</script>`** (e.g. a player nickname) must not break the page. Test in Task 4.

---

## Backend (`~/projects/ufobal-web`)

### Task 1: Create backend branch

**Files:** none

- [ ] **Step 1: Check working tree**

Run: `cd ~/projects/ufobal-web && git status --short`

At plan time the tree had uncommitted changes: `static/dist/managestats.min.js`, `static/dist/ufobalapp.min.js`, `ufobalapp/static/ufobalapp/ng-parts/team.html` (the last one adds a stray `3` after `</div>`, likely accidental).

**STOP and ask the user** what to do with them (stash / commit on master / discard / carry into branch). Do not decide yourself.

- [ ] **Step 2: Create branch**

```bash
cd ~/projects/ufobal-web && git checkout -b new-frontend
```

- [ ] **Step 3: Gitignore future build output**

Append to `~/projects/ufobal-web/.gitignore`:

```
# new React frontend build output (copied from ufobal-web-frontend)
/static/spa/
/templates/spa.html
```

```bash
git add .gitignore && git commit -m "chore: ignore new frontend build output"
```

---

### Task 2: Old frontend under `/old/`

**Files:**
- Modify: `ufobal/urls.py`
- Modify: `ufobalapp/views.py` (`home` → `home_old`, helper `_live_tournament_pk`)
- Modify: `templates/index.html`
- Create: `ufobalapp/tests/test_frontend_serving.py`

**Interfaces:**
- Produces: URL namespace `api` at `/old/api/…`, view `views.home_old`, helper `views._live_tournament_pk() -> int | None`, URL name `home_old`.

- [ ] **Step 1: Write the failing tests**

`ufobalapp/tests/test_frontend_serving.py`:

```python
import pytest
from django.urls import reverse


def test_old_api_mounted_under_old_prefix():
    assert reverse('api:get_players') == '/old/api/players'
    assert reverse('api_frontend:get_players') == '/api_frontend/players'


@pytest.mark.django_db
def test_old_frontend_served_under_old(client):
    response = client.get('/old/hraci')
    assert response.status_code == 200
    assert b'<base href="/old/">' in response.content
    assert b'ng-app="ufoIS"' in response.content


@pytest.mark.django_db
def test_old_frontend_root(client):
    response = client.get('/old/')
    assert response.status_code == 200
    assert b'<base href="/old/">' in response.content


@pytest.mark.django_db
def test_unknown_api_frontend_endpoint_is_404(client):
    assert client.get('/api_frontend/does_not_exist').status_code == 404
```

- [ ] **Step 2: Run to verify they fail**

Run: `cd ~/projects/ufobal-web && ~/miniconda3/envs/ufobal_web/bin/python -m pytest -q ufobalapp/tests/test_frontend_serving.py`
Expected: FAIL (`/players` != `/old/api/players`; `/old/hraci` has `<base href="/">`; no-tournament IndexError possible).

- [ ] **Step 3: Implement**

In `ufobalapp/views.py` replace the `home` view (around line 1061) with:

```python
def _live_tournament_pk():
    tournament = (
        Tournament.objects.exclude(category__in=[Tournament.TRENING, Tournament.LIGA]).order_by("-date").first()
    )
    return tournament.pk if tournament else None


@ensure_csrf_cookie
def home_old(request):
    from ufobalapp.views_auth import get_user_data

    return render(
        request,
        "index.html",
        {
            "GOOGLE_ANALYTICS": settings.ON_SERVER and not settings.DEBUG,
            "DEBUG": settings.DEBUG,
            "TEST": settings.TEST,
            "user": json.dumps(get_user_data(request)),
            "live_tournament_pk": _live_tournament_pk(),
        },
    )
```

(`home` is re-added in Task 3. Until then the root catch-all points at `home_old`.)

In `ufobal/urls.py` replace the `urlpatterns = …` block with:

```python
urlpatterns = static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT) + [
    path('admin/', admin.site.urls),
    path('', include('social_django.urls', namespace='social')),
    path('close_login_popup/', TemplateView.as_view(template_name="close_login_popup.html"), name='login_popup_close'),
    path('login/close_login_popup', views_auth.close_login_popup, name='login_popup_close_new'),
    path('old/api/', include('ufobalapp.urls', namespace='api')),
    path('api_frontend/', include('ufobalapp.urls', namespace='api_frontend')),
    path('managestats/', include('managestats.urls', namespace='managestats')),
    path('intro', ufobalapp.views.intro, name='intro'),
    re_path(r'^api_frontend/', views.not_found, name='api_frontend_not_found'),
    re_path(r'^old/', views.home_old, name='home_old'),
    re_path(r'.*', views.home_old, name='home'),
]
```

In `templates/index.html`:
- `<base href="/">` → `<base href="/old/">`
- top bar: `href="/"` → `href="./"`, `href="/turnaje"` → `href="turnaje"`, `/tymy` → `tymy`, `/hraci` → `hraci`, `/statistiky` → `statistiky`, `/brankari` → `brankari`, `/sin_slavy` → `sin_slavy`, `href="/turnaj/{{ live_tournament_pk }}"` → `href="turnaj/{{ live_tournament_pk }}"`
- footer `href="/privacy_policy"` → `href="privacy_policy"`

- [ ] **Step 4: Run tests**

Run: `~/miniconda3/envs/ufobal_web/bin/python -m pytest -q`
Expected: new tests PASS; overall 4 failed (baseline ones only).

- [ ] **Step 5: Commit**

```bash
git add ufobal/urls.py ufobalapp/views.py templates/index.html ufobalapp/tests/test_frontend_serving.py
git commit -m "feat: serve old frontend and its API under /old/"
```

---

### Task 3: Relative links in old frontend + Grunt rebuild

**Files:**
- Modify: `ufobalapp/static/ufobalapp/ng-parts/*.html` (12 files with absolute links: groups, auth, tournament_live, pair_account, teams, team, tournament_team, tournament, home, player, tournaments, tournament_main)
- Modify: `ufobalapp/static/ufobalapp/js/app.js:154`
- Modify: `static/dist/*` (Grunt output, committed)

- [ ] **Step 1: List all absolute links**

```bash
cd ~/projects/ufobal-web/ufobalapp/static/ufobalapp
grep -rn 'href="/\|ng-href="/\|src="static/' ng-parts
grep -n 'location.href\|\.path("/' js/*.js
```

- [ ] **Step 2: Rewrite links**

Rules:
- `href="/X..."` and `ng-href="/X..."` → drop the leading `/` (`href="tym/{{ … }}"`), so they resolve against `<base href="/old/">`.
- **Keep absolute**: `/managestats/…`, `/static/…`, `/admin/…`, `/login/…`, external `http(s)://`.
- `src="static/google-icon.png"` / `src="static/facebook-icon.png"` → `src="/static/…"` (relative would resolve to `/old/static/`).
- `js/app.js:154` `$window.location.href = "/";` → `$window.location.href = "./";`
- `$location.path("/…")` calls stay as they are (Angular resolves them against `<base>`).

Check again with grep from Step 1 — the only remaining absolute hrefs are the kept ones.

- [ ] **Step 3: Rebuild dist**

```bash
cd ~/projects/ufobal-web && npx grunt
```

Expected: tasks jshint, ngtemplates, concat, uglify, cssmin, copy finish without errors. If `npx grunt` is missing or fails on Node 22, report to the user and stop (do not upgrade Grunt plugins on your own).

- [ ] **Step 4: Manual check**

Run Django: `cd ~/projects/ufobal-web && ~/miniconda3/envs/ufobal_web/bin/python manage.py runserver` (needs MySQL + memcached per README).
Open `http://localhost:8000/old/`, click through top bar links, a tournament, a team, a player; every URL must stay under `/old/`. Login dropdown icons must load.

- [ ] **Step 5: Commit**

```bash
git add ufobalapp/static/ufobalapp static/dist
git commit -m "fix: relative links in old frontend for /old/ prefix"
```

---

### Task 4: Serve new SPA at root + social popup template

**Files:**
- Modify: `ufobalapp/views.py` (add `home`, `_json_for_script`)
- Modify: `ufobal/urls.py` (root → `home`, drop `intro`)
- Create: `templates/close_login_popup_new.html`
- Create (test fixture only, gitignored): `templates/spa.html`
- Modify: `ufobalapp/tests/test_frontend_serving.py`

**Interfaces:**
- Produces: template context var `initial_json` (safe JSON string) rendered into `spa.html`; JSON shape:
  `{"user": User | null, "liveTournamentPk": number | null, "test": boolean}`
- Produces: popup page posts `{type: "ufo-social-login"}` to `window.opener` with target origin = own origin.

- [ ] **Step 1: Write failing tests**

Append to `ufobalapp/tests/test_frontend_serving.py`:

```python
import json
import re
from datetime import datetime

from django.contrib.auth.models import User

from ufobalapp.models import Player, Tournament


SPA_STUB = '<script id="initial-data" type="application/json">{{ initial_json|safe }}</script>'


@pytest.fixture()
def spa_template(settings, tmp_path):
    (tmp_path / 'spa.html').write_text(SPA_STUB)
    settings.TEMPLATES = [
        {**settings.TEMPLATES[0], 'DIRS': [str(tmp_path), *settings.TEMPLATES[0]['DIRS']]},
    ]


def _initial(response):
    match = re.search(rb'<script id="initial-data" type="application/json">(.*)</script>', response.content)
    return json.loads(match.group(1))


@pytest.mark.django_db
def test_spa_served_at_root_without_tournaments(client, spa_template):
    response = client.get('/players')
    assert response.status_code == 200
    assert _initial(response) == {'user': None, 'liveTournamentPk': None, 'test': False}
    assert 'csrftoken' in response.cookies


@pytest.mark.django_db
def test_spa_live_tournament(client, spa_template):
    t = Tournament.objects.create(
        category=Tournament.BRNO, date=datetime(2021, 1, 1), registration_to=datetime(2020, 1, 1),
        name='T', location='L', field_count=1, description='d',
    )
    assert _initial(client.get('/'))['liveTournamentPk'] == t.pk


@pytest.mark.django_db
def test_spa_initial_json_escapes_script_end(client, spa_template):
    user = User.objects.create_user('pepa', password='x')
    Player.objects.create(name='a', lastname='b', nickname='</script><b>x', user=user)
    client.force_login(user)
    response = client.get('/')
    assert b'</script><b>x' not in response.content
    assert _initial(response)['user']['player']['nickname'] == '</script><b>x'


@pytest.mark.django_db
def test_intro_is_spa_route(client, spa_template):
    assert b'id="initial-data"' in client.get('/intro').content


@pytest.mark.django_db
def test_close_login_popup_posts_message(client):
    response = client.get('/login/close_login_popup')
    assert response.status_code == 200
    assert b'ufo-social-login' in response.content
```

Note: if `Player.objects.create` needs more required fields, check `ufobalapp/models.py` `Player` and add them (e.g. `gender`), keeping `nickname` as above.

- [ ] **Step 2: Run to verify they fail**

Run: `~/miniconda3/envs/ufobal_web/bin/python -m pytest -q ufobalapp/tests/test_frontend_serving.py`
Expected: new tests FAIL (root serves old index; popup template missing).

- [ ] **Step 3: Implement**

`ufobalapp/views.py` — add imports at top if missing: `from django.core.serializers.json import DjangoJSONEncoder`, `from django.utils.safestring import mark_safe`. Add after `home_old`:

```python
def _json_for_script(data):
    """JSON safe to embed inside <script type="application/json">."""
    dumped = json.dumps(data, cls=DjangoJSONEncoder)
    return mark_safe(dumped.replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026"))


@ensure_csrf_cookie
def home(request):
    from ufobalapp.views_auth import get_user_data

    initial = {
        "user": get_user_data(request),
        "liveTournamentPk": _live_tournament_pk(),
        "test": settings.TEST,
    }
    return render(request, "spa.html", {"initial_json": _json_for_script(initial)})
```

`ufobal/urls.py`: remove the line `path('intro', ufobalapp.views.intro, name='intro'),` and change the last pattern to `re_path(r'.*', views.home, name='home'),`. Remove the now-unused `import ufobalapp.views` only if nothing else uses it.

`templates/close_login_popup_new.html`:

```html
<!DOCTYPE html>
<html lang="cs">
<head><meta charset="utf-8"><title>Přihlášení</title></head>
<body>
<p>Přihlášení dokončeno, okno můžeš zavřít.</p>
<script>
    if (window.opener) {
        window.opener.postMessage({type: "ufo-social-login"}, window.location.origin);
        window.close();
    }
</script>
</body>
</html>
```

- [ ] **Step 4: Run tests**

Run: `~/miniconda3/envs/ufobal_web/bin/python -m pytest -q`
Expected: all new tests PASS; only the 4 baseline failures remain.

- [ ] **Step 5: Commit**

```bash
git add ufobalapp/views.py ufobal/urls.py templates/close_login_popup_new.html ufobalapp/tests/test_frontend_serving.py
git commit -m "feat: serve new SPA at root with injected initial data"
```

---

## Frontend (`~/projects/ufobal-web-frontend`)

### Task 5: Scaffold Vite + React + TS + Tailwind + Vitest

**Files:**
- Delete: `angular.json`, `tsconfig.app.json`, `tsconfig.spec.json`, `tsconfig.json`, `proxy.conf.json`, `src/`, `dist/`, `node_modules/`, `package.json`, `package-lock.json`
- Create: `package.json`, `index.html`, `vite.config.ts`, `tsconfig.json`, `eslint.config.js`, `.prettierrc`, `.gitignore`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/test/setup.ts`, `src/App.test.tsx`
- Modify: `README.md`

- [ ] **Step 1: Branch and remove Angular**

```bash
cd ~/projects/ufobal-web-frontend
git checkout -b react-rewrite
git rm -r -q angular.json tsconfig.app.json tsconfig.spec.json tsconfig.json proxy.conf.json src package.json package-lock.json
rm -rf node_modules dist .angular
```

- [ ] **Step 2: Create `package.json`**

```json
{
  "name": "ufobal-web-frontend",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "format": "prettier --write src"
  }
}
```

- [ ] **Step 3: Install dependencies**

```bash
npm install react@19 react-dom@19 react-router@7 @tanstack/react-query@5 @headlessui/react@2 sonner
npm install -D vite@7 @vitejs/plugin-react typescript@5 @types/react@19 @types/react-dom@19 @types/node \
  tailwindcss@4 @tailwindcss/vite@4 \
  vitest@3 jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event \
  eslint@9 @eslint/js typescript-eslint eslint-plugin-react-hooks globals prettier
```

- [ ] **Step 4: Config files**

`vite.config.ts`:

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const DJANGO = 'http://127.0.0.1:8000';
const proxied = [
  '/api_frontend',
  '/login',
  '/complete',
  '/disconnect',
  '/logout',
  '/managestats',
  '/admin',
  '/static',
  '/media',
  '/old',
  '/angular',
];

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/static/spa/' : '/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // changeOrigin stays false so Django sees Host localhost:5173 (CSRF origin check, OAuth redirect).
    proxy: Object.fromEntries(proxied.map((p) => [p, { target: DJANGO }])),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
}));
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "noEmit": true,
    "types": ["vite/client", "vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src", "vite.config.ts"]
}
```

`eslint.config.js`:

```js
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: { ...reactHooks.configs.recommended.rules },
  },
);
```

`.prettierrc`:

```json
{ "singleQuote": true, "printWidth": 110 }
```

`.gitignore`:

```
node_modules
dist
coverage
*.local
.vite
```

`index.html`:

```html
<!doctype html>
<html lang="cs">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" href="/static/favicon.ico" />
    <title>Ufo-IS</title>
    <script id="initial-data" type="application/json">{{ initial_json|safe }}</script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/index.css` (Tailwind with a Foundation-5-like theme):

```css
@import 'tailwindcss';

@theme {
  --font-sans: 'Helvetica Neue', Helvetica, Roboto, Arial, sans-serif;
  --color-primary: #008cba;
  --color-primary-dark: #007095;
  --color-secondary: #e7e7e7;
  --color-alert: #f04124;
  --color-success: #43ac6a;
  --color-warning: #f08a24;
  --color-topbar: #333333;
  --color-topbar-hover: #272727;
  --color-medal-gold: gold;
  --color-medal-silver: silver;
  --color-medal-bronze: #e79335;
}

@layer base {
  body {
    @apply bg-white font-sans text-[#222];
  }
  a {
    @apply text-primary hover:text-primary-dark;
  }
  h2,
  h4 {
    @apply text-2xl font-bold text-gray-500;
  }
}

@layer components {
  .btn {
    @apply inline-block cursor-pointer bg-primary px-4 py-3 text-white transition-colors hover:bg-primary-dark disabled:opacity-50;
  }
  .btn-secondary {
    @apply bg-secondary text-[#333] hover:bg-[#b9b9b9];
  }
  .btn-alert {
    @apply bg-alert hover:bg-[#cf2a0e];
  }
  .input {
    @apply block w-full border border-[#ccc] bg-white px-2 py-2 shadow-inner focus:border-[#999] focus:outline-none;
  }
  .callout {
    @apply border border-[#d8d8d8] bg-[#f2f2f2] p-4;
  }
  .callout-alert {
    @apply border-[#de2d0f] bg-alert text-white;
  }
}
```

`src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
  localStorage.clear();
});
```

- [ ] **Step 5: Write the failing smoke test**

`src/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders app name', () => {
  render(<App />);
  expect(screen.getByText('Ufo-IS')).toBeInTheDocument();
});
```

Run: `npm test`
Expected: FAIL — `./App` not found.

- [ ] **Step 6: Minimal app**

`src/App.tsx`:

```tsx
export default function App() {
  return <h1>Ufo-IS</h1>;
}
```

`src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 7: Verify**

Run: `npm test && npm run typecheck && npm run lint && npm run build`
Expected: test PASS, no type/lint errors, `dist/index.html` references `/static/spa/assets/…`.

- [ ] **Step 8: README**

Replace `README.md` with:

````markdown
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
````

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: scaffold React + Vite + Tailwind frontend, remove Angular"
```

---

### Task 6: API client and initial data

**Files:**
- Create: `src/api/client.ts`, `src/api/client.test.ts`
- Create: `src/api/types.ts`
- Create: `src/initialData.ts`, `src/initialData.test.ts`

**Interfaces:**
- Produces:
  - `class ApiError extends Error { status: number; errorType: string | null }`
  - `getCookie(name: string): string | null`
  - `api<T>(path: string, init?: { method?: 'GET' | 'POST' | 'DELETE'; body?: unknown }): Promise<T>` — path is relative to `/api_frontend/`
  - `types.ts`: `interface PlayerSimple { pk; name; lastname; nickname; age: number | null; full_name; gender; is_paired: boolean }`, `interface User { first_name: string; last_name: string; is_staff: boolean; is_authorized: boolean; player: PlayerSimple | null }`
  - `interface InitialData { user: User | null; liveTournamentPk: number | null; test: boolean }`, `readInitialData(doc?: Document): InitialData | null`

- [ ] **Step 1: Failing tests**

`src/api/client.test.ts`:

```ts
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { api, ApiError, getCookie } from './client';

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  document.cookie = 'csrftoken=tok123';
});
afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
  document.cookie = 'csrftoken=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
});

const respond = (status: number, body: string) =>
  fetchMock.mockResolvedValueOnce(new Response(body, { status }));

test('getCookie reads a cookie', () => {
  expect(getCookie('csrftoken')).toBe('tok123');
  expect(getCookie('missing')).toBeNull();
});

test('GET prefixes path and parses JSON, without CSRF header', async () => {
  respond(200, '[{"pk":1}]');
  await expect(api('players')).resolves.toEqual([{ pk: 1 }]);
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe('/api_frontend/players');
  expect(init.method).toBe('GET');
  expect(init.credentials).toBe('same-origin');
  expect(init.headers['X-CSRFToken']).toBeUndefined();
});

test('POST sends JSON body and CSRF token', async () => {
  respond(200, '{"ok":true}');
  await api('login', { method: 'POST', body: { username: 'a' } });
  const [, init] = fetchMock.mock.calls[0];
  expect(init.headers['X-CSRFToken']).toBe('tok123');
  expect(init.headers['Content-Type']).toBe('application/json');
  expect(init.body).toBe('{"username":"a"}');
});

test('JSON null body resolves to null (anonymous user_profile)', async () => {
  respond(200, 'null');
  await expect(api('user_profile')).resolves.toBeNull();
});

test('plain text success body (logout 202 "ok") resolves to text', async () => {
  respond(202, 'ok');
  await expect(api('logout', { method: 'POST' })).resolves.toBe('ok');
});

test('JSON error becomes ApiError with message and type', async () => {
  respond(401, '{"error":"Špatné jméno nebo heslo.","error_type":"password_username_not_match"}');
  const err = await api('login', { method: 'POST', body: {} }).catch((e) => e);
  expect(err).toBeInstanceOf(ApiError);
  expect(err.status).toBe(401);
  expect(err.message).toBe('Špatné jméno nebo heslo.');
  expect(err.errorType).toBe('password_username_not_match');
});

test('plain text error becomes ApiError with text message', async () => {
  respond(400, 'Nejsi v žádném týmu');
  const err = await api('get_referee_feedbacks/1').catch((e) => e);
  expect(err.status).toBe(400);
  expect(err.message).toBe('Nejsi v žádném týmu');
  expect(err.errorType).toBeNull();
});
```

`src/initialData.test.ts`:

```ts
import { expect, test } from 'vitest';
import { readInitialData } from './initialData';

function docWith(content: string | null): Document {
  const doc = document.implementation.createHTMLDocument();
  if (content !== null) {
    const el = doc.createElement('script');
    el.id = 'initial-data';
    el.type = 'application/json';
    el.textContent = content;
    doc.head.appendChild(el);
  }
  return doc;
}

test('reads injected JSON', () => {
  const data = { user: null, liveTournamentPk: 5, test: true };
  expect(readInitialData(docWith(JSON.stringify(data)))).toEqual(data);
});

test('returns null for raw Django placeholder (Vite dev server)', () => {
  expect(readInitialData(docWith('{{ initial_json|safe }}'))).toBeNull();
});

test('returns null when element is missing', () => {
  expect(readInitialData(docWith(null))).toBeNull();
});
```

Run: `npm test` → FAIL (modules missing).

- [ ] **Step 2: Implement**

`src/api/types.ts`:

```ts
export interface PlayerSimple {
  pk: number;
  name: string;
  lastname: string;
  nickname: string;
  age: number | null;
  full_name: string;
  gender: string;
  is_paired: boolean;
}

export interface User {
  first_name: string;
  last_name: string;
  is_staff: boolean;
  is_authorized: boolean;
  player: PlayerSimple | null;
}
```

`src/api/client.ts`:

```ts
export const API_BASE = '/api_frontend/';

export class ApiError extends Error {
  status: number;
  errorType: string | null;

  constructor(status: number, message: string, errorType: string | null = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errorType = errorType;
  }
}

export function getCookie(name: string): string | null {
  for (const part of document.cookie.split('; ')) {
    const eq = part.indexOf('=');
    if (eq > 0 && part.slice(0, eq) === name) {
      const value = decodeURIComponent(part.slice(eq + 1));
      return value || null;
    }
  }
  return null;
}

function parseBody(text: string): unknown {
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function api<T>(
  path: string,
  init: { method?: 'GET' | 'POST' | 'DELETE'; body?: unknown } = {},
): Promise<T> {
  const method = init.method ?? 'GET';
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (method !== 'GET') {
    const token = getCookie('csrftoken');
    if (token) headers['X-CSRFToken'] = token;
  }
  if (init.body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(API_BASE + path, {
    method,
    headers,
    credentials: 'same-origin',
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const body = parseBody(await res.text());

  if (!res.ok) {
    if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
      const errorType = 'error_type' in body && typeof body.error_type === 'string' ? body.error_type : null;
      throw new ApiError(res.status, body.error, errorType);
    }
    throw new ApiError(res.status, typeof body === 'string' && body ? body : res.statusText);
  }
  return body as T;
}
```

`src/initialData.ts`:

```ts
import type { User } from './api/types';

export interface InitialData {
  user: User | null;
  liveTournamentPk: number | null;
  test: boolean;
}

export function readInitialData(doc: Document = document): InitialData | null {
  const text = doc.getElementById('initial-data')?.textContent;
  if (!text) return null;
  try {
    return JSON.parse(text) as InitialData;
  } catch {
    return null;
  }
}
```

- [ ] **Step 3: Verify**

Run: `npm test && npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/api src/initialData.ts src/initialData.test.ts
git commit -m "feat: API client with CSRF and error parsing, initial data reader"
```

---

### Task 7: Query client, auth hooks, permissions

**Files:**
- Create: `src/queryClient.ts`, `src/queryClient.test.ts`
- Create: `src/api/auth.ts`
- Create: `src/auth/user.ts`, `src/auth/user.test.tsx`
- Create: `src/auth/permissions.ts`, `src/auth/permissions.test.ts`
- Create: `src/AppContext.tsx`
- Create: `src/test/utils.tsx`

**Interfaces:**
- Consumes: `api`, `ApiError` (Task 6), `User`, `InitialData`.
- Produces:
  - `createQueryClient(initial: InitialData | null): QueryClient` — sets `['user']` from initial data when present; global error handling (401 → toast + refetch user; mutation errors → toast).
  - `api/auth.ts`: `getUserProfile(): Promise<User | null>`, `login(c: { username: string; password: string }): Promise<User>`, `signup(c: SignupData): Promise<User>`, `logout(): Promise<void>`, `interface SignupData { username; email; password; password_check; first_name?; last_name? }`
  - `auth/user.ts`: `userQueryKey = ['user']`, `useUser(): UseQueryResult<User | null>`, `useLogin()`, `useSignup()`, `useLogout()`, `openSocialLogin(provider: 'google-oauth2' | 'facebook'): void`, `useSocialLoginListener(): void`, `SOCIAL_LOGIN_MESSAGE = 'ufo-social-login'`
  - `auth/permissions.ts`: `isLoggedIn(u)`, `isStaff(u)`, `canRecord(u)`, `isOwnPlayer(u, playerPk: number)` — all take `User | null | undefined`, return boolean.
  - `AppContext.tsx`: `AppConfigProvider`, `useAppConfig(): { liveTournamentPk: number | null; test: boolean }`
  - `test/utils.tsx`: `renderWithProviders(ui, opts?: { user?: User | null; route?: string; config?: Partial<AppConfig> })` returning RTL result + `queryClient`.

- [ ] **Step 1: Failing tests**

`src/auth/permissions.test.ts`:

```ts
import { expect, test } from 'vitest';
import type { User } from '../api/types';
import { canRecord, isLoggedIn, isOwnPlayer, isStaff } from './permissions';

const base: User = { first_name: 'A', last_name: 'B', is_staff: false, is_authorized: false, player: null };
const player = { pk: 7, name: 'a', lastname: 'b', nickname: 'c', age: 20, full_name: 'a b', gender: 'man', is_paired: true };

test('anonymous', () => {
  expect(isLoggedIn(null)).toBe(false);
  expect(isStaff(null)).toBe(false);
  expect(canRecord(undefined)).toBe(false);
  expect(isOwnPlayer(null, 7)).toBe(false);
});

test('logged in user without player', () => {
  expect(isLoggedIn(base)).toBe(true);
  expect(canRecord(base)).toBe(false);
  expect(isOwnPlayer(base, 7)).toBe(false);
});

test('authorized user with player', () => {
  const u = { ...base, is_authorized: true, player };
  expect(canRecord(u)).toBe(true);
  expect(isOwnPlayer(u, 7)).toBe(true);
  expect(isOwnPlayer(u, 8)).toBe(false);
});

test('staff', () => {
  expect(isStaff({ ...base, is_staff: true })).toBe(true);
});
```

`src/queryClient.test.ts`:

```ts
import { expect, test, vi } from 'vitest';
import { toast } from 'sonner';
import { ApiError } from './api/client';
import { createQueryClient } from './queryClient';

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

const user = { first_name: 'A', last_name: 'B', is_staff: false, is_authorized: true, player: null };

test('seeds user from initial data, including anonymous null', () => {
  expect(createQueryClient({ user, liveTournamentPk: 1, test: false }).getQueryData(['user'])).toEqual(user);
  expect(createQueryClient({ user: null, liveTournamentPk: 1, test: false }).getQueryData(['user'])).toBeNull();
  expect(createQueryClient(null).getQueryData(['user'])).toBeUndefined();
});

test('401 from a query shows toast and invalidates user', async () => {
  const qc = createQueryClient(null);
  const spy = vi.spyOn(qc, 'invalidateQueries');
  await qc
    .fetchQuery({ queryKey: ['x'], queryFn: () => Promise.reject(new ApiError(401, 'Unauthorized')), retry: false })
    .catch(() => {});
  expect(toast.error).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({ queryKey: ['user'] });
});

test('mutation error shows server message', async () => {
  const qc = createQueryClient(null);
  await qc
    .getMutationCache()
    .build(qc, { mutationFn: () => Promise.reject(new ApiError(400, 'Hesla se liší.')) })
    .execute(undefined)
    .catch(() => {});
  expect(toast.error).toHaveBeenCalledWith('Hesla se liší.');
});
```

`src/auth/user.test.tsx`:

```tsx
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createQueryClient } from '../queryClient';
import { SOCIAL_LOGIN_MESSAGE, useLogin, useLogout, useSocialLoginListener, useUser } from './user';

const fetchMock = vi.fn();
beforeEach(() => vi.stubGlobal('fetch', fetchMock));
afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

const user = { first_name: 'A', last_name: 'B', is_staff: false, is_authorized: true, player: null };

function setup(initialUser?: typeof user | null) {
  const qc = createQueryClient(
    initialUser === undefined ? null : { user: initialUser, liveTournamentPk: null, test: false },
  );
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  return { qc, wrapper };
}

test('useUser fetches user_profile when no initial data', async () => {
  fetchMock.mockResolvedValueOnce(new Response('null', { status: 200 }));
  const { wrapper } = setup();
  const { result } = renderHook(() => useUser(), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toBeNull();
  expect(fetchMock.mock.calls[0][0]).toBe('/api_frontend/user_profile');
});

test('useUser uses initial data without fetching', () => {
  const { wrapper } = setup(user);
  const { result } = renderHook(() => useUser(), { wrapper });
  expect(result.current.data).toEqual(user);
  expect(fetchMock).not.toHaveBeenCalled();
});

test('login stores returned user', async () => {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(user), { status: 200 }));
  const { qc, wrapper } = setup(null);
  const { result } = renderHook(() => useLogin(), { wrapper });
  await act(() => result.current.mutateAsync({ username: 'a', password: 'b' }));
  expect(qc.getQueryData(['user'])).toEqual(user);
});

test('logout clears user', async () => {
  fetchMock.mockResolvedValueOnce(new Response('ok', { status: 202 }));
  const { qc, wrapper } = setup(user);
  const { result } = renderHook(() => useLogout(), { wrapper });
  await act(() => result.current.mutateAsync());
  expect(qc.getQueryData(['user'])).toBeNull();
});

test('social login message from same origin refetches user; other origins ignored', async () => {
  const { qc, wrapper } = setup(null);
  const spy = vi.spyOn(qc, 'invalidateQueries');
  renderHook(() => useSocialLoginListener(), { wrapper });
  window.dispatchEvent(new MessageEvent('message', { data: { type: SOCIAL_LOGIN_MESSAGE }, origin: 'https://evil.example' }));
  expect(spy).not.toHaveBeenCalled();
  window.dispatchEvent(new MessageEvent('message', { data: { type: SOCIAL_LOGIN_MESSAGE }, origin: window.location.origin }));
  expect(spy).toHaveBeenCalled();
});
```

Run: `npm test` → FAIL.

- [ ] **Step 2: Implement**

`src/auth/permissions.ts`:

```ts
import type { User } from '../api/types';

type MaybeUser = User | null | undefined;

export const isLoggedIn = (u: MaybeUser): boolean => !!u;
export const isStaff = (u: MaybeUser): boolean => !!u?.is_staff;
export const canRecord = (u: MaybeUser): boolean => !!u?.is_authorized;
export const isOwnPlayer = (u: MaybeUser, playerPk: number): boolean => u?.player?.pk === playerPk;
```

`src/api/auth.ts`:

```ts
import { api } from './client';
import type { User } from './types';

export interface SignupData {
  username: string;
  email: string;
  password: string;
  password_check: string;
  first_name?: string;
  last_name?: string;
}

export const getUserProfile = () => api<User | null>('user_profile');
export const login = (c: { username: string; password: string }) => api<User>('login', { method: 'POST', body: c });
export const signup = (c: SignupData) => api<User>('signup', { method: 'POST', body: c });
export const logout = async (): Promise<void> => {
  await api<string>('logout', { method: 'POST' });
};
```

`src/queryClient.ts`:

```ts
import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from './api/client';
import type { InitialData } from './initialData';

export function createQueryClient(initial: InitialData | null): QueryClient {
  const handleUnauthorized = (error: unknown) => {
    // 401 with error_type (e.g. wrong password) falls through to the server message toast.
    if (error instanceof ApiError && error.status === 401 && !error.errorType) {
      toast.error('Nejsi přihlášen nebo nemáš oprávnění.');
      void queryClient.invalidateQueries({ queryKey: ['user'] });
      return true;
    }
    return false;
  };

  const queryClient: QueryClient = new QueryClient({
    queryCache: new QueryCache({ onError: handleUnauthorized }),
    mutationCache: new MutationCache({
      onError: (error) => {
        if (handleUnauthorized(error)) return;
        toast.error(error instanceof Error ? error.message : 'Něco se pokazilo.');
      },
    }),
    defaultOptions: {
      queries: { staleTime: 5 * 60_000, refetchOnWindowFocus: false, retry: 1 },
    },
  });

  if (initial) queryClient.setQueryData(['user'], initial.user);
  return queryClient;
}
```

Also add this test to `src/queryClient.test.ts`:

```ts
test('401 with error_type (wrong password) shows server message', async () => {
  const qc = createQueryClient(null);
  await qc
    .getMutationCache()
    .build(qc, { mutationFn: () => Promise.reject(new ApiError(401, 'Špatné jméno nebo heslo.', 'password_username_not_match')) })
    .execute(undefined)
    .catch(() => {});
  expect(toast.error).toHaveBeenCalledWith('Špatné jméno nebo heslo.');
});
```

`src/auth/user.ts`:

```ts
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import * as authApi from '../api/auth';
import type { User } from '../api/types';

export const userQueryKey = ['user'] as const;
export const SOCIAL_LOGIN_MESSAGE = 'ufo-social-login';

export function useUser() {
  return useQuery({ queryKey: userQueryKey, queryFn: authApi.getUserProfile, staleTime: Infinity });
}

function setUserAndRefreshRest(qc: QueryClient, user: User | null) {
  qc.setQueryData(userQueryKey, user);
  // Responses differ for staff (e.g. birthdate), so everything else is refetched.
  void qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== userQueryKey[0] });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: authApi.login, onSuccess: (user) => setUserAndRefreshRest(qc, user) });
}

export function useSignup() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: authApi.signup, onSuccess: (user) => setUserAndRefreshRest(qc, user) });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: authApi.logout, onSuccess: () => setUserAndRefreshRest(qc, null) });
}

export function openSocialLogin(provider: 'google-oauth2' | 'facebook') {
  window.open(
    `/login/${provider}/?next=/login/close_login_popup`,
    'popup',
    'height=700,width=700,left=100,top=100,resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=yes',
  );
}

export function useSocialLoginListener() {
  const qc = useQueryClient();
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.data?.type !== SOCIAL_LOGIN_MESSAGE) return;
      void qc.invalidateQueries();
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [qc]);
}
```

`src/AppContext.tsx`:

```tsx
import { createContext, useContext, type ReactNode } from 'react';

export interface AppConfig {
  liveTournamentPk: number | null;
  test: boolean;
}

const AppConfigContext = createContext<AppConfig>({ liveTournamentPk: null, test: false });

export function AppConfigProvider({ value, children }: { value: AppConfig; children: ReactNode }) {
  return <AppConfigContext.Provider value={value}>{children}</AppConfigContext.Provider>;
}

export const useAppConfig = () => useContext(AppConfigContext);
```

`src/test/utils.tsx`:

```tsx
import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router';
import type { User } from '../api/types';
import { AppConfigProvider, type AppConfig } from '../AppContext';
import { createQueryClient } from '../queryClient';

export function renderWithProviders(
  ui: ReactElement,
  opts: { user?: User | null; route?: string; config?: Partial<AppConfig> } = {},
) {
  const queryClient = createQueryClient({
    user: opts.user ?? null,
    liveTournamentPk: null,
    test: false,
  });
  const config: AppConfig = { liveTournamentPk: null, test: false, ...opts.config };
  const result = render(
    <QueryClientProvider client={queryClient}>
      <AppConfigProvider value={config}>
        <MemoryRouter initialEntries={[opts.route ?? '/']}>{ui}</MemoryRouter>
      </AppConfigProvider>
    </QueryClientProvider>,
  );
  return { ...result, queryClient };
}

export const testUser = (overrides: Partial<User> = {}): User => ({
  first_name: 'Jan',
  last_name: 'Novák',
  is_staff: false,
  is_authorized: false,
  player: null,
  ...overrides,
});
```

- [ ] **Step 3: Verify**

Run: `npm test && npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src
git commit -m "feat: query client with global error handling, auth hooks, permissions"
```

---

### Task 8: Router with placeholder pages and legacy redirects

**Files:**
- Create: `src/router.tsx`, `src/router.test.tsx`
- Create: `src/routes/legacyRedirects.tsx`
- Create: `src/pages/Placeholder.tsx`
- Create: `src/components/Layout.tsx` (temporary minimal version, completed in Task 9)

**Interfaces:**
- Produces:
  - `routes: RouteObject[]` (exported from `src/router.tsx`) — used by `createBrowserRouter(routes)` in `App` and by tests with `createMemoryRouter`.
  - `legacyRoutes: RouteObject[]` from `src/routes/legacyRedirects.tsx`.
  - `Placeholder({ title }: { title: string })` page component.
  - New paths (exact strings, later plans replace placeholders):
    `/`, `/privacy-policy`, `/faq`, `/intro`, `/hall-of-records`, `/pair-account/:token?`, `/players`, `/players/:id/:slug?`, `/teams`, `/teams/:id/:slug?`, `/tournaments`, `/tournaments/:id/results/:teamId?`, `/tournaments/:id/record`, `/tournaments/:id/live`, `/tournaments/:id/groups`, `/tournaments/:id/register`, `/tournaments/:id/teams/:totId`, `/tournaments/:id/matches/:matchId`, `/tournaments/:id/matches/:matchId/edit`, `/tournaments/:id/referee-feedback`, `/stats/players`, `/stats/goalies`, `*`.

- [ ] **Step 1: Failing tests**

`src/router.test.tsx`:

```tsx
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { expect, test } from 'vitest';
import { AppConfigProvider } from './AppContext';
import { createQueryClient } from './queryClient';
import { routes } from './router';

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const qc = createQueryClient({ user: null, liveTournamentPk: null, test: false });
  render(
    <QueryClientProvider client={qc}>
      <AppConfigProvider value={{ liveTournamentPk: null, test: false }}>
        <RouterProvider router={router} />
      </AppConfigProvider>
    </QueryClientProvider>,
  );
  return router;
}

test.each([
  ['/privacy_policy', '/privacy-policy'],
  ['/sin_slavy', '/hall-of-records'],
  ['/sparovat_ucet', '/pair-account'],
  ['/sparovat_ucet/abc', '/pair-account/abc'],
  ['/hraci', '/players'],
  ['/hrac/12/Pepa%20Nov%C3%A1k', '/players/12/Pepa%20Nov%C3%A1k'],
  ['/tymy', '/teams'],
  ['/tym/3/Ufo%20t%C3%BDm', '/teams/3/Ufo%20t%C3%BDm'],
  ['/turnaje', '/tournaments'],
  ['/turnaj/5', '/tournaments/5/record'],
  ['/turnaj/5/Brno%202024', '/tournaments/5/results'],
  ['/turnaj/5/Brno%202024/9', '/tournaments/5/results/9'],
  ['/turnaj-zive/5', '/tournaments/5/live'],
  ['/turnaj/5/tym/9', '/tournaments/5/teams/9'],
  ['/turnaj/prihlasovani/5', '/tournaments/5/register'],
  ['/turnaj/zapas/5/77', '/tournaments/5/matches/77'],
  ['/turnaj/zapas/5/77/edit', '/tournaments/5/matches/77/edit'],
  ['/skupiny/5', '/tournaments/5/groups'],
  ['/statistiky', '/stats/players'],
  ['/brankari', '/stats/goalies'],
  ['/hodnoceni_rozhodcich/5', '/tournaments/5/referee-feedback'],
])('redirects %s → %s', async (from, to) => {
  const router = renderAt(from);
  await waitFor(() => expect(router.state.location.pathname).toBe(to));
});

test('query string is preserved on redirect', async () => {
  const router = renderAt('/hraci?x=1');
  await waitFor(() => expect(router.state.location.search).toBe('?x=1'));
});

test('unknown route shows 404', async () => {
  renderAt('/nonsense/path');
  expect(await screen.findByText('Stránka nenalezena')).toBeInTheDocument();
});

test('new route renders placeholder', async () => {
  renderAt('/players');
  expect(await screen.findByRole('heading', { name: 'Hráči' })).toBeInTheDocument();
});
```

Run: `npm test src/router.test.tsx` → FAIL.

- [ ] **Step 2: Implement**

`src/pages/Placeholder.tsx`:

```tsx
export default function Placeholder({ title }: { title: string }) {
  return (
    <div>
      <h2>{title}</h2>
      <p className="text-gray-500">Připravujeme.</p>
    </div>
  );
}
```

`src/pages/NotFound.tsx`:

```tsx
import { Link } from 'react-router';

export default function NotFound() {
  return (
    <div className="callout">
      <h2>Stránka nenalezena</h2>
      <Link to="/">Zpět na úvod</Link>
    </div>
  );
}
```

`src/components/Layout.tsx` (temporary; Task 9 replaces it):

```tsx
import { Outlet } from 'react-router';

export default function Layout() {
  return (
    <main className="mx-auto max-w-[62.5rem] px-1 pt-5 pb-30">
      <Outlet />
    </main>
  );
}
```

`src/routes/legacyRedirects.tsx`:

```tsx
import { Navigate, useLocation, useParams, type Params, type RouteObject } from 'react-router';

type Target = (p: Params<string>) => string;

const enc = (v: string | undefined) => encodeURIComponent(v ?? '');

function LegacyRedirect({ to }: { to: Target }) {
  const params = useParams();
  const { search } = useLocation();
  return <Navigate replace to={to(params) + search} />;
}

const LEGACY: [string, Target][] = [
  ['/privacy_policy', () => '/privacy-policy'],
  ['/sin_slavy', () => '/hall-of-records'],
  ['/sparovat_ucet', () => '/pair-account'],
  ['/sparovat_ucet/:token', (p) => `/pair-account/${enc(p.token)}`],
  ['/hraci', () => '/players'],
  ['/hrac/:id/:slug', (p) => `/players/${p.id}/${enc(p.slug)}`],
  ['/tymy', () => '/teams'],
  ['/tym/:id/:slug', (p) => `/teams/${p.id}/${enc(p.slug)}`],
  ['/turnaje', () => '/tournaments'],
  ['/turnaj/:id', (p) => `/tournaments/${p.id}/record`],
  ['/turnaj/:id/:slug', (p) => `/tournaments/${p.id}/results`],
  ['/turnaj/:id/:slug/:teamId', (p) => `/tournaments/${p.id}/results/${p.teamId}`],
  ['/turnaj-zive/:id', (p) => `/tournaments/${p.id}/live`],
  ['/turnaj/:id/tym/:totId', (p) => `/tournaments/${p.id}/teams/${p.totId}`],
  ['/turnaj/prihlasovani/:id', (p) => `/tournaments/${p.id}/register`],
  ['/turnaj/zapas/:id/:matchId', (p) => `/tournaments/${p.id}/matches/${p.matchId}`],
  ['/turnaj/zapas/:id/:matchId/edit', (p) => `/tournaments/${p.id}/matches/${p.matchId}/edit`],
  ['/skupiny/:id', (p) => `/tournaments/${p.id}/groups`],
  ['/statistiky', () => '/stats/players'],
  ['/brankari', () => '/stats/goalies'],
  ['/hodnoceni_rozhodcich/:id', (p) => `/tournaments/${p.id}/referee-feedback`],
];

export const legacyRoutes: RouteObject[] = LEGACY.map(([path, to]) => ({
  path,
  element: <LegacyRedirect to={to} />,
}));
```

`src/router.tsx`:

```tsx
import type { RouteObject } from 'react-router';
import Layout from './components/Layout';
import NotFound from './pages/NotFound';
import Placeholder from './pages/Placeholder';
import { legacyRoutes } from './routes/legacyRedirects';

const page = (path: string, title: string): RouteObject => ({ path, element: <Placeholder title={title} /> });

export const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { index: true, element: <Placeholder title="Ufo-IS" /> },
      page('privacy-policy', 'Privacy policy'),
      page('faq', 'Co a jak?'),
      page('intro', 'Úvod'),
      page('hall-of-records', 'Síň rekordů'),
      page('pair-account/:token?', 'Spárovat účet'),
      page('players', 'Hráči'),
      page('players/:id/:slug?', 'Hráč'),
      page('teams', 'Týmy'),
      page('teams/:id/:slug?', 'Tým'),
      page('tournaments', 'Turnaje'),
      page('tournaments/:id/results/:teamId?', 'Výsledky turnaje'),
      page('tournaments/:id/record', 'Správa turnaje'),
      page('tournaments/:id/live', 'Turnaj živě'),
      page('tournaments/:id/groups', 'Skupiny'),
      page('tournaments/:id/register', 'Přihlášení na turnaj'),
      page('tournaments/:id/teams/:totId', 'Soupiska týmu'),
      page('tournaments/:id/matches/:matchId', 'Zápas'),
      page('tournaments/:id/matches/:matchId/edit', 'Záznam zápasu'),
      page('tournaments/:id/referee-feedback', 'Hodnocení rozhodčích'),
      page('stats/players', 'Statistiky'),
      page('stats/goalies', 'Brankáři'),
      ...legacyRoutes,
      { path: '*', element: <NotFound /> },
    ],
  },
];
```

`src/App.tsx`:

```tsx
import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { AppConfigProvider } from './AppContext';
import { readInitialData, type InitialData } from './initialData';
import { createQueryClient } from './queryClient';
import { routes } from './router';

export default function App({ initial = readInitialData() }: { initial?: InitialData | null }) {
  const [queryClient] = useState(() => createQueryClient(initial));
  const [router] = useState(() => createBrowserRouter(routes));
  return (
    <QueryClientProvider client={queryClient}>
      <AppConfigProvider value={{ liveTournamentPk: initial?.liveTournamentPk ?? null, test: initial?.test ?? false }}>
        <RouterProvider router={router} />
      </AppConfigProvider>
    </QueryClientProvider>
  );
}
```

Update `src/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders home', async () => {
  render(<App initial={{ user: null, liveTournamentPk: null, test: false }} />);
  expect(await screen.findByRole('heading', { name: 'Ufo-IS' })).toBeInTheDocument();
});
```

- [ ] **Step 3: Verify**

Run: `npm test && npm run typecheck && npm run lint`
Expected: PASS (if an ambiguous `/turnaj/...` case resolves wrongly, fix the route order/shape in `LEGACY`, not the test).

- [ ] **Step 4: Commit**

```bash
git add src
git commit -m "feat: router with placeholder pages and legacy Czech URL redirects"
```

---

### Task 9: Shell — top bar, login/signup dialogs, footer

**Files:**
- Modify: `src/components/Layout.tsx`
- Create: `src/components/TopBar.tsx`, `src/components/TopBar.test.tsx`
- Create: `src/components/Modal.tsx`
- Create: `src/auth/LoginDialog.tsx`, `src/auth/SignupDialog.tsx`, `src/auth/LoginDialog.test.tsx`
- Create: `src/auth/UserMenu.tsx`
- Create: `src/components/Footer.tsx`
- Copy: `~/projects/ufobal-web/static/google-icon.png`, `facebook-icon.png` are served by Django at `/static/…` — reference them by URL, do not copy.

**Interfaces:**
- Consumes: `useUser`, `useLogin`, `useSignup`, `useLogout`, `openSocialLogin`, `useSocialLoginListener` (Task 7), `isStaff`, `useAppConfig`.
- Produces: `Modal({ open, onClose, title, children })`, `Layout` (top bar + TEST banner + `<Outlet/>` + footer + `<Toaster/>`), `playerPath(player: { pk: number; nickname: string }): string` in `src/paths.ts` returning `/players/${pk}/${encodeURIComponent(nickname)}`.

- [ ] **Step 1: Failing tests**

`src/components/TopBar.test.tsx`:

```tsx
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { renderWithProviders, testUser } from '../test/utils';
import TopBar from './TopBar';

test('shows main navigation', () => {
  renderWithProviders(<TopBar />);
  for (const name of ['Turnaje', 'Týmy', 'Hráči', 'Statistiky', 'Brankáři', 'Síň rekordů', 'Co a jak?']) {
    expect(screen.getAllByRole('link', { name })[0]).toBeInTheDocument();
  }
  expect(screen.getAllByRole('link', { name: 'Hráči' })[0]).toHaveAttribute('href', '/players');
});

test('live tournament link only when known', () => {
  const { unmount } = renderWithProviders(<TopBar />);
  expect(screen.queryByRole('link', { name: 'Aktuální turnaj' })).not.toBeInTheDocument();
  unmount();
  renderWithProviders(<TopBar />, { config: { liveTournamentPk: 42 } });
  expect(screen.getByRole('link', { name: 'Aktuální turnaj' })).toHaveAttribute('href', '/tournaments/42/record');
});

test('admin link only for staff, as full page link', () => {
  const { unmount } = renderWithProviders(<TopBar />, { user: testUser() });
  expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument();
  unmount();
  renderWithProviders(<TopBar />, { user: testUser({ is_staff: true }) });
  expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/managestats/');
});

test('anonymous user sees login menu', async () => {
  renderWithProviders(<TopBar />);
  await userEvent.click(screen.getByRole('button', { name: 'Přihlášení' }));
  expect(screen.getByRole('menuitem', { name: /Google/ })).toBeInTheDocument();
  expect(screen.getByRole('menuitem', { name: /Facebook/ })).toBeInTheDocument();
  expect(screen.getByRole('menuitem', { name: /jméno/ })).toBeInTheDocument();
  expect(screen.getByRole('menuitem', { name: /registrovat/ })).toBeInTheDocument();
});

test('logged user sees name with nickname and logout', async () => {
  const player = { pk: 7, name: 'Jan', lastname: 'Novák', nickname: 'Honza', age: 20, full_name: 'Jan Novák', gender: 'man', is_paired: true };
  renderWithProviders(<TopBar />, { user: testUser({ player }) });
  await userEvent.click(screen.getByRole('button', { name: /Jan Novák - Honza/ }));
  expect(screen.getByRole('menuitem', { name: 'Profil hráče' })).toBeInTheDocument();
  expect(screen.getByRole('menuitem', { name: 'Odhlásit se' })).toBeInTheDocument();
});
```

`src/auth/LoginDialog.test.tsx`:

```tsx
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { renderWithProviders, testUser } from '../test/utils';
import LoginDialog from './LoginDialog';

const fetchMock = vi.fn();
beforeEach(() => vi.stubGlobal('fetch', fetchMock));
afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

test('submits credentials and closes on success', async () => {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(testUser()), { status: 200 }));
  const onClose = vi.fn();
  const { queryClient } = renderWithProviders(<LoginDialog open onClose={onClose} />);
  await userEvent.type(screen.getByPlaceholderText('jméno'), 'pepa');
  await userEvent.type(screen.getByPlaceholderText('heslo'), 'tajne');
  await userEvent.click(screen.getByRole('button', { name: 'Přihlásit' }));
  await waitFor(() => expect(onClose).toHaveBeenCalled());
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ username: 'pepa', password: 'tajne' });
  expect(queryClient.getQueryData(['user'])).toEqual(testUser());
});

test('stays open on failure', async () => {
  fetchMock.mockResolvedValueOnce(
    new Response('{"error":"Špatné jméno nebo heslo.","error_type":"password_username_not_match"}', { status: 401 }),
  );
  const onClose = vi.fn();
  renderWithProviders(<LoginDialog open onClose={onClose} />);
  await userEvent.type(screen.getByPlaceholderText('jméno'), 'pepa');
  await userEvent.type(screen.getByPlaceholderText('heslo'), 'x');
  await userEvent.click(screen.getByRole('button', { name: 'Přihlásit' }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  expect(onClose).not.toHaveBeenCalled();
});
```

Run: `npm test` → FAIL.

- [ ] **Step 2: Implement**

`src/paths.ts`:

```ts
export const playerPath = (p: { pk: number; nickname: string }) => `/players/${p.pk}/${encodeURIComponent(p.nickname)}`;
```

`src/components/Modal.tsx`:

```tsx
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import type { ReactNode } from 'react';

export default function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/45" aria-hidden="true" />
      <div className="fixed inset-0 flex items-start justify-center overflow-y-auto p-4 pt-[10vh]">
        <DialogPanel className="relative w-full max-w-lg border border-[#666] bg-white p-6 shadow-lg">
          <button type="button" onClick={onClose} aria-label="Zavřít" className="absolute top-2 right-3 text-2xl text-gray-500">
            ×
          </button>
          <DialogTitle className="mb-4 text-xl font-bold">{title}</DialogTitle>
          {children}
        </DialogPanel>
      </div>
    </Dialog>
  );
}
```

`src/auth/LoginDialog.tsx`:

```tsx
import { useState, type FormEvent } from 'react';
import Modal from '../components/Modal';
import { useLogin } from './user';

export default function LoginDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const login = useLogin();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    login.mutate({ username, password }, { onSuccess: onClose });
  };

  return (
    <Modal open={open} onClose={onClose} title="Přihlášení">
      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
        <input className="input" placeholder="jméno" name="username" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />
        <input className="input" placeholder="heslo" name="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button type="submit" className="btn" disabled={login.isPending}>
          Přihlásit
        </button>
      </form>
    </Modal>
  );
}
```

`src/auth/SignupDialog.tsx`:

```tsx
import { useState, type FormEvent } from 'react';
import type { SignupData } from '../api/auth';
import Modal from '../components/Modal';
import { useSignup } from './user';

const EMPTY: SignupData = { username: '', email: '', password: '', password_check: '', first_name: '', last_name: '' };

const FIELDS: { key: keyof SignupData; label: string; type: string; required: boolean }[] = [
  { key: 'username', label: 'Uživatelské jméno', type: 'text', required: true },
  { key: 'email', label: 'Email', type: 'email', required: true },
  { key: 'password', label: 'Heslo', type: 'password', required: true },
  { key: 'password_check', label: 'Kontrola hesla', type: 'password', required: true },
  { key: 'first_name', label: 'Jméno', type: 'text', required: false },
  { key: 'last_name', label: 'Příjmení', type: 'text', required: false },
];

export default function SignupDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [data, setData] = useState<SignupData>(EMPTY);
  const signup = useSignup();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    signup.mutate(data, { onSuccess: onClose });
  };

  return (
    <Modal open={open} onClose={onClose} title="Registrace">
      <form onSubmit={submit} className="flex flex-col gap-3">
        {FIELDS.map((f) => (
          <label key={f.key} className="block text-sm">
            {f.label}
            <input
              className="input mt-1"
              type={f.type}
              required={f.required}
              placeholder={f.required ? undefined : 'nepovinné'}
              value={data[f.key] ?? ''}
              onChange={(e) => setData({ ...data, [f.key]: e.target.value })}
            />
          </label>
        ))}
        <button type="submit" className="btn self-start" disabled={signup.isPending}>
          Registrovat
        </button>
      </form>
    </Modal>
  );
}
```

`src/auth/UserMenu.tsx`:

```tsx
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { playerPath } from '../paths';
import LoginDialog from './LoginDialog';
import SignupDialog from './SignupDialog';
import { openSocialLogin, useLogout, useUser } from './user';

const itemClass = 'flex w-full items-center gap-2 px-4 py-2 text-left text-white data-focus:bg-topbar-hover';

export default function UserMenu() {
  const { data: user } = useUser();
  const logout = useLogout();
  const navigate = useNavigate();
  const [dialog, setDialog] = useState<'login' | 'signup' | null>(null);

  const label = user
    ? `${user.first_name} ${user.last_name}${user.player ? ` - ${user.player.nickname}` : ''}`
    : 'Přihlášení';

  return (
    <>
      <Menu as="div" className="relative">
        <MenuButton className="px-4 py-3 text-white hover:bg-topbar-hover">{label}</MenuButton>
        <MenuItems anchor="bottom end" className="z-40 min-w-48 bg-topbar shadow-lg focus:outline-none">
          {user ? (
            <>
              <MenuItem>
                <button className={itemClass} onClick={() => navigate(user.player ? playerPath(user.player) : '/pair-account')}>
                  Profil hráče
                </button>
              </MenuItem>
              <MenuItem>
                <button className={itemClass} onClick={() => logout.mutate()}>
                  Odhlásit se
                </button>
              </MenuItem>
            </>
          ) : (
            <>
              <MenuItem>
                <button className={itemClass} onClick={() => openSocialLogin('google-oauth2')}>
                  <img src="/static/google-icon.png" width={24} height={24} alt="" /> přes <b>Google</b>
                </button>
              </MenuItem>
              <MenuItem>
                <button className={itemClass} onClick={() => openSocialLogin('facebook')}>
                  <img src="/static/facebook-icon.png" width={24} height={24} alt="" /> přes <b>Facebook</b>
                </button>
              </MenuItem>
              <MenuItem>
                <button className={itemClass} onClick={() => setDialog('login')}>
                  @ přes <b>jméno</b>
                </button>
              </MenuItem>
              <MenuItem>
                <button className={itemClass} onClick={() => setDialog('signup')}>
                  ↑ registrovat
                </button>
              </MenuItem>
            </>
          )}
        </MenuItems>
      </Menu>
      <LoginDialog open={dialog === 'login'} onClose={() => setDialog(null)} />
      <SignupDialog open={dialog === 'signup'} onClose={() => setDialog(null)} />
    </>
  );
}
```

`src/components/TopBar.tsx`:

```tsx
import { useState } from 'react';
import { Link, NavLink } from 'react-router';
import { useAppConfig } from '../AppContext';
import { isStaff } from '../auth/permissions';
import UserMenu from '../auth/UserMenu';
import { useUser } from '../auth/user';

const NAV = [
  { to: '/tournaments', label: 'Turnaje' },
  { to: '/teams', label: 'Týmy' },
  { to: '/players', label: 'Hráči' },
  { to: '/stats/players', label: 'Statistiky' },
  { to: '/stats/goalies', label: 'Brankáři' },
  { to: '/hall-of-records', label: 'Síň rekordů' },
];

const linkClass = 'block px-4 py-3 text-white hover:bg-topbar-hover hover:text-white';

export default function TopBar() {
  const [open, setOpen] = useState(false);
  const { liveTournamentPk } = useAppConfig();
  const { data: user } = useUser();
  const close = () => setOpen(false);

  const nav = [...NAV, ...(liveTournamentPk ? [{ to: `/tournaments/${liveTournamentPk}/record`, label: 'Aktuální turnaj' }] : [])];

  return (
    <nav className="bg-topbar text-sm" aria-label="Hlavní navigace">
      <div className="mx-auto flex max-w-[62.5rem] flex-wrap items-center">
        <Link to="/" onClick={close} className="px-4 py-3 text-lg font-bold tracking-wide text-white uppercase hover:text-white">
          Ufo-IS
        </Link>
        <button
          type="button"
          className="ml-auto px-4 py-3 text-white md:hidden"
          aria-label="Menu"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          ☰ Menu
        </button>
        <div className={`${open ? 'flex' : 'hidden'} w-full flex-col md:flex md:w-auto md:flex-1 md:flex-row md:items-center`}>
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} onClick={close} className={linkClass}>
              {n.label}
            </NavLink>
          ))}
          <div className="flex flex-col md:ml-auto md:flex-row md:items-center">
            <NavLink to="/faq" onClick={close} className={linkClass}>
              Co a jak?
            </NavLink>
            {isStaff(user) && (
              <a href="/managestats/" className={linkClass}>
                Admin
              </a>
            )}
            <UserMenu />
          </div>
        </div>
      </div>
    </nav>
  );
}
```

`src/components/Footer.tsx`:

```tsx
import { Link } from 'react-router';

export default function Footer() {
  return (
    <footer className="absolute bottom-0 w-full border-t border-gray-300 p-2.5 text-center text-sm">
      Vytvořil <a href="mailto:thran@centrum.cz">Thran</a> &amp; Wizy
      <span className="inline-block w-8" />
      <Link to="/privacy-policy">Privacy policy</Link>
    </footer>
  );
}
```

`src/components/Layout.tsx`:

```tsx
import { Outlet } from 'react-router';
import { Toaster } from 'sonner';
import { useAppConfig } from '../AppContext';
import { useSocialLoginListener } from '../auth/user';
import Footer from './Footer';
import TopBar from './TopBar';

export default function Layout() {
  const { test } = useAppConfig();
  useSocialLoginListener();
  return (
    <div className="relative min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-[62.5rem] px-1 pt-5 pb-30">
        {test && (
          <div className="callout callout-alert mb-4 text-center">
            Testovací verze - změny zde se <b>nepromítnou</b> do{' '}
            <a className="text-sky-200" href="https://is.ufobal.cz">
              ostrého systému
            </a>
            .
          </div>
        )}
        <Outlet />
      </main>
      <Footer />
      <Toaster position="top-right" richColors />
    </div>
  );
}
```

- [ ] **Step 3: Verify**

Run: `npm test && npm run typecheck && npm run lint`
Expected: PASS.

Manual: `npm run dev` with Django running; at http://localhost:5173 check top bar at desktop width and at 375 px width (hamburger), login via name works, logout works, the TEST banner is absent unless `TEST=True` (only visible in a Django-served build).

- [ ] **Step 4: Commit**

```bash
git add src
git commit -m "feat: app shell with top bar, login/signup dialogs, footer"
```

---

### Task 10: Error boundary, ErrorBox, Spinner, RequireAuth

**Files:**
- Create: `src/components/Spinner.tsx`
- Create: `src/components/ErrorBox.tsx`, `src/components/ErrorBox.test.tsx`
- Create: `src/components/RouteError.tsx`
- Create: `src/auth/RequireAuth.tsx`, `src/auth/RequireAuth.test.tsx`
- Modify: `src/router.tsx` (add `errorElement`, wrap protected placeholders)

**Interfaces:**
- Consumes: `ApiError`, `useUser`, permissions.
- Produces:
  - `Spinner()` — loading indicator with `role="status"` and text `Načítám…`.
  - `ErrorBox({ error, onRetry? }: { error: unknown; onRetry?: () => void })` — shows `error.message` (or generic text) and a "Zkusit znovu" button when `onRetry` given.
  - `RouteError()` — route `errorElement`.
  - `RequireAuth({ level, children }: { level: 'login' | 'authorized' | 'staff'; children: ReactNode })`.

- [ ] **Step 1: Failing tests**

`src/components/ErrorBox.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { ApiError } from '../api/client';
import ErrorBox from './ErrorBox';

test('shows message and retry', async () => {
  const onRetry = vi.fn();
  render(<ErrorBox error={new ApiError(500, 'Server spadl')} onRetry={onRetry} />);
  expect(screen.getByRole('alert')).toHaveTextContent('Server spadl');
  await userEvent.click(screen.getByRole('button', { name: 'Zkusit znovu' }));
  expect(onRetry).toHaveBeenCalled();
});

test('generic message for unknown error, no retry button', () => {
  render(<ErrorBox error="weird" />);
  expect(screen.getByRole('alert')).toHaveTextContent('Nepodařilo se načíst data.');
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
```

`src/auth/RequireAuth.test.tsx`:

```tsx
import { screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { renderWithProviders, testUser } from '../test/utils';
import RequireAuth from './RequireAuth';

const secret = <p>tajné</p>;

test('login level', () => {
  const { unmount } = renderWithProviders(<RequireAuth level="login">{secret}</RequireAuth>);
  expect(screen.getByRole('alert')).toHaveTextContent('Pro tuto stránku se musíš přihlásit.');
  unmount();
  renderWithProviders(<RequireAuth level="login">{secret}</RequireAuth>, { user: testUser() });
  expect(screen.getByText('tajné')).toBeInTheDocument();
});

test('authorized level: logged but unpaired user gets pairing hint', () => {
  renderWithProviders(<RequireAuth level="authorized">{secret}</RequireAuth>, { user: testUser() });
  expect(screen.getByRole('alert')).toHaveTextContent('spáruj');
  expect(screen.getByRole('link', { name: 'Spárovat účet' })).toHaveAttribute('href', '/pair-account');
});

test('authorized level passes for authorized user', () => {
  renderWithProviders(<RequireAuth level="authorized">{secret}</RequireAuth>, { user: testUser({ is_authorized: true }) });
  expect(screen.getByText('tajné')).toBeInTheDocument();
});

test('staff level', () => {
  const { unmount } = renderWithProviders(<RequireAuth level="staff">{secret}</RequireAuth>, { user: testUser({ is_authorized: true }) });
  expect(screen.getByRole('alert')).toHaveTextContent('jen pro administrátory');
  unmount();
  renderWithProviders(<RequireAuth level="staff">{secret}</RequireAuth>, { user: testUser({ is_staff: true }) });
  expect(screen.getByText('tajné')).toBeInTheDocument();
});
```

Add to `src/router.test.tsx`:

```tsx
test('protected route asks anonymous user to log in', async () => {
  renderAt('/tournaments/5/record');
  expect(await screen.findByRole('alert')).toHaveTextContent('přihlásit');
});
```

Run: `npm test` → FAIL.

- [ ] **Step 2: Implement**

`src/components/Spinner.tsx`:

```tsx
export default function Spinner() {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-8 text-gray-500">
      <span className="size-5 animate-spin rounded-full border-2 border-gray-300 border-t-primary" />
      Načítám…
    </div>
  );
}
```

`src/components/ErrorBox.tsx`:

```tsx
export default function ErrorBox({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof Error && error.message ? error.message : 'Nepodařilo se načíst data.';
  return (
    <div role="alert" className="callout callout-alert my-4 flex items-center justify-between gap-4">
      <span>{message}</span>
      {onRetry && (
        <button type="button" className="btn btn-secondary py-1" onClick={onRetry}>
          Zkusit znovu
        </button>
      )}
    </div>
  );
}
```

`src/components/RouteError.tsx`:

```tsx
import { isRouteErrorResponse, Link, useRouteError } from 'react-router';

export default function RouteError() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Neznámá chyba';
  return (
    <div role="alert" className="callout callout-alert m-4">
      <h2 className="text-white">Něco se pokazilo</h2>
      <p>{message}</p>
      <Link className="text-white underline" to="/">
        Zpět na úvod
      </Link>
    </div>
  );
}
```

`src/auth/RequireAuth.tsx`:

```tsx
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import Spinner from '../components/Spinner';
import { canRecord, isLoggedIn, isStaff } from './permissions';
import { useUser } from './user';

export default function RequireAuth({ level, children }: { level: 'login' | 'authorized' | 'staff'; children: ReactNode }) {
  const { data: user, isPending } = useUser();
  if (isPending) return <Spinner />;

  if (!isLoggedIn(user)) {
    return <div role="alert" className="callout">Pro tuto stránku se musíš přihlásit.</div>;
  }
  if (level === 'authorized' && !canRecord(user)) {
    return (
      <div role="alert" className="callout">
        Nemáš oprávnění. Nejdřív si spáruj účet s hráčem: <Link to="/pair-account">Spárovat účet</Link>
      </div>
    );
  }
  if (level === 'staff' && !isStaff(user)) {
    return <div role="alert" className="callout">Tato stránka je jen pro administrátory.</div>;
  }
  return children;
}
```

`src/router.tsx` — change the helper and the layout route:

```tsx
import RequireAuth from './auth/RequireAuth';
import RouteError from './components/RouteError';

type Level = 'login' | 'authorized' | 'staff';

const page = (path: string, title: string, level?: Level): RouteObject => ({
  path,
  element: level ? (
    <RequireAuth level={level}>
      <Placeholder title={title} />
    </RequireAuth>
  ) : (
    <Placeholder title={title} />
  ),
});
```

Set `errorElement: <RouteError />` on the layout route, and pass levels:
- `pair-account/:token?` → `'login'`
- `tournaments/:id/record`, `tournaments/:id/register`, `tournaments/:id/teams/:totId`, `tournaments/:id/matches/:matchId/edit`, `tournaments/:id/referee-feedback` → `'authorized'`

- [ ] **Step 3: Verify**

Run: `npm test && npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src
git commit -m "feat: error box, route error boundary, spinner, RequireAuth"
```

---

### Task 11: Build into backend + end-to-end check

**Files:**
- Create: `scripts/build-to-backend.sh`

- [ ] **Step 1: Build script**

`scripts/build-to-backend.sh`:

```bash
#!/usr/bin/env bash
# Builds the SPA and copies it into the Django repo (static/spa + templates/spa.html).
set -euo pipefail

cd "$(dirname "$0")/.."
BACKEND="$(cd "${1:-../ufobal-web}" && pwd)"

[ -f "$BACKEND/manage.py" ] || { echo "Not a Django repo: $BACKEND" >&2; exit 1; }

npm run build
rm -rf "$BACKEND/static/spa"
mkdir -p "$BACKEND/static/spa"
cp -r dist/assets "$BACKEND/static/spa/"
cp dist/index.html "$BACKEND/templates/spa.html"
echo "Copied build into $BACKEND"
```

```bash
chmod +x scripts/build-to-backend.sh
```

- [ ] **Step 2: Verify build and Django serving**

```bash
npm test && npm run typecheck && npm run lint
./scripts/build-to-backend.sh ~/projects/ufobal-web
cd ~/projects/ufobal-web && ~/miniconda3/envs/ufobal_web/bin/python manage.py runserver
```

In a browser at http://localhost:8000:
- `/` shows the new shell; DevTools → the `#initial-data` script contains real JSON; no request to `user_profile` on load.
- `/hraci` redirects to `/players`.
- Login via name works; reload keeps you logged in (session); "Admin" appears for staff and opens `/managestats/`.
- `/old/` shows the old AngularJS app and its navigation stays under `/old/`.
- `/api_frontend/players` returns JSON; `/old/api/players` returns JSON.

Report each check's result to the user.

- [ ] **Step 3: Commit**

```bash
cd ~/projects/ufobal-web-frontend
git add scripts
git commit -m "feat: build-to-backend script"
```

---

## Next plans (not part of this plan)

- Plan 2: read-only pages + `DataTable` (+ entity DTOs, linking and stats in `domain/`).
- Plan 3: authorized pages (hub, registration, roster, player edit, pairing, referee feedback).
- Plan 4: match page (view + edit, reducer, timer, localStorage sync).
- Plan 5: Playwright smoke tests, deploy of built files, switch.
