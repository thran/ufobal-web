# UfoIS React Frontend — Design

Date: 2026-10-10

## Goal

Replace the AngularJS 1.8 + Foundation 5 frontend of `~/projects/ufobal-web` with a modern
React frontend, keeping all current functionality and a similar (not 1:1) look.
The Django backend stays; only small changes are allowed. The old frontend stays
functional under `/old/` until it is retired.

The abandoned Angular 16 rewrite in this repo is removed (kept in git history as reference).

## Decisions

| Topic | Decision |
|---|---|
| Framework | React 19 + Vite + TypeScript (strict) |
| Router | React Router v7, SPA mode |
| Data | TanStack Query + pure linking/stat functions |
| Tables | TanStack Table |
| Styling | Tailwind v4 themed to approximate Foundation 5, Headless UI for dialogs/menus |
| Misc libs | sonner (toasts), date-fns, small star-rating component |
| Language | Czech, hardcoded, no i18n library |
| URLs | English; old Czech URLs redirect client-side |
| managestats | Stays in Django, linked from top bar |
| Location | This repo; Django serves the build |
| Rollout | Big bang after full parity; old frontend kept under `/old/` |
| Tests | Vitest (+ Testing Library) for logic/components, Playwright smoke |
| Backend changes | Branch `new-frontend` in `~/projects/ufobal-web` |

## 1. Structure

```
src/
  api/         client.ts, endpoints.ts, types.ts (DTOs)
  queries/     TanStack Query hooks per entity + mutations
  domain/      link.ts, stats.ts, groups.ts, matchReducer.ts, timer.ts (pure, tested)
  components/  Layout, TopBar, DataTable, Modal, Spinner, StarRating, ErrorBox, ...
  pages/       one folder per page
  auth/        useUser, LoginDropdown, RequireAuth, permission helpers
  router.tsx   routes + legacy Czech redirects
```

## 2. Routes

| New | Old (redirects to new) | Access |
|---|---|---|
| `/` | `/` | public |
| `/privacy-policy` | `/privacy_policy` | public |
| `/faq` | `/faq` | public |
| `/intro` | `/intro` | public |
| `/hall-of-records` | `/sin_slavy` | public |
| `/pair-account/:token?` | `/sparovat_ucet/:token?` | logged in |
| `/players` | `/hraci` | public |
| `/players/:id/:slug?` | `/hrac/:id/:hrac` | public (edit: staff or own player) |
| `/teams` | `/tymy` | public |
| `/teams/:id/:slug?` | `/tym/:id/:tym` | public |
| `/tournaments` | `/turnaje` | public |
| `/tournaments/:id/results/:teamId?` | `/turnaj/:id/:turnaj/:team?` | public |
| `/tournaments/:id/record` | `/turnaj/:id` | authorized |
| `/tournaments/:id/live` | `/turnaj-zive/:id` | public |
| `/tournaments/:id/groups` | `/skupiny/:id` | public |
| `/tournaments/:id/register` | `/turnaj/prihlasovani/:id` | authorized |
| `/tournaments/:id/teams/:totId` | `/turnaj/:tid/tym/:id` | authorized |
| `/tournaments/:id/matches/:matchId` | `/turnaj/zapas/:tid/:id` | public |
| `/tournaments/:id/matches/:matchId/edit` | `/turnaj/zapas/:tid/:id/edit` | authorized |
| `/tournaments/:id/referee-feedback` | `/hodnoceni_rozhodcich/:id` | authorized |
| `/stats/players` | `/statistiky` | public |
| `/stats/goalies` | `/brankari` | public |

- `/turnaj/:id` (one segment) → record hub; `/turnaj/:id/:name[/:team]` → results.
- `/managestats/`, `/admin/`, social-auth URLs remain Django pages.
- Unknown routes → 404 page.

## 3. Backend integration (branch `new-frontend`)

### 3.1 Old frontend under `/old/`
- Move the root API mount (namespace `api`) from `''` to `old/api/`. The old JS calls
  the API only via `djangoUrl.reverse("api:...")`, so it follows automatically.
- Add `re_path(r'^old/', home_old)` rendering the old `index.html` with `<base href="/old/">`.
- Make hardcoded absolute links in `ng-parts` templates and JS (`href="/tym/..."`,
  `$window.location.href = "/"`, etc.) relative to `<base>`; rebuild `static/dist` with Grunt.
- Old social login (`/close_login_popup/` → `opener.social_auth_callback`) stays unchanged.

