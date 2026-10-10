# Plan 2b — Tournament Results, Groups and Stats Pages

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholders for Tournament results, Groups, Player stats and Goalie stats with working pages; add a backend `goalie_stats` endpoint so goalie statistics are computed server-side instead of downloading every match.

**Architecture:** New DTOs/endpoints/query hooks for matches, pairs, groups and goalie stats. Pure computation modules `src/domain/tournament.ts`, `src/domain/stats.ts`, `src/domain/groups.ts`. `DataTable` gains manual pagination so it can rank rows **before** search (stats pages), an `extraFilter`, a shared debounced-input hook, and a fix for the stale-closure bug in its debounced search. Pages compose these.

**Tech Stack:** React 19, TS strict, React Router 7, TanStack Query 5, TanStack Table 8, Tailwind 4, Vitest. Backend Django 4.2, pytest-django.

**Spec:** `docs/superpowers/specs/2026-10-10-react-frontend-design.md`
**Research (old app behaviour):** `/tmp/claude-1000/-home-thran-projects-ufobal-web-frontend/afb38ef5-0a40-47b4-8bbe-1e26e7cfcf82/scratchpad/plan2-research.md` — sections **R§3.3–3.4** (goalie algorithm), **R§3.9** (groups), **R§4.10–4.13** (pages). Old sources: `~/projects/ufobal-web/ufobalapp/static/ufobalapp/{js,ng-parts}/`.

## Global Constraints

- Branches: frontend `react-rewrite`, backend `new-frontend` (`~/projects/ufobal-web`). Never push.
- UI text Czech; code/comments English; comments only for non-obvious things.
- Numbers via `formatNumber` (Czech). Percentages: `${formatNumber(x * 100, 1)}%`, empty string when NaN.
- Table state in URL search params. **Multiple tables on one page use prefixes ending with `_`** (`p_`, `g_`, `d_`). Stats filters also live in the URL (params below).
- Page size 15 everywhere; tournament-results tables show 5 page links (`displayedPages={5}`), others 10.
- **Old-app bugs are fixed (user decision):** team filter on tournament results by TOT pk (not name substring); pairs kept if **either** player is in the selected team; goalie stats exclude `trening`; gender sign shown on goalie names; ranks recomputed on any sort change.
- Goalie statistics come only from the backend `goalie_stats` endpoint (never compute them from match events in the browser).
- Commit trailer (after a blank line):
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01NHHZjCnSN7qrM8oz75zwSt`
- Backend tests: `cd ~/projects/ufobal-web && ~/miniconda3/envs/ufobal_web/bin/python -m pytest -q` (baseline 4 failed in `test_views.py`). Frontend: `npm test && npm run typecheck && npm run lint`.

## Review Focus

1. **Tournament with no matches (historical/fake-only)** — results page renders teams with `0:0`, hides summary list (goalCount 0), no matches/goalies sections, players still listed from goal stats. Test in Task 6.
2. **Unknown tournament id** (`/tournaments/999/results`, groups for missing tournament) — "Turnaj nenalezen." / error box, no crash. Tests in Tasks 6 and 7.
3. **Goalie with zero shots** — success NaN → shown as empty, sorted last, excluded from goalie stats page (needs success > 0). Tests in Tasks 4, 5, 9.
4. **Stats filter edge values in URL** (`from=abc`, `min=-5`, all categories off, both genders off) — parse to safe values, empty table, no crash. Test in Task 5.
5. **Search + rank on stats pages** — searching shows each player's overall rank (rank computed before search, after gender filter). Tests in Tasks 3 and 8.

---

## File Structure

```
backend: ufobalapp/views.py (goalie_stats, compute_goalie_stats), ufobalapp/urls.py, ufobalapp/tests/test_goalie_stats.py
src/api/types.ts              + GoalDto, MatchDto, PairDto, GroupTotDto, PlayoffEntryDto, GroupDto, GroupLevelStats, GroupsDto, GoalieStatDto
src/api/endpoints.ts          + getMatches, getPairs, getGroups, getGoalieStats
src/queries/data.ts           + useMatches, usePairs, useGroups, useGoalieStats
src/hooks/useDebouncedInput.ts new
src/components/DataTable.tsx  manual pagination, rank: boolean | 'beforeSearch', extraFilter, uses useDebouncedInput
src/domain/tournament.ts      new: teamScores, tournamentSummary, sortTotsByRank, tournamentPlayerRows, goalieRows, pairRows, formatPercent
src/domain/stats.ts           new: StatsFilter, defaults, URL parse/serialize, filterTournaments, genderMatches, playerStatsRows, goalieStatsRows
src/domain/groups.ts          new: groupCell, groupRecord, groupScore
src/components/StatsFilterForm.tsx new
src/pages/TournamentResultsPage.tsx, GroupsPage.tsx, PlayerStatsPage.tsx, GoalieStatsPage.tsx  new
src/test/fixtures.ts          + matchDto, sampleMatches, samplePairs, sampleGoalieStats
src/router.tsx                4 placeholders replaced
```

---

### Task 1: Backend — `goalie_stats` endpoint

**Files (repo `~/projects/ufobal-web`):**
- Modify: `ufobalapp/views.py` (add `compute_goalie_stats`, `goalie_stats`)
- Modify: `ufobalapp/urls.py` (add route before the generic model routes loop)
- Create: `ufobalapp/tests/test_goalie_stats.py`

**Interfaces:**
- Produces: `GET /api_frontend/goalie_stats[?tournament=<pk>]` → JSON list of
  `{goalie: int, tournament: int, team: int | null, matches: int, shots: int, goals: int}` — one row per (goalie, tournament).
- Semantics (port of old `getGoalieScore`, R§3.3): only non-fake matches with `length` set; per (goalie, tournament): `team` = TOT the goalie belonged to in the **first** such match (team_one if the goalie is on team_one's roster, else team_two); every GoalieInMatch adds its match to `matches`; if the GoalieInMatch has `end` set, every goal with `time` in `[start, end]` whose shooter's team (team_one if shooter on team_one's roster, else team_two — null shooter counts as team_two) differs from the goalie's `team` adds 1 to `goals` and 1 to `shots`, and every shot with `time` in `[start, end]` whose `team_id` differs from the goalie's `team` adds 1 to `shots`.
- Caching: the unfiltered response is cached under key `"goalie_stats"` for 1 hour; filtered responses are not cached.

- [ ] **Step 1: Failing tests** — `ufobalapp/tests/test_goalie_stats.py`:

```python
from datetime import datetime, time

import pytest
from django.core.cache import cache

from ufobalapp.models import Goal, GoalieInMatch, Match, Player, Shot, Team, TeamOnTournament, Tournament


@pytest.fixture(autouse=True)
def clear_cache():
    cache.clear()
    yield
    cache.clear()


def make_tournament(name='T'):
    return Tournament.objects.create(
        category=Tournament.BRNO, date=datetime(2023, 6, 10), registration_to=datetime(2023, 6, 1),
        name=name, location='L', field_count=1, description='d',
    )


@pytest.fixture()
def setup():
    t = make_tournament()
    goalie = Player.objects.create(name='g', lastname='g', nickname='Goalie')
    a1 = Player.objects.create(name='a', lastname='a', nickname='A1')
    b1 = Player.objects.create(name='b', lastname='b', nickname='B1')
    team_a = TeamOnTournament.objects.create(team=Team.objects.create(name='A'), tournament=t)
    team_a.players.add(goalie, a1)
    team_b = TeamOnTournament.objects.create(team=Team.objects.create(name='B'), tournament=t)
    team_b.players.add(b1)
    m = Match.objects.create(tournament=t, team_one=team_a, team_two=team_b, length=time(0, 20))
    GoalieInMatch.objects.create(goalie=goalie, match=m, start=time(0, 0), end=time(0, 20))
    Goal.objects.create(match=m, shooter=b1, time=time(0, 5))       # against goalie
    Goal.objects.create(match=m, shooter=a1, time=time(0, 6))       # own team
    Goal.objects.create(match=m, shooter=b1, time=time(0, 25))      # outside window
    Shot.objects.create(match=m, team=team_b, time=time(0, 7))      # against goalie
    Shot.objects.create(match=m, team=team_a, time=time(0, 8))      # own team
    unfinished = Match.objects.create(tournament=t, team_one=team_a, team_two=team_b)
    GoalieInMatch.objects.create(goalie=goalie, match=unfinished, start=time(0, 0), end=time(0, 20))
    fake = Match.objects.create(tournament=t, team_one=team_a, team_two=team_b, length=time(0, 20), fake=True)
    GoalieInMatch.objects.create(goalie=goalie, match=fake, start=time(0, 0), end=time(0, 20))
    return {'t': t, 'goalie': goalie, 'team_a': team_a}


@pytest.mark.django_db
def test_goalie_stats_counts_goals_and_shots_against(client, setup):
    data = client.get('/api_frontend/goalie_stats').json()
    assert data == [{
        'goalie': setup['goalie'].pk, 'tournament': setup['t'].pk, 'team': setup['team_a'].pk,
        'matches': 1, 'shots': 2, 'goals': 1,
    }]


@pytest.mark.django_db
def test_goalie_stats_filter_by_tournament(client, setup):
    other = make_tournament('Other')
    assert client.get(f'/api_frontend/goalie_stats?tournament={other.pk}').json() == []
    assert len(client.get(f'/api_frontend/goalie_stats?tournament={setup["t"].pk}').json()) == 1


@pytest.mark.django_db
def test_goalie_without_end_gets_no_shots(client, setup):
    GoalieInMatch.objects.filter(match__length=time(0, 20), match__fake=False).update(end=None)
    row = client.get('/api_frontend/goalie_stats').json()[0]
    assert (row['matches'], row['shots'], row['goals']) == (1, 0, 0)
