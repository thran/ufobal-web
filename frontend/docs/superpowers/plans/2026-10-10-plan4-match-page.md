# Plan 4 — Match Page (View + Live Recording) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the match page: a read-only view (`/tournaments/:id/matches/:matchId`) and the live recorder (`…/edit`) with the old timer, goals/shots/cards/goalie changes/referee, halftime and end, local persistence that survives reloads (including a running clock), and a reliable ordered sync queue with error handling and server-side duplicate protection.

**Architecture:** Pure domain modules (`time`, `clock`, `matchEvents`, `recorder` reducer, `recorderStorage`) hold all logic and are unit-tested. A `useMatchSync` hook sends unsaved work to the backend one item at a time (match patch first, then events in order), retrying transient failures with backoff and surfacing permanent errors on the event. Presentational components (`src/components/match/*`) are shared by the view page and the recorder page.

**Tech Stack:** React 19, TS strict, TanStack Query 5, Headless UI Dialog (via `Modal`), sonner, Tailwind 4, Vitest. Backend Django 4.2 + migration.

**Spec:** `docs/superpowers/specs/2026-10-10-react-frontend-design.md`
**Research (old behaviour, exact texts, endpoints):** `/tmp/claude-1000/-home-thran-projects-ufobal-web-frontend/afb38ef5-0a40-47b4-8bbe-1e26e7cfcf82/scratchpad/plan4-research.md` — **R§x**. Old sources: `~/projects/ufobal-web/ufobalapp/static/ufobalapp/js/{tournament.js,timer.js,dataService.js}`, `ng-parts/tournament_match.html`.

## Global Constraints

- Branches: frontend `react-rewrite`, backend `new-frontend`. Never push.
- UI text Czech (old typos corrected, e.g. "Obranný faul"); code English; comments only for non-obvious things.
- **User decisions:**
  - Timer = **exact clone** of the old directive semantics (countdown per half from `tournament.halftime_length` minutes, display `[-]MM:SS.d` with the old overtime rounding, ±1 s/±5 s nudges, tap digits toggles; game time = old `getTime()` incl. its quirks).
  - A **running clock survives reload/crash** (persist start wall-clock + remaining).
  - **localStorage:** new key `ufo:match:<pk>` (schema v1); one-time import of the old app's `events<pk>` / `match<pk>` / `time<pk>` (marker `ufo:match:<pk>:imported`); old keys are never modified.
  - **Sync:** send immediately, strictly in order, one request at a time; transient failures (network, 5xx) retry with backoff 2 s → 5 s → 10 s → 30 s (max) and on the browser `online` event; permanent failures (4xx) are shown on the event with "Zkusit znovu" / "Zahodit"; in-flight state is never persisted; a status indicator shows pending/offline/errors.
  - **Backend idempotency:** every created event carries a client UUID (`client_id`); the backend returns the existing object instead of creating a duplicate.
  - **Gating:** `/edit` keeps `RequireAuth level="authorized"`; `tournament.closed_edit && !staff` → redirect to the view page; an ended match is read-only until the "úpravy" toggle is on; action buttons (střela/gól/karta) are hidden before kickoff unless "úpravy" is on; goalie and referee can be set before kickoff.
  - **Confirmations** use the app `Modal` (`ConfirmDialog`), same texts as old.
  - **Edit mode loads server data once** (single recorder); the view page polls with "živě" (default on, 15 s).
- Defaults chosen here (old behaviour unless noted): data from `matchs?tournament=` (`useMatches`); score = counts derived from events (incl. unsaved); view page shows no ticking clock and no penalty countdowns; penalty countdown shows only penalties with `0 ≤ elapsed ≤ length` (red 2 min, yellow 1 min; dead "2nd card" rule dropped); view-page "N. poločas" label is not clickable (old bug); team one = dark blue, team two = dark red (follow the team, not the side); side switch is local (persisted in recorder storage); icons are Unicode characters.
- After any successful match write invalidate: `matches(t)`, `pairs(t)`, `groups(t)`, `goalieStats(t)`, `goalieStats('all')`, `goals`.
- Commit trailer (after a blank line): `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01NHHZjCnSN7qrM8oz75zwSt`.
- Backend tests: `cd ~/projects/ufobal-web && ~/miniconda3/envs/ufobal_web/bin/python -m pytest -q` (baseline 4 failed). Frontend: `npm test && npm run typecheck && npm run lint`.
- Never render a Headless UI `Dialog` inside a `<form>`; mutation errors via the global toast only.

## Review Focus

1. **Reload during a running half** — clock continues from wall-clock; unsaved events and pending match patch restored; nothing marked in-flight. Tests in Tasks 5 and 6.
2. **Offline then online** — events queue, order preserved, retried with backoff and on `online`; no duplicate requests for one event; server dedups replays via `client_id`. Tests in Tasks 1 and 7.
3. **Permanent 400 (e.g. shooter not in team)** — event shows error with retry/discard; queue continues with the next event. Test in Task 7.
4. **Old-app data present in localStorage** — imported once into the new schema; second load does not re-import. Test in Task 6.
5. **closed_edit tournament / ended match** — non-staff redirected to view; ended match read-only until "úpravy". Test in Task 11.

---

## File Structure

```
backend: ufobalapp/models.py (client_id fields, goalie_stats cache signals), migrations/0040_client_id.py,
         ufobalapp/views.py (add_goal/add_shot/add_penalty/change_goalie idempotency), tests/test_match_idempotency.py
src/api/types.ts            ShotDto, GoalieInMatchDto; MatchDto typed
src/api/endpoints.ts        addGoal, addShot, addPenalty, editGoal, editPenalty, editMatch, removeGoal/Shot/Penalty, changeGoalie
src/queries/mutations.ts    invalidateMatchData, useRemoveMatchEvent
src/domain/time.ts          hmsToMs, msToHms, shortTime, isValidHms, formatClock, nowDateTime
src/domain/clock.ts         ClockState + pure ops, gameTimeMs, initialClock
src/domain/matchEvents.ts   MatchEvent model, serverEvents, mergeLocal, computeGoalies, eventCounts, activePenalties, constants
src/domain/recorder.ts      RecorderState, actions, reducer, currentGameTime
src/domain/recorderStorage.ts  save/load/import/initRecorder
src/hooks/useMatchSync.ts   ordered sync queue
src/hooks/useNow.ts         ticking clock
src/components/match/*      MatchStatus, ClockControls, GoalieRow, TeamNames, Scoreboard, PenaltyCountdowns, EventList, PlayerTiles, SyncStatus
src/components/match/dialogs/*  ConfirmDialog, GoalDialog, PenaltyDialog, GoalieChangeDialog, RefereeDialog, EditGoalDialog, EditPenaltyDialog
src/pages/MatchViewPage.tsx, src/pages/MatchRecordPage.tsx
src/router.tsx              two placeholders replaced
```

---

### Task 1: Backend — client_id idempotency + goalie_stats cache invalidation

**Files (repo `~/projects/ufobal-web`):**
- Modify: `ufobalapp/models.py` (Goal, Shot, Penalty, GoalieInMatch: add `client_id`; add cache-invalidation receiver)
- Create: `ufobalapp/migrations/0040_client_id.py` (via `makemigrations`)
- Modify: `ufobalapp/views.py` (`add_goal` ~546, `add_shot` ~570, `add_penalty` ~643, `change_goalie` ~835)
- Create: `ufobalapp/tests/test_match_idempotency.py`

**Changes:**
1. Add to `Goal`, `Shot`, `Penalty`, `GoalieInMatch`: `client_id = models.CharField(max_length=36, null=True, blank=True, unique=True)`. Run `~/miniconda3/envs/ufobal_web/bin/python manage.py makemigrations ufobalapp -n client_id` (rename to `0040_client_id.py` if numbered differently is fine as long as it follows 0039).
2. In `add_goal` / `add_shot` / `add_penalty`: right after parsing the body, `client_id = data.get('client_id')`; if set and `Model.objects.filter(client_id=client_id).first()` exists → `return HttpResponse(existing.pk)` (no validation, no new row). Otherwise set `client_id=client_id` on the new object.
3. In `change_goalie`: if `client_id` set and `GoalieInMatch.objects.filter(client_id=client_id).exists()` → `return HttpResponse('OK')`; otherwise set it on the new `GoalieInMatch`.
4. In `models.py` add a receiver clearing the goalie stats cache:

```python
@receiver(post_save, sender=Goal)
@receiver(post_delete, sender=Goal)
@receiver(post_save, sender=Shot)
@receiver(post_delete, sender=Shot)
@receiver(post_save, sender=GoalieInMatch)
@receiver(post_delete, sender=GoalieInMatch)
@receiver(post_save, sender=Match)
def reset_goalie_stats_cache(sender, instance, **kwargs):
    cache.delete('goalie_stats')
```

(import `post_delete` alongside `post_save`; place after the model classes.)

- [ ] **Step 1: Failing tests** — `ufobalapp/tests/test_match_idempotency.py`:

