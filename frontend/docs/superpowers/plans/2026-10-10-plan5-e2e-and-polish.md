# Plan 5: E2E smoke tests, browser check, polish

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Playwright smoke tests against a real local Django, then fix the open follow-ups:
- the RequireAuth error state;
- the plan 4 minors;
- the graph memo;
- the managestats links;
- the READMEs.

Finish with a real-browser check of the whole app done by Claude in Chrome.

**Architecture:**
- Playwright's `webServer` runs `e2e/server.sh`, which does three things:
  - migrates a fresh sqlite database (env vars only, no settings file);
  - seeds it with a new backend management command `seed_e2e`;
  - starts Django `runserver`, which serves the built SPA (`scripts/build-to-backend.sh`) plus `/old/` and the API.
- Specs log in through the password API and run against Google Chrome (`channel: 'chrome'`, so no browser download).

**Tech Stack:** @playwright/test, Django management command, existing React/Vitest stack.

**Spec:** `docs/superpowers/specs/2026-10-10-react-frontend-design.md` (§8 Testing, §9 step 6). Research: `/tmp/claude-1000/-home-thran-projects-ufobal-web-frontend/afb38ef5-0a40-47b4-8bbe-1e26e7cfcf82/scratchpad/plan5-research.md`.

## Global Constraints

- **Repos and branches:**
  - Backend changes go in `~/projects/ufobal-web`, branch `new-frontend`. Python is `~/miniconda3/envs/ufobal_web/bin/python`. Run backend tests with `pytest`; the baseline is 4 known failures in `test_views.py`, and no new failures are allowed.
  - Frontend changes go in `~/projects/ufobal-web-frontend`, branch `react-rewrite`. Every task must leave `npm test`, `npm run typecheck`, `npm run lint` and `npm run build` clean.
- **Commits:** DO NOT COMMIT (user decision). Stage your task's files with `git add`. The controller asks the user before any commit.
- **Out of scope** (user decision):
  - Deploying the build to production ("leave it be, for now"): do not change `deploy.sh` or `.gitignore`.
  - Tightening backend permissions (dropped).
  - Removing `/old/` (later cleanup).
- **E2E environment:**
  - Run on local Django with sqlite. Without `ON_VIPER` the settings already give DEBUG=True and LocMemCache, so memcached is not needed.
  - Never set `TEST=True`: it authorizes everyone and would hide the RequireAuth behaviour.
  - Always set `LOG_FILE` to a temp path so the repo isn't dirtied.
- **Seed safety:** `seed_e2e` must refuse to run unless the DB engine is sqlite, so it can never touch the MySQL dev or production DB.
- **Test location:** Playwright specs live in `e2e/` and must not be picked up by Vitest (`test.include: ['src/**/*.test.{ts,tsx}']`).
- **Language:** UI copy is Czech. Code, comments and identifiers are English, with comments only where something is not obvious.
- **Shell pitfall:** never `pkill -f "manage.py runserver"` from a Bash command, because it kills the invoking shell. Let Playwright manage the server.
- **Network:** installing `@playwright/test` (npm) needs network; the controller has user approval for it as part of this plan. No `npx playwright install`: use the system Chrome.

## Review Focus

1. **E2E stability:** specs must wait on UI state (roles/text) rather than fixed sleeps, and each spec must be independent. The recording spec uses its own match, so a re-run on the same server doesn't break it.
2. **Port in use / stale server:** `reuseExistingServer: false` on port 8123, so a leftover server makes the run fail loudly instead of testing old code.
3. **Seed against a real DB:** `seed_e2e` on a MySQL URL must abort with a clear message (backend test).
4. **RequireAuth when `/user_profile` fails:** show an ErrorBox with retry, never "Pro tuto stránku se musíš přihlásit." (unit test).
5. **Graph memo shared across pages:** the cached graph must not be mutated by any consumer, and a changed input ref must give a new graph (unit test).

---

### Task 1: Backend: `seed_e2e` command and managestats links

**Files:**
- Create: `ufobalapp/management/commands/seed_e2e.py`
- Create: `ufobalapp/tests/test_seed_e2e.py`
- Modify: `managestats/templates/managestats/referee_feedbacks.html:18`, `managestats/templates/managestats/pairing_requests.html:10`