```

If `Team`, `Player`, `Match`, `Goal` or `Shot` creation needs more required fields, add them (check `ufobalapp/models.py`); keep the scenario.

- [ ] **Step 2: Run, expect FAIL** (404) — `~/miniconda3/envs/ufobal_web/bin/python -m pytest -q ufobalapp/tests/test_goalie_stats.py`

- [ ] **Step 3: Implement** — in `ufobalapp/views.py` (near `goals`/`pairs` views):

```python
def compute_goalie_stats(tournament_id=None):
    """Per (goalie, tournament) shots/goals against, as the old frontend's getGoalieScore computed it."""
    matches = Match.objects.filter(fake=False, length__isnull=False)
    if tournament_id is not None:
        matches = matches.filter(tournament_id=tournament_id)
    matches = matches.order_by('tournament_id', 'pk').prefetch_related(
        'goalies_in_match', 'goals', 'shots', 'team_one__players'
    )
    stats = {}
    for match in matches:
        team_one_players = {p.pk for p in match.team_one.players.all()} if match.team_one else set()

        def team_of(player_id):
            return match.team_one_id if player_id in team_one_players else match.team_two_id

        for gim in match.goalies_in_match.all():
            row = stats.setdefault(
                (gim.goalie_id, match.tournament_id),
                {'goalie': gim.goalie_id, 'tournament': match.tournament_id, 'team': team_of(gim.goalie_id),
                 'matches': set(), 'shots': 0, 'goals': 0},
            )
            row['matches'].add(match.pk)
            if gim.end is None:
                continue
            for goal in match.goals.all():
                if goal.time is not None and gim.start <= goal.time <= gim.end and team_of(goal.shooter_id) != row['team']:
                    row['goals'] += 1
                    row['shots'] += 1
            for shot in match.shots.all():
                if gim.start <= shot.time <= gim.end and shot.team_id != row['team']:
                    row['shots'] += 1
    return [{**row, 'matches': len(row['matches'])} for row in stats.values()]


def goalie_stats(request):
    tournament = request.GET.get('tournament')
    if tournament is not None:
        return JsonResponse(compute_goalie_stats(int(tournament)), safe=False)
    data = cache.get('goalie_stats')
    if data is None:
        data = compute_goalie_stats()
        cache.set('goalie_stats', data, 60 * 60)
    return JsonResponse(data, safe=False)
```

A non-integer `?tournament=` must return 400: wrap `int(tournament)` in `try/except ValueError: return HttpResponseBadRequest('tournament must be an integer')` (import if missing).

In `ufobalapp/urls.py`, add to `urlpatterns` (in the explicit list, e.g. after `pairs`): `path('goalie_stats', views.goalie_stats, name='goalie_stats'),`

- [ ] **Step 4: Run all backend tests** — new tests PASS; total failures = 4 baseline.

- [ ] **Step 5: Commit** (in `~/projects/ufobal-web`)

```bash
git add ufobalapp/views.py ufobalapp/urls.py ufobalapp/tests/test_goalie_stats.py
git commit -m "feat: goalie_stats endpoint computing goalie shots and goals against"
```

---

### Task 2: DTOs, endpoints, query hooks, fixtures

**Files:**
- Modify: `src/api/types.ts`, `src/api/endpoints.ts`, `src/queries/data.ts`, `src/test/fixtures.ts`
- Create: `src/queries/matchData.test.tsx`

**Interfaces:**
- Produces (types.ts):

```ts
export interface GoalDto {
  pk: number;
  shooter: number | null;
  assistance: number | null;
  match: number;
  time: string | null;
  type: 'normal' | 'penalty' | 'shootout';
}

export interface MatchDto {
  pk: number;
  tournament: number;
  team_one: number | null;
  team_two: number | null;
  start: string | null;
  end: string | null;
  halftime_length: string | null;
  length: string | null;
  referee: number | null;
  referee_team: number | null;
  fake: boolean;
  place: string | null;
  goals: GoalDto[];
  /** Typed in the match-page plan; not used by results pages. */
  shots: unknown[];
  penalties: unknown[];
  goalies: unknown[];
  /** Number of shootout goals (truthy = decided by shootout). */
  with_shootout: number;
  score_one: number | null;
  score_two: number | null;
}

export interface PairDto {
  players: [number, number];
  points: number;
  goals_first?: number;
  goals_second?: number;
}

export type GroupTotDto = Omit<TotDto, 'player_pks'>;
export type PlayoffEntryDto = GroupTotDto & { score: number; win: boolean };

export interface GroupDto {
  pk: number;
  tournament: TournamentDto;
  teams: GroupTotDto[];
  level: number;
  name: string;
  /** 3 rounds × 8 slots when the group is a detected 8-team playoff. */
  playoff?: PlayoffEntryDto[][];
}

export interface GroupLevelStats {
  score: [number, number];
  wins: number;
  looses: number;
  winsP: number;
  loosesP: number;
  draws: number;
}

export interface GroupsDto {
  groups: GroupDto[];
  /** key `${totA}-${totB}` → level → [scoreA, scoreB, shootoutCount] */
  matches: Record<string, Record<string, [number, number, number]>>;
  /** tot pk → level → stats */
  stats: Record<string, Record<string, GroupLevelStats>>;
}

export interface GoalieStatDto {
  goalie: number;
  tournament: number;
  team: number | null;
  matches: number;
  shots: number;
  goals: number;
}
```

- Produces (endpoints.ts): `getMatches(tournament: number, signal?)` → `api<MatchDto[]>('matchs', { params: { tournament }, signal })`; `getPairs(tournament: number, signal?)` → `pairs/${tournament}`; `getGroups(tournament: number, signal?)` → `get_groups/${tournament}`; `getGoalieStats(tournament?: number, signal?)` → `api<GoalieStatDto[]>('goalie_stats', { params: { tournament }, signal })`.
- Produces (data.ts): `dataKeys.matches(pk)`, `dataKeys.pairs(pk)`, `dataKeys.groups(pk)`, `dataKeys.goalieStats(pk | 'all')`; hooks `useMatches(pk: number)`, `usePairs(pk: number)`, `useGroups(pk: number)`, `useGoalieStats(tournament?: number)` (standard `useQuery`; `useGoalieStats()` without arg uses `staleTime: LIST_STALE`).
- Produces (fixtures.ts): `matchDto(o: Partial<MatchDto> & Pick<MatchDto, 'pk'>)`, `sampleMatches(): MatchDto[]`, `samplePairs(): PairDto[]`, `sampleGoalieStats(): GoalieStatDto[]`:

```ts
export const matchDto = (o: Partial<MatchDto> & Pick<MatchDto, 'pk'>): MatchDto => ({
  tournament: 1,
  team_one: 1000,
  team_two: 1001,
  start: null,
  end: null,
  halftime_length: null,
  length: null,
  referee: null,
  referee_team: null,
  fake: false,
  place: null,
  goals: [],
  shots: [],
  penalties: [],
  goalies: [],
  with_shootout: 0,
  score_one: 0,
  score_two: 0,
  ...o,
});

export const sampleMatches = (): MatchDto[] => [
  matchDto({ pk: 500, score_one: 3, score_two: 1, length: '00:20:00', start: '2023-06-10 09:00:00+00:00' }),
  matchDto({ pk: 501, team_one: 1001, team_two: 1000, score_one: 2, score_two: 2, with_shootout: 1, length: '00:20:00', start: '2023-06-10 10:00:00+00:00' }),
  matchDto({ pk: 502, score_one: 0, score_two: 0, length: null, start: '2023-06-10 11:00:00+00:00' }),
];

export const samplePairs = (): PairDto[] => [
  { players: [100, 101], points: 2, goals_first: 1, goals_second: 1 },
  { players: [100, 999], points: 5 },
];

export const sampleGoalieStats = (): GoalieStatDto[] => [
  { goalie: 100, tournament: 1, team: 1000, matches: 2, shots: 10, goals: 2 },
  { goalie: 102, tournament: 1, team: 1001, matches: 1, shots: 0, goals: 0 },
  { goalie: 101, tournament: 2, team: 1002, matches: 12, shots: 20, goals: 5 },
];
```

- [ ] **Step 1: Failing test** — `src/queries/matchData.test.tsx`:

```tsx
import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { expect, test } from 'vitest';
import { createQueryClient } from '../queryClient';
import { sampleGoalieStats, sampleMatches } from '../test/fixtures';
import { mockApi } from '../test/utils';
import { useGoalieStats, useMatches } from './data';

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={createQueryClient(null)}>{children}</QueryClientProvider>
);

test('useMatches requests matches filtered by tournament', async () => {
  const fetchMock = mockApi({ 'matchs?tournament=1': sampleMatches() });
  const { result } = renderHook(() => useMatches(1), { wrapper });
  await waitFor(() => expect(result.current.data).toHaveLength(3));
  expect(String(fetchMock.mock.calls[0][0])).toBe('/api_frontend/matchs?tournament=1');
});