```python
import json
from datetime import date, time

import pytest
from django.contrib.auth.models import User
from django.core.cache import cache

from ufobalapp.models import Goal, GoalieInMatch, Match, Penalty, Player, Shot, Team, TeamOnTournament, Tournament


@pytest.fixture()
def setup(client):
    t = Tournament.objects.create(
        category=Tournament.BRNO, date=date(2023, 6, 10), registration_to=date(2023, 6, 1),
        name='T', location='L', field_count=1, description='d',
    )
    a1 = Player.objects.create(name='a', lastname='a', nickname='A1')
    b1 = Player.objects.create(name='b', lastname='b', nickname='B1')
    team_a = TeamOnTournament.objects.create(team=Team.objects.create(name='A'), tournament=t)
    team_a.players.add(a1)
    team_b = TeamOnTournament.objects.create(team=Team.objects.create(name='B'), tournament=t)
    team_b.players.add(b1)
    m = Match.objects.create(tournament=t, team_one=team_a, team_two=team_b, referee_team=team_b)
    client.force_login(User.objects.create_user('admin', password='x', is_staff=True))
    return {'m': m, 'a1': a1, 'b1': b1, 'team_a': team_a, 'team_b': team_b}


def post(client, url, data):
    return client.post(url, json.dumps(data), content_type='application/json')


@pytest.mark.django_db
def test_add_goal_is_idempotent_by_client_id(client, setup):
    body = {'match': setup['m'].pk, 'shooter': setup['a1'].pk, 'time': '00:01:00', 'client_id': 'uuid-1'}
    first = post(client, '/api_frontend/add_goal', body)
    second = post(client, '/api_frontend/add_goal', body)
    assert first.status_code == second.status_code == 200
    assert first.content == second.content
    assert Goal.objects.count() == 1


@pytest.mark.django_db
def test_add_shot_and_penalty_idempotent(client, setup):
    shot = {'match': setup['m'].pk, 'team': setup['team_a'].pk, 'time': '00:02:00', 'client_id': 's-1'}
    post(client, '/api_frontend/add_shot', shot)
    post(client, '/api_frontend/add_shot', shot)
    assert Shot.objects.count() == 1
    pen = {'match': setup['m'].pk, 'player': setup['b1'].pk, 'card': 'yellow', 'reason': 'x', 'time': '00:03:00', 'client_id': 'p-1'}
    post(client, '/api_frontend/add_penalty', pen)
    post(client, '/api_frontend/add_penalty', pen)
    assert Penalty.objects.count() == 1


@pytest.mark.django_db
def test_change_goalie_idempotent(client, setup):
    url = f'/api_frontend/change_goalie/{setup["m"].pk}-{setup["team_a"].pk}'
    body = {'goalie': setup['a1'].pk, 'time': '00:04:00', 'client_id': 'g-1'}
    assert post(client, url, body).status_code == 200
    assert post(client, url, body).status_code == 200
    assert GoalieInMatch.objects.filter(match=setup['m']).count() == 1


@pytest.mark.django_db
def test_without_client_id_still_creates(client, setup):
    body = {'match': setup['m'].pk, 'shooter': setup['a1'].pk, 'time': '00:01:00'}
    post(client, '/api_frontend/add_goal', body)
    post(client, '/api_frontend/add_goal', body)
    assert Goal.objects.count() == 2


@pytest.mark.django_db
def test_goal_save_clears_goalie_stats_cache(setup):
    cache.set('goalie_stats', ['x'])
    Goal.objects.create(match=setup['m'], shooter=setup['a1'], time=time(0, 1))
    assert cache.get('goalie_stats') is None
```

Adjust fixtures if model creation needs more fields; keep scenarios.

- [ ] **Step 2: Run, expect FAIL** — `~/miniconda3/envs/ufobal_web/bin/python -m pytest -q ufobalapp/tests/test_match_idempotency.py`

- [ ] **Step 3: Implement** the four changes and generate the migration.

- [ ] **Step 4: Run all backend tests** — new PASS; failures = 4 baseline.

- [ ] **Step 5: Commit** — `git add ufobalapp/models.py ufobalapp/views.py ufobalapp/migrations ufobalapp/tests/test_match_idempotency.py` then `git commit -m "feat: client_id idempotency for match events; clear goalie stats cache on changes"` (+ trailers).

---

### Task 2: Match DTO types, endpoints, invalidation helper

**Files:**
- Modify: `src/api/types.ts`, `src/api/endpoints.ts`, `src/queries/mutations.ts`, `src/queries/mutations.test.tsx`

**Interfaces:**

```ts
// types.ts
export interface ShotDto { pk: number; time: string; match: number; shooter: number | null; team: number | null }
export interface GoalieInMatchDto { pk: number; goalie: number; match: number; start: string; end: string | null }
// MatchDto: replace `shots: unknown[]; penalties: unknown[]; goalies: unknown[]` with
//   shots: ShotDto[]; penalties: PenaltyDto[]; goalies: GoalieInMatchDto[];
export type GoalType = 'normal' | 'penalty' | 'shootout';
export type CardType = 'yellow' | 'red';
export interface GoalBody { match: number; shooter: number | null; assistance?: number; type?: GoalType; time: string; client_id?: string }
export interface ShotBody { match: number; team: number; time: string; shooter?: number; client_id?: string }
export interface PenaltyBody { match: number; player: number; card: CardType; reason: string; time: string; client_id?: string }
export interface MatchPatch { start?: string; end?: string; halftime_length?: string; length?: string; referee?: number }
```

```ts
// endpoints.ts
export const addGoal = (b: GoalBody) => pk(api<number>('add_goal', { method: 'POST', body: b }));
export const editGoal = (id: number, b: GoalBody) => api<string>(`edit_goal/${id}`, { method: 'POST', body: b });
export const addShot = (b: ShotBody) => pk(api<number>('add_shot', { method: 'POST', body: b }));
export const addPenalty = (b: PenaltyBody) => pk(api<number>('add_penalty', { method: 'POST', body: b }));
export const editPenalty = (id: number, b: PenaltyBody) => api<string>(`edit_penalty/${id}`, { method: 'POST', body: b });
export const editMatch = (id: number, p: MatchPatch) => api<string>(`edit_match/${id}`, { method: 'POST', body: p });
export const removeMatchEvent = (type: 'goal' | 'shot' | 'penalty', id: number) =>
  api<string>(`remove_${type}/${id}`, { method: 'DELETE' });
// URL uses a literal hyphen between match and team pk.
export const changeGoalie = (match: number, team: number, b: { goalie: number; time: string; client_id?: string }) =>
  api<string>(`change_goalie/${match}-${team}`, { method: 'POST', body: b });
```

```ts
// mutations.ts
export function invalidateMatchData(qc: QueryClient, tournament: number) {
  return Promise.all(
    [dataKeys.matches(tournament), dataKeys.pairs(tournament), dataKeys.groups(tournament),
     dataKeys.goalieStats(tournament), dataKeys.goalieStats('all'), dataKeys.goals]
      .map((queryKey) => qc.invalidateQueries({ queryKey })),
  );
}
export const useRemoveMatchEvent = (tournament: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { type: 'goal' | 'shot' | 'penalty'; pk: number }) => removeMatchEvent(v.type, v.pk),
    onSuccess: () => invalidateMatchData(qc, tournament),
  });
};
```

(Check the actual signature of `dataKeys.goalieStats` in `src/queries/data.ts` and pass `'all'` the way it expects.)

- [ ] **Step 1: Failing test** — append to `src/queries/mutations.test.tsx`:

```tsx
test('remove match event uses DELETE remove_<type>/<pk> and invalidates match data', async () => {
  fetchMock.mockResolvedValueOnce(new Response('OK', { status: 200 }));
  const { spy, wrapper } = setup();
  const { result } = renderHook(() => useRemoveMatchEvent(5), { wrapper });
  await act(() => result.current.mutateAsync({ type: 'goal', pk: 9 }));
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe('/api_frontend/remove_goal/9');
  expect(init.method).toBe('DELETE');
  expect(spy).toHaveBeenCalledWith({ queryKey: dataKeys.matches(5) });
  expect(spy).toHaveBeenCalledWith({ queryKey: dataKeys.goals });
});
```

Run → FAIL. (Fix any type errors in existing code/fixtures caused by the typed `MatchDto` fields — e.g. `matchDto` fixture defaults `shots: []` etc. stay valid.)

- [ ] **Step 2: Implement**; **Step 3: Verify** (`npm test && npm run typecheck && npm run lint`); **Step 4: Commit** — `git add src` then `git commit -m "feat: match event endpoints, typed match DTO, match data invalidation"`.

---

### Task 3: Domain — time and clock (exact clone of old timer)

**Files:**
- Create: `src/domain/time.ts`, `src/domain/time.test.ts`, `src/domain/clock.ts`, `src/domain/clock.test.ts`

**Code** (R§3):

`src/domain/time.ts`:

```ts
const DAY = 86_400_000;
const pad = (n: number) => String(n).padStart(2, '0');

export function hmsToMs(hms: string | null | undefined): number {
  const m = hms?.match(/^(\d{1,2}):(\d{2}):(\d{2})/);
  return m ? ((Number(m[1]) * 60 + Number(m[2])) * 60 + Number(m[3])) * 1000 : 0;
}

/** Same as old moment.utc(ms).format('HH:mm:ss'): wraps around midnight, floors to seconds. */
export function msToHms(ms: number): string {
  const t = Math.floor((((ms % DAY) + DAY) % DAY) / 1000);
  return `${pad(Math.floor(t / 3600))}:${pad(Math.floor(t / 60) % 60)}:${pad(t % 60)}`;
}

/** Old template showed `time | limitTo:-5`, i.e. "MM:SS". */
export const shortTime = (hms: string) => hms.slice(-5);

export const isValidHms = (s: string) => /^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(s);

/** Old timer directive display: `[-]MM:SS.d`; overtime is shown via its `999 - millis` trick. */
export function formatClock(remainingMs: number): { text: string; negative: boolean } {
  let m = Math.round(remainingMs / 10) * 10;
  const negative = m < 0;
  if (negative) m = 999 - m;
  const d = Math.floor((m / 100) % 10);
  const s = Math.floor((m / 1000) % 60);
  const min = Math.floor((m / 60_000) % 60);
  return { text: `${negative ? '-' : ''}${pad(min)}:${pad(s)}.${d}`, negative };
}

/** Browser-local "YYYY-MM-DD HH:mm:ss" (format the backend parses for start/end). */
export function nowDateTime(d = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
```

`src/domain/clock.ts`:

```ts
import { hmsToMs } from './time';

export interface ClockState {
  running: boolean;
  /** Remaining ms while stopped. */
  remainingMs: number;
  /** Epoch ms when started (only meaningful while running). */
  startedAt: number;
  remainingAtStart: number;
}

export type Phase = 0 | 1 | 2 | null;

export const stoppedClock = (remainingMs: number): ClockState => ({
  running: false,
  remainingMs,
  startedAt: 0,
  remainingAtStart: remainingMs,
});

export const remaining = (c: ClockState, now: number) =>
  c.running ? c.remainingAtStart - (now - c.startedAt) : c.remainingMs;

export const startClock = (c: ClockState, now: number): ClockState =>
  c.running ? c : { running: true, remainingMs: c.remainingMs, startedAt: now, remainingAtStart: c.remainingMs };

export const stopClock = (c: ClockState, now: number): ClockState =>
  c.running ? stoppedClock(remaining(c, now)) : c;

export const adjustClock = (c: ClockState, delta: number): ClockState =>
  c.running ? { ...c, remainingAtStart: c.remainingAtStart + delta } : stoppedClock(c.remainingMs + delta);

/** Old getTime(): elapsed game time; the 1st-half length is added only in phase 2 (old quirk kept). */
export function gameTimeMs(halftimeMinutes: number, remainingMs: number, phase: Phase, h1Length: string | null) {
  let ms = halftimeMinutes * 60_000 - Math.round(remainingMs);
  if (phase === 2) ms += hmsToMs(h1Length);
  return ms;
}

/** Old setTime(match): derive phase and a stopped clock from match state and the latest known game time. */
export function initialClock(o: {
  halftimeMinutes: number;
  h1Length: string | null;
  length: string | null;
  start: string | null;
  latestTime: string;
}): { phase: Phase; clock: ClockState } {
  const t = hmsToMs(o.latestTime);
  const phase: Phase = o.length ? null : o.h1Length ? 2 : t || o.start ? 1 : 0;
  return { phase, clock: stoppedClock(o.halftimeMinutes * 60_000 - t + hmsToMs(o.h1Length)) };
}
```

- [ ] **Step 1: Failing tests**

`src/domain/time.test.ts`:

```ts
import { expect, test } from 'vitest';
import { formatClock, hmsToMs, isValidHms, msToHms, nowDateTime, shortTime } from './time';

test('hms conversions incl. wrap-around like moment.utc', () => {
  expect(hmsToMs('00:01:05')).toBe(65_000);
  expect(hmsToMs(null)).toBe(0);
  expect(msToHms(65_999)).toBe('00:01:05');
  expect(msToHms(-5000)).toBe('23:59:55');
  expect(shortTime('00:12:34')).toBe('12:34');
  expect(isValidHms('00:12:34')).toBe(true);
  expect(isValidHms('12:34')).toBe(false);
});

test('formatClock matches old directive', () => {
  expect(formatClock(480_000)).toEqual({ text: '08:00.0', negative: false });
  expect(formatClock(61_234)).toEqual({ text: '01:01.2', negative: false });
  expect(formatClock(-1500)).toEqual({ text: '-00:02.4', negative: true });
});

test('nowDateTime formats local time', () => {
  expect(nowDateTime(new Date(2025, 4, 1, 8, 5, 9))).toBe('2025-05-01 08:05:09');
});
```

`src/domain/clock.test.ts`:

```ts
import { expect, test } from 'vitest';
import { adjustClock, gameTimeMs, initialClock, remaining, startClock, stopClock, stoppedClock } from './clock';

test('wall-clock based start/stop/adjust', () => {
  let c = stoppedClock(600_000);
  c = startClock(c, 1000);
  expect(remaining(c, 61_000)).toBe(540_000);
  c = adjustClock(c, 5000);
  expect(remaining(c, 61_000)).toBe(545_000);
  c = stopClock(c, 61_000);
  expect(c.running).toBe(false);
  expect(remaining(c, 999_999)).toBe(545_000);
  expect(adjustClock(c, -1000).remainingMs).toBe(544_000);
});

test('gameTimeMs adds first half only in phase 2', () => {
  expect(gameTimeMs(10, 400_000, 1, null)).toBe(200_000);
  expect(gameTimeMs(10, 400_000, 2, '00:10:30')).toBe(830_000);
  expect(gameTimeMs(10, 400_000, null, '00:10:30')).toBe(200_000);
});

test('initialClock derives phase like old setTime', () => {
  expect(initialClock({ halftimeMinutes: 10, h1Length: null, length: null, start: null, latestTime: '00:00:00' }))
    .toEqual({ phase: 0, clock: stoppedClock(600_000) });
  expect(initialClock({ halftimeMinutes: 10, h1Length: null, length: null, start: null, latestTime: '00:03:00' }).phase).toBe(1);
  expect(initialClock({ halftimeMinutes: 10, h1Length: null, length: null, start: 'x', latestTime: '00:00:00' }).phase).toBe(1);
  const h2 = initialClock({ halftimeMinutes: 10, h1Length: '00:10:30', length: null, start: 'x', latestTime: '00:12:30' });
  expect(h2.phase).toBe(2);
  expect(h2.clock.remainingMs).toBe(600_000 - 750_000 + 630_000);
  expect(initialClock({ halftimeMinutes: 10, h1Length: '00:10:00', length: '00:20:00', start: 'x', latestTime: '00:20:00' }).phase).toBeNull();
});
```

Run → FAIL. **Step 2: Implement** (code above). **Step 3: Verify.** **Step 4: Commit** — `git commit -m "feat: match clock and time utilities (old timer semantics)"`.

---

### Task 4: Domain — match events

**Files:**
- Create: `src/domain/matchEvents.ts`, `src/domain/matchEvents.test.ts`
- Modify: `src/test/fixtures.ts` (add `recordedMatch()` fixture)

**Code:**

```ts
import type { CardType, GoalType, MatchDto } from '../api/types';
import { hmsToMs } from './time';

export type EventType = 'goal' | 'shot' | 'penalty' | 'goalieChange' | 'halftime' | 'end';
export interface GoalData { shooter: number | null; assistance: number | null; goalType: GoalType }
export interface ShotData { shooter: number | null }
export interface PenaltyData { player: number; card: CardType; reason: string }
export interface GoalieData { goalie: number }
export type EventData = GoalData | ShotData | PenaltyData | GoalieData;

export interface MatchEvent {
  /** Client UUID for locally created events (sent as client_id); `srv-<type>-<pk>` for server events. */
  id: string;
  type: EventType;
  time: string;
  team: number | null;
  data: EventData | null;
  pk: number | null;
  saved: boolean;
  /** Goal edited after creation (old flag; kept for compatibility of imported data). */
  onlyEdit?: boolean;
  /** Permanent sync error message. */
  error?: string | null;
}

export const CARDS: { id: CardType; text: string }[] = [
  { id: 'yellow', text: 'žlutá' },
  { id: 'red', text: 'červená' },
];
export const PENALTY_REASONS = [
  'Útočný faul', 'Nebezpečná střela', 'Obranný faul', 'Držení', 'Drsná hra', 'Nesportovní chování', 'Urážení rozhodčího', 'Jiné',
];
export const cardText = (card: CardType) => (card === 'red' ? 'červená' : 'žlutá');
export const penaltyLengthMs = (card: CardType) => (card === 'red' ? 120_000 : 60_000);

export const sortEvents = (events: MatchEvent[]) =>
  [...events].sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));

const serverId = (type: EventType, pk: number) => `srv-${type}-${pk}`;

/** Old inTeam(team_one, player) ? team_one : team_two. */
export function teamOf(match: MatchDto, rosterOf: (tot: number | null) => number[], player: number | null) {
  return player != null && rosterOf(match.team_one).includes(player) ? match.team_one : match.team_two;
}

export function serverEvents(match: MatchDto, rosterOf: (tot: number | null) => number[]) {
  const events: MatchEvent[] = [];
  const base = { saved: true, error: null } as const;
  for (const g of match.goals) {
    events.push({ ...base, id: serverId('goal', g.pk), type: 'goal', time: g.time ?? '00:00:00', pk: g.pk,
      team: teamOf(match, rosterOf, g.shooter),
      data: { shooter: g.shooter, assistance: g.assistance, goalType: g.type ?? 'normal' } });
  }
  for (const s of match.shots) {
    events.push({ ...base, id: serverId('shot', s.pk), type: 'shot', time: s.time, pk: s.pk, team: s.team, data: { shooter: s.shooter } });
  }
  for (const p of match.penalties) {
    events.push({ ...base, id: serverId('penalty', p.pk), type: 'penalty', time: p.time, pk: p.pk,
      team: teamOf(match, rosterOf, p.player), data: { player: p.player, card: p.card, reason: p.reason } });
  }
  const initialGoalies: Record<number, number | null> = {};
  for (const g of [...match.goalies].sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0))) {
    const team = teamOf(match, rosterOf, g.goalie);
    if (team == null) continue;
    if (g.start === '00:00:00') initialGoalies[team] = g.goalie;
    else events.push({ ...base, id: serverId('goalieChange', g.pk), type: 'goalieChange', time: g.start, pk: g.pk, team, data: { goalie: g.goalie } });
  }
  if (match.halftime_length) events.push({ ...base, id: 'halftime', type: 'halftime', time: match.halftime_length, team: null, data: null, pk: null });
  if (match.length) events.push({ ...base, id: 'end', type: 'end', time: match.length, team: null, data: null, pk: null });
  return { events: sortEvents(events), initialGoalies };
}

/** Local events win over server events with the same type+pk (edited locally). */
export function mergeLocal(server: MatchEvent[], local: MatchEvent[]): MatchEvent[] {
  const localKeys = new Set(local.filter((e) => e.pk != null).map((e) => `${e.type}-${e.pk}`));
  const localIds = new Set(local.map((e) => e.id));
  return sortEvents([...local, ...server.filter((e) => !localKeys.has(`${e.type}-${e.pk}`) && !localIds.has(e.id))]);
}

export function computeGoalies(initial: Record<number, number | null>, events: MatchEvent[]) {
  const goalies = { ...initial };
  for (const e of sortEvents(events)) {
    if (e.type === 'goalieChange' && e.team != null) goalies[e.team] = (e.data as GoalieData).goalie;
  }
  return goalies;
}

export function eventCounts(events: MatchEvent[], team: number | null) {
  let goals = 0;
  let shots = 0;
  for (const e of events) {
    if (e.team !== team) continue;
    if (e.type === 'goal') goals += 1;
    if (e.type === 'shot') shots += 1;
  }
  return { goals, shots };
}

export function activePenalties(events: MatchEvent[], team: number | null, gameMs: number) {
  return events
    .filter((e) => e.type === 'penalty' && e.team === team)
    .map((e) => {
      const len = penaltyLengthMs((e.data as PenaltyData).card);
      const elapsed = gameMs - hmsToMs(e.time);
      return { event: e, remainingMs: len - elapsed, active: elapsed >= 0 && elapsed <= len };
    })
    .filter((p) => p.active)
    .sort((a, b) => (a.event.time < b.event.time ? 1 : -1));
}
```