**Interfaces:**
- Produces: `python manage.py seed_e2e --out <path>`, which writes JSON to `<path>`. The shape is:
  `{"tournament": int, "recordMatch": int, "viewMatch": int, "user": {"username": "e2e", "password": "e2e"}, "players": {"<nickname>": pk}}`.

**Seed content:**
- **Tournament:** "E2E turnaj", `category=BRNO`, `date=today`, `registration_to=today`, `location='Hala'`, `field_count=1`, `description='e2e'`, `halftime_length=8`.
- **Teams:**
  - "Draci": players Alfa (default_goalie) and Beta (captain).
  - "Sovy": players Gama (default_goalie) and Delta (captain).
- **recordMatch:** Draci vs Sovy, `referee_team=None`, not started. It has GoalieInMatch rows at `00:00:00` (Alfa for Draci, Gama for Sovy), so the goalie guard passes.
- **viewMatch:** Draci vs Sovy, finished: `start`/`end` set, `length='00:16:00'`, `halftime_length='00:08:00'`. It has initial goalies like recordMatch and one Goal: shooter Beta, assistance None, time `00:03:00`.
- **User:** `e2e` / `e2e`, not staff, paired with Player nickname "E2E" (`Player.user`).

- [ ] **Step 1: Write the failing test** `ufobalapp/tests/test_seed_e2e.py`:

```python
import json

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError
from django.db import connection

from ufobalapp.models import Goal, GoalieInMatch, Match, Player, Tournament


@pytest.mark.django_db
def test_seed_creates_data_and_writes_ids(tmp_path):
    out = tmp_path / 'seed.json'
    call_command('seed_e2e', out=str(out))
    ids = json.loads(out.read_text())
    t = Tournament.objects.get(pk=ids['tournament'])
    assert t.name == 'E2E turnaj'
    rec = Match.objects.get(pk=ids['recordMatch'])
    assert rec.start is None and GoalieInMatch.objects.filter(match=rec).count() == 2
    assert Goal.objects.filter(match_id=ids['viewMatch'], shooter__nickname='Beta').count() == 1
    assert Player.objects.get(nickname='E2E').user.username == 'e2e'
    assert set(ids['players']) >= {'Alfa', 'Beta', 'Gama', 'Delta'}


@pytest.mark.django_db
def test_seed_refuses_non_sqlite(tmp_path, monkeypatch):
    monkeypatch.setattr(connection, 'vendor', 'mysql')
    with pytest.raises(CommandError, match='sqlite'):
        call_command('seed_e2e', out=str(tmp_path / 's.json'))
```

- [ ] **Step 2: Run it and check that it fails:** `cd ~/projects/ufobal-web && ~/miniconda3/envs/ufobal_web/bin/python -m pytest ufobalapp/tests/test_seed_e2e.py -q`. Expected: FAIL (`Unknown command: 'seed_e2e'`).

- [ ] **Step 3: Implement** `seed_e2e.py`:
  - `BaseCommand` with a required `--out` argument.
  - First line of `handle`: `if connection.vendor != 'sqlite': raise CommandError('seed_e2e runs only on sqlite (set DATABASE_URL=sqlite:///...)')`.
  - Wrap the creation in `transaction.atomic()` and create the content listed above. Use `datetime.date.today()`; set Match `start`/`end` from `timezone.now()` minus 30 and minus 10 minutes.
  - Write the JSON with `json.dump(..., ensure_ascii=False)`.
  - Check the model fields in `ufobalapp/models.py`: Tournament, Team, TeamOnTournament (`players` M2M, `captain`, `default_goalie`), Match, Goal, GoalieInMatch (`start`).

- [ ] **Step 4: Update the managestats links:**
  - `referee_feedbacks.html:18`: `href="/old/turnaj/zapas/{{ tournament.pk }}/{{ match.pk }}"` becomes `href="/tournaments/{{ tournament.pk }}/matches/{{ match.pk }}"`.
  - `pairing_requests.html:10`: `href="/old/hrac/{{ request.player.pk }}/{{ request.player.nickname }}"` becomes `href="/players/{{ request.player.pk }}/{{ request.player.nickname|urlencode }}"`.
  - Then run `grep -rn "/old/" managestats`. Expected: no matches.

- [ ] **Step 5: Run the backend tests:** `~/miniconda3/envs/ufobal_web/bin/python -m pytest -q`. Expected: the new tests pass, and the only failures are the 4 baseline failures in test_views.py.