### 3.2 New frontend at root
- `home` catch-all renders `templates/spa.html` (Vite's built `index.html`), injecting
  `window.__INITIAL__ = {user, liveTournamentPk, googleAnalytics}`; keeps `@ensure_csrf_cookie`.
- API only under `/api_frontend/`.
- Remove Django `/intro` view (React page replaces it).
- Build: Vite `base: '/static/spa/'`; deploy copies `dist/assets` into Django static
  (`static/spa/`) and `dist/index.html` to `templates/spa.html`. Deploy script updated.
- `close_login_popup_new.html` (`/login/close_login_popup`) posts `postMessage` to the opener.

### 3.3 Dev
- Vite dev server on :5173 proxies `/api_frontend`, `/login`, `/complete`, `/logout`,
  `/disconnect`, `/managestats`, `/admin`, `/static`, `/media`, `/old` to Django on :8000.
- In dev, `__INITIAL__` is absent; the user is loaded from `user_profile`.

## 4. Data layer

### 4.1 API client
- `api<T>(path, opts)` fetches `/api_frontend/<path>` with `credentials: 'same-origin'`,
  `X-CSRFToken` from the `csrftoken` cookie, JSON body.
- Non-2xx → `ApiError {status, error, errorType}`; handles JSON `{error, error_type}` and plain text.
- `endpoints.ts`: one typed function per used endpoint (reads, writes, auth).

### 4.2 Queries
- One hook per resource; keys like `['players']`, `['teams']`, `['tournaments']`,
  `['teamontournaments']`, `['matches', tournamentId]`, `['groups', id]`, `['stats']`,
  `['hallOfGlory']`, `['goals']`, `['pairs', tournamentId]`, `['user']`.
- Default `staleTime` 5 min for big lists; polling via `refetchInterval: 15_000` on live views.
- `['user']` uses `__INITIAL__.user` as initial data.

### 4.3 Linking & stats
- DTOs reference others by id. Pure functions in `domain/link.ts` build linked view
  models (tournament → teams → players, match → teams/events, player → teams/tournaments),
  memoized per page with `useMemo`.
- Stats from the old `dataService`/controllers (canada points, goalie stats,
  `getScoreWithoutTeam`, team names, group standings) live in `domain/stats.ts`
  and `domain/groups.ts`.

### 4.4 Mutations
- One `useMutation` per write endpoint. On success, invalidate affected queries
  (backend already clears list caches on save via `reset_cache` signal); optionally
  patch cache with `setQueryData` for instant feedback.

## 5. Auth
- `useUser()` → `{first_name, last_name, is_staff, is_authorized, player}`.
- Helpers: `isStaff(user)`, `canRecord(user)` (= `is_authorized`), `isOwnPlayer(user, player)`.
- Top-bar dropdown: login / signup form (JSON POST to `login` / `signup`), logout,
  Google / Facebook buttons.
- Social login: popup to `/login/<backend>/?next=/login/close_login_popup`; popup
  posts a message; opener refetches `['user']`.
- `<RequireAuth level="login|authorized|staff">` wraps protected routes and shows a
  "please log in" message otherwise.
- Any 401 → toast + refetch user.

## 6. Pages

### 6.1 Public
Home (global stats, live tournament link, PDF guide), FAQ, Intro (FAQ + "I read it"
checkbox), Privacy, Players list/detail, Teams list (sorted by medals)/detail,
Tournaments list, Tournament results (tabs: teams, scorers, goalies, pairs; optional
selected team), Groups/standings, Hall of records, Player stats (tournament filter),
Goalie stats.

All tables use a shared `<DataTable>`: sorting, global search, pagination, rank
column, filter state persisted to `localStorage`.

### 6.2 Authorized
- Player detail extras (staff or own player): profile edit, attendance add/remove, pairing request.
- Pair account by token.
- Tournament record hub: match list, "add match" dialog (allowed if tournament open or
  staff); if `closed_edit` and not staff → redirect to results.
- Live view: hub data with 15 s polling.
- Registration (when `registration_open`): register existing team or create new team.
- Roster: add/remove players, set captain, set default goalie.
- Referee feedback: star rating per referee + text, save.

### 6.3 Match page
- View mode: match detail; "refresh" checkbox enables 15 s polling.
- Edit mode:
  - State in `matchReducer` (pure): events (goal, shot, penalty/card, goalieChange,
    halftime, end) each with `saved`, referee, halftime, side swap, score.
  - `useMatchTimer`: per-halftime countdown from tournament `halftime_length`,
    based on `Date.now()` deltas.
  - Penalty countdowns: red card 2 min, yellow 1 min, and the "2nd card" rule
    (as in `penaltyTimerFilter`).
  - Every 5 s save time, unsaved events and changed match to `localStorage` keys
    `ufo:match:<pk>:*`; on load restore and merge with server events, dedupe by `type+pk`.
  - Every 15 s: `ping`, then send unsaved events (`add_*`/`edit_*`, `change_goalie`);
    increment score when a new goal is confirmed.
  - Actions: start/end match, next halftime (confirm dialog), change referee,
    edit/delete event (`remove_*`), switch sides, show/hide shots.
  - Blue/red team colors; mobile-first layout.

### 6.4 Shell
- Top bar like Foundation's: logo, nav, live tournament link, "Admin" (staff →
  `/managestats/`), login dropdown; hamburger on mobile.
- Feedback link hidden on the match page.
- Google Analytics only when `__INITIAL__.googleAnalytics`.

## 7. Error handling
- Query errors: inline `<ErrorBox>` with retry.
- Mutation errors: toast with server message.
- Route-level error boundary; 404 page.

## 8. Testing
- Vitest: `domain/*` (linking, stats, groups, matchReducer, timer math, localStorage
  merge), `api/client` (CSRF, error parsing).
- Testing Library: `DataTable`, `RequireAuth`, match page interactions.
- Playwright smoke against local Django (test DB): public pages render, Czech
  redirects, login → record a goal → visible in results, `/old/` loads.
- Scripts: `test`, `e2e`, `lint`, `typecheck`. No CI.

## 9. Delivery order
1. Backend branch `new-frontend`: old frontend under `/old/`, `spa.html` serving, popup `postMessage`.
2. Frontend scaffold: Vite, Tailwind theme, router + redirects, API client, Query, shell, auth.
3. Read-only pages + `DataTable`.
4. Authorized pages: hub, registration, roster, player edit, pairing, referee feedback.
5. Match page (view + edit).
6. Playwright smoke, deploy script update, switch.

## Out of scope
- managestats rewrite, i18n, CI, backend API redesign.