Fixture (`src/test/fixtures.ts`): `recordedMatch()` returns a `matchDto` for tournament 1, team_one 1000 (Ufo: players 100, 101), team_two 1001 (Kométa: no players in sample → add `player_pks: [102]` via a custom tots list in tests that need it), with:
`goals: [{ pk: 1, shooter: 100, assistance: 101, match: 500, time: '00:02:00', type: 'normal' }]`, `shots: [{ pk: 2, time: '00:03:00', match: 500, shooter: null, team: 1001 }]`, `penalties: [penaltyDto(pk 3, player 100, card 'yellow', reason 'Držení', time '00:04:00', match {pk:500}, tournament 1)]`, `goalies: [{ pk: 4, goalie: 101, match: 500, start: '00:00:00', end: null }, { pk: 5, goalie: 100, match: 500, start: '00:05:00', end: null }]`, `halftime_length: '00:10:00'`, `length: null`, `start: '2023-06-10 09:00:00+00:00'`, `referee: 102`, `referee_team: 1001`, `place: '1'`.

- [ ] **Step 1: Failing tests** — `src/domain/matchEvents.test.ts`:

```ts
import { expect, test } from 'vitest';
import { recordedMatch } from '../test/fixtures';
import {
  activePenalties, computeGoalies, eventCounts, mergeLocal, serverEvents, type MatchEvent,
} from './matchEvents';

const rosters: Record<number, number[]> = { 1000: [100, 101], 1001: [102] };
const rosterOf = (tot: number | null) => (tot == null ? [] : rosters[tot] ?? []);

test('server events with teams, initial goalies, halftime marker, sorted by time', () => {
  const { events, initialGoalies } = serverEvents(recordedMatch(), rosterOf);
  expect(events.map((e) => e.type)).toEqual(['goal', 'shot', 'penalty', 'goalieChange', 'halftime']);
  expect(events[0]).toMatchObject({ id: 'srv-goal-1', team: 1000, saved: true, pk: 1 });
  expect(events[2].team).toBe(1000);
  expect(initialGoalies).toEqual({ 1000: 101 });
  expect(computeGoalies(initialGoalies, events)).toEqual({ 1000: 100 });
});

test('mergeLocal: local edited copy replaces server event, new local events appended in time order', () => {
  const { events } = serverEvents(recordedMatch(), rosterOf);
  const edited: MatchEvent = { ...events[0], id: 'srv-goal-1', time: '00:02:30', saved: false };
  const fresh: MatchEvent = { id: 'u1', type: 'shot', time: '00:01:00', team: 1000, data: { shooter: null }, pk: null, saved: false };
  const merged = mergeLocal(events, [edited, fresh]);
  expect(merged.filter((e) => e.type === 'goal')).toHaveLength(1);
  expect(merged[0].id).toBe('u1');
  expect(merged.find((e) => e.type === 'goal')!.time).toBe('00:02:30');
});

test('counts and active penalties', () => {
  const { events } = serverEvents(recordedMatch(), rosterOf);
  expect(eventCounts(events, 1000)).toEqual({ goals: 1, shots: 0 });
  expect(eventCounts(events, 1001)).toEqual({ goals: 0, shots: 1 });
  expect(activePenalties(events, 1000, 240_000 + 30_000)[0].remainingMs).toBe(30_000);
  expect(activePenalties(events, 1000, 240_000 + 61_000)).toHaveLength(0);
  expect(activePenalties(events, 1000, 200_000)).toHaveLength(0);
});
```

Run → FAIL. **Step 2: Implement** (+ fixture). **Step 3: Verify.** **Step 4: Commit** — `git commit -m "feat: match events model built from server data"`.

---

### Task 5: Domain — recorder reducer

**Files:**
- Create: `src/domain/recorder.ts`, `src/domain/recorder.test.ts`

**Code:**

```ts
import type { MatchPatch } from '../api/types';
import { gameTimeMs, remaining, startClock, stopClock, stoppedClock, adjustClock, type ClockState, type Phase } from './clock';
import { computeGoalies, sortEvents, type EventData, type MatchEvent } from './matchEvents';
import { msToHms } from './time';

export interface RecorderState {
  matchPk: number;
  tournamentPk: number;
  teamOne: number | null;
  teamTwo: number | null;
  halftimeMinutes: number;
  phase: Phase;
  h1Length: string | null;
  length: string | null;
  start: string | null;
  end: string | null;
  referee: number | null;
  matchPatch: MatchPatch | null;
  matchPatchError: string | null;
  clock: ClockState;
  events: MatchEvent[];
  initialGoalies: Record<number, number | null>;
  goalies: Record<number, number | null>;
  sidesSwapped: boolean;
}

export type RecorderAction =
  | { type: 'clockStart'; now: number }
  | { type: 'clockStop'; now: number }
  | { type: 'clockAdjust'; delta: number }
  | { type: 'kickoff'; now: number; at: string }
  | { type: 'nextPhase'; now: number; at: string }
  | { type: 'setReferee'; referee: number }
  | { type: 'addEvent'; event: MatchEvent }
  | { type: 'editEvent'; id: string; time: string; data: EventData }
  | { type: 'removeEvent'; id: string }
  | { type: 'syncOk'; id: string; pk: number | null }
  | { type: 'syncFail'; id: string; message: string }
  | { type: 'retryEvent'; id: string }
  | { type: 'patchOk'; sent: MatchPatch }
  | { type: 'patchFail'; message: string }
  | { type: 'retryPatch' }
  | { type: 'swapSides' };

export const currentGameTime = (s: RecorderState, now: number) =>
  msToHms(gameTimeMs(s.halftimeMinutes, remaining(s.clock, now), s.phase, s.h1Length));

const marker = (type: 'halftime' | 'end', time: string): MatchEvent => ({
  id: type, type, time, team: null, data: null, pk: null, saved: true, error: null,
});

const withEvents = (s: RecorderState, events: MatchEvent[]): RecorderState => {
  const sorted = sortEvents(events);
  return { ...s, events: sorted, goalies: computeGoalies(s.initialGoalies, sorted) };
};

const patch = (s: RecorderState, p: MatchPatch): MatchPatch => ({ ...(s.matchPatch ?? {}), ...p });

export function recorderReducer(s: RecorderState, a: RecorderAction): RecorderState {
  switch (a.type) {
    case 'clockStart':
      return s.phase === 0 ? s : { ...s, clock: startClock(s.clock, a.now) };
    case 'clockStop':
      return { ...s, clock: stopClock(s.clock, a.now) };
    case 'clockAdjust':
      return { ...s, clock: adjustClock(s.clock, a.delta) };
    case 'kickoff':
      if (s.phase !== 0) return s;
      return { ...s, phase: 1, start: a.at, matchPatch: patch(s, { start: a.at }), clock: startClock(s.clock, a.now) };
    case 'nextPhase': {
      const clock = stopClock(s.clock, a.now);
      const time = msToHms(gameTimeMs(s.halftimeMinutes, clock.remainingMs, s.phase, s.h1Length));
      if (s.phase === 1) {
        return withEvents(
          { ...s, phase: 2, h1Length: time, clock: stoppedClock(s.halftimeMinutes * 60_000), matchPatch: patch(s, { halftime_length: time }) },
          [...s.events, marker('halftime', time)],
        );
      }
      if (s.phase === 2) {
        return withEvents(
          { ...s, phase: null, length: time, end: a.at, clock, matchPatch: patch(s, { length: time, end: a.at }) },
          [...s.events, marker('end', time)],
        );
      }
      return s;
    }
    case 'setReferee':
      return { ...s, referee: a.referee, matchPatch: patch(s, { referee: a.referee }), matchPatchError: null };
    case 'addEvent':
      return withEvents(s, [...s.events, a.event]);
    case 'editEvent':
      return withEvents(
        s,
        s.events.map((e) =>
          e.id === a.id ? { ...e, time: a.time, data: a.data, saved: false, error: null, onlyEdit: e.type === 'goal' ? true : e.onlyEdit } : e,
        ),
      );
    case 'removeEvent':
      return withEvents(s, s.events.filter((e) => e.id !== a.id));
    case 'syncOk':
      return { ...s, events: s.events.map((e) => (e.id === a.id ? { ...e, saved: true, error: null, pk: a.pk ?? e.pk } : e)) };
    case 'syncFail':
      return { ...s, events: s.events.map((e) => (e.id === a.id ? { ...e, error: a.message } : e)) };
    case 'retryEvent':
      return { ...s, events: s.events.map((e) => (e.id === a.id ? { ...e, error: null } : e)) };
    case 'patchOk': {
      if (!s.matchPatch) return s;
      const rest = Object.fromEntries(
        Object.entries(s.matchPatch).filter(([k, v]) => a.sent[k as keyof MatchPatch] !== v),
      ) as MatchPatch;
      return { ...s, matchPatch: Object.keys(rest).length ? rest : null, matchPatchError: null };
    }
    case 'patchFail':
      return { ...s, matchPatchError: a.message };
    case 'retryPatch':
      return { ...s, matchPatchError: null };
    case 'swapSides':
      return { ...s, sidesSwapped: !s.sidesSwapped };
  }
}
```