- [ ] **Step 6: Stage** the 4 files with `git add` (no commit). Commit message for the user: `feat: seed_e2e command; managestats links to new frontend`.

---

### Task 2: RequireAuth shows an error instead of "log in" when the user query fails

**Files:**
- Modify: `src/auth/RequireAuth.tsx`
- Test: `src/auth/RequireAuth.test.tsx`

- [ ] **Step 1: Write the failing test.** Add a case to `RequireAuth.test.tsx`, reusing that file's existing render and mock helpers:
  - `user_profile` responds 500.
  - Expect `findByRole('alert')` *not* to contain "Pro tuto stránku se musíš přihlásit.".
  - Expect a "Zkusit znovu" button (the ErrorBox retry label; check `src/components/ErrorBox.tsx`).
  - Clicking it after the mock is switched to return a paired user renders the protected children.
- [ ] **Step 2: Run it and check that it fails:** `npx vitest run src/auth/RequireAuth.test.tsx`.
- [ ] **Step 3: Implement.**
  - `const { data: user, isPending, error, refetch } = useUser();`
  - After the pending check, add: `if (error && !user) return <ErrorBox error={error} onRetry={() => void refetch()} />;`
  - If the shared test QueryClient retries, the test already disables retries; check `src/test/`.
- [ ] **Step 4: Run** `npx vitest run src/auth`, then the full suite, typecheck and lint.
- [ ] **Step 5: Stage** the two files. Commit message: `fix: RequireAuth shows error with retry when user query fails`.

---

### Task 3: Plan 4 leftover minors (batch)

**Files** (each item lists its own): `src/components/match/ClockControls.tsx`, `src/pages/MatchRecordPage.tsx`, `src/hooks/useMatchSync.ts`, `src/components/match/dialogs/{PenaltyDialog,EditPenaltyDialog}.tsx`, `src/components/match/dialogs/dialogs.test.tsx`, `src/domain/recorderStorage.ts`, `src/domain/matchEvents.ts`, plus their tests. Also `src/domain/time.test.ts`, the test for `src/queries/mutations.ts`, and `src/pages/MatchViewPage.test.tsx`.

Fix each item with its own failing test first, where it's a behaviour change.

1. **ClockControls:** DOM order must match visual order.
   - Render the clock span first in the DOM.
   - On `sm+`, place it between the +1 s and −1 s buttons with explicit `order-*` classes.
   - Below `sm` the clock stays on its own full-width first row and the four step buttons sit in one row underneath.
   - Test: in DOM order (`container.querySelectorAll('button, [aria-label="Čas zápasu"]')`), the `Čas zápasu` element comes before `Přidat 5 s`.
2. **MatchRecordPage:** the matches fetch must not spin forever.
   - The `useMatches` queryFn for this page aborts after 15 s: add an optional `signal`/timeout to the query (`AbortSignal.timeout(15_000)` combined with the TanStack `signal`).
   - When it times out, the page shows the ErrorBox with retry.
   - Test with a never-resolving fetch and fake timers.
3. **useMatchSync:** call `setOffline(false)` in both the permanent-error branch and the max-transient-failures branch.
   - Test: an item is poisoned while other items are pending, and `offline` becomes false.
4. **PenaltyDialog:** trim `extra`, so whitespace-only input gives a plain `reason`.
   - **EditPenaltyDialog:** trim the reason, and disable "Upravit" while it is empty.
   - Tests in `dialogs.test.tsx`.
5. **dialogs.test.tsx:** fix the act() warning in "GoalDialog resets its draft after close".
   - After `rerender(open=false)`, run `await act(async () => {})`, then assert directly with `queryByRole('dialog')`.
   - After reopening, assert the "asistence" title is gone.
   - Run `npx vitest run src/components/match/dialogs 2>&1 | grep -c "not wrapped in act"`. Expected: 0.
6. **recorderStorage.loadRecorder:** add a shape guard.
   - Accept only these:
     - `events` is an array of objects with string `id`/`type`/`time`;
     - `clock` is an object with a boolean `running`;
     - `phase` is `0 | 1 | 2 | null`.
   - Otherwise return null.
   - Tests: missing events, events not an array, missing clock, bad phase. Each returns null and `initRecorder` falls back to server data.
7. **matchEvents:** the penalty comparator becomes three-way: `a.event.time < b.event.time ? 1 : a.event.time > b.event.time ? -1 : 0`.
   - Test: two penalties with the same time keep their input order (stable sort).