test('useGoalieStats with and without tournament', async () => {
  mockApi({ goalie_stats: sampleGoalieStats(), 'goalie_stats?tournament=1': sampleGoalieStats().slice(0, 2) });
  const all = renderHook(() => useGoalieStats(), { wrapper });
  const one = renderHook(() => useGoalieStats(1), { wrapper });
  await waitFor(() => expect(all.result.current.data).toHaveLength(3));
  await waitFor(() => expect(one.result.current.data).toHaveLength(2));
});
```

Run → FAIL.

- [ ] **Step 2: Implement** types, endpoints, hooks, fixtures as specified (import new types into `fixtures.ts`).

- [ ] **Step 3: Verify** — `npm test && npm run typecheck && npm run lint` → PASS.

- [ ] **Step 4: Commit** — `git add src && git commit -m "feat: match, pairs, groups and goalie stats data hooks"`

---

### Task 3: DataTable — manual pagination, rank before search, extraFilter, debounced-input hook

**Files:**
- Create: `src/hooks/useDebouncedInput.ts`, `src/hooks/useDebouncedInput.test.tsx`
- Modify: `src/components/DataTable.tsx`, `src/components/DataTable.test.tsx`

**Interfaces:**
- Produces: `useDebouncedInput(value: string, commit: (v: string) => void, delay = 300): readonly [string, (v: string) => void]` — returns a local draft; commits it after `delay` ms of inactivity; re-seeds the draft whenever `value` changes externally; always calls the **latest** `commit` (stored in a ref updated in an effect).
- Changes `DataTableProps<T>`:
  - `rank?: boolean | 'beforeSearch'` — `true`: position among searched/filtered+sorted rows; `'beforeSearch'`: position among sorted rows **before** search and `extraFilter` are applied (gender filtering is done by callers before passing `data`).
  - `extraFilter?: (row: T) => boolean` — applied together with search (after ranking), resets nothing by itself.
  - All existing props unchanged (`searchLabel`, `urlPrefix`, ...).
- Implementation shape: TanStack table built on full `data` with sorting only (`getCoreRowModel`, `getSortedRowModel`, `enableMultiSort: false`); `sortedRows = table.getSortedRowModel().rows`; `rankById` (Map row.id → index+1) memoized on `sortedRows`; `visibleRows` = `sortedRows` filtered by search needle and `extraFilter` (memoized); page slice computed manually (no `getPaginationRowModel`, no TanStack pagination state); rank column rendered manually as the first `<th>#</th>` / `<td>{n}.</td>` (not a TanStack column). Search input uses `useDebouncedInput(query, (v) => update({ q: v || null, page: null }))`; the clear button sets the draft to `''` and updates the URL immediately.

- [ ] **Step 1: Failing tests**

`src/hooks/useDebouncedInput.test.tsx`:

```tsx
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { useDebouncedInput } from './useDebouncedInput';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

test('commits after delay with latest commit callback', () => {
  const first = vi.fn();
  const second = vi.fn();
  const { result, rerender } = renderHook(({ commit }) => useDebouncedInput('', commit), {
    initialProps: { commit: first },
  });
  act(() => result.current[1]('ab'));
  rerender({ commit: second });
  act(() => vi.advanceTimersByTime(300));
  expect(first).not.toHaveBeenCalled();
  expect(second).toHaveBeenCalledWith('ab');
});

test('re-seeds draft when value changes externally', () => {
  const { result, rerender } = renderHook(({ value }) => useDebouncedInput(value, vi.fn()), {
    initialProps: { value: 'x' },
  });
  rerender({ value: 'y' });
  expect(result.current[0]).toBe('y');
});

test('does not commit when draft equals value', () => {
  const commit = vi.fn();
  renderHook(() => useDebouncedInput('same', commit));
  act(() => vi.advanceTimersByTime(1000));
  expect(commit).not.toHaveBeenCalled();
});
```

Append to `src/components/DataTable.test.tsx` (keep all existing tests passing unchanged in intent):

```tsx
test("rank 'beforeSearch' keeps overall rank while searching", async () => {
  setup('/?sort=-score', { rank: 'beforeSearch' });
  await userEvent.type(screen.getByPlaceholderText('hledat...'), 'pepa');
  await waitFor(() => expect(bodyRows()).toHaveLength(1));
  // Pépa has score 0 → last of 20 when sorted desc
  expect(within(bodyRows()[0]).getAllByRole('cell')[0]).toHaveTextContent('20.');
});

test('extraFilter hides rows after ranking', () => {
  setup('/?sort=-score', { rank: 'beforeSearch', extraFilter: (r: Row) => r.score >= 18 });
  expect(bodyRows()).toHaveLength(2);
  expect(within(bodyRows()[0]).getAllByRole('cell')[0]).toHaveTextContent('1.');
  expect(within(bodyRows()[1]).getAllByRole('cell')[0]).toHaveTextContent('2.');
});
```

(`waitFor` import from `@testing-library/react` if not already imported.)

Run → FAIL.

- [ ] **Step 2: Implement**

`src/hooks/useDebouncedInput.ts`:

```ts
import { useEffect, useRef, useState } from 'react';

export function useDebouncedInput(value: string, commit: (v: string) => void, delay = 300) {
  const [draft, setDraft] = useState(value);
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    setDraft(value);
  }
  const commitRef = useRef(commit);
  useEffect(() => {
    commitRef.current = commit;
  });
  useEffect(() => {
    if (draft === value) return;
    const timer = setTimeout(() => commitRef.current(draft), delay);
    return () => clearTimeout(timer);
  }, [draft, value, delay]);
  return [draft, setDraft] as const;
}
```

`src/components/DataTable.tsx` — restructure per the "Implementation shape" above. Key parts:

```tsx
  const query = params.get(key('q')) ?? '';
  const [draft, setDraft] = useDebouncedInput(query, (v) => update({ q: v || null, page: null }));

  // TanStack Table returns non-memoizable functions; the React Compiler lint rule does not apply here.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getRowId,
    state: { sorting },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      const s = next[0];
      update({ sort: s ? `${s.desc ? '-' : ''}${s.id}` : '', page: null });
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableMultiSort: false,
  });

  const sortedRows = table.getSortedRowModel().rows;
  const rankById = useMemo(() => new Map(sortedRows.map((r, i) => [r.id, i + 1])), [sortedRows]);
  const needle = searchKey(query);
  const visibleRows = useMemo(
    () =>
      sortedRows.filter(
        (r) =>
          (!searchText || !needle || searchText(r.original).includes(needle)) &&
          (!extraFilter || extraFilter(r.original)),
      ),
    [sortedRows, searchText, needle, extraFilter],
  );
  const pageCount = Math.max(1, Math.ceil(visibleRows.length / pageSize));
  const requestedPage = Number.parseInt(params.get(key('page')) ?? '1', 10);
  const pageIndex = Math.min(Math.max(Number.isFinite(requestedPage) ? requestedPage : 1, 1), pageCount) - 1;
  const pageRows = visibleRows.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
  const setPage = (index: number) => update({ page: index > 0 ? String(index + 1) : null });
  const rankOf = (rowId: string, i: number) =>
    rank === 'beforeSearch' ? rankById.get(rowId) : pageIndex * pageSize + i + 1;
```

Header row: `{rank && <th className="px-2 py-2 text-right">#</th>}` before the TanStack headers. Body rows: `{rank && <td className="text-right">{rankOf(row.id, i)}.</td>}` before the cells. Pager buttons call `setPage(...)`. Keep the existing sorting `useMemo`, search box markup (`value={draft}`, `onChange={(e) => setDraft(e.target.value)}`, clear button `onClick={() => { setDraft(''); update({ q: null, page: null }); }}`), `.table-basic`, aria labels and `searchLabel`. Remove the old `draft`/timer state and `getPaginationRowModel` import.

- [ ] **Step 3: Verify** — `npm test && npm run typecheck && npm run lint` → PASS (all existing DataTable, players, teams, tournaments tests must still pass).

- [ ] **Step 4: Commit** — `git add src && git commit -m "feat: DataTable rank before search, extra filter, debounced input hook"`

---

### Task 4: Domain — tournament computations

**Files:**
- Create: `src/domain/tournament.ts`, `src/domain/tournament.test.ts`

**Interfaces:**
- Consumes: `Graph`, `PlayerVM`, `TotVM`, `TournamentVM`, DTOs, `formatNumber`.
- Produces:
  - `interface TeamScore { scored: number; received: number }`; `teamScores(matches: MatchDto[]): Map<number, TeamScore>` — over **all** given matches (null scores = 0).
  - `tournamentSummary(t: TournamentVM, matches: MatchDto[]): { teamCount: number; matchCount: number; playerCount: number; goalCount: number }` — `playerCount` = sum of `tot.players.length`.
  - `sortTotsByRank(tots: TotVM[]): TotVM[]` — rank asc, null last, ties by `czech` name compare.
  - `interface PlayerScoreRow { player: PlayerVM; goals: number; assists: number; canada: number }`; `tournamentPlayerRows(graph: Graph, tournamentPk: number): PlayerScoreRow[]` — only `canada > 0`, sorted canada desc (stable).
  - `interface GoalieRow { player: PlayerVM; team: number | null; matches: number; shots: number; goals: number; success: number }` (success = `1 - goals/shots`, NaN when shots = 0); `goalieRows(stats: GoalieStatDto[], graph: Graph): GoalieRow[]` — unknown players skipped, sorted success desc, NaN last.
  - `interface PairRow { id: string; player1: PlayerVM; player2: PlayerVM; points: number; goalsFirst?: number; goalsSecond?: number }`; `pairRows(pairs: PairDto[], graph: Graph): PairRow[]` — both players must be known; `id = \`${a}-${b}\``; sorted points desc.
  - `formatPercent(ratio: number): string` — `''` for NaN, else `${formatNumber(ratio * 100, 1)}%`.
  - `compareSuccess(a: number, b: number): number` — ascending comparator treating NaN as lower than any number (for TanStack `sortingFn`).

- [ ] **Step 1: Failing tests** — `src/domain/tournament.test.ts`:

```ts
import { expect, test } from 'vitest';
import { sampleGoalieStats, sampleMatches, samplePairs, sampleRaw } from '../test/fixtures';
import { buildGraph } from './graph';
import {
  compareSuccess,
  formatPercent,
  goalieRows,
  pairRows,
  sortTotsByRank,
  teamScores,
  tournamentPlayerRows,
  tournamentSummary,
} from './tournament';

const graph = () => buildGraph(sampleRaw());

test('teamScores sums own and opponent goals over all matches', () => {
  const scores = teamScores(sampleMatches());
  expect(scores.get(1000)).toEqual({ scored: 5, received: 3 });
  expect(scores.get(1001)).toEqual({ scored: 3, received: 5 });
});

test('tournamentSummary', () => {
  const g = graph();
  expect(tournamentSummary(g.tournamentsById.get(1)!, sampleMatches())).toEqual({
    teamCount: 2,
    matchCount: 3,
    playerCount: 2,
    goalCount: 8,
  });
});

test('sortTotsByRank puts null ranks last', () => {
  const g = graph();
  const sorted = sortTotsByRank(g.tournamentsById.get(2)!.tots);
  expect(sorted.map((t) => t.pk)).toEqual([1002, 1003]);
});

test('tournamentPlayerRows keeps scorers sorted by canada', () => {
  const rows = tournamentPlayerRows(graph(), 1);
  expect(rows.map((r) => [r.player.nickname, r.canada])).toEqual([
    ['Karel', 4],
    ['Pépa', 3],
    ['Jana', 3],
  ]);
});

test('goalieRows computes success, NaN last, unknown skipped', () => {
  const rows = goalieRows(sampleGoalieStats().slice(0, 2), graph());
  expect(rows[0].player.nickname).toBe('Pépa');
  expect(rows[0].success).toBeCloseTo(0.8);
  expect(Number.isNaN(rows[1].success)).toBe(true);
});

test('pairRows skips unknown players and sorts by points', () => {
  const rows = pairRows(samplePairs(), graph());
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ id: '100-101', points: 2, goalsFirst: 1, goalsSecond: 1 });
});

test('formatPercent and compareSuccess', () => {
  expect(formatPercent(0.934)).toBe('93,4%');
  expect(formatPercent(Number.NaN)).toBe('');
  expect([0.5, Number.NaN, 0.9].sort(compareSuccess)).toEqual([Number.NaN, 0.5, 0.9]);
});
```

Run → FAIL.

- [ ] **Step 2: Implement** `src/domain/tournament.ts`:

```ts
import type { GoalieStatDto, MatchDto, PairDto } from '../api/types';
import { formatNumber } from '../format';
import type { Graph, PlayerVM, TotVM, TournamentVM } from './graph';

export interface TeamScore {
  scored: number;
  received: number;
}

export function teamScores(matches: MatchDto[]): Map<number, TeamScore> {
  const scores = new Map<number, TeamScore>();
  const add = (tot: number | null, scored: number, received: number) => {
    if (tot == null) return;
    const s = scores.get(tot) ?? { scored: 0, received: 0 };
    s.scored += scored;
    s.received += received;
    scores.set(tot, s);
  };
  for (const m of matches) {
    const a = m.score_one ?? 0;
    const b = m.score_two ?? 0;
    add(m.team_one, a, b);
    add(m.team_two, b, a);
  }
  return scores;
}

export function tournamentSummary(t: TournamentVM, matches: MatchDto[]) {
  return {
    teamCount: t.tots.length,
    matchCount: matches.length,
    playerCount: t.tots.reduce((n, tot) => n + tot.players.length, 0),
    goalCount: matches.reduce((n, m) => n + (m.score_one ?? 0) + (m.score_two ?? 0), 0),
  };
}

export function sortTotsByRank(tots: TotVM[]): TotVM[] {
  const rank = (t: TotVM) => t.rank ?? Number.MAX_SAFE_INTEGER;
  return [...tots].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, 'cs'));
}

export interface PlayerScoreRow {
  player: PlayerVM;
  goals: number;
  assists: number;
  canada: number;
}

export function tournamentPlayerRows(graph: Graph, tournamentPk: number): PlayerScoreRow[] {
  return graph.players
    .map((player) => {
      const goals = player.goals[tournamentPk] ?? 0;
      const assists = player.assists[tournamentPk] ?? 0;
      return { player, goals, assists, canada: goals + assists };
    })
    .filter((r) => r.canada > 0)
    .sort((a, b) => b.canada - a.canada);
}

export function compareSuccess(a: number, b: number): number {
  const na = Number.isNaN(a);
  const nb = Number.isNaN(b);
  if (na || nb) return na === nb ? 0 : na ? -1 : 1;
  return a - b;
}

export interface GoalieRow {
  player: PlayerVM;
  team: number | null;
  matches: number;
  shots: number;
  goals: number;
  success: number;
}

export function goalieRows(stats: GoalieStatDto[], graph: Graph): GoalieRow[] {
  return stats
    .flatMap((s) => {
      const player = graph.playersById.get(s.goalie);
      if (!player) return [];
      const success = s.shots ? 1 - s.goals / s.shots : Number.NaN;
      return [{ player, team: s.team, matches: s.matches, shots: s.shots, goals: s.goals, success }];
    })
    .sort((a, b) => compareSuccess(b.success, a.success));
}

export interface PairRow {
  id: string;
  player1: PlayerVM;
  player2: PlayerVM;
  points: number;
  goalsFirst?: number;
  goalsSecond?: number;
}

export function pairRows(pairs: PairDto[], graph: Graph): PairRow[] {
  return pairs
    .flatMap((p) => {
      const player1 = graph.playersById.get(p.players[0]);
      const player2 = graph.playersById.get(p.players[1]);
      if (!player1 || !player2) return [];
      return [
        {
          id: `${p.players[0]}-${p.players[1]}`,
          player1,
          player2,
          points: p.points,
          goalsFirst: p.goals_first,
          goalsSecond: p.goals_second,
        },
      ];
    })
    .sort((a, b) => b.points - a.points);
}

export function formatPercent(ratio: number): string {
  return Number.isNaN(ratio) ? '' : `${formatNumber(ratio * 100, 1)}%`;
}
```

- [ ] **Step 3: Verify** — `npm test && npm run typecheck && npm run lint` → PASS.

- [ ] **Step 4: Commit** — `git add src && git commit -m "feat: tournament results computations"`

---

### Task 5: Domain — stats filters and aggregations

**Files:**
- Create: `src/domain/stats.ts`, `src/domain/stats.test.ts`

**Interfaces:**
- Produces:

```ts
export type CategoryKey = 'nizkov' | 'brno' | 'hala' | 'liga' | 'other';
export const CATEGORY_LABELS: Record<CategoryKey, string>; // nizkov 'Nížkov', brno 'Brno', hala 'Hala', liga 'Liga', other 'Další'
export interface StatsFilter {
  yearFrom: number | null;
  yearTo: number | null;
  categories: Record<CategoryKey, boolean>;
  man: boolean;
  woman: boolean;
  minMatches: number;
  team: string;
}
export function defaultStatsFilter(thisYear: number): StatsFilter;
export const STATS_PARAM_KEYS: readonly string[]; // ['from', 'to', 'cat', 'g', 'min', 'team']
export function parseStatsFilter(params: URLSearchParams, thisYear: number): StatsFilter;
export function statsFilterParams(filter: StatsFilter): Record<string, string>;
export function filterTournaments(ts: TournamentVM[], f: StatsFilter, opts: { allowLiga: boolean }): TournamentVM[];
export function genderMatches(player: { gender: string | null }, f: Pick<StatsFilter, 'man' | 'woman'>): boolean;
export interface PlayerStatsRow { player: PlayerVM; perTournament: Record<number, { goals?: number; assists?: number }>; goals: number; assists: number; canada: number }
export function playerStatsRows(players: PlayerVM[], tournaments: TournamentVM[]): PlayerStatsRow[];
export interface GoalieTournamentStat { matches: number; shots: number; goals: number; success: number }
export interface GoalieStatsRow { player: PlayerVM; perTournament: Record<number, GoalieTournamentStat>; matches: number; shots: number; goals: number; success: number }
export function goalieStatsRows(stats: GoalieStatDto[], graph: Graph, tournaments: TournamentVM[]): GoalieStatsRow[];
export function tournamentsWithGoalieStats(stats: GoalieStatDto[], tournaments: TournamentVM[]): TournamentVM[];
```

Semantics:
- Defaults: `yearFrom = thisYear - 6`, `yearTo = thisYear`, categories `{ nizkov: true, brno: true, hala: false, liga: false, other: false }`, `man = woman = true`, `minMatches = 10`, `team = ''`.
- URL params: `from`, `to` (integer; absent → default; empty string → null; non-integer → default); `cat` = comma list of enabled category keys (absent → default; empty string → none enabled; unknown keys ignored); `g` = `m` (men only), `w` (women only), `0` (none) — absent → both; `min` = integer ≥ 0 (absent/invalid → 10; negative → 0); `team` (absent → '').
- `statsFilterParams` produces all six keys explicitly (`from`/`to` empty string for null; `g` = `mw` both, `m`, `w`, `0` none), so `parseStatsFilter(new URLSearchParams(statsFilterParams(f)), y)` equals `f`.
- `filterTournaments`: keep if `(yearFrom == null || year >= yearFrom) && (yearTo == null || year <= yearTo)`; category slug `trening` always excluded; slug `liga` kept only if `opts.allowLiga && categories.liga`; slugs `nizkov|brno|hala|other` kept only if their category is enabled; null slug kept. Sorted by `date` asc.
- `genderMatches`: `(f.man || gender === 'woman') && (f.woman || gender === 'man')`.
- `playerStatsRows`: one row per player (including zero points); `perTournament[t.pk]` present only if goals or assists exist for that tournament; sums over the given tournaments.
- `goalieStatsRows`: stats restricted to the given tournaments; grouped by goalie (unknown players skipped); per-tournament success = `1 - goals/shots` (NaN if 0 shots); totals summed; total success likewise. Order: input order of first appearance.
- `tournamentsWithGoalieStats`: tournaments (keeping input order) that appear in `stats`.