- [ ] **Step 1: Failing tests** — `src/domain/recorder.test.ts`: build a base state helper

```ts
import { expect, test } from 'vitest';
import { stoppedClock } from './clock';
import { currentGameTime, recorderReducer, type RecorderState } from './recorder';

const base = (o: Partial<RecorderState> = {}): RecorderState => ({
  matchPk: 500, tournamentPk: 1, teamOne: 1000, teamTwo: 1001, halftimeMinutes: 10, phase: 0,
  h1Length: null, length: null, start: null, end: null, referee: null, matchPatch: null, matchPatchError: null,
  clock: stoppedClock(600_000), events: [], initialGoalies: { 1000: 101, 1001: 102 }, goalies: { 1000: 101, 1001: 102 },
  sidesSwapped: false, ...o,
});

test('kickoff starts clock and queues start patch; clockStart ignored before kickoff', () => {
  expect(recorderReducer(base(), { type: 'clockStart', now: 0 }).clock.running).toBe(false);
  const s = recorderReducer(base(), { type: 'kickoff', now: 1000, at: '2025-05-01 09:00:00' });
  expect(s.phase).toBe(1);
  expect(s.clock.running).toBe(true);
  expect(s.matchPatch).toEqual({ start: '2025-05-01 09:00:00' });
  expect(currentGameTime(s, 1000 + 125_000)).toBe('00:02:05');
});

test('next phase: halftime then end, with markers and patches', () => {
  let s = recorderReducer(base(), { type: 'kickoff', now: 0, at: 'A' });
  s = recorderReducer(s, { type: 'nextPhase', now: 630_000, at: 'B' });
  expect(s).toMatchObject({ phase: 2, h1Length: '00:10:30' });
  expect(s.clock).toEqual(stoppedClock(600_000));
  expect(s.events.at(-1)).toMatchObject({ type: 'halftime', time: '00:10:30', saved: true });
  s = recorderReducer(s, { type: 'clockStart', now: 1_000_000 });
  s = recorderReducer(s, { type: 'nextPhase', now: 1_600_000, at: 'C' });
  expect(s).toMatchObject({ phase: null, length: '00:20:30', end: 'C' });
  expect(s.matchPatch).toEqual({ start: 'A', halftime_length: '00:10:30', length: '00:20:30', end: 'C' });
});

test('events: add goalie change updates goalies; edit marks unsaved; sync ok/fail/retry', () => {
  let s = recorderReducer(base(), {
    type: 'addEvent',
    event: { id: 'g1', type: 'goalieChange', time: '00:01:00', team: 1000, data: { goalie: 100 }, pk: null, saved: false },
  });
  expect(s.goalies[1000]).toBe(100);
  s = recorderReducer(s, { type: 'syncOk', id: 'g1', pk: null });
  expect(s.events[0].saved).toBe(true);
  s = recorderReducer(s, {
    type: 'addEvent',
    event: { id: 'x', type: 'goal', time: '00:02:00', team: 1000, data: { shooter: 100, assistance: null, goalType: 'normal' }, pk: null, saved: false },
  });
  s = recorderReducer(s, { type: 'syncFail', id: 'x', message: 'Střelec se nenachází ani v jednom z týmů.' });
  expect(s.events[1].error).toMatch(/Střelec/);
  s = recorderReducer(s, { type: 'retryEvent', id: 'x' });
  expect(s.events[1].error).toBeNull();
  s = recorderReducer(s, { type: 'syncOk', id: 'x', pk: 77 });
  s = recorderReducer(s, { type: 'editEvent', id: 'x', time: '00:02:10', data: { shooter: 101, assistance: null, goalType: 'normal' } });
  expect(s.events[1]).toMatchObject({ saved: false, pk: 77, time: '00:02:10', onlyEdit: true });
});

test('patchOk keeps fields changed after sending', () => {
  let s = base({ matchPatch: { start: 'A', referee: 5 } });
  s = recorderReducer(s, { type: 'setReferee', referee: 6 });
  s = recorderReducer(s, { type: 'patchOk', sent: { start: 'A', referee: 5 } });
  expect(s.matchPatch).toEqual({ referee: 6 });
  s = recorderReducer(s, { type: 'patchOk', sent: { referee: 6 } });
  expect(s.matchPatch).toBeNull();
});
```

Run → FAIL. **Step 2: Implement.** **Step 3: Verify.** **Step 4: Commit** — `git commit -m "feat: match recorder reducer"`.

---

### Task 6: Domain — recorder storage, old-app import, initial state

**Files:**
- Create: `src/domain/recorderStorage.ts`, `src/domain/recorderStorage.test.ts`

**Interfaces / code:**

```ts
import type { MatchDto, MatchPatch, TournamentDto } from '../api/types';
import { initialClock, type ClockState, type Phase } from './clock';
import { computeGoalies, mergeLocal, serverEvents, type EventData, type MatchEvent } from './matchEvents';
import type { RecorderState } from './recorder';

export const storageKey = (pk: number) => `ufo:match:${pk}`;
const importedKey = (pk: number) => `ufo:match:${pk}:imported`;

export interface StoredRecorder {
  v: 1;
  phase: Phase;
  h1Length: string | null;
  length: string | null;
  start: string | null;
  end: string | null;
  referee: number | null;
  matchPatch: MatchPatch | null;
  clock: ClockState;
  /** Unsaved events only. */
  events: MatchEvent[];
  sidesSwapped: boolean;
}

function read(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function write(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* storage unavailable or full */ }
}

export function saveRecorder(s: RecorderState) {
  const stored: StoredRecorder = {
    v: 1, phase: s.phase, h1Length: s.h1Length, length: s.length, start: s.start, end: s.end, referee: s.referee,
    matchPatch: s.matchPatch, clock: s.clock, events: s.events.filter((e) => !e.saved), sidesSwapped: s.sidesSwapped,
  };
  write(storageKey(s.matchPk), JSON.stringify(stored));
}

export function loadRecorder(pk: number): StoredRecorder | null {
  const raw = read(storageKey(pk));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredRecorder;
    return parsed?.v === 1 ? parsed : null;
  } catch {
    return null;
  }
}

interface OldEvent { type: MatchEvent['type']; time: string; team?: number; onlyEdit?: boolean; data?: Record<string, unknown> }

/** One-time import of the old AngularJS recorder data (same origin). Old keys are left untouched. */
export function importOldRecorder(pk: number): { events: MatchEvent[]; time: string | null; patch: MatchPatch | null } | null {
  if (read(importedKey(pk))) return null;
  const rawEvents = read(`events${pk}`);
  const time = read(`time${pk}`);
  const rawMatch = read(`match${pk}`);
  if (!rawEvents && !time && !rawMatch) return null;
  write(importedKey(pk), '1');
  let events: MatchEvent[] = [];
  try {
    events = ((JSON.parse(rawEvents ?? '[]') as OldEvent[]) ?? []).flatMap((e) => convertOldEvent(e));
  } catch { events = []; }
  let patch: MatchPatch | null = null;
  try {
    const m = rawMatch ? (JSON.parse(rawMatch) as Record<string, unknown>) : null;
    if (m) {
      patch = {};
      for (const k of ['start', 'end', 'halftime_length', 'length'] as const) if (typeof m[k] === 'string') patch[k] = m[k] as string;
      if (typeof m.referee === 'number') patch.referee = m.referee;
      if (!Object.keys(patch).length) patch = null;
    }
  } catch { patch = null; }
  return { events, time, patch };
}

function convertOldEvent(e: OldEvent): MatchEvent[] {
  const d = e.data ?? {};
  const num = (v: unknown) => (typeof v === 'number' ? v : null);
  let data: EventData;
  switch (e.type) {
    case 'goal': data = { shooter: num(d.shooter), assistance: num(d.assistance), goalType: (d.type as 'penalty' | 'shootout') ?? 'normal' }; break;
    case 'shot': data = { shooter: num(d.shooter) }; break;
    case 'penalty': data = { player: num(d.player) ?? 0, card: d.card === 'red' ? 'red' : 'yellow', reason: String(d.reason ?? '') }; break;
    case 'goalieChange': data = { goalie: num(d.goalie) ?? 0 }; break;
    default: return [];
  }
  return [{ id: crypto.randomUUID(), type: e.type, time: e.time, team: e.team ?? null, data, pk: num(d.pk), saved: false, onlyEdit: e.onlyEdit, error: null }];
}

export function initRecorder(o: {
  match: MatchDto;
  tournament: TournamentDto;
  rosterOf: (tot: number | null) => number[];
  stored: StoredRecorder | null;
  imported: ReturnType<typeof importOldRecorder>;
}): RecorderState {
  const { match, tournament } = o;
  const server = serverEvents(match, o.rosterOf);
  const common = {
    matchPk: match.pk, tournamentPk: tournament.pk, teamOne: match.team_one, teamTwo: match.team_two,
    halftimeMinutes: tournament.halftime_length, initialGoalies: server.initialGoalies, matchPatchError: null,
  };
  if (o.stored) {
    const events = mergeLocal(server.events, o.stored.events);
    return {
      ...common, phase: o.stored.phase, h1Length: o.stored.h1Length, length: o.stored.length, start: o.stored.start,
      end: o.stored.end, referee: o.stored.referee, matchPatch: o.stored.matchPatch, clock: o.stored.clock, events,
      goalies: computeGoalies(server.initialGoalies, events), sidesSwapped: o.stored.sidesSwapped,
    };
  }
  const p = o.imported?.patch ?? null;
  const events = mergeLocal(server.events, o.imported?.events ?? []);
  const latestTime = [o.imported?.time ?? '00:00:00', ...events.map((e) => e.time)].reduce((a, b) => (b > a ? b : a));
  const h1Length = p?.halftime_length ?? match.halftime_length;
  const length = p?.length ?? match.length;
  const start = p?.start ?? match.start;
  const { phase, clock } = initialClock({ halftimeMinutes: tournament.halftime_length, h1Length, length, start, latestTime });
  return {
    ...common, phase, h1Length, length, start, end: p?.end ?? match.end, referee: p?.referee ?? match.referee,
    matchPatch: p, clock, events, goalies: computeGoalies(server.initialGoalies, events), sidesSwapped: false,
  };
}
```