8. **Test gaps:**
   - `formatClock(-1)`, `formatClock(59_999)`, `formatClock(0)`: assert the exact strings the current implementation produces. It is an exact clone of the old timer, so don't change the function.
   - `invalidateMatchData`: spy on `qc.invalidateQueries` and assert all 6 keys.
   - MatchViewPage:
     - closed_edit with an authorized non-staff user hides "Zaznamenávat";
     - closed_edit with staff shows it;
     - an open tournament with an authorized user shows it.

- [ ] Run the full suite, typecheck, lint and build, then stage. Commit message: `fix: plan 4 follow-ups (clock order, fetch timeout, offline flag, dialog validation, storage guard)`.

---

### Task 4: Graph memo shared across pages

**Files:**
- Modify: `src/domain/graph.ts` (add `buildGraphCached`), `src/queries/data.ts:53-65`
- Test: `src/domain/graph.test.ts`

- [ ] **Step 1: Write the failing test.**
  - Calling `buildGraphCached(raw)` twice with the same 4 refs returns the same object (`toBe`).
  - Replacing any one ref (for example `goals: {...raw.goals}`) returns a new object.
  - `buildGraph` does not mutate its inputs: deep-clone `raw` (`structuredClone`) before the call and compare with `toEqual` afterwards.
- [ ] **Step 2: Run it and check that it fails.**
- [ ] **Step 3: Implement** a single-entry module cache:

```ts
let last: { raw: RawData; graph: Graph } | null = null;

/** buildGraph memoized on the identity of the four inputs (TanStack keeps refs stable until data changes). */
export function buildGraphCached(raw: RawData): Graph {
  if (
    last &&
    last.raw.players === raw.players &&
    last.raw.tots === raw.tots &&
    last.raw.goals === raw.goals &&
    last.raw.emptyTournaments === raw.emptyTournaments
  )
    return last.graph;
  const graph = buildGraph(raw);
  last = { raw, graph };
  return graph;
}
```

- In `useGraph`, replace `buildGraph` with `buildGraphCached` inside the existing `useMemo`.
- Grep the consumers (`useGraph(` across `src/pages`) for mutations of graph objects (`.push(`, `.sort(` on graph arrays, property assignment). Any in-place `.sort()` on a graph array must become `[...arr].sort()`. List what you checked in the report.
- [ ] **Step 4: Run** the full suite, typecheck and lint, then stage. Commit message: `perf: share the built entity graph across pages`.

---

### Task 5: Playwright setup and public smoke tests

**Files:**
- Modify: `package.json` (devDependency `@playwright/test`, scripts), `vite.config.ts` (vitest `include`), `eslint.config.js` (Node globals for `e2e/**` and `playwright.config.ts`), `.gitignore` (`/test-results/`, `/playwright-report/`, `/e2e/.seed.json`)
- Create: `playwright.config.ts`, `e2e/server.sh`, `e2e/tsconfig.json`, `e2e/fixtures.ts`, `e2e/public.spec.ts`

**Interfaces:**
- Produces:
  - `npm run e2e`, which runs `scripts/build-to-backend.sh && playwright test`.
  - `e2e/fixtures.ts` exporting `seed()`, which reads `e2e/.seed.json` and returns the seed JSON from Task 1, and `login(page)`.

- [ ] **Step 1: Install:** `npm install -D @playwright/test`. Do not run `playwright install`.
- [ ] **Step 2: Write** `e2e/server.sh` (make it executable):

```bash
#!/usr/bin/env bash
# Fresh sqlite DB + seed + Django runserver for Playwright (started by playwright.config.ts webServer).
set -euo pipefail
cd "$(dirname "$0")/.."
BACKEND="$(cd "${UFOBAL_BACKEND:-../ufobal-web}" && pwd)"
PY="${UFOBAL_PYTHON:-$HOME/miniconda3/envs/ufobal_web/bin/python}"
TMP="$(mktemp -d)"
export DATABASE_URL="sqlite:///$TMP/e2e.sqlite3" LOG_FILE="$TMP/django.log"
"$PY" "$BACKEND/manage.py" migrate --noinput >/dev/null
"$PY" "$BACKEND/manage.py" seed_e2e --out "$PWD/e2e/.seed.json"
exec "$PY" "$BACKEND/manage.py" runserver 127.0.0.1:8123 --noreload
```