- [ ] **Step 1: Failing tests** — `src/domain/stats.test.ts`:

```ts
import { expect, test } from 'vitest';
import { sampleGoalieStats, sampleRaw, tournamentDto } from '../test/fixtures';
import { buildGraph } from './graph';
import {
  defaultStatsFilter,
  filterTournaments,
  genderMatches,
  goalieStatsRows,
  parseStatsFilter,
  playerStatsRows,
  statsFilterParams,
  tournamentsWithGoalieStats,
} from './stats';

const g = () => buildGraph(sampleRaw());

test('default filter keeps Brno and Nížkov in the last 6 years, sorted by date', () => {
  const f = defaultStatsFilter(2025);
  expect(filterTournaments(g().tournaments, f, { allowLiga: true }).map((t) => t.pk)).toEqual([1, 2]);
});

test('categories, liga permission and trening exclusion', () => {
  const graph = buildGraph({
    ...sampleRaw(),
    emptyTournaments: [
      tournamentDto({ pk: 3, year: 2025, date: '2025-01-15', category_slugname: 'hala' }),
      tournamentDto({ pk: 4, year: 2025, date: '2025-02-01', category_slugname: 'liga' }),
      tournamentDto({ pk: 5, year: 2025, date: '2025-03-01', category_slugname: 'trening' }),
    ],
  });
  const f = defaultStatsFilter(2025);
  f.categories = { nizkov: false, brno: false, hala: true, liga: true, other: true };
  expect(filterTournaments(graph.tournaments, f, { allowLiga: true }).map((t) => t.pk)).toEqual([3, 4]);
  expect(filterTournaments(graph.tournaments, f, { allowLiga: false }).map((t) => t.pk)).toEqual([3]);
});

test('URL round trip and defaults', () => {
  const f = { ...defaultStatsFilter(2025), yearFrom: null, man: false, minMatches: 3, team: 'ufo' };
  expect(parseStatsFilter(new URLSearchParams(statsFilterParams(f)), 2025)).toEqual(f);
  expect(parseStatsFilter(new URLSearchParams(''), 2025)).toEqual(defaultStatsFilter(2025));
});

test('junk URL values parse safely', () => {
  const f = parseStatsFilter(new URLSearchParams('from=abc&min=-5&cat=&g=0&cat2=x'), 2025);
  expect(f.yearFrom).toBe(2019);
  expect(f.minMatches).toBe(0);
  expect(Object.values(f.categories).every((v) => !v)).toBe(true);
  expect([f.man, f.woman]).toEqual([false, false]);
});

test('genderMatches', () => {
  expect(genderMatches({ gender: 'man' }, { man: true, woman: false })).toBe(true);
  expect(genderMatches({ gender: 'woman' }, { man: true, woman: false })).toBe(false);
  expect(genderMatches({ gender: null }, { man: true, woman: true })).toBe(true);
  expect(genderMatches({ gender: null }, { man: false, woman: true })).toBe(false);
});

test('playerStatsRows sums over selected tournaments, includes zero rows', () => {
  const graph = g();
  const rows = playerStatsRows(graph.players, [graph.tournamentsById.get(1)!, graph.tournamentsById.get(2)!]);
  const pepa = rows.find((r) => r.player.pk === 100)!;
  expect(pepa).toMatchObject({ goals: 5, assists: 0, canada: 5 });
  expect(pepa.perTournament).toEqual({ 1: { goals: 3 }, 2: { goals: 2 } });
  const onlyT2 = playerStatsRows(graph.players, [graph.tournamentsById.get(2)!]);
  expect(onlyT2.find((r) => r.player.pk === 101)!.canada).toBe(0);
  expect(onlyT2).toHaveLength(3);
});

test('goalieStatsRows aggregates per goalie over selected tournaments', () => {
  const graph = g();
  const t1 = graph.tournamentsById.get(1)!;
  const rows = goalieStatsRows(sampleGoalieStats(), graph, [t1]);
  expect(rows.map((r) => r.player.pk)).toEqual([100, 102]);
  expect(rows[0]).toMatchObject({ matches: 2, shots: 10, goals: 2 });
  expect(rows[0].success).toBeCloseTo(0.8);
  expect(rows[0].perTournament[1].success).toBeCloseTo(0.8);
  expect(Number.isNaN(rows[1].success)).toBe(true);
  expect(tournamentsWithGoalieStats(sampleGoalieStats(), graph.tournaments).map((t) => t.pk)).toEqual([1, 2]);
});
```

Run → FAIL.

- [ ] **Step 2: Implement** `src/domain/stats.ts`:

```ts
import type { GoalieStatDto } from '../api/types';
import type { Graph, PlayerVM, TournamentVM } from './graph';

export type CategoryKey = 'nizkov' | 'brno' | 'hala' | 'liga' | 'other';
const CATEGORY_KEYS: CategoryKey[] = ['nizkov', 'brno', 'hala', 'liga', 'other'];

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  nizkov: 'Nížkov',
  brno: 'Brno',
  hala: 'Hala',
  liga: 'Liga',
  other: 'Další',
};

export interface StatsFilter {
  yearFrom: number | null;
  yearTo: number | null;
  categories: Record<CategoryKey, boolean>;
  man: boolean;
  woman: boolean;
  minMatches: number;
  team: string;
}

export function defaultStatsFilter(thisYear: number): StatsFilter {
  return {
    yearFrom: thisYear - 6,
    yearTo: thisYear,
    categories: { nizkov: true, brno: true, hala: false, liga: false, other: false },
    man: true,
    woman: true,
    minMatches: 10,
    team: '',
  };
}

export const STATS_PARAM_KEYS = ['from', 'to', 'cat', 'g', 'min', 'team'] as const;

const int = (s: string | null) => (s !== null && /^-?\d+$/.test(s) ? Number(s) : undefined);

export function parseStatsFilter(params: URLSearchParams, thisYear: number): StatsFilter {
  const f = defaultStatsFilter(thisYear);
  const year = (name: string, fallback: number | null) => {
    const raw = params.get(name);
    if (raw === null) return fallback;
    if (raw === '') return null;
    return int(raw) ?? fallback;
  };
  f.yearFrom = year('from', f.yearFrom);
  f.yearTo = year('to', f.yearTo);
  const cat = params.get('cat');
  if (cat !== null) {
    const enabled = new Set(cat.split(','));
    f.categories = Object.fromEntries(CATEGORY_KEYS.map((k) => [k, enabled.has(k)])) as Record<CategoryKey, boolean>;
  }
  const g = params.get('g');
  if (g !== null && g !== 'mw') {
    f.man = g === 'm';
    f.woman = g === 'w';
  }
  const min = int(params.get('min'));
  if (min !== undefined) f.minMatches = Math.max(0, min);
  f.team = params.get('team') ?? '';
  return f;
}

export function statsFilterParams(f: StatsFilter): Record<string, string> {
  return {
    from: f.yearFrom == null ? '' : String(f.yearFrom),
    to: f.yearTo == null ? '' : String(f.yearTo),
    cat: CATEGORY_KEYS.filter((k) => f.categories[k]).join(','),
    g: f.man && f.woman ? 'mw' : f.man ? 'm' : f.woman ? 'w' : '0',
    min: String(f.minMatches),
    team: f.team,
  };
}

export function filterTournaments(ts: TournamentVM[], f: StatsFilter, opts: { allowLiga: boolean }): TournamentVM[] {
  return ts
    .filter((t) => {
      if (f.yearFrom != null && t.year < f.yearFrom) return false;
      if (f.yearTo != null && t.year > f.yearTo) return false;
      const slug = t.category_slugname;
      if (slug === 'trening') return false;
      if (slug === 'liga') return opts.allowLiga && f.categories.liga;
      if (slug) return f.categories[slug];
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function genderMatches(player: { gender: string | null }, f: Pick<StatsFilter, 'man' | 'woman'>): boolean {
  return (f.man || player.gender === 'woman') && (f.woman || player.gender === 'man');
}

export interface PlayerStatsRow {
  player: PlayerVM;
  perTournament: Record<number, { goals?: number; assists?: number }>;
  goals: number;
  assists: number;
  canada: number;
}

export function playerStatsRows(players: PlayerVM[], tournaments: TournamentVM[]): PlayerStatsRow[] {
  return players.map((player) => {
    const row: PlayerStatsRow = { player, perTournament: {}, goals: 0, assists: 0, canada: 0 };
    for (const t of tournaments) {
      const goals = player.goals[t.pk];
      const assists = player.assists[t.pk];
      if (goals === undefined && assists === undefined) continue;
      row.perTournament[t.pk] = {
        ...(goals !== undefined && { goals }),
        ...(assists !== undefined && { assists }),
      };
      row.goals += goals ?? 0;
      row.assists += assists ?? 0;
    }
    row.canada = row.goals + row.assists;
    return row;
  });
}

export interface GoalieTournamentStat {
  matches: number;
  shots: number;
  goals: number;
  success: number;
}

export interface GoalieStatsRow extends GoalieTournamentStat {
  player: PlayerVM;
  perTournament: Record<number, GoalieTournamentStat>;
}

const success = (goals: number, shots: number) => (shots ? 1 - goals / shots : Number.NaN);

export function goalieStatsRows(stats: GoalieStatDto[], graph: Graph, tournaments: TournamentVM[]): GoalieStatsRow[] {
  const allowed = new Set(tournaments.map((t) => t.pk));
  const rows = new Map<number, GoalieStatsRow>();
  for (const s of stats) {
    if (!allowed.has(s.tournament)) continue;
    const player = graph.playersById.get(s.goalie);
    if (!player) continue;
    let row = rows.get(s.goalie);
    if (!row) {
      row = { player, perTournament: {}, matches: 0, shots: 0, goals: 0, success: Number.NaN };
      rows.set(s.goalie, row);
    }
    row.perTournament[s.tournament] = {
      matches: s.matches,
      shots: s.shots,
      goals: s.goals,
      success: success(s.goals, s.shots),
    };
    row.matches += s.matches;
    row.shots += s.shots;
    row.goals += s.goals;
  }
  for (const row of rows.values()) row.success = success(row.goals, row.shots);
  return [...rows.values()];
}

export function tournamentsWithGoalieStats(stats: GoalieStatDto[], tournaments: TournamentVM[]): TournamentVM[] {
  const present = new Set(stats.map((s) => s.tournament));
  return tournaments.filter((t) => present.has(t.pk));
}
```