- [ ] **Step 1: Failing tests** — `src/domain/recorderStorage.test.ts`:

```ts
import { expect, test } from 'vitest';
import { recordedMatch, t1 } from '../test/fixtures';
import { startClock, stoppedClock } from './clock';
import { recorderReducer } from './recorder';
import { importOldRecorder, initRecorder, loadRecorder, saveRecorder, storageKey } from './recorderStorage';

const rosters: Record<number, number[]> = { 1000: [100, 101], 1001: [102] };
const rosterOf = (tot: number | null) => (tot == null ? [] : rosters[tot] ?? []);
const tournament = { ...t1, halftime_length: 10 };

test('fresh init derives phase 2 from server halftime', () => {
  const s = initRecorder({ match: recordedMatch(), tournament, rosterOf, stored: null, imported: null });
  expect(s.phase).toBe(2);
  expect(s.events.some((e) => e.type === 'halftime')).toBe(true);
  expect(s.goalies[1000]).toBe(100);
});

test('save/load round trip keeps running clock and only unsaved events, never in-flight state', () => {
  let s = initRecorder({ match: { ...recordedMatch(), halftime_length: null }, tournament, rosterOf, stored: null, imported: null });
  s = { ...s, clock: startClock(stoppedClock(500_000), 1_000) };
  s = recorderReducer(s, {
    type: 'addEvent',
    event: { id: 'u1', type: 'shot', time: '00:05:00', team: 1000, data: { shooter: null }, pk: null, saved: false },
  });
  saveRecorder(s);
  const stored = loadRecorder(500)!;
  expect(stored.clock.running).toBe(true);
  expect(stored.events.map((e) => e.id)).toEqual(['u1']);
  const restored = initRecorder({ match: { ...recordedMatch(), halftime_length: null }, tournament, rosterOf, stored, imported: null });
  expect(restored.events.find((e) => e.id === 'u1')).toBeTruthy();
  expect(restored.events.filter((e) => e.type === 'goal')).toHaveLength(1);
  expect(JSON.parse(localStorage.getItem(storageKey(500))!).events[0]).not.toHaveProperty('inFlight');
});

test('old app data is imported once and old keys are kept', () => {
  localStorage.setItem('time500', '00:06:00');
  localStorage.setItem('events500', JSON.stringify([
    { type: 'goal', time: '00:06:00', saved: false, team: 1000, data: { shooter: 100, match: 500, team: 1000, time: '00:06:00' } },
  ]));
  localStorage.setItem('match500', JSON.stringify({ pk: 500, referee: 102, changed: true }));
  const imported = importOldRecorder(500)!;
  expect(imported.events[0]).toMatchObject({ type: 'goal', team: 1000, saved: false, data: { shooter: 100, assistance: null, goalType: 'normal' } });
  expect(imported.time).toBe('00:06:00');
  expect(imported.patch).toEqual({ referee: 102 });
  expect(importOldRecorder(500)).toBeNull();
  expect(localStorage.getItem('events500')).not.toBeNull();
});
```

(`src/test/setup.ts` clears localStorage after each test.) Run → FAIL. **Step 2: Implement.** **Step 3: Verify.** **Step 4: Commit** — `git commit -m "feat: recorder persistence with old app import"`.

---

### Task 7: Sync hook (`useMatchSync`) and `useNow`

**Files:**
- Create: `src/hooks/useMatchSync.ts`, `src/hooks/useMatchSync.test.tsx`, `src/hooks/useNow.ts`

**Interfaces:**
- `nextWork(s: RecorderState): { kind: 'patch'; patch: MatchPatch } | { kind: 'event'; event: MatchEvent } | null` — patch first (if set and no `matchPatchError`), else first event (in list order) with `!saved && !error` whose type is not `halftime`/`end`.
- `sendWork(work, s): Promise<number | null>` — request mapping:
  - patch → `editMatch(s.matchPk, patch)` → `null`
  - goal → body `{ match, shooter, time, ...(assistance != null && { assistance }), ...(goalType !== 'normal' && { type: goalType }) }`; `pk ? editGoal(pk, body) : addGoal({ ...body, client_id: id })`
  - shot → `addShot({ match, team, time, ...(shooter != null && { shooter }), client_id: id })` (shots are never edited)
  - penalty → body `{ match, player, card, reason, time }`; `pk ? editPenalty(pk, body) : addPenalty({ ...body, client_id: id })`
  - goalieChange → `changeGoalie(match, team, { goalie, time, client_id: id })` → `null`
- `isPermanent(err) = err instanceof ApiError && err.status >= 400 && err.status < 500`.
- `useMatchSync(state, dispatch, { enabled: boolean; onSynced?: () => void })` returns `{ inFlightId: string | null; offline: boolean; pending: number; errors: number }`. Behaviour: whenever idle and `nextWork` exists, send it; success → `syncOk`/`patchOk`, reset backoff, call `onSynced`; permanent failure → `syncFail`/`patchFail` (message = `err.message`) and continue with the next item; transient failure → `offline = true`, retry after `RETRY_DELAYS = [2000, 5000, 10000, 30000]` (index = attempt, capped) or immediately on `window` `online` event. Exactly one request in flight. Ignore results after unmount.
- `useNow(intervalMs: number, active: boolean): number` — `Date.now()` re-rendering every `intervalMs` while `active`.

Implementation sketch for the hook (keep it this simple):

```ts
export function useMatchSync(state: RecorderState, dispatch: Dispatch<RecorderAction>, opts: { enabled: boolean; onSynced?: () => void }) {
  const [inFlightId, setInFlightId] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [wake, setWake] = useState(0);
  const busy = useRef(false);
  const attempt = useRef(0);
  const mounted = useRef(true);
  const onSynced = useRef(opts.onSynced);
  useEffect(() => { onSynced.current = opts.onSynced; });
  useEffect(() => () => { mounted.current = false; }, []);
  useEffect(() => {
    const onOnline = () => setWake((w) => w + 1);
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, []);

  useEffect(() => {
    if (!opts.enabled || busy.current) return;
    const work = nextWork(state);
    if (!work) return;
    busy.current = true;
    const id = work.kind === 'event' ? work.event.id : 'patch';
    setInFlightId(id);
    let timer: ReturnType<typeof setTimeout> | undefined;
    sendWork(work, state)
      .then((pk) => {
        if (!mounted.current) return;
        dispatch(work.kind === 'patch' ? { type: 'patchOk', sent: work.patch } : { type: 'syncOk', id, pk });
        attempt.current = 0;
        setOffline(false);
        onSynced.current?.();
      })
      .catch((err: unknown) => {
        if (!mounted.current) return;
        if (isPermanent(err)) {
          const message = (err as Error).message;
          dispatch(work.kind === 'patch' ? { type: 'patchFail', message } : { type: 'syncFail', id, message });
          return;
        }
        setOffline(true);
        const delay = RETRY_DELAYS[Math.min(attempt.current, RETRY_DELAYS.length - 1)];
        attempt.current += 1;
        timer = setTimeout(() => setWake((w) => w + 1), delay);
      })
      .finally(() => {
        busy.current = false;
        if (mounted.current) setInFlightId(null);
      });
    return () => { if (timer) clearTimeout(timer); };
  }, [state, wake, opts.enabled, dispatch]);
  // pending / errors derived from state
}
```

Careful: the effect cleanup above would cancel the retry timer whenever `state` changes (e.g. user adds an event while offline). That is acceptable only if the next effect run immediately re-sends; since `busy` is false after `finally`, a state change triggers an immediate send, which is fine (the user acted). Keep the retry timer in a ref instead of the effect cleanup if tests show it being cancelled unexpectedly; clear it on unmount.

- [ ] **Step 1: Failing tests** — `src/hooks/useMatchSync.test.tsx` (use `vi.useFakeTimers({ shouldAdvanceTime: true })` where backoff is tested):