- [ ] **Step 3: Write** `playwright.config.ts`:

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: { baseURL: 'http://127.0.0.1:8123', channel: 'chrome', locale: 'cs-CZ', trace: 'retain-on-failure' },
  webServer: {
    command: 'bash e2e/server.sh',
    url: 'http://127.0.0.1:8123/api_frontend/ping',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
```

- [ ] **Step 4: Config changes:**
  - **vite.config.ts:** `test.include: ['src/**/*.test.{ts,tsx}']`.
  - **package.json scripts:** `"e2e": "bash scripts/build-to-backend.sh && playwright test"`.
  - **e2e/tsconfig.json:** extends the root, `include: ["."]`, `types: ["node"]`.
  - **Root tsconfig.json:** add `"playwright.config.ts"` to `include`.
  - **Typecheck script:** make `npm run typecheck` also run `tsc --noEmit -p e2e`.
  - **ESLint:** add Node globals for `e2e/**/*.ts` and `playwright.config.ts`.
- [ ] **Step 5: Write `e2e/fixtures.ts`:**
  - **`seed()`:** reads JSON with `readFileSync(new URL('./.seed.json', import.meta.url))`.
  - **`login(page)`:**
    1. `await page.goto('/')` (sets csrftoken).
    2. Read the `csrftoken` cookie from `page.context().cookies()`.
    3. `await page.request.post('/api_frontend/login', { data: { username: 'e2e', password: 'e2e' }, headers: { 'X-CSRFToken': token } })`.
    4. Expect it to be ok.
- [ ] **Step 6: Write `e2e/public.spec.ts`.** Each test is independent; use role/text assertions from the research doc §4:
  - **Home:** `/` shows the heading "Ufobalový Informační Systém" and the text "V systému je aktuálně:".
  - **Tournaments:** `/tournaments` has h1 "Turnaje" and a link containing "E2E turnaj".
  - **Players:** `/players` has h1 "Hráči". Fill the search with "Beta", click the player and expect h1 "Beta".
  - **Tournament results:** `/tournaments/<t>/results` has h1 containing "E2E turnaj", and Beta is listed with a goal.
  - **Match view:** `/tournaments/<t>/matches/<viewMatch>` shows "Beta" in the `events-desktop` test id and the scoreboard 1 : 0. It shows no "Zaznamenávat" while logged out.
  - **Not found:** `/nope` shows "Stránka nenalezena".
  - **Legacy redirects:** `/hraci` lands on `/players`, `/turnaj-zive/<t>` on `/tournaments/<t>/live`, and `/turnaj/zapas/<t>/<viewMatch>` on `/tournaments/<t>/matches/<viewMatch>`. Check `page.url()` and one heading or text for each.
  - **Old app:** `/old/` responds 200 and `html[ng-app="ufoIS"]` is present.
- [ ] **Step 7: Run:** `npm run e2e`. Expected: all pass. Also run `npm test`; Vitest must not pick up `e2e/`. Then run typecheck, lint and build.
- [ ] **Step 8: Stage.** Commit message: `test: Playwright smoke tests against local Django`.

---

### Task 6: E2E authorized flows: recording a goal

**Files:**
- Create: `e2e/record.spec.ts`

- [ ] **Step 1: Write the specs.** Read the labels from `src/pages/MatchRecordPage.tsx`, `src/components/match/*` and the dialogs. Known labels: `Spustit čas`, the confirm "Začít zápas?" plus "Ano", player tiles `Gól <name>` / `Střela <name>` / `Karta <name>`, goal dialog titles "Gól - <team> - střelec|asistence", tile "nikdo", and SyncStatus text "Neuloženo: N".
  1. **Unauthenticated:** `/tournaments/<t>/matches/<recordMatch>/edit` shows the alert "Pro tuto stránku se musíš přihlásit.".
  2. **Record a goal:** `login(page)`, then open the record page.
     - Click `Spustit čas` → "Ano". Expect "1. poločas".
     - Click `Gól Beta`. Finish the dialog with the assistant "nikdo" (follow the actual GoalDialog steps).
     - Wait until no "Neuloženo" text is visible (sync done).
     - Open the view page for the same match: the scoreboard shows 1 : 0, and Beta appears in `events-desktop`.
  3. **Reload recovery:** on the record page after kickoff (match already started in test 2, so give this test its own `test.describe.serial` chain with test 2):
     - Add a shot with `Střela Delta`.
     - Wait until synced.
     - `page.reload()`. The clock is still running (the button is labelled `Zastavit čas`), and the shot is still listed exactly once (no duplicate).
  4. **Hub:** `/tournaments/<t>/record` shows h1 with the tournament name, h3 "Zápasy", and a link to the record match.
- [ ] **Step 2: Run** `npm run e2e` twice in a row (the server restarts with a fresh DB each run). Expected: green both times.
- [ ] **Step 3: Stage.** Commit message: `test: e2e recording flow`.

---

### Task 7: READMEs (both repos)

**Files:**
- Modify: `~/projects/ufobal-web-frontend/README.md`, `~/projects/ufobal-web/README.md`

- [ ] **Frontend README:** keep the Dev/Scripts sections. Add:
  - an `## E2E` section: `npm run e2e`, what it does (build-to-backend, fresh sqlite, `seed_e2e`, runserver :8123, system Chrome), the env overrides `UFOBAL_BACKEND` and `UFOBAL_PYTHON`, and how to open the trace (`npx playwright show-trace test-results/.../trace.zip`);
  - an `## URLs` note pointing at `src/router.tsx` and `src/routes/legacyRedirects.tsx` (old Czech URLs redirect client-side; old app under `/old/`).
- [ ] **Backend README:**
  - Fix the memcached note: memcached is only needed on the server (`ON_VIPER=True`); locally Django uses an in-memory cache.
  - Add a sqlite quickstart: `DATABASE_URL=sqlite:////tmp/ufobal.sqlite3 python manage.py migrate && python manage.py seed_e2e --out /tmp/seed.json && python manage.py runserver`, with login `e2e`/`e2e`.
  - Add a `## Frontend` section:
    - the new React SPA lives in the `ufobal-web-frontend` repo and is built into `static/spa/` + `templates/spa.html` via its `scripts/build-to-backend.sh`;
    - without a build, `/` returns 503 "Frontend is not built";
    - the old AngularJS app is served under `/old/` and keeps its Grunt/Bower instructions, marked as legacy.
- [ ] **Stage** both. Commit messages: frontend `docs: README e2e and URLs`; backend `docs: README sqlite quickstart, frontend build, memcached note`.

---

### Task 8 (controller, not a subagent): Browser check in Chrome

The controller does this after the final review's fix wave.

- Start the e2e server in the background: `bash e2e/server.sh` (port 8123), after running `scripts/build-to-backend.sh`.
- Use the claude-in-chrome tools in a new tab and work through the checklist:
  1. **Public pages, desktop width:**
     - Home, Tournaments (sorting and filter in the URL), Players (search typing, Czech number format), Player, Teams, Team, Tournament results, Groups/bracket, Player stats, Goalie stats, FAQ, Hall of records, 404.
     - Check that nothing has a broken layout and that there are no console errors (`read_console_messages`, pattern `error`).
  2. **Legacy URLs:** spot-check 3 of them.
  3. **Login** (`e2e`/`e2e` via the login dialog):
     - Hub: add a match.
     - Live page.
     - Registration and roster: view only, don't submit destructive actions.
     - Player edit and attendance.
     - Referee feedback.
  4. **Match recording at 360×740** (`resize_window`). Record a GIF with `gif_creator` (`match_recording_360.gif`):
     - Kickoff, then a goal with an assistant, a shot, a yellow card, and a goalie change.
     - Edit a goal's time and remove the shot.
     - Halftime, end of match.
     - Check touch targets, that the clock row doesn't overflow, and that dialogs fit the screen.
     - Reload mid-half: the clock keeps running and there are no duplicates.
     - Go offline using the DevTools-equivalent `javascript_tool` (dispatch `offline` / stub `fetch`): the badge appears and events sync after going back online.
  5. **Match view** with "živě" on, at desktop width and at 360 px.
  6. **`/old/`:** home loads and one old page renders.
  7. **managestats:** this needs a staff user, so create one via `manage.py shell -c` against the same `DATABASE_URL`. Open the referee feedbacks and pairing requests pages and check that the links point to the new URLs.
- Write the findings to the ledger. Each defect becomes a fix dispatched to a subagent (one batch), followed by a scoped re-review. Stop the server by its PID afterwards.
- Report to the user with screenshots/GIF and the list of staged commit messages.