- [ ] **Step 3: Verify** — `npm test && npm run typecheck && npm run lint` → PASS.

- [ ] **Step 4: Commit** — `git add src && git commit -m "feat: stats filters and aggregations"`

---

### Task 6: Tournament results page

**Files:**
- Create: `src/pages/TournamentResultsPage.tsx`, `src/pages/TournamentResultsPage.test.tsx`
- Modify: `src/router.tsx`

**Interfaces:**
- Consumes: `useGraph`, `useMatches`, `usePairs`, `useGoalieStats`, tournament domain functions, `genderMatches`, `DataTable`, `czechSort`, `PlayerLink`, `BackLink`, `teamPath`, `tournamentResultsPath`, `formatRank`, `Spinner`, `ErrorBox`.

Route `tournaments/:id/results/:teamId?` (`teamId` = TOT pk). Structure: page component handles graph loading/not-found (`<div role="alert" className="callout">Turnaj nenalezen.</div>` after `BackLink`); an inner `TournamentResults({ graph, tournament, selectedTot })` holds the hooks/memos.

Layout (R§4.10, with bug fixes):
1. `<BackLink fallback="/tournaments" />`
2. Right-floated buttons (`btn btn-secondary text-sm`, as links): "Skupiny" → `/tournaments/:id/groups`; "Spravovat" → `/tournaments/:id/record` if `is_tournament_open`; "Hodnocení rozhodčích" → `/tournaments/:id/referee-feedback` if `!closed_edit`.
3. `<h1 className="text-3xl">{full_name}</h1>`
4. If matches loaded and `summary.goalCount > 0`: list — `lokace: {location}`, `kategorie: {category}`, `<b>{teamCount}</b> týmů odehrálo <b>{matchCount}</b> zápasů`, `celkem se zúčastnilo <b>{playerCount}</b> hráčů`, `bylo vstřeleno <b>{goalCount}</b> branek`.
5. `<hr>`; team filter `<select aria-label="Tým">` with option "Všechny týmy" (value '') + tournament TOTs sorted by name (`localeCompare(…, 'cs')`), value = TOT pk, label = `tot.name`. Change → `navigate({ pathname: tournamentResultsPath(id, pk?), search: <current params without p_page, g_page, d_page> }, { replace: true })`.
6. Two columns (`md:grid md:grid-cols-12 gap-6`): left `md:col-span-7`, right `md:col-span-5`.
   - Left: `<h3>Týmy</h3>` plain `table-basic`: headers `#` (right) | Jméno | Skóre | Hráči; rows `sortTotsByRank(tournament.tots)` filtered to `selectedTot` when set; cells `formatRank(rank)` | link `teamPath({ pk: tot.team.pk, name: tot.name })` text `tot.name` | `{scored}:{received}` from `teamScores(matches)` (0:0 when absent or matches not loaded) | `PlayerLink`s joined by `, `.
   - Left: matches section: while loading `Spinner`; on error `ErrorBox` with retry; else rows = matches with `length != null`, filtered to `team_one === selectedTot || team_two === selectedTot` when set, sorted by `start` (string compare, null last). If rows non-empty: `<h3>Zápasy</h3>` and plain table (no header row): `team_one` `name_pure` (right) | `score_one` (right) | `score_two` + ` P` if `with_shootout` | `team_two` `name_pure` | `<Link to="/tournaments/:id/matches/:pk">detail</Link>`. Team names from `graph.totsById` (missing → '').
   - Right: gender checkboxes (top right) labelled `♂` (`aria-label="Muži"`) and `♀` (`aria-label="Ženy"`), state from URL param `g` (same encoding as stats: absent/`mw` both, `m`, `w`, `0`); toggling writes `g` and drops `p_page`.
   - Right: `<h3>Nejlepší hráči</h3>` + `DataTable` (`urlPrefix="p_"`, `rank`, `displayedPages={5}`), rows = `tournamentPlayerRows(graph, id)` filtered by gender and (if selected) `selectedTot.playerPks.includes(player.pk)`; columns: `nickname` "Jméno" (PlayerLink, czechSort) | `goals` "góly" | `assists` "asistence" | `canada` "kanada" (numbers right, `sortDescFirst`).
   - Right: goalies (from `useGoalieStats(id)` → `goalieRows`), filtered to `row.team === selectedTot` when set; hidden when empty or not loaded. `<h3>Nejlepší brankáři</h3>` + `DataTable` (`urlPrefix="g_"`, `rank`, `displayedPages={5}`); columns: `nickname` "Jméno" (PlayerLink) | `matches` "zápasů" | `shots` "střel" | `goals` "gólů" | `success` "úspěšnost" (`formatPercent`, `sortingFn` using `compareSuccess`, `sortDescFirst`).
   - Right: pairs (`usePairs(id)` → `pairRows`), filtered when a team is selected to pairs where **either** player is in `selectedTot.playerPks`; hidden when empty. `<h3>Nejproduktivnější dvojice</h3>` + `DataTable` (`urlPrefix="d_"`, `rank`, `displayedPages={5}`); columns: `player1` "Hráč 1" (no sort; PlayerLink + ` (${goalsFirst})` when truthy) | `player2` "Hráč 2" (same with `goalsSecond`) | `points` "body" (`sortDescFirst`).

Column arrays at module level. Use `id`s exactly as named above.

- [ ] **Step 1: Failing tests** — `src/pages/TournamentResultsPage.test.tsx`:

```tsx
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router';
import { expect, test } from 'vitest';
import { sampleGoalieStats, sampleMatches, samplePairs } from '../test/fixtures';
import { mockGraphApi, renderWithProviders } from '../test/utils';
import TournamentResultsPage from './TournamentResultsPage';

function Loc() {
  const l = useLocation();
  return <div data-testid="loc">{l.pathname + l.search}</div>;
}

const api = () =>
  mockGraphApi({
    'matchs?tournament=1': sampleMatches(),
    'pairs/1': samplePairs(),
    'goalie_stats?tournament=1': sampleGoalieStats().slice(0, 2),
    'matchs?tournament=2': [],
    'pairs/2': [],
    'goalie_stats?tournament=2': [],
  });

const render = (route: string) =>
  renderWithProviders(
    <>
      <TournamentResultsPage />
      <Loc />
    </>,
    { route, path: '/tournaments/:id/results/:teamId?' },
  );

const section = (name: string) => screen.getByRole('heading', { name }).parentElement!;

test('shows summary, teams with scores, finished matches, players, goalies and pairs', async () => {
  api();
  render('/tournaments/1/results');
  expect(await screen.findByRole('heading', { name: 'Brno 2023' })).toBeInTheDocument();
  expect(await screen.findByText(/bylo vstřeleno/)).toHaveTextContent('bylo vstřeleno 8 branek');
  const teams = within(section('Týmy')).getAllByRole('row');
  expect(teams[1]).toHaveTextContent('1.');
  expect(teams[1]).toHaveTextContent('Ufo');
  expect(teams[1]).toHaveTextContent('5:3');
  const matches = within(section('Zápasy')).getAllByRole('row');
  expect(matches).toHaveLength(2);
  expect(matches[1]).toHaveTextContent('2 P');
  expect(within(matches[0]).getByRole('link', { name: 'detail' })).toHaveAttribute('href', '/tournaments/1/matches/500');
  expect(await screen.findByRole('heading', { name: 'Nejlepší brankáři' })).toBeInTheDocument();
  expect(screen.getByText('80,0%')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Nejproduktivnější dvojice' })).toBeInTheDocument();
});

test('team filter navigates to TOT pk and filters by pk', async () => {
  api();
  render('/tournaments/1/results?p_page=2');
  await screen.findByRole('heading', { name: 'Brno 2023' });
  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Tým' }), '1001');
  expect(screen.getByTestId('loc')).toHaveTextContent('/tournaments/1/results/1001');
  expect(screen.getByTestId('loc')).not.toHaveTextContent('p_page');
  const teams = within(section('Týmy')).getAllByRole('row');
  expect(teams).toHaveLength(2);
  expect(teams[1]).toHaveTextContent('Kométa');
  expect(within(section('Nejlepší hráči')).queryByText('Pépa')).not.toBeInTheDocument();
});

test('gender filter hides women', async () => {
  api();
  render('/tournaments/1/results?g=m');
  await screen.findByRole('heading', { name: 'Nejlepší hráči' });
  expect(within(section('Nejlepší hráči')).queryByText('Jana')).not.toBeInTheDocument();
  expect(screen.getByRole('checkbox', { name: 'Ženy' })).not.toBeChecked();
});

test('tournament without matches shows teams 0:0 and no summary/matches/goalies', async () => {
  api();
  render('/tournaments/2/results');
  expect(await screen.findByRole('heading', { name: 'Nížkov 2024' })).toBeInTheDocument();
  expect(within(section('Týmy')).getAllByRole('row')[1]).toHaveTextContent('0:0');
  expect(screen.queryByText(/bylo vstřeleno/)).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Zápasy' })).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Nejlepší brankáři' })).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Nejlepší hráči' })).toBeInTheDocument();
});

test('unknown tournament', async () => {
  api();
  render('/tournaments/999/results');
  expect(await screen.findByRole('alert')).toHaveTextContent('Turnaj nenalezen.');
});
```