```tsx
import { act, renderHook, waitFor } from '@testing-library/react';
import { useReducer } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { stoppedClock } from '../domain/clock';
import type { MatchEvent } from '../domain/matchEvents';
import { recorderReducer, type RecorderState } from '../domain/recorder';
import { nextWork, useMatchSync } from './useMatchSync';

const fetchMock = vi.fn();
beforeEach(() => vi.stubGlobal('fetch', fetchMock));
afterEach(() => { fetchMock.mockReset(); vi.useRealTimers(); });

const ev = (id: string, o: Partial<MatchEvent> = {}): MatchEvent => ({
  id, type: 'shot', time: '00:01:00', team: 1000, data: { shooter: null }, pk: null, saved: false, error: null, ...o,
});
const base = (o: Partial<RecorderState> = {}): RecorderState => ({
  matchPk: 500, tournamentPk: 1, teamOne: 1000, teamTwo: 1001, halftimeMinutes: 10, phase: 1, h1Length: null, length: null,
  start: 'A', end: null, referee: 102, matchPatch: null, matchPatchError: null, clock: stoppedClock(600_000), events: [],
  initialGoalies: {}, goalies: {}, sidesSwapped: false, ...o,
});

function useHarness(initial: RecorderState) {
  const [state, dispatch] = useReducer(recorderReducer, initial);
  const sync = useMatchSync(state, dispatch, { enabled: true });
  return { state, sync };
}

const body = (i: number) => JSON.parse(fetchMock.mock.calls[i][1].body);

test('nextWork prefers patch, skips errored and saved events', () => {
  expect(nextWork(base({ matchPatch: { start: 'A' }, events: [ev('a')] }))).toMatchObject({ kind: 'patch' });
  expect(nextWork(base({ events: [ev('a', { saved: true }), ev('b', { error: 'x' }), ev('c')] }))).toMatchObject({ kind: 'event', event: { id: 'c' } });
});

test('sends patch then events in order, one at a time, with client_id', async () => {
  fetchMock.mockImplementation(async () => new Response('11', { status: 200 }));
  const { result } = renderHook(() => useHarness(base({ matchPatch: { start: 'A' }, events: [ev('a'), ev('b', { time: '00:02:00' })] })));
  await waitFor(() => expect(result.current.state.events.every((e) => e.saved)).toBe(true));
  expect(fetchMock.mock.calls.map(([u]) => String(u))).toEqual([
    '/api_frontend/edit_match/500', '/api_frontend/add_shot', '/api_frontend/add_shot',
  ]);
  expect(body(1)).toEqual({ match: 500, team: 1000, time: '00:01:00', client_id: 'a' });
  expect(result.current.state.matchPatch).toBeNull();
});

test('permanent 400 marks event and continues with the next', async () => {
  fetchMock
    .mockResolvedValueOnce(new Response('Střelec se nenachází ani v jednom z týmů.', { status: 400 }))
    .mockResolvedValueOnce(new Response('12', { status: 200 }));
  const { result } = renderHook(() => useHarness(base({ events: [ev('a'), ev('b', { time: '00:02:00' })] })));
  await waitFor(() => expect(result.current.state.events[1].saved).toBe(true));
  expect(result.current.state.events[0].error).toBe('Střelec se nenachází ani v jednom z týmů.');
  expect(result.current.sync.errors).toBe(1);
});

test('network failure retries with backoff and keeps order', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValue(new Response('13', { status: 200 }));
  const { result } = renderHook(() => useHarness(base({ events: [ev('a')] })));
  await waitFor(() => expect(result.current.sync.offline).toBe(true));
  expect(fetchMock).toHaveBeenCalledTimes(1);
  await act(async () => { vi.advanceTimersByTime(2100); });
  await waitFor(() => expect(result.current.state.events[0].saved).toBe(true));
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(result.current.sync.offline).toBe(false);
});

test('goalie change posts to change_goalie/<match>-<team>', async () => {
  fetchMock.mockResolvedValue(new Response('OK', { status: 200 }));
  const { result } = renderHook(() => useHarness(base({
    events: [ev('g', { type: 'goalieChange', data: { goalie: 100 } })],
  })));
  await waitFor(() => expect(result.current.state.events[0].saved).toBe(true));
  expect(String(fetchMock.mock.calls[0][0])).toBe('/api_frontend/change_goalie/500-1000');
  expect(body(0)).toEqual({ goalie: 100, time: '00:01:00', client_id: 'g' });
});
```

Run → FAIL. **Step 2: Implement** both hooks. **Step 3: Verify.** **Step 4: Commit** — `git commit -m "feat: ordered match sync queue with retry and useNow"`.

---

### Task 8: Shared match UI components

**Files:**
- Create in `src/components/match/`: `icons.ts`, `MatchStatus.tsx`, `ClockControls.tsx`, `GoalieRow.tsx`, `TeamNames.tsx`, `Scoreboard.tsx`, `PenaltyCountdowns.tsx`, `EventList.tsx`, `PlayerTiles.tsx`, `SyncStatus.tsx`, `match.test.tsx`
- Modify: `src/index.css` (add `.pressbutton`, `.pressbutton-red`, `.team-one` (`color: darkblue`), `.team-two` (`color: darkred`) component classes — R§4.3 values)

**Interfaces (props) and behaviour (R§4):**
- `icons.ts`: `ICONS = { rewind: '⏪', back1: '◀', play: '▶', pause: '⏸', fwd1: '▶', fastForward: '⏩', next: '➜', swap: '⇄', card: '⚠', unlink: '⛓', remove: '✕', edit: '✎', goalie: '⟳' }`.
- `MatchStatus({ phase, onNextPhase?, liveToggle? })`: phase 1/2 → "`{phase}. poločas`" (a button only when `onNextPhase` given, also an extra "➜" button `aria-label="Další poločas"`); phase null → "zápas ukončen"; phase 0 → nothing. `liveToggle?: { checked, onChange }` renders the "živě" checkbox (`aria-label="živě"`).
- `ClockControls({ remainingMs, running, phase, onToggle, onAdjust })`: row `⏪ ◀ [▶|⏸] [MM:SS.d] ▶ ⏩`; buttons labelled `+5 s`, `+1 s`, `Start`/`Pauza` (play/pause button `aria-label` "Spustit čas" / "Zastavit čas"), `−1 s`, `−5 s` (`aria-label`s "Přidat 5 s", "Přidat 1 s", "Ubrat 1 s", "Ubrat 5 s"); the digits are a button (`aria-label="Čas zápasu"`) calling `onToggle`; text from `formatClock`, red when negative; phase 0 → play+digits highlighted (`pressbutton`). Large font (`text-5xl`), centered, `select-none`.
- `GoalieRow({ left, right, onChange? })` where side = `{ team: number; goalieName: string | null; colorClass: string }`: shows bold goalie name or "bez brankáře", clickable (button) when `onChange` → `onChange(team)`; left right-aligned, right left-aligned.
- `TeamNames({ left, right, onSwap? })`: two bold `text-2xl` names with team color; middle "⇄" button `aria-label="Prohodit strany"` when `onSwap`.
- `Scoreboard({ left, right })` side = `{ goals, shots, colorClass }`: left: `{pct}% - {goals+shots}` then big goals; right mirrored; pct = `Math.round(goals/(goals+shots)*100)`, empty when 0 shots+goals.
- `PenaltyCountdowns({ left, right })` sides = `{ items: { id, playerName, remainingMs }[], colorClass }`: each item `⚠ {mm:ss} - <b>{name}</b>`; mm:ss from `remainingMs` (floor seconds).
- `EventList({ events, sides, teamColor, playerName, showShots, editable, inFlightId, onEdit, onRemove, onRetry, onDiscard })`:
  - events newest first; shots hidden unless `showShots`.
  - Mobile (single column, `md:hidden`) and desktop (`hidden md:grid`, mirrored 3 columns: left team text / center time + icons / right team text; halftime/end shown centered across) — both render the same row content builder.
  - Row text: goal `gól: <b>{shooter}</b>` + ` - {assistance}` + ` - penalta`/` - penaltový rozstřel`; shot `střela` + `: {shooter}`; penalty `⚠ {cardText} karta: <b>{player}</b> - {reason}`; goalieChange `⟳ změna brankáře: <b>{goalie}</b>`; halftime `konec poločasu` (with a rule); end `konec zápasu`. Time via `shortTime`.
  - Unsaved → `⛓` (`title="Neuloženo"`); `error` → red text with message + buttons "Zkusit znovu" (`onRetry(id)`) and, if `pk == null`, "Zahodit" (`onDiscard(id)`).
  - `editable` → "✕" (`aria-label="Smazat"`) for goal/shot/penalty (disabled when `id === inFlightId`) and "✎" (`aria-label="Upravit"`) for goal/penalty.
- `PlayerTiles({ players, onPick, hiddenPk?, extra? })`: grid (`grid-cols-2 md:grid-cols-3`) of `pressbutton` buttons with nickname; `hiddenPk` renders an empty placeholder tile; `extra` = extra red tiles `{ label, onClick }[]`.
- `SyncStatus({ pending, errors, offline, patchError, onRetryPatch })`: "Vše uloženo" (green) / "Neuloženo: {n}" / "Offline – čeká {n}" / "Chyby: {n}"; when `patchError`: alert "Uložení zápasu selhalo: {msg}" + button "Zkusit znovu".

- [ ] **Step 1: Failing tests** — `src/components/match/match.test.tsx` covering: ClockControls text/negative class and that clicking digits calls `onToggle`; Scoreboard pct ("75% - 4" for 3 goals + 1 shot; empty pct for 0/0); EventList hides shots unless `showShots`, shows error with "Zkusit znovu"/"Zahodit" only when no pk, ✕ disabled for in-flight id; SyncStatus variants; PlayerTiles hidden tile and extra tiles. Write concrete assertions using `render` from Testing Library.

Run → FAIL. **Step 2: Implement.** **Step 3: Verify.** **Step 4: Commit** — `git commit -m "feat: shared match page components"`.

---

### Task 9: Match dialogs

**Files:**
- Create in `src/components/match/dialogs/`: `ConfirmDialog.tsx`, `GoalDialog.tsx`, `PenaltyDialog.tsx`, `GoalieChangeDialog.tsx`, `RefereeDialog.tsx`, `EditGoalDialog.tsx`, `EditPenaltyDialog.tsx`, `dialogs.test.tsx`

All dialogs use `Modal` (mount content only while `open`, so drafts reset on close). Props share `{ open: boolean; onClose: () => void }`.

- `ConfirmDialog({ open, text, confirmLabel = 'Ano', onConfirm, onClose })` — text + big buttons "Ano"/"Zrušit".
- `GoalDialog({ open, teamName, players, onSave, onClose })` → `onSave({ shooter: number | null; assistance: number | null; goalType })`. Step 1 title "Gól - {team} - střelec": `PlayerTiles` (pick shooter). Step 2 title "Gól - {team} - asistence": `PlayerTiles` with the shooter tile hidden + extra red tiles "nikdo" (assistance null), "penalta" (goalType 'penalty', assistance null), "rozstřel" ('shootout', assistance null), plus a "‹ zpět na střelce" button. Picking an assistant saves `normal`.
- `PenaltyDialog({ open, teamName, players, onSave, onClose })` → `onSave({ player, card, reason })`. Step 1 player tiles; Step 2 title "Karta - {team} - {player}": select "Karta" (žlutá/červená, default žlutá), select "Odůvodnění" (`----` + `PENALTY_REASONS`), input "dodatečné info"; button "Udělit" disabled until a reason is chosen; reason = `extra ? \`${reason} - ${extra}\` : reason`.
- `GoalieChangeDialog({ open, teamName, players, onSave, onClose })` — title "Změna brankáře - {team}", tiles; pick → `onSave(pk)` (dialog closes via parent).
- `RefereeDialog({ open, players, value, onSave, onClose })` — title "Volba hlavního rozhodčího", select (`----` + referee team players, label nickname); change → `onSave(pk)`.
- `EditGoalDialog({ open, teamName, players, event, onSave, onClose })` → `onSave(time, data)`. Fields: "Čas" (`HH:MM:SS`, validated with `isValidHms`; invalid → inline "Neplatný čas (HH:MM:SS)." and save disabled), "Střelec", "Asistence" (`----` = null), "Typ gólu" (Běžný/Penalta/Penaltový rozstřel); button "Upravit".
- `EditPenaltyDialog({ open, teamName, players, event, onSave, onClose })` → fields "Čas", "Hráč", "Karta", "Odůvodnění" (textarea); button "Upravit".

- [ ] **Step 1: Failing tests** — `dialogs.test.tsx`: GoalDialog two-step flow (pick shooter → pick assistant → `onSave({shooter, assistance, goalType:'normal'})`; "penalta" → `{assistance:null, goalType:'penalty'}`; back button returns to shooter step); PenaltyDialog requires reason and concatenates extra; EditGoalDialog rejects "12:34" and saves "00:12:34"; ConfirmDialog calls onConfirm.

Run → FAIL. **Step 2: Implement.** **Step 3: Verify.** **Step 4: Commit** — `git commit -m "feat: match dialogs"`.

---

### Task 10: Match view page

**Files:**
- Create: `src/pages/MatchViewPage.tsx`, `src/pages/MatchViewPage.test.tsx`
- Modify: `src/router.tsx` (route `tournaments/:id/matches/:matchId`, public)

**Behaviour:** `useTournament(id)`, `useGraph()`, `useMatches(id, { refetchInterval: live ? 15_000 : false })` with "živě" checkbox (default on); `match = matches.find(pk === matchId)`; not found → `BackLink` + alert "Zápas nenalezen.". Errors → `ErrorBox` only when no data.
- Build `{ events, initialGoalies } = serverEvents(match, rosterOf)` (rosterOf from `graph.totsById.get(tot)?.playerPks ?? []`), `goalies = computeGoalies(...)`, phase = `length ? null : halftime_length ? 2 : start ? 1 : 0`.
- Layout: `BackLink fallback={livePath(id)}`; `MatchStatus` (no `onNextPhase`) with live toggle; if `canRecord(user) && !(closed_edit && !isStaff(user))` a link "Zaznamenávat" → `matchPath(id, matchId, true)`; referee line "píská: {referee_team name_pure} - <b>{referee nickname}</b>"; `GoalieRow` (read-only); `TeamNames` (team one left); `Scoreboard`; checkbox "střely" (`aria-label="střely"`); `EventList` (not editable).

- [ ] **Step 1: Failing test** — renders goal/penalty/goalie change/halftime rows from `recordedMatch()` (mock `matchs?tournament=1` with it), scoreboard "1" vs "0", referee line, "živě" checked, shots hidden until "střely" ticked, unknown match id → "Zápas nenalezen.".

Run → FAIL. **Step 2: Implement** + route. **Step 3: Verify.** **Step 4: Commit** — `git commit -m "feat: match view page"`.

---

### Task 11: Match record page

**Files:**
- Create: `src/pages/MatchRecordPage.tsx`, `src/pages/MatchRecordPage.test.tsx`
- Modify: `src/router.tsx` (route `tournaments/:id/matches/:matchId/edit`, keep `RequireAuth level="authorized"`)

**Behaviour:**
- Loader component: `useTournament`, `useGraph`, `useMatches(id)` (no polling); not found → alert "Zápas nenalezen."; `tournament.closed_edit && !isStaff(user)` → `<Navigate replace to={matchPath(id, matchId)} />`. When all loaded, render `<Recorder key={matchPk} initial={initRecorder({ match, tournament, rosterOf, stored: loadRecorder(pk), imported: loadRecorder(pk) ? null : importOldRecorder(pk) })} … />` (compute `initial` once with `useState(() => …)` inside Recorder).
- Recorder: `useReducer(recorderReducer, initial)`; `useEffect(() => saveRecorder(state), [state])`; `useMatchSync(state, dispatch, { enabled: true, onSynced: debounced(() => invalidateMatchData(qc, id), 1000) })`; `now = useNow(200, state.clock.running || hasActivePenalties)`.
- Local UI state: `editMode` ("úpravy" checkbox), `showShots` ("střely"), open dialogs, confirm state.
- `canAct = editMode || state.phase === 1 || state.phase === 2`; `canChangeGoalieOrReferee = editMode || state.phase !== null`.
- Sides: `left = sidesSwapped ? teamTwo : teamOne`; color class `team-one` for teamOne, `team-two` for teamTwo regardless of side.
- Header: `BackLink fallback={recordPath(id)}`; `SyncStatus`; `MatchStatus` with `onNextPhase` → `ConfirmDialog` ("Opravdu přejít do druhého poločasu?" in phase 1, "Opravdu chcete ukončit zápas?" in phase 2) → `dispatch({ type: 'nextPhase', now: Date.now(), at: nowDateTime() })`; phase null → also link "‹ zpět na přehled" (`recordPath(id)`).
- `ClockControls` shown when `phase !== null`: toggle → if both goalies not set → `toast.error('Není nastaven brankář.')`; else phase 0 → `ConfirmDialog` "Začít zápas?" → `kickoff`; else running ? `clockStop` : `clockStart`. Adjust buttons → `clockAdjust` with +5000/+1000/−1000/−5000.
- Referee line (button when `canChangeGoalieOrReferee`) → `RefereeDialog` (players of referee team; auto-open on mount if `state.referee == null`); save → `setReferee`.
- `GoalieRow` with `onChange` when allowed → `GoalieChangeDialog` (team players) → `addEvent({ id: crypto.randomUUID(), type: 'goalieChange', time: <time captured when dialog opened>, team, data: { goalie }, pk: null, saved: false })` + `toast.success('Brankář změněn')`.
- `TeamNames` with swap; checkboxes "úpravy" and "střely".
- `PenaltyCountdowns` when phase 1/2 from `activePenalties(state.events, team, gameTimeMs(...))`.
- `Scoreboard` from `eventCounts` (includes unsaved).
- Action buttons when `canAct`, mirrored per side: "⚠" (`aria-label="Karta {team}"`), "střela" (`aria-label="Střela {team}"`), "gól" (`aria-label="Gól {team}"`). Shot → immediate `addEvent` (time = `currentGameTime(state, Date.now())`) + `toast.success('Střela uložena')`. Gól/Karta → capture time at open, `GoalDialog` / `PenaltyDialog` → `addEvent` + toast "Gól uložen" / "Karta uložena".
- `EventList` editable when `editMode`: edit → `EditGoalDialog`/`EditPenaltyDialog` → `editEvent`; remove → `ConfirmDialog` "Opravdu smazat?" → if `pk`: `useRemoveMatchEvent(id).mutate({ type, pk }, { onSuccess: () => dispatch(removeEvent) })` else `dispatch(removeEvent)`; retry → `retryEvent`; discard → `removeEvent`.
- Player names via `graph.playersById`; team players via `graph.totsById.get(tot).players` sorted by nickname (cs).

- [ ] **Step 1: Failing tests** — `src/pages/MatchRecordPage.test.tsx` (mock API: graph, `tournament/1` with `halftime_length: 10`, `matchs?tournament=1` with a fresh match pk 600 (no events, goalies at 00:00:00 for both teams, referee set), `add_shot`, `add_goal`, `edit_match`; use custom tots so team 1001 has player 102):
  1. kickoff: click "Čas zápasu" → confirm "Začít zápas?" → "Ano" → `edit_match/600` called with body containing `start`; clock running (play/pause label "Zastavit čas").
  2. shot: after kickoff click "Střela Ufo" → toast-free assertion: `add_shot` body has `match: 600, team: 1000` and a `client_id`; the event row appears.
  3. goal flow: "Gól Ufo" → pick "Pépa" → "nikdo" → `add_goal` body `{ match: 600, shooter: 100, time, client_id }` (no assistance/type).
  4. no goalie: with a match whose goalies list is empty, clicking the clock shows "Není nastaven brankář." (spy on `toast.error`) and does not kick off.
  5. closed_edit non-staff → redirected to view path (use the route `Shell` pattern from `TournamentRecordPage.test.tsx`).
  6. reload: render, kick off, add a shot while `add_shot` returns 500; unmount; render again → the unsaved shot is still listed with "⛓" and the clock is running (stored state restored).
  7. ended match (length set): action buttons absent until "úpravy" ticked.

Run → FAIL. **Step 2: Implement** + route. **Step 3: Verify** — `npm test && npm run typecheck && npm run lint && npm run build`. **Step 4: Commit** — `git commit -m "feat: live match recording page"`.

---

## Next

- Plan 5: Playwright smoke tests, deployment of the built SPA (committing `static/spa` + `templates/spa.html` or a build step in `deploy.sh`), manual browser checklist (incl. `/old/`), switch-over and cleanup of the old frontend.