Each section heading and its table must share a wrapping element (e.g. `<section>`) so `section(name)` works.

Run → FAIL.

- [ ] **Step 2: Implement** the page and replace the route placeholder `tournaments/:id/results/:teamId?`.

- [ ] **Step 3: Verify** — `npm test && npm run typecheck && npm run lint` → PASS.

- [ ] **Step 4: Commit** — `git add src && git commit -m "feat: tournament results page"`

---

### Task 7: Groups page (round robin + playoff bracket)

**Files:**
- Create: `src/domain/groups.ts`, `src/domain/groups.test.ts`, `src/pages/GroupsPage.tsx`, `src/pages/GroupsPage.test.tsx`
- Modify: `src/router.tsx`

**Interfaces:**
- Produces (`src/domain/groups.ts`):
  - `groupCell(matches: GroupsDto['matches'], a: number, b: number, level: number): string` — `''` if no entry, else `` `${s0} : ${s1}` `` + `' P'` if `s2` truthy.
  - `groupRecord(stats: GroupsDto['stats'], tot: number, level: number): string` — `''` if no entry, else `` `${wins}${winsP ? `(${winsP}P)` : ''} / ${looses}${loosesP ? `(${loosesP}P)` : ''} / ${draws}` ``.
  - `groupScore(stats: GroupsDto['stats'], tot: number, level: number): string` — `''` if no entry, else `` `${score[0]} : ${score[1]}` ``.
  - `PLAYOFF_LABELS = ['Finále', 'O 3. místo', 'O 5. místo', 'O 7. místo']`.

Page (R§4.11): route `tournaments/:id/groups`; `useGroups(id)` + `useTournament(id)`.
- `<BackLink fallback={tournamentResultsPath(id)} />`, `<h1 className="text-3xl">Skupiny - {tournament full_name}</h1>` (title part empty until loaded).
- Groups loading → `Spinner`; error → `ErrorBox` with retry (a missing tournament returns 404 → error box).
- Each group (server order) in a `<section>`: `<h3 id={group.name}>{group.name}</h3>`, then:
  - **Round robin** (no `playoff`): `table-basic text-center whitespace-nowrap` inside `overflow-x-auto`. Header: empty `th`, one `th` per team (`max-w-[7em] truncate`) with `Link` to `teamPath({ pk: t.team.pk, name: t.team.name })` text `t.name_pure`, then `th` "V / P / R" and `th` "Skóre". Rows per team: `th` `name_pure`, cells `groupCell(matches, row.pk, col.pk, level)` (diagonal empty), `groupRecord`, `groupScore`.
  - **Playoff bracket** (`playoff` present): `grid grid-cols-3 gap-4` (horizontal scroll on small screens); column per round (0..2); each column has 4 match boxes for slot pairs (0,1),(2,3),(4,5),(6,7) (`border rounded p-2`); in round 2 each box has a small gray label from `PLAYOFF_LABELS[pairIndex]` above it; each box has two lines `name_pure` + right-aligned `score`, winner line bold (`entry.win`).

- [ ] **Step 1: Failing tests**

`src/domain/groups.test.ts`:

```ts
import { expect, test } from 'vitest';
import { groupCell, groupRecord, groupScore } from './groups';

const matches = { '1-2': { '1': [3, 1, 0] as [number, number, number] }, '2-1': { '1': [1, 3, 0] as [number, number, number] }, '1-3': { '1': [2, 2, 1] as [number, number, number] } };
const stats = {
  '1': { '1': { score: [5, 3] as [number, number], wins: 1, looses: 0, winsP: 0, loosesP: 0, draws: 1 } },
  '3': { '1': { score: [2, 2] as [number, number], wins: 1, looses: 1, winsP: 1, loosesP: 1, draws: 0 } },
};

test('groupCell', () => {
  expect(groupCell(matches, 1, 2, 1)).toBe('3 : 1');
  expect(groupCell(matches, 1, 3, 1)).toBe('2 : 2 P');
  expect(groupCell(matches, 2, 3, 1)).toBe('');
  expect(groupCell(matches, 1, 2, 2)).toBe('');
});

test('groupRecord and groupScore', () => {
  expect(groupRecord(stats, 1, 1)).toBe('1 / 0 / 1');
  expect(groupRecord(stats, 3, 1)).toBe('1(1P) / 1(1P) / 0');
  expect(groupRecord(stats, 9, 1)).toBe('');
  expect(groupScore(stats, 1, 1)).toBe('5 : 3');
});
```

`src/pages/GroupsPage.test.tsx`:

```tsx
import { screen, within } from '@testing-library/react';
import { expect, test } from 'vitest';
import type { GroupTotDto, GroupsDto } from '../api/types';
import { kometa, t1, ufo } from '../test/fixtures';
import { mockApi, renderWithProviders } from '../test/utils';
import GroupsPage from './GroupsPage';

const gt = (pk: number, team = ufo, name = team.name): GroupTotDto => ({
  pk, team, tournament: t1, captain: null, default_goalie: null, name, name_pure: name, name_short: null, rank: null,
});

const roundRobin: GroupsDto = {
  groups: [{ pk: 1, tournament: t1, teams: [gt(1000), gt(1001, kometa)], level: 1, name: 'Skupina A' }],
  matches: { '1000-1001': { '1': [3, 1, 0] }, '1001-1000': { '1': [1, 3, 0] } },
  stats: {
    '1000': { '1': { score: [3, 1], wins: 1, looses: 0, winsP: 0, loosesP: 0, draws: 0 } },
    '1001': { '1': { score: [1, 3], wins: 0, looses: 1, winsP: 0, loosesP: 0, draws: 0 } },
  },
};

const playoffEntries = Array.from({ length: 8 }, (_, i) => ({ ...gt(2000 + i, ufo, `Tým ${i + 1}`), score: i % 2 ? 1 : 2, win: i % 2 === 0 }));
const playoff: GroupsDto = {
  groups: [{ pk: 2, tournament: t1, teams: playoffEntries, level: 2, name: 'Play-off', playoff: [playoffEntries, playoffEntries, playoffEntries] }],
  matches: {},
  stats: {},
};

const render = () => renderWithProviders(<GroupsPage />, { route: '/tournaments/1/groups', path: '/tournaments/:id/groups' });

test('round robin table', async () => {
  mockApi({ 'get_groups/1': roundRobin, 'tournament/1': t1 });
  render();
  expect(await screen.findByRole('heading', { name: 'Skupina A' })).toBeInTheDocument();
  expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Skupiny - Brno 2023');
  const rows = within(screen.getByRole('table')).getAllByRole('row');
  expect(rows[1]).toHaveTextContent('3 : 1');
  expect(rows[1]).toHaveTextContent('1 / 0 / 0');
  expect(within(rows[0]).getByRole('link', { name: 'Kométa' })).toHaveAttribute('href', '/teams/11/Kom%C3%A9ta');
});

test('playoff bracket with labels and bold winners', async () => {
  mockApi({ 'get_groups/1': playoff, 'tournament/1': t1 });
  render();
  expect(await screen.findByText('Finále')).toBeInTheDocument();
  expect(screen.getByText('O 7. místo')).toBeInTheDocument();
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
  expect(screen.getAllByText('Tým 1')[0].closest('.font-bold')).not.toBeNull();
});

test('missing tournament shows error', async () => {
  mockApi({});
  render();
  expect(await screen.findByRole('alert')).toBeInTheDocument();
});
```

Run → FAIL.

- [ ] **Step 2: Implement** domain helpers, page (with `RoundRobinTable` and `PlayoffBracket` subcomponents in the same file), and replace the `tournaments/:id/groups` route placeholder.

- [ ] **Step 3: Verify** — `npm test && npm run typecheck && npm run lint` → PASS.

- [ ] **Step 4: Commit** — `git add src && git commit -m "feat: groups page with round robin tables and playoff bracket"`

---

### Task 8: Stats filter form + Player stats page

**Files:**
- Create: `src/components/StatsFilterForm.tsx`, `src/pages/PlayerStatsPage.tsx`, `src/pages/PlayerStatsPage.test.tsx`
- Modify: `src/router.tsx`

**Interfaces:**
- Produces:
  - `StatsFilterForm({ filter, onChange, onReset, showLiga, showMinMatches }: { filter: StatsFilter; onChange: (patch: Partial<StatsFilter>) => void; onReset: () => void; showLiga: boolean; showMinMatches: boolean })`.
  - `useStatsFilter(): [StatsFilter, (patch: Partial<StatsFilter>) => void, () => void]` (exported from `StatsFilterForm.tsx`) — reads `parseStatsFilter(searchParams, new Date().getFullYear())`; `set(patch)` writes `statsFilterParams({ ...filter, ...patch })` merged into the URL, deleting `page`; `reset()` deletes all `STATS_PARAM_KEYS` and `page`; writes use `replace: true`.

Form layout (R§4.12), two fieldsets side by side on `md` (`fieldset` with `legend`, `border p-3`):
- "Filtrování hráčů": checkboxes `♂` (`aria-label="Muži"`) and `♀` (`aria-label="Ženy"`); text input "Jméno týmu" (`placeholder="tým"`, `aria-label="Jméno týmu"`) bound via `useDebouncedInput(filter.team, (v) => onChange({ team: v }))`; if `showMinMatches`: number input "Zápasů" (`aria-label="Zápasů"`, min 0) bound via `useDebouncedInput(String(filter.minMatches), (v) => onChange({ minMatches: Math.max(0, Number(v) || 0) }))`.
- "Filtrování turnajů": number inputs "od roku" / "do roku" (`placeholder="rok"`, `aria-label`s same as labels) via `useDebouncedInput` (empty → null); checkboxes for `nizkov`, `brno`, `hala`, (`liga` only if `showLiga`), `other` labelled with `CATEGORY_LABELS`; button "×" `aria-label="Obnovit výchozí filtr"` calling `onReset`.
- Player name search is the DataTable search (`searchPlaceholder="jméno"`, `searchLabel="Jméno hráče"`).

Player stats page (route `stats/players`):
- `useGraph()`; `[filter, setFilter, resetFilter] = useStatsFilter()`.
- `tournaments = filterTournaments(graph.tournaments, filter, { allowLiga: true })`.
- `rows = playerStatsRows(graph.players, tournaments).filter((r) => genderMatches(r.player, filter))` (memoized).
- `extraFilter` = when `filter.team`: `(r) => r.player.teamsSearch.includes(searchKey(filter.team))` (memoized), else undefined.
- `DataTable` with `rank="beforeSearch"`, `searchText={(r) => r.player.search}` (module-level function), `defaultSort={{ id: 'canada', desc: true }}` (module-level constant), columns (memoized on `tournaments`): `nickname` "Jméno" (PlayerLink, czechSort, width 10%) | one display column per tournament, `id: \`t${pk}\``, header `<Link to={tournamentResultsPath(pk)}>{full_name}</Link>`, cell: `<b>{goals}</b>` if goals, `+` if both, `{assists}` if assists (empty when neither), right | `goals` "G" | `assists` "A" | `canada` "K" (numbers center-aligned, `sortDescFirst`).

- [ ] **Step 1: Failing test** — `src/pages/PlayerStatsPage.test.tsx`:

```tsx
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { mockGraphApi, renderWithProviders } from '../test/utils';
import PlayerStatsPage from './PlayerStatsPage';

vi.useFakeTimers({ toFake: ['Date'] });
vi.setSystemTime(new Date('2025-03-01T12:00:00'));

const bodyRows = () => within(screen.getAllByRole('rowgroup')[1]).getAllByRole('row');

test('default filter: Brno and Nížkov columns, sorted by K, ranks shown', async () => {
  mockGraphApi();
  renderWithProviders(<PlayerStatsPage />, { route: '/stats/players' });
  expect(await screen.findByRole('link', { name: 'Brno 2023' })).toHaveAttribute('href', '/tournaments/1/results');
  expect(screen.getByRole('link', { name: 'Nížkov 2024' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Hala 2025' })).not.toBeInTheDocument();
  expect(bodyRows()[0]).toHaveTextContent('1.');
  expect(bodyRows()[0]).toHaveTextContent('Pépa');
  expect(bodyRows()[0]).toHaveTextContent('3');
});

test('name search keeps overall rank; team filter and gender filter apply', async () => {
  mockGraphApi();
  renderWithProviders(<PlayerStatsPage />, { route: '/stats/players' });
  await screen.findByRole('link', { name: 'Brno 2023' });
  await userEvent.type(screen.getByRole('textbox', { name: 'Jméno hráče' }), 'jana');
  await waitFor(() => expect(bodyRows()).toHaveLength(1));
  expect(bodyRows()[0]).toHaveTextContent('3.');
});

test('women only via URL', async () => {
  mockGraphApi();
  renderWithProviders(<PlayerStatsPage />, { route: '/stats/players?g=w' });
  await screen.findByRole('link', { name: 'Brno 2023' });
  expect(bodyRows()).toHaveLength(1);
  expect(bodyRows()[0]).toHaveTextContent('Jana');
  expect(screen.getByRole('checkbox', { name: 'Muži' })).not.toBeChecked();
});

test('all categories off shows no tournament columns and still renders', async () => {
  mockGraphApi();
  renderWithProviders(<PlayerStatsPage />, { route: '/stats/players?cat=' });
  await screen.findByRole('checkbox', { name: 'Brno' });
  expect(screen.queryByRole('link', { name: 'Brno 2023' })).not.toBeInTheDocument();
});
```

Expected order with default filter (tournaments 1, 2): Pépa 5, Karel 4, Jana 3 → Jana's overall rank 3. (Karel scored 4 in t1 without a roster; he still has goals.) If `vi.useFakeTimers({ toFake: ['Date'] })` interferes with `userEvent`/debounce, instead mock `Date` via `vi.setSystemTime` inside `beforeEach` with `vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ['Date'] })` — explain in report.

Run → FAIL.

- [ ] **Step 2: Implement** form, hook and page; replace the `stats/players` route placeholder.

- [ ] **Step 3: Verify** — `npm test && npm run typecheck && npm run lint` → PASS.

- [ ] **Step 4: Commit** — `git add src && git commit -m "feat: player stats page with URL filters"`

---

### Task 9: Goalie stats page

**Files:**
- Create: `src/pages/GoalieStatsPage.tsx`, `src/pages/GoalieStatsPage.test.tsx`
- Modify: `src/router.tsx`

**Interfaces:**
- Consumes: `useGraph`, `useGoalieStats()`, `useStatsFilter`, `StatsFilterForm`, `filterTournaments`, `tournamentsWithGoalieStats`, `goalieStatsRows`, `genderMatches`, `formatPercent`, `compareSuccess`, `DataTable`, `czechSort`, `PlayerLink`.

Page (route `stats/goalies`, R§4.13 with fixes):
- Loading: graph and goalie stats (`Spinner`; either error → `ErrorBox` with retry of the failed one).
- `tournaments = tournamentsWithGoalieStats(stats, filterTournaments(graph.tournaments, filter, { allowLiga: false }))`.
- `rows = goalieStatsRows(stats, graph, tournaments).filter((r) => genderMatches(r.player, filter) && r.success > 0 && r.matches >= filter.minMatches)`.
- `StatsFilterForm` with `showLiga={false}`, `showMinMatches`.
- `DataTable`: `rank="beforeSearch"`, search on player name (`searchPlaceholder="jméno"`, `searchLabel="Jméno hráče"`), team filter as `extraFilter` (same as player stats), `defaultSort={{ id: 'success', desc: true }}`; columns (memoized on `tournaments`): `nickname` "Jméno" (**PlayerLink with gender sign**, czechSort, width 10%) | per tournament `t${pk}` header link, cell when `perTournament[pk]` exists and `success > 0`: `<b>{formatPercent(success)}</b><br /><span className="text-xs">({goals} / {shots})</span>`, else empty | `matches` "zápasů" | `shots` "střel" | `goals` "gólů" | `success` "úspěšnost" (`formatPercent`, `sortingFn` via `compareSuccess`). All numeric columns `sortDescFirst`, right-aligned.

- [ ] **Step 1: Failing test** — `src/pages/GoalieStatsPage.test.tsx`:

```tsx
import { screen, within } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { sampleGoalieStats } from '../test/fixtures';
import { mockGraphApi, renderWithProviders } from '../test/utils';
import GoalieStatsPage from './GoalieStatsPage';

vi.useFakeTimers({ toFake: ['Date'] });
vi.setSystemTime(new Date('2025-03-01T12:00:00'));

const bodyRows = () => within(screen.getAllByRole('rowgroup')[1]).getAllByRole('row');

test('lists goalies meeting min matches with per-tournament success', async () => {
  mockGraphApi({ goalie_stats: sampleGoalieStats() });
  renderWithProviders(<GoalieStatsPage />, { route: '/stats/goalies?min=2' });
  expect(await screen.findByRole('link', { name: 'Brno 2023' })).toBeInTheDocument();
  const rows = bodyRows();
  expect(rows).toHaveLength(2);
  expect(rows[0]).toHaveTextContent('Pépa');
  expect(rows[0]).toHaveTextContent('80,0%');
  expect(rows[0]).toHaveTextContent('(2 / 10)');
  expect(within(rows[1]).getByRole('link')).toHaveTextContent('♀');
});

test('default min matches 10 hides goalies with few matches; zero-shot goalie never shown', async () => {
  mockGraphApi({ goalie_stats: sampleGoalieStats() });
  renderWithProviders(<GoalieStatsPage />, { route: '/stats/goalies' });
  await screen.findByRole('link', { name: 'Nížkov 2024' });
  const rows = bodyRows();
  expect(rows).toHaveLength(1);
  expect(rows[0]).toHaveTextContent('Jana');
  expect(screen.queryByText('Karel')).not.toBeInTheDocument();
});

test('goalie stats error shows retry box', async () => {
  mockGraphApi();
  renderWithProviders(<GoalieStatsPage />, { route: '/stats/goalies' });
  expect(await screen.findByRole('alert')).toBeInTheDocument();
});
```

(Expected: with `min=2`, Pépa (t1: 2 matches, 80 %) and Jana (t2: 12 matches, 75 %) shown, Karel (0 shots) never; sorted by success desc.)

Run → FAIL.

- [ ] **Step 2: Implement**; replace the `stats/goalies` route placeholder.

- [ ] **Step 3: Verify** — `npm test && npm run typecheck && npm run lint && npm run build` → PASS.

- [ ] **Step 4: Commit** — `git add src && git commit -m "feat: goalie stats page from backend goalie_stats"`

---

## Next

- Plan 3: authorized pages (record hub/live view, registration, roster, player edit/attendance/pairing, pair account, referee feedback).
