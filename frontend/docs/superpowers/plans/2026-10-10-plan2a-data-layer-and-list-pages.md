# Plan 2a — Data Layer, DataTable and Simple Read-only Pages

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholders for Home, FAQ, Privacy policy, Hall of records, Players, Player detail, Teams, Team detail and Tournaments with working read-only pages, built on a typed data layer (DTOs, endpoints, linked entity graph), a URL-state `DataTable`, and shared UI pieces. Also fix the backend `/players` cache leaking staff-only `birthdate`.

**Architecture:** Raw JSON lists (`players`, `teamontournaments`, `goals`, `get_empty_trournaments`) are fetched with TanStack Query and turned into a linked, read-only object graph by a pure function `buildGraph` (`src/domain/graph.ts`). Pages read the graph via `useGraph()`, render tables with a generic `DataTable` (TanStack Table; sort/search/page in URL search params), and reuse small components (`PlayerLink`, `Medals`, `BackLink`).

**Tech Stack:** React 19, TypeScript strict, React Router 7, TanStack Query 5, **TanStack Table 8 (new dependency)**, Tailwind 4, Vitest + Testing Library. Backend: Django 4.2, pytest-django.

**Spec:** `docs/superpowers/specs/2026-10-10-react-frontend-design.md`
**Research (old app behaviour, exact columns/labels/formulas):** `/tmp/claude-1000/-home-thran-projects-ufobal-web-frontend/afb38ef5-0a40-47b4-8bbe-1e26e7cfcf82/scratchpad/plan2-research.md` — referenced as **R§x.y** below. If the file is gone, the old app sources it cites are in `~/projects/ufobal-web/ufobalapp/static/ufobalapp/`.

## Global Constraints

- Branches: frontend `react-rewrite` (this repo), backend `new-frontend` (`~/projects/ufobal-web`). Never push.
- UI text Czech, hardcoded; code/comments English; comments only for non-obvious things.
- **Numbers formatted Czech** (`Intl.NumberFormat('cs-CZ')`: `12 345` with U+00A0 as group separator, `93,4`). Dates `d. M. yyyy` and `d. M. yyyy H:mm`.
- **Table state (sort, search, page) lives in URL search params**, not localStorage. Param names: `<prefix>sort` (`col` asc, `-col` desc, empty = natural order), `<prefix>q`, `<prefix>page` (1-based, omitted for page 1). Writes use `replace: true`.
- Page size 15 for all tables in this plan; pagination hidden when fewer than 2 pages.
- `/intro` redirects to `/faq` (user decision; the old checkbox is dropped).
- Never display `birthdate` (use `age`).
- API calls only via `src/api/client.ts` to `/api_frontend/`.
- Big lists (`players`, `teamontournaments`, `goals`, `get_empty_trournaments`) use `staleTime: 10 * 60_000`.
- Commit trailer (after a blank line):
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01NHHZjCnSN7qrM8oz75zwSt`
- Backend tests: `cd ~/projects/ufobal-web && ~/miniconda3/envs/ufobal_web/bin/python -m pytest -q` — baseline **4 failed** (pre-existing in `test_views.py`); don't make it worse. Tests use Django's local-memory cache.
- Frontend checks: `npm test && npm run typecheck && npm run lint`.

## Review Focus

1. **Player with no teams / no goals / no penalties** — Players and Player detail must render (empty team list, blank stat cells, "Karty" table with headers only). Test in Task 8.
2. **Team or tournament referenced only by an "empty" tournament or with `rank: null`** — no NaN medals, empty tournaments listed with `0` teams. Tests in Tasks 3 and 10.
3. **Unknown id in URL** (`/players/999999`, `/teams/abc`) — show a "nenalezen" message, not a crash. Tests in Tasks 8 and 9.
4. **URL table state out of range** (`?page=999`, `?sort=nonexistent`) — clamp to last page / ignore unknown sort, no crash. Test in Task 4.
5. **Search with diacritics either way** (`pepa` finds `Pépa`, `kometa` finds `Kométa`). Tests in Tasks 4 and 9.

---

## File Structure (new/changed in this plan)

```
src/api/types.ts            + DTOs (PlayerDto, PenaltyDto, TeamDto, TournamentDto, TotDto, GoalsDto, StatsDto, HallOfGloryDto)
src/api/client.ts           + params, signal
src/api/endpoints.ts        new: one function per read endpoint
src/domain/text.ts          new: searchKey()
src/domain/graph.ts         new: buildGraph(), compareMedals(), scoreWithoutTeam(), VM types
src/format.ts               new: formatNumber, formatDate, formatDateTime, formatRank
src/queries/data.ts         new: dataKeys, useGraph(), useStats(), useHallOfGlory(), useTournament()
src/components/DataTable.tsx new
src/components/PlayerLink.tsx, Medals.tsx, BackLink.tsx  new
src/paths.ts                + teamPath, tournamentResultsPath
src/pages/{Home,Faq,PrivacyPolicy,HallOfRecords,Players,Player,Teams,Team,Tournaments}Page.tsx  new
src/router.tsx              placeholders replaced, /intro → /faq
src/test/fixtures.ts        new: sample DTOs
src/test/utils.tsx          + mockApi(), path option
src/test/setup.ts           + ResizeObserver polyfill, unstubAllGlobals
```

---

### Task 1: Backend — per-audience list cache (birthdate leak)

**Files (repo `~/projects/ufobal-web`):**
- Modify: `ufobalapp/models.py` (add `list_cache_key`, update `reset_cache` at ~line 686-694)
- Modify: `ufobalapp/views.py` (`get_json_all`, ~line 77-112)
- Create: `ufobalapp/tests/test_list_cache.py`

**Interfaces:**
- Produces: `models.list_cache_key(model_class, staff: bool) -> str` — `"Player"` for public, `"Player:staff"` for staff.

- [ ] **Step 1: Failing tests** — `ufobalapp/tests/test_list_cache.py`:

```python
from datetime import date

import pytest
from django.contrib.auth.models import User
from django.core.cache import cache

from ufobalapp.models import Player, list_cache_key


@pytest.fixture(autouse=True)
def clear_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.mark.django_db
def test_staff_request_does_not_leak_birthdate_to_public(client):
    Player.objects.create(name='a', lastname='b', nickname='n', birthdate=date(2000, 1, 1))
    staff = User.objects.create_user('admin', password='x', is_staff=True)
    client.force_login(staff)
    assert 'birthdate' in client.get('/api_frontend/players').json()[0]
    client.logout()
    assert 'birthdate' not in client.get('/api_frontend/players').json()[0]


@pytest.mark.django_db
def test_public_cache_does_not_hide_birthdate_from_staff(client):
    Player.objects.create(name='a', lastname='b', nickname='n', birthdate=date(2000, 1, 1))
    assert 'birthdate' not in client.get('/api_frontend/players').json()[0]
    client.force_login(User.objects.create_user('admin', password='x', is_staff=True))
    assert 'birthdate' in client.get('/api_frontend/players').json()[0]


@pytest.mark.django_db
def test_save_resets_both_cache_variants():
    cache.set(list_cache_key(Player, False), ['x'])
    cache.set(list_cache_key(Player, True), ['x'])
    Player.objects.create(name='a', lastname='b', nickname='n')
    assert cache.get(list_cache_key(Player, False)) is None
    assert cache.get(list_cache_key(Player, True)) is None
```

If `Player.objects.create` needs more required fields, add them (check the model).

- [ ] **Step 2: Run, expect FAIL** — `~/miniconda3/envs/ufobal_web/bin/python -m pytest -q ufobalapp/tests/test_list_cache.py` (ImportError `list_cache_key`).

- [ ] **Step 3: Implement**

In `ufobalapp/models.py`, above `reset_cache`:

```python
def list_cache_key(model_class, staff):
    """Cache key of a list endpoint; staff responses contain extra fields (e.g. birthdate)."""
    return f"{model_class.__name__}:staff" if staff else model_class.__name__
```

Replace the body of `reset_cache` with:

```python
    for model_class in (TeamOnTournament, Tournament, Player):
        for staff in (False, True):
            cache.delete(list_cache_key(model_class, staff))
```

In `ufobalapp/views.py` `get_json_all`: import `list_cache_key` from `ufobalapp.models`; compute `cache_key = list_cache_key(model_class, request.user.is_staff)` right after `use_cache`, and use `cache_key` in both `cache.get(...)` and `cache.set(...)` instead of `model_class.__name__`.

- [ ] **Step 4: Run all backend tests** — new tests PASS; total failures = 4 (baseline).

- [ ] **Step 5: Commit** (in `~/projects/ufobal-web`)

```bash
git add ufobalapp/models.py ufobalapp/views.py ufobalapp/tests/test_list_cache.py
git commit -m "fix: separate list cache for staff to stop leaking birthdate"
```

---

### Task 2: DTO types, endpoints, client params/signal, text + format utils

**Files:**
- Modify: `src/api/types.ts`, `src/api/client.ts`, `src/api/client.test.ts`
- Create: `src/api/endpoints.ts`, `src/domain/text.ts`, `src/domain/text.test.ts`, `src/format.ts`, `src/format.test.ts`

**Interfaces:**
- Produces (types.ts): `PenaltyDto`, `PlayerDto`, `TeamDto`, `CategorySlug`, `TournamentDto`, `TotDto`, `GoalsDto`, `StatsDto`, `HallRecord<T>`, `HallOfGloryDto` (exact shapes below).
- Produces (client.ts): `api<T>(path, init?: { method?: 'GET'|'POST'|'DELETE'; body?: unknown; params?: Record<string, string | number | undefined>; signal?: AbortSignal })`.
- Produces (endpoints.ts): `getPlayers(signal?)`, `getTeamOnTournaments(signal?)`, `getEmptyTournaments(signal?)`, `getTournament(pk, signal?)`, `getGoals(signal?)`, `getStats(signal?)`, `getHallOfGlory(signal?)`.
- Produces: `searchKey(s: string): string` (lowercase, diacritics removed); `formatNumber(n: number | null | undefined, digits = 0): string`, `formatDate(iso: string | null | undefined): string`, `formatDateTime(iso: string | null | undefined): string`, `formatRank(rank: number | null | undefined): string`.

- [ ] **Step 1: Failing tests**

`src/domain/text.test.ts`:

```ts
import { expect, test } from 'vitest';
import { searchKey } from './text';

test('searchKey lowercases and strips Czech diacritics', () => {
  expect(searchKey('Pépa Kométa ŘŽČ')).toBe('pepa kometa rzc');
  expect(searchKey('')).toBe('');
});
```

`src/format.test.ts`:

```ts
import { expect, test } from 'vitest';
import { formatDate, formatDateTime, formatNumber, formatRank } from './format';

const nbsp = ' ';

test('formatNumber uses Czech grouping and decimals', () => {
  expect(formatNumber(12345)).toBe(`12${nbsp}345`);
  expect(formatNumber(93.44, 1)).toBe('93,4');
  expect(formatNumber(null)).toBe('');
  expect(formatNumber(Number.NaN)).toBe('');
});

test('formatDate formats ISO date, tolerates junk', () => {
  expect(formatDate('2023-06-10')).toBe('10. 6. 2023');
  expect(formatDate('None')).toBe('');
  expect(formatDate(null)).toBe('');
});

test('formatDateTime formats local datetime', () => {
  expect(formatDateTime('2024-05-01T08:05:00')).toBe('1. 5. 2024 8:05');
  expect(formatDateTime(undefined)).toBe('');
});

test('formatRank', () => {
  expect(formatRank(1)).toBe('1.');
  expect(formatRank(null)).toBe('-');
});
```

Append to `src/api/client.test.ts`:

```ts
test('params are encoded into the query string, undefined skipped; signal is passed', async () => {
  respond(200, '[]');
  const controller = new AbortController();
  await api('matchs', { params: { tournament: 5, x: undefined, q: 'á b' }, signal: controller.signal });
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe('/api_frontend/matchs?tournament=5&q=%C3%A1+b');
  expect(init.signal).toBe(controller.signal);
});
```

Run `npm test` → FAIL.

- [ ] **Step 2: Implement**

`src/domain/text.ts`:

```ts
export function searchKey(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
```

`src/format.ts`:

```ts
const formatters = new Map<number, Intl.NumberFormat>();

export function formatNumber(n: number | null | undefined, digits = 0): string {
  if (n == null || Number.isNaN(n)) return '';
  let f = formatters.get(digits);
  if (!f) {
    f = new Intl.NumberFormat('cs-CZ', { minimumFractionDigits: digits, maximumFractionDigits: digits });
    formatters.set(digits, f);
  }
  return f.format(n);
}

export function formatDate(iso: string | null | undefined): string {
  const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${Number(m[3])}. ${Number(m[2])}. ${m[1]}` : '';
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return '';
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()} ${d.getHours()}:${minutes}`;
}

export function formatRank(rank: number | null | undefined): string {
  return rank == null ? '-' : `${rank}.`;
}
```

If `formatNumber(12345)` in jsdom/Node yields a different space character (e.g. U+202F), keep the implementation and make the test assert with `toMatch(/^12\s345$/u)` instead — note it in the report.

`src/api/client.ts` — extend `api`:

```ts
export async function api<T>(
  path: string,
  init: {
    method?: 'GET' | 'POST' | 'DELETE';
    body?: unknown;
    params?: Record<string, string | number | undefined>;
    signal?: AbortSignal;
  } = {},
): Promise<T> {
  // ...existing header code unchanged...
  const query = init.params
    ? new URLSearchParams(
        Object.entries(init.params)
          .filter((entry): entry is [string, string | number] => entry[1] !== undefined)
          .map(([k, v]) => [k, String(v)]),
      ).toString()
    : '';
  const res = await fetch(API_BASE + path + (query ? `?${query}` : ''), {
    method,
    headers,
    credentials: 'same-origin',
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    signal: init.signal,
  });
  // ...rest unchanged...
}
```

Append to `src/api/types.ts`:

```ts
export interface PenaltyDto {
  pk: number;
  card: 'red' | 'yellow';
  card_verbose: string;
  time: string;
  match: { pk: number };
  tournament: number;
  player: number;
  reason: string;
}

export interface PlayerDto extends PlayerSimple {
  penalties: PenaltyDto[];
}

export interface TeamDto {
  pk: number;
  name: string;
  name_short: string | null;
  name_pure: string;
  description: string | null;
}

export type CategorySlug = 'brno' | 'nizkov' | 'hala' | 'other' | 'liga' | 'trening';

export interface TournamentDto {
  pk: number;
  category: string | null;
  category_slugname: CategorySlug | null;
  name: string;
  location: string | null;
  full_name: string;
  date: string;
  registration_from: string | null;
  /** 'YYYY-MM-DD' or the literal string 'None'. */
  registration_to: string;
  registration_open: boolean;
  registration_scheduled: boolean;
  is_tournament_open: boolean;
  is_after_tournament: boolean;
  halftime_length: number;
  field_count: number;
  year: number;
  /** Trusted HTML written by staff in Django admin. */
  description: string | null;
  closed_edit: boolean;
}

export interface TotDto {
  pk: number;
  team: TeamDto;
  captain: number | null;
  default_goalie: number | null;
  name: string;
  name_pure: string;
  name_short: string | null;
  tournament: TournamentDto;
  rank: number | null;
  player_pks: number[];
}

export interface GoalsDto {
  goals: { shooter: number; match__tournament: number; count: number }[];
  assists: { assistance: number; match__tournament: number; count: number }[];
}

export interface StatsDto {
  tournament_count: number;
  max_year: number;
  min_year: number;
  player_count: number;
  player_male_count: number;
  player_female_count: number;
  team_count: number;
  team_on_tournament_count: number;
  goals: number;
  assists: number;
  active_players: number;
  active_players_year: number;
}

export interface HallRecord<T> {
  value: number;
  instances: T[];
}

export interface HallOfGloryDto {
  max_teams_per_tournament: HallRecord<TournamentDto>;
  max_matches_per_tournament: HallRecord<TournamentDto>;
  max_matches_per_team: HallRecord<TeamDto>;
  max_goals_per_team: HallRecord<TeamDto>;
  max_avg_goals_per_team: HallRecord<TeamDto>;
  max_goal_per_tournament_player: HallRecord<[PlayerSimple, TournamentDto]>;
  max_assistance_per_tournament_player: HallRecord<[PlayerSimple, TournamentDto]>;
  max_goal_per_tournament_player_female: HallRecord<[PlayerSimple, TournamentDto]>;
  max_assistance_per_tournament_player_female: HallRecord<[PlayerSimple, TournamentDto]>;
}
```

`src/api/endpoints.ts`:

```ts
import { api } from './client';
import type { GoalsDto, HallOfGloryDto, PlayerDto, StatsDto, TotDto, TournamentDto } from './types';

export const getPlayers = (signal?: AbortSignal) => api<PlayerDto[]>('players', { signal });
export const getTeamOnTournaments = (signal?: AbortSignal) => api<TotDto[]>('teamontournaments', { signal });
export const getEmptyTournaments = (signal?: AbortSignal) =>
  api<TournamentDto[]>('get_empty_trournaments', { signal });
export const getTournament = (pk: number, signal?: AbortSignal) =>
  api<TournamentDto>(`tournament/${pk}`, { signal });
export const getGoals = (signal?: AbortSignal) => api<GoalsDto>('goals', { signal });
export const getStats = (signal?: AbortSignal) => api<StatsDto>('stats', { signal });
export const getHallOfGlory = (signal?: AbortSignal) => api<HallOfGloryDto>('hall_of_glory', { signal });
```

- [ ] **Step 3: Verify** — `npm test && npm run typecheck && npm run lint` → PASS.

- [ ] **Step 4: Commit**

```bash
git add src
git commit -m "feat: DTO types, read endpoints, query params, text and format utils"
```

---

### Task 3: Entity graph + data hooks + test helpers

**Files:**
- Create: `src/domain/graph.ts`, `src/domain/graph.test.ts`, `src/queries/data.ts`, `src/queries/data.test.tsx`, `src/test/fixtures.ts`
- Modify: `src/test/utils.tsx` (add `mockApi`, `mockGraphApi`, `path` option), `src/test/setup.ts`

**Interfaces:**
- Consumes: DTOs, endpoints, `searchKey` (Task 2).
- Produces (`src/domain/graph.ts`):
  - `interface PenaltyVM extends Omit<PenaltyDto, 'tournament'> { tournament: TournamentVM | null; tournamentPk: number }`
  - `interface PlayerVM extends Omit<PlayerDto, 'penalties'> { penalties: PenaltyVM[]; goals: Record<number, number>; assists: Record<number, number>; goalsSum: number; assistsSum: number; canada: number; penaltyCount: number; tots: TotVM[]; teams: { team: TeamVM; count: number }[]; search: string; teamsSearch: string }`
  - `interface TeamVM extends TeamDto { tots: TotVM[]; medals: number[]; altNames: { name: string; count: number }[]; search: string }`
  - `interface TournamentVM extends TournamentDto { tots: TotVM[] }`
  - `interface TotVM extends Omit<TotDto, 'team' | 'tournament' | 'player_pks'> { team: TeamVM; tournament: TournamentVM; players: PlayerVM[]; playerPks: number[] }`
  - `interface RawData { players: PlayerDto[]; tots: TotDto[]; goals: GoalsDto; emptyTournaments: TournamentDto[] }`
  - `interface Graph { players: PlayerVM[]; playersById: Map<number, PlayerVM>; teams: TeamVM[]; teamsById: Map<number, TeamVM>; tournaments: TournamentVM[]; tournamentsById: Map<number, TournamentVM>; totsById: Map<number, TotVM> }`
  - `buildGraph(raw: RawData): Graph`, `compareMedals(a: number[], b: number[]): number` (negative when `a` is better), `scoreWithoutTeam(player: PlayerVM, graph: Graph): { tournament: TournamentVM; goals: number; assists: number }[]`
- Produces (`src/queries/data.ts`): `dataKeys`, `useGraph(): { graph: Graph | undefined; error: unknown; isPending: boolean; refetch: () => void }`, `useStats()`, `useHallOfGlory()`, `useTournament(pk: number | null)` (standard `useQuery` results).
- Produces (`src/test/fixtures.ts`): `sampleRaw(): RawData` and builders `tournamentDto`, `teamDto`, `playerDto`, `totDto`.
- Produces (`src/test/utils.tsx`): `mockApi(responses: Record<string, unknown>)` (returns the fetch mock; unknown paths → 404), `mockGraphApi(extra?: Record<string, unknown>)`, `renderWithProviders(ui, { ..., path?: string })` — when `path` is given, renders `ui` inside `<Routes><Route path={path} element={ui} /></Routes>`.

Graph semantics (R§2.2–2.4, with old bugs fixed):
- `teams` / `tournaments` in first-appearance order of the TOT list; tournaments from `emptyTournaments` appended after (if not already present).
- `tot.team` / `tot.tournament` are the canonical VM objects.
- `medals[rank-1] += 1` only for `rank` 1..5 (null/other ranks ignored).
- `player.teams`: TOTs grouped by team, `count` = number of TOTs, ordered by count desc (ties: first appearance).
- `team.altNames`: TOTs grouped by `tot.name` where `tot.name !== team.name`, ordered by count desc (ties: first appearance).
- `team.search` = `searchKey` of team name, short name and alt names joined by spaces; `player.search = searchKey(nickname)`; `player.teamsSearch` = `searchKey` of the player's team names joined by spaces.
- Goals/assists per tournament from `GoalsDto`; `canada = goalsSum + assistsSum`; rows whose player is unknown are skipped.
- `penalty.tournament` = tournament VM if known, else `null` (`tournamentPk` keeps the id).
- `scoreWithoutTeam`: tournaments present in `goals`/`assists` keys but not among the player's TOT tournaments, in ascending tournament pk order, unknown tournaments skipped.

- [ ] **Step 1: Test fixtures and helpers**

`src/test/fixtures.ts`:

```ts
import type { PlayerDto, TeamDto, TotDto, TournamentDto } from '../api/types';
import type { RawData } from '../domain/graph';

export const tournamentDto = (o: Partial<TournamentDto> & Pick<TournamentDto, 'pk'>): TournamentDto => ({
  category: 'Brno',
  category_slugname: 'brno',
  name: `Turnaj ${o.pk}`,
  location: 'Brno',
  full_name: `Turnaj ${o.pk} 2023`,
  date: '2023-06-10',
  registration_from: null,
  registration_to: 'None',
  registration_open: false,
  registration_scheduled: false,
  is_tournament_open: false,
  is_after_tournament: true,
  halftime_length: 10,
  field_count: 2,
  year: 2023,
  description: null,
  closed_edit: true,
  ...o,
});

export const teamDto = (o: Partial<TeamDto> & Pick<TeamDto, 'pk' | 'name'>): TeamDto => ({
  name_short: null,
  name_pure: o.name_short ?? o.name,
  description: null,
  ...o,
});

export const playerDto = (o: Partial<PlayerDto> & Pick<PlayerDto, 'pk' | 'nickname'>): PlayerDto => ({
  name: null as unknown as string,
  lastname: null as unknown as string,
  age: null,
  full_name: o.nickname,
  gender: 'man',
  is_paired: false,
  penalties: [],
  ...o,
});

export const totDto = (
  o: Partial<TotDto> & Pick<TotDto, 'pk' | 'team' | 'tournament'>,
): TotDto => ({
  captain: null,
  default_goalie: null,
  name: o.team.name,
  name_pure: o.team.name_pure,
  name_short: o.team.name_short,
  rank: null,
  player_pks: [],
  ...o,
});

export const t1 = tournamentDto({ pk: 1, name: 'Brno', full_name: 'Brno 2023', date: '2023-06-10', year: 2023 });
export const t2 = tournamentDto({
  pk: 2,
  name: 'Nížkov',
  full_name: 'Nížkov 2024',
  date: '2024-07-20',
  year: 2024,
  category: 'Nížkov',
  category_slugname: 'nizkov',
  location: 'Nížkov',
});
export const t3 = tournamentDto({ pk: 3, name: 'Hala', full_name: 'Hala 2025', date: '2025-01-15', year: 2025, category: 'Hala', category_slugname: 'hala' });
export const ufo = teamDto({ pk: 10, name: 'Ufo' });
export const kometa = teamDto({ pk: 11, name: 'Kométa', name_short: 'KOM' });

export function sampleRaw(): RawData {
  const pepa = playerDto({
    pk: 100,
    nickname: 'Pépa',
    name: 'Josef',
    lastname: 'Novák',
    age: 30,
    full_name: 'Pépa - Josef Novák',
    penalties: [
      { pk: 900, card: 'yellow', card_verbose: 'žlutá', time: '00:05:00', match: { pk: 500 }, tournament: 1, player: 100, reason: 'Faul' },
    ],
  });
  const jana = playerDto({ pk: 101, nickname: 'Jana', gender: 'woman' });
  const karel = playerDto({ pk: 102, nickname: 'Karel' });
  return {
    players: [pepa, jana, karel],
    tots: [
      totDto({ pk: 1000, team: ufo, tournament: t1, rank: 1, player_pks: [100, 101], captain: 100 }),
      totDto({ pk: 1001, team: kometa, tournament: t1, rank: 2 }),
      totDto({ pk: 1002, team: ufo, tournament: t2, rank: 3, player_pks: [100], name: 'Béčko (Ufo)', name_pure: 'Béčko (Ufo)' }),
      totDto({ pk: 1003, team: kometa, tournament: t2, rank: null }),
    ],
    goals: {
      goals: [
        { shooter: 100, match__tournament: 1, count: 3 },
        { shooter: 100, match__tournament: 2, count: 2 },
        { shooter: 101, match__tournament: 1, count: 1 },
        { shooter: 102, match__tournament: 1, count: 4 },
        { shooter: 999, match__tournament: 1, count: 7 },
      ],
      assists: [{ assistance: 101, match__tournament: 1, count: 2 }],
    },
    emptyTournaments: [t3],
  };
}
```

Add to `src/test/utils.tsx` (keep existing exports; add `Routes, Route` imports and the `path` option):

```tsx
import { vi } from 'vitest';
import { API_BASE } from '../api/client';
import { sampleRaw } from './fixtures';

export function mockApi(responses: Record<string, unknown>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const path = String(input).replace(API_BASE, '');
    if (!(path in responses)) return new Response('not found', { status: 404 });
    return new Response(JSON.stringify(responses[path]), { status: 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

export function mockGraphApi(extra: Record<string, unknown> = {}) {
  const raw = sampleRaw();
  return mockApi({
    players: raw.players,
    teamontournaments: raw.tots,
    goals: raw.goals,
    get_empty_trournaments: raw.emptyTournaments,
    ...extra,
  });
}
```

In `renderWithProviders`, accept `path?: string` and render
`opts.path ? <Routes><Route path={opts.path} element={ui} /></Routes> : ui` inside the `MemoryRouter`.

`src/test/setup.ts` — add (keep existing content):

```ts
import { vi } from 'vitest';

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

afterEach(() => {
  vi.unstubAllGlobals();
});
```

Then remove the per-file `ResizeObserver` stub from `src/auth/UserMenu.test.tsx` (now global) and run that test to confirm it still passes. If `vi.unstubAllGlobals()` in setup breaks a test that stubs at module level, move that stub into a `beforeEach` in the test.

- [ ] **Step 2: Failing tests**

`src/domain/graph.test.ts`:

```ts
import { expect, test } from 'vitest';
import { sampleRaw } from '../test/fixtures';
import { buildGraph, compareMedals, scoreWithoutTeam } from './graph';

const g = () => buildGraph(sampleRaw());

test('players get goal/assist stats and canada; unknown shooters skipped', () => {
  const graph = g();
  const pepa = graph.playersById.get(100)!;
  expect(pepa.goals).toEqual({ 1: 3, 2: 2 });
  expect(pepa.goalsSum).toBe(5);
  expect(pepa.canada).toBe(5);
  const jana = graph.playersById.get(101)!;
  expect(jana.assistsSum).toBe(2);
  expect(jana.canada).toBe(3);
  expect(graph.players).toHaveLength(3);
});

test('teams and tournaments are canonical and ordered by first appearance; empty tournaments appended', () => {
  const graph = g();
  expect(graph.teams.map((t) => t.pk)).toEqual([10, 11]);
  expect(graph.tournaments.map((t) => t.pk)).toEqual([1, 2, 3]);
  const tot = graph.totsById.get(1002)!;
  expect(tot.team).toBe(graph.teamsById.get(10));
  expect(tot.tournament).toBe(graph.tournamentsById.get(2));
  expect(graph.tournamentsById.get(3)!.tots).toEqual([]);
});

test('medals count ranks 1..5 only, null rank ignored', () => {
  const graph = g();
  expect(graph.teamsById.get(10)!.medals).toEqual([1, 0, 1, 0, 0]);
  expect(graph.teamsById.get(11)!.medals).toEqual([0, 1, 0, 0, 0]);
});

test('player teams, tots and penalties are linked', () => {
  const graph = g();
  const pepa = graph.playersById.get(100)!;
  expect(pepa.tots.map((t) => t.pk)).toEqual([1000, 1002]);
  expect(pepa.teams).toEqual([{ team: graph.teamsById.get(10), count: 2 }]);
  expect(pepa.penaltyCount).toBe(1);
  expect(pepa.penalties[0].tournament).toBe(graph.tournamentsById.get(1));
  expect(graph.playersById.get(102)!.teams).toEqual([]);
});

test('team alt names and search keys', () => {
  const graph = g();
  const ufoTeam = graph.teamsById.get(10)!;
  expect(ufoTeam.altNames).toEqual([{ name: 'Béčko (Ufo)', count: 1 }]);
  expect(ufoTeam.search).toContain('becko');
  const kom = graph.teamsById.get(11)!;
  expect(kom.search).toContain('kometa');
  expect(kom.search).toContain('kom');
  expect(graph.playersById.get(100)!.search).toBe('pepa');
  expect(graph.playersById.get(100)!.teamsSearch).toBe('ufo');
});

test('compareMedals orders golds, then silvers, ...', () => {
  expect(compareMedals([1, 0, 0, 0, 0], [0, 5, 0, 0, 0])).toBeLessThan(0);
  expect(compareMedals([0, 1, 0, 0, 0], [0, 1, 2, 0, 0])).toBeGreaterThan(0);
  expect(compareMedals([1, 1, 1, 1, 1], [1, 1, 1, 1, 1])).toBe(0);
});

test('scoreWithoutTeam lists tournaments where player scored without a roster', () => {
  const graph = g();
  const karel = graph.playersById.get(102)!;
  expect(scoreWithoutTeam(karel, graph)).toEqual([{ tournament: graph.tournamentsById.get(1), goals: 4, assists: 0 }]);
  expect(scoreWithoutTeam(graph.playersById.get(100)!, graph)).toEqual([]);
});
```

`src/queries/data.test.tsx`:

```tsx
import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { expect, test } from 'vitest';
import { createQueryClient } from '../queryClient';
import { mockApi, mockGraphApi } from '../test/utils';
import { useGraph } from './data';

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={createQueryClient(null)}>{children}</QueryClientProvider>
);

test('useGraph loads all four lists and builds the graph', async () => {
  const fetchMock = mockGraphApi();
  const { result } = renderHook(() => useGraph(), { wrapper });
  expect(result.current.isPending).toBe(true);
  await waitFor(() => expect(result.current.graph).toBeDefined());
  expect(result.current.graph!.players).toHaveLength(3);
  expect(fetchMock).toHaveBeenCalledTimes(4);
});

test('useGraph exposes an error when a list fails', async () => {
  mockApi({ players: [], teamontournaments: [], goals: { goals: [], assists: [] } });
  const { result } = renderHook(() => useGraph(), { wrapper });
  await waitFor(() => expect(result.current.error).toBeTruthy());
  expect(result.current.graph).toBeUndefined();
  expect(result.current.isPending).toBe(false);
});
```

Run `npm test` → FAIL.

- [ ] **Step 3: Implement**

`src/domain/graph.ts`:

```ts
import type { GoalsDto, PenaltyDto, PlayerDto, TeamDto, TotDto, TournamentDto } from '../api/types';
import { searchKey } from './text';

export interface PenaltyVM extends Omit<PenaltyDto, 'tournament'> {
  tournament: TournamentVM | null;
  tournamentPk: number;
}

export interface PlayerVM extends Omit<PlayerDto, 'penalties'> {
  penalties: PenaltyVM[];
  goals: Record<number, number>;
  assists: Record<number, number>;
  goalsSum: number;
  assistsSum: number;
  canada: number;
  penaltyCount: number;
  tots: TotVM[];
  teams: { team: TeamVM; count: number }[];
  search: string;
  teamsSearch: string;
}

export interface TeamVM extends TeamDto {
  tots: TotVM[];
  medals: number[];
  altNames: { name: string; count: number }[];
  search: string;
}

export interface TournamentVM extends TournamentDto {
  tots: TotVM[];
}

export interface TotVM extends Omit<TotDto, 'team' | 'tournament' | 'player_pks'> {
  team: TeamVM;
  tournament: TournamentVM;
  players: PlayerVM[];
  playerPks: number[];
}

export interface RawData {
  players: PlayerDto[];
  tots: TotDto[];
  goals: GoalsDto;
  emptyTournaments: TournamentDto[];
}

export interface Graph {
  players: PlayerVM[];
  playersById: Map<number, PlayerVM>;
  teams: TeamVM[];
  teamsById: Map<number, TeamVM>;
  tournaments: TournamentVM[];
  tournamentsById: Map<number, TournamentVM>;
  totsById: Map<number, TotVM>;
}

/** Groups items by key, ordered by count desc; ties keep first-appearance order. */
function countBy<T, K>(items: T[], key: (item: T) => K): { key: K; count: number }[] {
  const counts = new Map<K, number>();
  for (const item of items) {
    const k = key(item);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts].map(([k, count]) => ({ key: k, count })).sort((a, b) => b.count - a.count);
}

export function buildGraph(raw: RawData): Graph {
  const playersById = new Map<number, PlayerVM>();
  const players = raw.players.map((p) => {
    const vm: PlayerVM = {
      ...p,
      penalties: [],
      goals: {},
      assists: {},
      goalsSum: 0,
      assistsSum: 0,
      canada: 0,
      penaltyCount: p.penalties.length,
      tots: [],
      teams: [],
      search: searchKey(p.nickname),
      teamsSearch: '',
    };
    playersById.set(p.pk, vm);
    return vm;
  });

  const teams: TeamVM[] = [];
  const teamsById = new Map<number, TeamVM>();
  const ensureTeam = (t: TeamDto) => {
    let vm = teamsById.get(t.pk);
    if (!vm) {
      vm = { ...t, tots: [], medals: [0, 0, 0, 0, 0], altNames: [], search: '' };
      teamsById.set(t.pk, vm);
      teams.push(vm);
    }
    return vm;
  };

  const tournaments: TournamentVM[] = [];
  const tournamentsById = new Map<number, TournamentVM>();
  const ensureTournament = (t: TournamentDto) => {
    let vm = tournamentsById.get(t.pk);
    if (!vm) {
      vm = { ...t, tots: [] };
      tournamentsById.set(t.pk, vm);
      tournaments.push(vm);
    }
    return vm;
  };

  const totsById = new Map<number, TotVM>();
  for (const { team, tournament, player_pks, ...rest } of raw.tots) {
    const tot: TotVM = {
      ...rest,
      team: ensureTeam(team),
      tournament: ensureTournament(tournament),
      players: [],
      playerPks: player_pks,
    };
    tot.team.tots.push(tot);
    tot.tournament.tots.push(tot);
    if (tot.rank != null && tot.rank >= 1 && tot.rank <= 5) tot.team.medals[tot.rank - 1] += 1;
    for (const pk of player_pks) {
      const player = playersById.get(pk);
      if (!player) continue;
      tot.players.push(player);
      player.tots.push(tot);
    }
    totsById.set(tot.pk, tot);
  }
  for (const t of raw.emptyTournaments) ensureTournament(t);

  for (const { shooter, match__tournament, count } of raw.goals.goals) {
    const p = playersById.get(shooter);
    if (!p) continue;
    p.goals[match__tournament] = count;
    p.goalsSum += count;
    p.canada += count;
  }
  for (const { assistance, match__tournament, count } of raw.goals.assists) {
    const p = playersById.get(assistance);
    if (!p) continue;
    p.assists[match__tournament] = count;
    p.assistsSum += count;
    p.canada += count;
  }

  raw.players.forEach((dto, i) => {
    const p = players[i];
    p.penalties = dto.penalties.map((pen) => ({
      ...pen,
      tournament: tournamentsById.get(pen.tournament) ?? null,
      tournamentPk: pen.tournament,
    }));
    p.teams = countBy(p.tots, (tot) => tot.team).map(({ key, count }) => ({ team: key, count }));
    p.teamsSearch = p.teams.map((t) => searchKey(t.team.name)).join(' ');
  });

  for (const team of teams) {
    team.altNames = countBy(
      team.tots.filter((tot) => tot.name !== team.name),
      (tot) => tot.name,
    ).map(({ key, count }) => ({ name: key, count }));
    team.search = [team.name, team.name_short ?? '', ...team.altNames.map((n) => n.name)]
      .filter(Boolean)
      .map(searchKey)
      .join(' ');
  }

  return { players, playersById, teams, teamsById, tournaments, tournamentsById, totsById };
}

/** Negative when `a` has the better medal record (more golds, then silvers, ...). */
export function compareMedals(a: number[], b: number[]): number {
  for (let i = 0; i < 5; i++) {
    const diff = (b[i] ?? 0) - (a[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export function scoreWithoutTeam(player: PlayerVM, graph: Graph) {
  const onRoster = new Set(player.tots.map((tot) => tot.tournament.pk));
  const pks = new Set([...Object.keys(player.goals), ...Object.keys(player.assists)].map(Number));
  return [...pks]
    .filter((pk) => !onRoster.has(pk))
    .sort((a, b) => a - b)
    .flatMap((pk) => {
      const tournament = graph.tournamentsById.get(pk);
      return tournament ? [{ tournament, goals: player.goals[pk] ?? 0, assists: player.assists[pk] ?? 0 }] : [];
    });
}
```

`src/queries/data.ts`:

```ts
import { useQueries, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
  getEmptyTournaments,
  getGoals,
  getHallOfGlory,
  getPlayers,
  getStats,
  getTeamOnTournaments,
  getTournament,
} from '../api/endpoints';
import { buildGraph } from '../domain/graph';

const LIST_STALE = 10 * 60_000;

export const dataKeys = {
  players: ['players'] as const,
  tots: ['teamontournaments'] as const,
  goals: ['goals'] as const,
  emptyTournaments: ['emptyTournaments'] as const,
  tournament: (pk: number) => ['tournament', pk] as const,
  stats: ['stats'] as const,
  hallOfGlory: ['hallOfGlory'] as const,
};

export function useGraph() {
  const [players, tots, goals, empty] = useQueries({
    queries: [
      { queryKey: dataKeys.players, queryFn: ({ signal }) => getPlayers(signal), staleTime: LIST_STALE },
      { queryKey: dataKeys.tots, queryFn: ({ signal }) => getTeamOnTournaments(signal), staleTime: LIST_STALE },
      { queryKey: dataKeys.goals, queryFn: ({ signal }) => getGoals(signal), staleTime: LIST_STALE },
      {
        queryKey: dataKeys.emptyTournaments,
        queryFn: ({ signal }) => getEmptyTournaments(signal),
        staleTime: LIST_STALE,
      },
    ],
  });
  const graph = useMemo(
    () =>
      players.data && tots.data && goals.data && empty.data
        ? buildGraph({ players: players.data, tots: tots.data, goals: goals.data, emptyTournaments: empty.data })
        : undefined,
    [players.data, tots.data, goals.data, empty.data],
  );
  const failed = [players, tots, goals, empty].filter((q) => q.error);
  return {
    graph,
    error: failed[0]?.error ?? null,
    isPending: !graph && failed.length === 0,
    refetch: () => failed.forEach((q) => void q.refetch()),
  };
}

export const useStats = () => useQuery({ queryKey: dataKeys.stats, queryFn: ({ signal }) => getStats(signal) });

export const useHallOfGlory = () =>
  useQuery({ queryKey: dataKeys.hallOfGlory, queryFn: ({ signal }) => getHallOfGlory(signal) });

export const useTournament = (pk: number | null) =>
  useQuery({
    queryKey: dataKeys.tournament(pk ?? 0),
    queryFn: ({ signal }) => getTournament(pk!, signal),
    enabled: pk != null,
  });
```

- [ ] **Step 4: Verify** — `npm test && npm run typecheck && npm run lint` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src
git commit -m "feat: linked entity graph, data hooks and API test helpers"
```

---

### Task 4: DataTable (TanStack Table, URL state)

**Files:**
- Create: `src/components/DataTable.tsx`, `src/components/DataTable.test.tsx`
- Modify: `package.json` (dependency)

**Interfaces:**
- Consumes: `searchKey`.
- Produces:
  ```ts
  interface DataTableProps<T> {
    data: T[];                        // already in default (natural) order
    columns: ColumnDef<T, any>[];     // TanStack column defs; meta.align / meta.width supported
    getRowId: (row: T) => string;
    urlPrefix?: string;               // default ''
    pageSize?: number;                // default 15
    displayedPages?: number;          // default 10
    searchText?: (row: T) => string;  // enables the search box; must return searchKey()-normalized text
    searchPlaceholder?: string;       // default 'hledat...'
    defaultSort?: { id: string; desc: boolean };  // used when the sort param is absent
    rank?: boolean;                   // prepend '#' column: position in searched+sorted rows, rendered "N."
  }
  export default function DataTable<T>(props: DataTableProps<T>): JSX.Element
  export const czechSort: SortingFn<any>  // localeCompare(…, 'cs') on the column value
  ```
- Column meta typing: augment `@tanstack/react-table` `ColumnMeta` with `align?: 'left' | 'right' | 'center'; width?: string`.

Behaviour:
- Sort cycle per column = TanStack default with removal (`asc → desc → none`, or `desc → asc → none` with `sortDescFirst: true`). Sorting change writes `<prefix>sort` and drops `<prefix>page`. Unknown column id in URL → ignored (natural order).
- Search box (only if `searchText`): input with placeholder and a "×" reset button (`aria-label="Zrušit hledání"`); filtering = `searchText(row).includes(searchKey(query))`, applied **before** sorting and paging; writes `<prefix>q`, drops `<prefix>page`.
- Page from `<prefix>page`, clamped into `[1, pageCount]`.
- Pagination nav (`aria-label="Stránkování"`): buttons `«` `‹` page numbers (window of `displayedPages`) `›` `»`, current page `aria-current="page"`; hidden if pageCount < 2.
- Header cells of sortable columns are buttons with ▲/▼ indicators and `aria-sort` on the `<th>`.

- [ ] **Step 1: Install**

```bash
npm install @tanstack/react-table@8
```

- [ ] **Step 2: Failing tests** — `src/components/DataTable.test.tsx`:

```tsx
import { createColumnHelper } from '@tanstack/react-table';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router';
import { expect, test } from 'vitest';
import { searchKey } from '../domain/text';
import { renderWithProviders } from '../test/utils';
import DataTable, { czechSort } from './DataTable';

interface Row {
  id: number;
  name: string;
  score: number;
}
const rows: Row[] = Array.from({ length: 20 }, (_, i) => ({ id: i + 1, name: `Hráč ${i + 1}`, score: (i * 7) % 20 }));
rows[0].name = 'Pépa';

const h = createColumnHelper<Row>();
const columns = [
  h.accessor('name', { header: 'Jméno', sortingFn: czechSort }),
  h.accessor('score', { header: 'Body', sortDescFirst: true, meta: { align: 'right' } }),
];

function Location() {
  const l = useLocation();
  return <div data-testid="loc">{l.search}</div>;
}

function setup(route = '/', extra: Partial<Parameters<typeof DataTable<Row>>[0]> = {}) {
  return renderWithProviders(
    <>
      <DataTable data={rows} columns={columns} getRowId={(r) => String(r.id)} searchText={(r) => searchKey(r.name)} {...extra} />
      <Location />
    </>,
    { route },
  );
}

const bodyRows = () => within(screen.getAllByRole('rowgroup')[1]).getAllByRole('row');

test('shows first page of 15 rows and pagination', () => {
  setup();
  expect(bodyRows()).toHaveLength(15);
  expect(screen.getByRole('navigation', { name: 'Stránkování' })).toBeInTheDocument();
});

test('page from URL, clamped when out of range', () => {
  setup('/?page=999');
  expect(bodyRows()).toHaveLength(5);
  expect(screen.getByRole('button', { name: '2' })).toHaveAttribute('aria-current', 'page');
});

test('clicking a desc-first header sorts desc and writes URL', async () => {
  setup();
  await userEvent.click(screen.getByRole('button', { name: /Body/ }));
  expect(screen.getByTestId('loc')).toHaveTextContent('sort=-score');
  expect(within(bodyRows()[0]).getAllByRole('cell')[1]).toHaveTextContent('19');
});

test('unknown sort param is ignored', () => {
  setup('/?sort=nonexistent');
  expect(within(bodyRows()[0]).getAllByRole('cell')[0]).toHaveTextContent('Pépa');
});

test('defaultSort applies when no sort param; empty param means natural order', () => {
  const { unmount } = setup('/', { defaultSort: { id: 'score', desc: true } });
  expect(within(bodyRows()[0]).getAllByRole('cell')[1]).toHaveTextContent('19');
  unmount();
  setup('/?sort=', { defaultSort: { id: 'score', desc: true } });
  expect(within(bodyRows()[0]).getAllByRole('cell')[0]).toHaveTextContent('Pépa');
});

test('search ignores diacritics, resets page, can be cleared', async () => {
  setup('/?page=2');
  await userEvent.type(screen.getByPlaceholderText('hledat...'), 'pepa');
  expect(bodyRows()).toHaveLength(1);
  expect(screen.getByTestId('loc')).not.toHaveTextContent('page=');
  await userEvent.click(screen.getByRole('button', { name: 'Zrušit hledání' }));
  expect(bodyRows()).toHaveLength(15);
});

test('url prefix isolates params', async () => {
  setup('/', { urlPrefix: 'p' });
  await userEvent.click(screen.getByRole('button', { name: /Body/ }));
  expect(screen.getByTestId('loc')).toHaveTextContent('psort=-score');
});

test('rank column numbers searched+sorted rows', async () => {
  setup('/?sort=-score', { rank: true });
  expect(within(bodyRows()[0]).getAllByRole('cell')[0]).toHaveTextContent('1.');
  await userEvent.click(screen.getByRole('button', { name: '2' }));
  expect(within(bodyRows()[0]).getAllByRole('cell')[0]).toHaveTextContent('16.');
});

test('no pagination when one page; no search box without searchText', () => {
  renderWithProviders(<DataTable data={rows.slice(0, 3)} columns={columns} getRowId={(r) => String(r.id)} />);
  expect(screen.queryByRole('navigation', { name: 'Stránkování' })).not.toBeInTheDocument();
  expect(screen.queryByPlaceholderText('hledat...')).not.toBeInTheDocument();
});
```

Run → FAIL.

- [ ] **Step 3: Implement** — `src/components/DataTable.tsx`:

```tsx
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type RowData,
  type SortingFn,
  type SortingState,
} from '@tanstack/react-table';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { searchKey } from '../domain/text';

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    align?: 'left' | 'right' | 'center';
    width?: string;
  }
}

export interface DataTableProps<T> {
  data: T[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<T, any>[];
  getRowId: (row: T) => string;
  urlPrefix?: string;
  pageSize?: number;
  displayedPages?: number;
  searchText?: (row: T) => string;
  searchPlaceholder?: string;
  defaultSort?: { id: string; desc: boolean };
  rank?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const czechSort: SortingFn<any> = (a, b, id) =>
  String(a.getValue(id) ?? '').localeCompare(String(b.getValue(id) ?? ''), 'cs');

const alignClass = { left: 'text-left', right: 'text-right', center: 'text-center' };

export default function DataTable<T>({
  data,
  columns,
  getRowId,
  urlPrefix = '',
  pageSize = 15,
  displayedPages = 10,
  searchText,
  searchPlaceholder = 'hledat...',
  defaultSort,
  rank = false,
}: DataTableProps<T>) {
  const [params, setParams] = useSearchParams();
  const key = (name: string) => urlPrefix + name;
  const update = (changes: Record<string, string | null>) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [name, value] of Object.entries(changes)) {
          if (value === null) next.delete(key(name));
          else next.set(key(name), value);
        }
        return next;
      },
      { replace: true },
    );

  const query = params.get(key('q')) ?? '';
  const rows = useMemo(() => {
    if (!searchText || !query) return data;
    const needle = searchKey(query);
    return data.filter((row) => searchText(row).includes(needle));
  }, [data, searchText, query]);

  const columnIds = new Set(columns.map((c) => c.id ?? ('accessorKey' in c ? String(c.accessorKey) : '')));
  const sortParam = params.get(key('sort'));
  const sorting: SortingState =
    sortParam === null
      ? defaultSort
        ? [defaultSort]
        : []
      : sortParam && columnIds.has(sortParam.replace(/^-/, ''))
        ? [{ id: sortParam.replace(/^-/, ''), desc: sortParam.startsWith('-') }]
        : [];

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const requestedPage = Number.parseInt(params.get(key('page')) ?? '1', 10);
  const pageIndex = Math.min(Math.max(Number.isFinite(requestedPage) ? requestedPage : 1, 1), pageCount) - 1;

  const allColumns = useMemo<ColumnDef<T, unknown>[]>(
    () =>
      rank
        ? [
            {
              id: '__rank',
              header: '#',
              enableSorting: false,
              meta: { align: 'right' },
              cell: ({ row, table }) =>
                `${table.getPrePaginationRowModel().rows.findIndex((r) => r.id === row.id) + 1}.`,
            },
            ...columns,
          ]
        : columns,
    [columns, rank],
  );

  // TanStack Table returns non-memoizable functions; the React Compiler lint rule does not apply here.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: rows,
    columns: allColumns,
    getRowId,
    state: { sorting, pagination: { pageIndex, pageSize } },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      const s = next[0];
      update({ sort: s ? `${s.desc ? '-' : ''}${s.id}` : '', page: null });
    },
    onPaginationChange: (updater) => {
      const next = typeof updater === 'function' ? updater({ pageIndex, pageSize }) : updater;
      update({ page: next.pageIndex > 0 ? String(next.pageIndex + 1) : null });
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    autoResetPageIndex: false,
  });

  const windowStart = Math.max(0, Math.min(pageIndex - Math.floor(displayedPages / 2), pageCount - displayedPages));
  const pages = Array.from({ length: Math.min(displayedPages, pageCount) }, (_, i) => windowStart + i);
  const pageButton = 'min-w-8 px-2 py-1 hover:bg-secondary disabled:opacity-40';

  return (
    <div>
      {searchText && (
        <div className="relative mb-2 max-w-[300px]">
          <input
            className="input pr-8"
            placeholder={searchPlaceholder}
            value={query}
            onChange={(e) => update({ q: e.target.value || null, page: null })}
          />
          {query && (
            <button
              type="button"
              aria-label="Zrušit hledání"
              className="absolute top-1/2 right-2 -translate-y-1/2 text-gray-500"
              onClick={() => update({ q: null, page: null })}
            >
              ×
            </button>
          )}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-[#f5f5f5]">
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => {
                  const meta = header.column.columnDef.meta;
                  const sorted = header.column.getIsSorted();
                  const label = flexRender(header.column.columnDef.header, header.getContext());
                  return (
                    <th
                      key={header.id}
                      style={meta?.width ? { width: meta.width } : undefined}
                      aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined}
                      className={`px-2 py-2 font-bold ${alignClass[meta?.align ?? 'left']}`}
                    >
                      {header.column.getCanSort() ? (
                        <button type="button" className="cursor-pointer select-none" onClick={header.column.getToggleSortingHandler()}>
                          {label}
                          {sorted === 'asc' ? ' ▲' : sorted === 'desc' ? ' ▼' : ''}
                        </button>
                      ) : (
                        label
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="even:bg-[#f9f9f9]">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className={`px-2 py-2 ${alignClass[cell.column.columnDef.meta?.align ?? 'left']}`}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pageCount > 1 && (
        <nav aria-label="Stránkování" className="mt-2 flex justify-center gap-1">
          <button type="button" className={pageButton} disabled={pageIndex === 0} onClick={() => table.setPageIndex(0)}>
            «
          </button>
          <button type="button" className={pageButton} disabled={pageIndex === 0} onClick={() => table.previousPage()}>
            ‹
          </button>
          {pages.map((p) => (
            <button
              key={p}
              type="button"
              className={`${pageButton} ${p === pageIndex ? 'bg-primary text-white hover:bg-primary' : ''}`}
              aria-current={p === pageIndex ? 'page' : undefined}
              onClick={() => table.setPageIndex(p)}
            >
              {p + 1}
            </button>
          ))}
          <button type="button" className={pageButton} disabled={pageIndex >= pageCount - 1} onClick={() => table.nextPage()}>
            ›
          </button>
          <button
            type="button"
            className={pageButton}
            disabled={pageIndex >= pageCount - 1}
            onClick={() => table.setPageIndex(pageCount - 1)}
          >
            »
          </button>
        </nav>
      )}
    </div>
  );
}
```

Notes for the implementer:
- Remove any `eslint-disable` comment whose rule does not exist in the installed plugin versions (lint will tell you "Definition for rule … was not found"); keep only ones lint actually needs.
- Accessor columns created with `createColumnHelper().accessor('name', …)` have `id` undefined and `accessorKey` set — the `columnIds` computation covers both; if TS complains about `accessorKey` on the union, narrow with `'accessorKey' in c`.

- [ ] **Step 4: Verify** — `npm test && npm run typecheck && npm run lint` → PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src
git commit -m "feat: DataTable with URL-synced sort, search and pagination"
```

---

### Task 5: Shared UI — PlayerLink, Medals, BackLink, paths

**Files:**
- Modify: `src/paths.ts`
- Create: `src/components/PlayerLink.tsx`, `src/components/Medals.tsx`, `src/components/BackLink.tsx`, `src/components/shared.test.tsx`

**Interfaces:**
- Produces:
  - `paths.ts`: `teamPath(t: { pk: number; name: string })` → `/teams/${pk}/${encodeURIComponent(name)}`; `tournamentResultsPath(pk: number, totPk?: number)` → `/tournaments/${pk}/results` or `/tournaments/${pk}/results/${totPk}`; existing `playerPath` unchanged.
  - `PlayerLink({ player }: { player: { pk: number; nickname: string; gender: string | null } })` — link to `playerPath`, text prefixed with `♂` (man) / `♀` (woman) in a `<span aria-hidden="true">`.
  - `Medals({ medals }: { medals: number[] })` — for each place 1..5 with count > 0: `{count}×` followed by a round badge with the place number (gold `bg-medal-gold`, silver `bg-medal-silver`, bronze `bg-medal-bronze`, 4–5 plain); badge has `title="{place}. místo"`.
  - `BackLink({ fallback }: { fallback: string })` — `‹ zpět` link-styled button; `navigate(-1)` when there is history (`location.key !== 'default'`), else `navigate(fallback)`; followed by `<hr className="my-3" />`.

- [ ] **Step 1: Failing tests** — `src/components/shared.test.tsx`:

```tsx
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { expect, test } from 'vitest';
import { teamPath, tournamentResultsPath } from '../paths';
import { renderWithProviders } from '../test/utils';
import BackLink from './BackLink';
import Medals from './Medals';
import PlayerLink from './PlayerLink';

test('paths encode names', () => {
  expect(teamPath({ pk: 3, name: 'Ufo tým' })).toBe('/teams/3/Ufo%20t%C3%BDm');
  expect(tournamentResultsPath(5)).toBe('/tournaments/5/results');
  expect(tournamentResultsPath(5, 9)).toBe('/tournaments/5/results/9');
});

test('PlayerLink shows gender sign and links to player', () => {
  renderWithProviders(<PlayerLink player={{ pk: 7, nickname: 'Jana', gender: 'woman' }} />);
  const link = screen.getByRole('link', { name: /Jana/ });
  expect(link).toHaveAttribute('href', '/players/7/Jana');
  expect(link).toHaveTextContent('♀');
});

test('Medals renders only non-zero places', () => {
  renderWithProviders(<Medals medals={[2, 0, 1, 0, 0]} />);
  expect(screen.getByTitle('1. místo')).toBeInTheDocument();
  expect(screen.getByTitle('3. místo')).toBeInTheDocument();
  expect(screen.queryByTitle('2. místo')).not.toBeInTheDocument();
  expect(screen.getByText(/2×/)).toBeInTheDocument();
});

test('BackLink falls back when there is no history', async () => {
  renderWithProviders(
    <Routes>
      <Route path="/players/1" element={<BackLink fallback="/players" />} />
      <Route path="/players" element={<p>seznam</p>} />
    </Routes>,
    { route: '/players/1' },
  );
  await userEvent.click(screen.getByRole('button', { name: '‹ zpět' }));
  expect(screen.getByText('seznam')).toBeInTheDocument();
});
```

Run → FAIL.

- [ ] **Step 2: Implement**

Append to `src/paths.ts`:

```ts
export const teamPath = (t: { pk: number; name: string }) => `/teams/${t.pk}/${encodeURIComponent(t.name)}`;
export const tournamentResultsPath = (pk: number, totPk?: number) =>
  totPk == null ? `/tournaments/${pk}/results` : `/tournaments/${pk}/results/${totPk}`;
```

`src/components/PlayerLink.tsx`:

```tsx
import { Link } from 'react-router';
import { playerPath } from '../paths';

const SIGNS: Record<string, string> = { man: '♂', woman: '♀' };

export default function PlayerLink({ player }: { player: { pk: number; nickname: string; gender: string | null } }) {
  const sign = player.gender ? SIGNS[player.gender] : undefined;
  return (
    <Link to={playerPath(player)}>
      {sign && <span aria-hidden="true">{sign} </span>}
      {player.nickname}
    </Link>
  );
}
```

`src/components/Medals.tsx`:

```tsx
const BADGE = ['bg-medal-gold', 'bg-medal-silver', 'bg-medal-bronze', '', ''];

export default function Medals({ medals }: { medals: number[] }) {
  return (
    <span className="inline-flex flex-wrap gap-2">
      {medals.map((count, i) =>
        count > 0 ? (
          <span key={i} className="whitespace-nowrap">
            {count}×
            <span
              title={`${i + 1}. místo`}
              className={`ml-0.5 inline-flex size-4 items-center justify-center rounded-full border border-gray-400 align-middle text-[0.6em] text-gray-600 ${BADGE[i]}`}
            >
              {i + 1}
            </span>
          </span>
        ) : null,
      )}
    </span>
  );
}
```

`src/components/BackLink.tsx`:

```tsx
import { useLocation, useNavigate } from 'react-router';

export default function BackLink({ fallback }: { fallback: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <>
      <button
        type="button"
        className="cursor-pointer text-primary hover:text-primary-dark"
        onClick={() => (location.key === 'default' ? navigate(fallback) : navigate(-1))}
      >
        ‹ zpět
      </button>
      <hr className="my-3 border-gray-300" />
    </>
  );
}
```

- [ ] **Step 3: Verify** — `npm test && npm run typecheck && npm run lint` → PASS.

- [ ] **Step 4: Commit**

```bash
git add src
git commit -m "feat: PlayerLink, Medals, BackLink and path helpers"
```

---

### Task 6: Static pages — Home, FAQ (+ /intro redirect), Privacy policy

**Files:**
- Create: `src/pages/HomePage.tsx`, `src/pages/FaqPage.tsx`, `src/pages/PrivacyPolicyPage.tsx`, `src/pages/static.test.tsx`
- Modify: `src/router.tsx`, `src/router.test.tsx`, `src/App.test.tsx`

**Interfaces:**
- Consumes: `useStats`, `useTournament`, `useAppConfig`, `formatNumber`, `formatDate`, `formatDateTime`, `Spinner`, `ErrorBox`.
- Produces: default-exported page components; routes `index` → `HomePage`, `faq` → `FaqPage`, `intro` → `<Navigate replace to="/faq" />`, `privacy-policy` → `PrivacyPolicyPage`.

Home layout (R§4.1), centered column `mx-auto max-w-xl`:
- `<h3 class="text-xl font-bold">Ufobalový Informační Systém</h3>`
- While stats load: `Spinner`; on error `ErrorBox` with retry. Then "V systému je aktuálně:" and a list (numbers bold, via `formatNumber`):
  - `{tournament_count} turnajů od roku {min_year} až do roku {max_year}`
  - `{player_count} hráčů z toho {player_female_count} žen a {player_male_count} mužů (zbytek asi velbloudi)`
  - `{team_count} týmů s jejich {team_on_tournament_count} účastmi na turnajích`
  - `{goals} gólů a {assists} asistencí`
  - `{active_players} aktivních hráčů (hrajicích od roku {active_players_year})`
  (years are rendered raw, not number-formatted).
- Link "Oficiální stránky ufobalu" → `http://ufobal.cz` (`target="_blank" rel="noreferrer"`); bold red (`text-red-800 font-bold`) link "Stručný návod na zapisování zápasu" → `/static/záznam_zápasu.pdf` (plain `<a>`).
- `<hr>`; live tournament block if `liveTournamentPk` and the tournament loaded:
  - `<h3>` with `<Link to="/tournaments/{pk}/record">{full_name}</Link>`
  - `datum: {formatDate(date)}`
  - if `registration_open`: `<Link to="/tournaments/{pk}/register">přihlásit se na turnaj</Link>` + (if `formatDate(registration_to)` non-empty) ` - do {formatDate(registration_to)}`
  - if `registration_scheduled`: `přihlašování začne {formatDateTime(registration_from)}`
  - `description` rendered with `dangerouslySetInnerHTML` (comment: trusted HTML from Django admin).
- `<hr>`; `<h3>Jak na UfoIS</h3>`; `<a href="https://www.youtube.com/watch?v=jxACZ41WJQI" target="_blank" rel="noreferrer"><img src="/static/youtube.png" alt="Jak na UfoIS" /></a>`.

FAQ: port `~/projects/ufobal-web/ufobalapp/static/ufobalapp/ng-parts/faq.html` to JSX **verbatim** (Czech text unchanged): lines 1–33 (sections "Co a jak?", "Co tento web vlastně je", "Co od vás potřebujeme") and lines 40–71 ("Často kladené dotazy" with its 5 questions). Skip the intro-only paragraph (lines 34–38) and all Angular attributes. Keep external links (`target="_blank" rel="noreferrer"`), `mailto:` links as is; replace any link to `http://is.ufobal.cz/intro` with `<Link to="/faq">`. Headings: `h3` → `text-xl font-bold mt-4`, `h5` → `font-bold mt-3`.

Privacy: port `git -C ~/projects/ufobal-web-frontend show 8caa65b:src/app/privacy-policy/privacy-policy.component.html` to JSX verbatim (English). Headings `h1` → `text-2xl font-bold`, `h2` → keep global h2 style.

- [ ] **Step 1: Failing tests** — `src/pages/static.test.tsx`:

```tsx
import { screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { tournamentDto } from '../test/fixtures';
import { mockApi, renderWithProviders } from '../test/utils';
import FaqPage from './FaqPage';
import HomePage from './HomePage';
import PrivacyPolicyPage from './PrivacyPolicyPage';

const stats = {
  tournament_count: 42, max_year: 2026, min_year: 2005, player_count: 1234, player_male_count: 800,
  player_female_count: 400, team_count: 120, team_on_tournament_count: 900, goals: 12345, assists: 6789,
  active_players: 321, active_players_year: 2025,
};

test('home shows stats with Czech number format', async () => {
  mockApi({ stats });
  renderWithProviders(<HomePage />);
  expect(await screen.findByText(/turnajů od roku/)).toHaveTextContent('42 turnajů od roku 2005 až do roku 2026');
  expect(screen.getByText(/gólů a/)).toHaveTextContent(/12\s345 gólů a 6\s789 asistencí/u);
  expect(screen.getByRole('link', { name: 'Stručný návod na zapisování zápasu' })).toHaveAttribute(
    'href',
    '/static/záznam_zápasu.pdf',
  );
});

test('home shows live tournament with registration link', async () => {
  mockApi({
    stats,
    'tournament/7': tournamentDto({
      pk: 7, full_name: 'Brno 2026', date: '2026-06-13', registration_open: true, registration_to: '2026-06-01',
      description: '<p>Popis <b>turnaje</b></p>',
    }),
  });
  renderWithProviders(<HomePage />, { config: { liveTournamentPk: 7 } });
  expect(await screen.findByRole('link', { name: 'Brno 2026' })).toHaveAttribute('href', '/tournaments/7/record');
  expect(screen.getByText('datum: 13. 6. 2026')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'přihlásit se na turnaj' })).toHaveAttribute('href', '/tournaments/7/register');
  expect(screen.getByText(/do 1\. 6\. 2026/)).toBeInTheDocument();
  expect(screen.getByText('turnaje').tagName).toBe('B');
});

test('home stats error shows retry box', async () => {
  mockApi({});
  renderWithProviders(<HomePage />);
  expect(await screen.findByRole('alert')).toBeInTheDocument();
});

test('faq has its sections', () => {
  renderWithProviders(<FaqPage />);
  expect(screen.getByRole('heading', { name: 'Co a jak?' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Často kladené dotazy' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Můžu něco pokazit?' })).toBeInTheDocument();
});

test('privacy policy renders', () => {
  renderWithProviders(<PrivacyPolicyPage />);
  expect(screen.getByRole('heading', { name: 'Privacy Policy for UfoIS' })).toBeInTheDocument();
});
```

In `src/router.test.tsx`:
- add `beforeEach(() => mockApi({}))` (import `mockApi` from `./test/utils`, `beforeEach` from vitest) so real pages don't hit the network;
- change the "new route renders placeholder" test to use `/tournaments/5/live` and heading `Turnaj živě`;
- add: `test('/intro redirects to /faq', …)` asserting `router.state.location.pathname === '/faq'`.

In `src/App.test.tsx`: call `mockApi({})` first and expect heading `Ufobalový Informační Systém` instead of `Ufo-IS`.

Run → FAIL.

- [ ] **Step 2: Implement** the three pages per the layout above, and update `src/router.tsx`:

```tsx
import { Navigate, type RouteObject } from 'react-router';
import FaqPage from './pages/FaqPage';
import HomePage from './pages/HomePage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
// ...
      { index: true, element: <HomePage /> },
      { path: 'privacy-policy', element: <PrivacyPolicyPage /> },
      { path: 'faq', element: <FaqPage /> },
      { path: 'intro', element: <Navigate replace to="/faq" /> },
```

`src/pages/HomePage.tsx`:

```tsx
import { Link } from 'react-router';
import { useAppConfig } from '../AppContext';
import ErrorBox from '../components/ErrorBox';
import Spinner from '../components/Spinner';
import { formatDate, formatDateTime, formatNumber } from '../format';
import { useStats, useTournament } from '../queries/data';

export default function HomePage() {
  const { liveTournamentPk } = useAppConfig();
  const stats = useStats();
  const live = useTournament(liveTournamentPk);
  const s = stats.data;
  const t = live.data;
  const registrationTo = t ? formatDate(t.registration_to) : '';

  return (
    <div className="mx-auto max-w-xl">
      <h3 className="mb-3 text-xl font-bold">Ufobalový Informační Systém</h3>
      {stats.error ? (
        <ErrorBox error={stats.error} onRetry={() => void stats.refetch()} />
      ) : !s ? (
        <Spinner />
      ) : (
        <>
          <p>V systému je aktuálně:</p>
          <ul className="my-2 ml-6 list-disc">
            <li>
              <b>{formatNumber(s.tournament_count)}</b> turnajů od roku <b>{s.min_year}</b> až do roku{' '}
              <b>{s.max_year}</b>
            </li>
            <li>
              <b>{formatNumber(s.player_count)}</b> hráčů z toho <b>{formatNumber(s.player_female_count)}</b> žen a{' '}
              <b>{formatNumber(s.player_male_count)}</b> mužů (zbytek asi velbloudi)
            </li>
            <li>
              <b>{formatNumber(s.team_count)}</b> týmů s jejich <b>{formatNumber(s.team_on_tournament_count)}</b>{' '}
              účastmi na turnajích
            </li>
            <li>
              <b>{formatNumber(s.goals)}</b> gólů a <b>{formatNumber(s.assists)}</b> asistencí
            </li>
            <li>
              <b>{formatNumber(s.active_players)}</b> aktivních hráčů (hrajicích od roku <b>{s.active_players_year}</b>)
            </li>
          </ul>
        </>
      )}
      <p className="my-2 flex flex-col gap-1">
        <a href="http://ufobal.cz" target="_blank" rel="noreferrer">
          Oficiální stránky ufobalu
        </a>
        <a href="/static/záznam_zápasu.pdf" className="font-bold text-red-800">
          Stručný návod na zapisování zápasu
        </a>
      </p>
      <hr className="my-4 border-gray-300" />
      {t && (
        <>
          <h3 className="text-xl font-bold">
            <Link to={`/tournaments/${t.pk}/record`}>{t.full_name}</Link>
          </h3>
          <p>datum: {formatDate(t.date)}</p>
          {t.registration_open && (
            <p>
              <Link to={`/tournaments/${t.pk}/register`}>přihlásit se na turnaj</Link>
              {registrationTo && ` - do ${registrationTo}`}
            </p>
          )}
          {t.registration_scheduled && <p>přihlašování začne {formatDateTime(t.registration_from)}</p>}
          {t.description && (
            // Trusted HTML written by staff in Django admin.
            <div className="my-2" dangerouslySetInnerHTML={{ __html: t.description }} />
          )}
          <hr className="my-4 border-gray-300" />
        </>
      )}
      <h3 className="text-xl font-bold">Jak na UfoIS</h3>
      <a href="https://www.youtube.com/watch?v=jxACZ41WJQI" target="_blank" rel="noreferrer">
        <img src="/static/youtube.png" alt="Jak na UfoIS" />
      </a>
    </div>
  );
}
```

- [ ] **Step 3: Verify** — `npm test && npm run typecheck && npm run lint` → PASS.

- [ ] **Step 4: Commit**

```bash
git add src
git commit -m "feat: home, FAQ and privacy policy pages; /intro redirects to /faq"
```

---

### Task 7: Hall of records

**Files:**
- Create: `src/pages/HallOfRecordsPage.tsx`, `src/pages/HallOfRecordsPage.test.tsx`
- Modify: `src/router.tsx`

**Interfaces:**
- Consumes: `useHallOfGlory`, `playerPath`, `teamPath`, `tournamentResultsPath`, `formatNumber`.

Layout (R§4.4): centered `max-w-2xl`; `<h3>Síň rekordů</h3>`; spinner/error; then for each record (in this order) a block: label, bold text, and a list (`ml-12 list-disc`) of instance links:

| key | label | bold text | instance |
|---|---|---|---|
| `max_teams_per_tournament` | Maximální počet týmů na turnaji: | `{v} týmů na turnaji` | tournament link (`tournamentResultsPath(pk)`, text `full_name`) |
| `max_matches_per_tournament` | Maximální počet zápasů na turnaji: | `{v} zápasů na turnaji` | tournament link |
| `max_matches_per_team` | Tým s nejvíce zápasy: | `{v} zápasů týmu` | team link (`teamPath`, text `name`) |
| `max_goals_per_team` | Tým s nejvíce góly: | `{v} gólů týmu` | team link |
| `max_avg_goals_per_team` | Tým s nejvíce góly na zápas: | `{formatNumber(v, 1)} gólů na zápas týmu` | team link |
| `max_goal_per_tournament_player` | Hráč s nejvíce góly na turnaji: | `{v} gólů` | player link (text `full_name`) + `, ` + tournament link |
| `max_assistance_per_tournament_player` | Hráč s nejvíce asistencemi na turnaji: | `{v} asistencí` | same |
| `max_goal_per_tournament_player_female` | Hráčka s nejvíce góly na turnaji: | `{v} gólů` | same |
| `max_assistance_per_tournament_player_female` | Hráčka s nejvíce asistencemi na turnaji: | `{v} asistencí` | same |

Footer: `<hr>` + `<i>Některé statistiky jsou počítány až od vzniku UfoISu v roce 2016.</i>`. A record missing from the response (or with no instances) is skipped.

Implement as a typed config array `{ key, label, text: (v) => string, kind: 'tournament' | 'team' | 'playerTournament' }[]` and one renderer.

- [ ] **Step 1: Failing test** — `src/pages/HallOfRecordsPage.test.tsx`:

```tsx
import { screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { playerDto, t1, ufo } from '../test/fixtures';
import { mockApi, renderWithProviders } from '../test/utils';
import HallOfRecordsPage from './HallOfRecordsPage';

const player = playerDto({ pk: 100, nickname: 'Pépa', full_name: 'Pépa - Josef Novák' });

test('renders records with links; missing records skipped', async () => {
  mockApi({
    hall_of_glory: {
      max_teams_per_tournament: { value: 24, instances: [t1] },
      max_avg_goals_per_team: { value: 3.456, instances: [ufo] },
      max_goal_per_tournament_player: { value: 17, instances: [[player, t1]] },
    },
  });
  renderWithProviders(<HallOfRecordsPage />);
  expect(await screen.findByText('24 týmů na turnaji')).toBeInTheDocument();
  expect(screen.getAllByRole('link', { name: 'Brno 2023' })[0]).toHaveAttribute('href', '/tournaments/1/results');
  expect(screen.getByText('3,5 gólů na zápas týmu')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Ufo' })).toHaveAttribute('href', '/teams/10/Ufo');
  expect(screen.getByRole('link', { name: 'Pépa - Josef Novák' })).toHaveAttribute('href', '/players/100/P%C3%A9pa');
  expect(screen.queryByText(/Tým s nejvíce zápasy/)).not.toBeInTheDocument();
});
```

Run → FAIL.

- [ ] **Step 2: Implement**; route `hall-of-records` → `<HallOfRecordsPage />`.

- [ ] **Step 3: Verify** — `npm test && npm run typecheck && npm run lint` → PASS.

- [ ] **Step 4: Commit** — `git add src && git commit -m "feat: hall of records page"`

---

### Task 8: Players list and Player detail

**Files:**
- Create: `src/pages/PlayersPage.tsx`, `src/pages/PlayerPage.tsx`, `src/pages/players.test.tsx`
- Modify: `src/router.tsx`

**Interfaces:**
- Consumes: `useGraph`, `scoreWithoutTeam`, `DataTable`, `czechSort`, `PlayerLink`, `BackLink`, `teamPath`, `tournamentResultsPath`, `formatRank`, `Spinner`, `ErrorBox`.

Players (R§4.5): rows = `graph.players` sorted by `canada` desc (stable); `DataTable` with `searchText={(p) => p.search}`, no URL prefix. Columns:

| id / header | sort | cell | meta |
|---|---|---|---|
| `nickname` "Jméno" | `czechSort` | `<PlayerLink player={p} />` | width 30% |
| `teams` "Týmy" | none | `p.teams.map(t => \`${t.team.name} (${t.count}x)\`).join(', ')` | width 40% |
| `goalsSum` "Góly" | desc-first | number | right |
| `assistsSum` "Asistence" | desc-first | number | right |
| `canada` "Kanada" | desc-first | number | right |
| `penaltyCount` "Karty" | desc-first | number | right |

Player detail (R§4.6, read-only): route params `id` (and ignored `slug`). `player = graph.playersById.get(Number(id))`; if missing → `<div role="alert" className="callout">Hráč nenalezen.</div>` (after `BackLink`).
- `<BackLink fallback="/players" />`
- `<h1 className="text-3xl">{nickname}</h1>`
- `<h2>{gender sign} {name} {lastname} {age != null && \`(${age})\`}</h2>` (omit null name parts)
- `<hr>`; `<h3 className="text-xl font-bold">Turnaje</h3>`; plain table (no paging), rows = `player.tots` sorted by `tournament.date` desc:
  headers: Turnaj | Tým | Góly | Asistence | Kanada | Umístění
  cells: link `tournamentResultsPath(t.pk, tot.pk)` text `tournament.full_name` | link `teamPath({pk: tot.team.pk, name: tot.name})` text `tot.name` | `goals[t.pk]` or blank | `assists[t.pk]` or blank | sum or blank when both missing | `formatRank(rank)`.
- `<h3>Karty</h3>`; table headers: (empty) | Zdůvodnění | Turnaj | Zápas; rows from `player.penalties`: `card_verbose` | `reason` | tournament link (`tournamentResultsPath(tournament.pk)`, text `full_name`) or plain `tournamentPk` text if `tournament` is null | link "detail" → `/tournaments/${tournamentPk}/matches/${match.pk}`. Table renders with headers even when empty.
- If `scoreWithoutTeam(player, graph)` non-empty: `<h4>What? Turnaje se skórem, ale bez týmu</h4>` and one line per item: `{full_name} - {goals} golů a {assists} assistencí` (spelling as in old app).
- No edit/pairing/attendance controls in this plan.

- [ ] **Step 1: Failing tests** — `src/pages/players.test.tsx`:

```tsx
import { screen, within } from '@testing-library/react';
import { expect, test } from 'vitest';
import { mockGraphApi, renderWithProviders } from '../test/utils';
import PlayerPage from './PlayerPage';
import PlayersPage from './PlayersPage';

test('players list sorted by canada with teams and stats', async () => {
  mockGraphApi();
  renderWithProviders(<PlayersPage />);
  const rows = within((await screen.findAllByRole('rowgroup'))[1]).getAllByRole('row');
  expect(rows[0]).toHaveTextContent('Pépa');
  expect(rows[0]).toHaveTextContent('Ufo (2x)');
  expect(within(rows[0]).getAllByRole('cell')[4]).toHaveTextContent('5');
  expect(rows[2]).toHaveTextContent('Jana');
});

test('player detail shows tournaments, cards and score without team', async () => {
  mockGraphApi();
  renderWithProviders(<PlayerPage />, { route: '/players/100/Pepa', path: '/players/:id/:slug?' });
  expect(await screen.findByRole('heading', { name: 'Pépa' })).toBeInTheDocument();
  expect(screen.getByText(/Josef Novák/)).toHaveTextContent('(30)');
  expect(screen.getByRole('link', { name: 'Nížkov 2024' })).toHaveAttribute('href', '/tournaments/2/results/1002');
  expect(screen.getByRole('link', { name: 'Béčko (Ufo)' })).toHaveAttribute('href', '/teams/10/B%C3%A9%C4%8Dko%20(Ufo)');
  expect(screen.getByText('žlutá')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'detail' })).toHaveAttribute('href', '/tournaments/1/matches/500');
});

test('player with no teams, goals in a tournament without roster', async () => {
  mockGraphApi();
  renderWithProviders(<PlayerPage />, { route: '/players/102/Karel', path: '/players/:id/:slug?' });
  expect(await screen.findByText('What? Turnaje se skórem, ale bez týmu')).toBeInTheDocument();
  expect(screen.getByText('Brno 2023 - 4 golů a 0 assistencí')).toBeInTheDocument();
  expect(screen.getByRole('columnheader', { name: 'Zdůvodnění' })).toBeInTheDocument();
});

test('unknown player id shows not found', async () => {
  mockGraphApi();
  renderWithProviders(<PlayerPage />, { route: '/players/999999', path: '/players/:id/:slug?' });
  expect(await screen.findByRole('alert')).toHaveTextContent('Hráč nenalezen.');
});
```

Run → FAIL.

- [ ] **Step 2: Implement** both pages; routes `players` → `<PlayersPage />`, `players/:id/:slug?` → `<PlayerPage />`. Pattern for loading in every graph page:

```tsx
const { graph, error, isPending, refetch } = useGraph();
if (error) return <ErrorBox error={error} onRetry={refetch} />;
if (isPending || !graph) return <Spinner />;
```

Define column arrays at module level (stable identity) with `createColumnHelper<PlayerVM>()`.

- [ ] **Step 3: Verify** — `npm test && npm run typecheck && npm run lint` → PASS.

- [ ] **Step 4: Commit** — `git add src && git commit -m "feat: players list and player detail pages"`

---

### Task 9: Teams list and Team detail

**Files:**
- Create: `src/pages/TeamsPage.tsx`, `src/pages/TeamPage.tsx`, `src/pages/teams.test.tsx`
- Modify: `src/router.tsx`

**Interfaces:**
- Consumes: `useGraph`, `compareMedals`, `DataTable`, `czechSort`, `Medals`, `BackLink`, `PlayerLink`, `teamPath`, `tournamentResultsPath`, `formatRank`.

Teams (R§4.7): rows = `[...graph.teams].sort((a, b) => compareMedals(a.medals, b.medals))`; `searchText={(t) => t.search}`. Columns:

| id / header | sort | cell | meta |
|---|---|---|---|
| `name` "Jméno" | `czechSort` | link `teamPath(team)` text `name` | width 20% |
| `altNames` (empty header) | none | `altNames.map(n => n.name).join(', ')` | width 40% |
| `medals` "Umístění" | `sortingFn: (a, b) => compareMedals(a.original.medals, b.original.medals)` | `<Medals medals={team.medals} />` | width 30% |
| `tournaments` "Počet turnajů" | none | `team.tots.length` | right |

Team detail (R§4.8): params `id`; missing → `<div role="alert" className="callout">Tým nenalezen.</div>`.
- `<BackLink fallback="/teams" />`
- `<h1 className="text-3xl">{name} {name_short && \`(${name_short})\`}</h1>`
- If `altNames` non-empty: `<h5 className="italic text-gray-500">{altNames.map(n => n.name).join(', ')}</h5>` (old app intended this; it was broken there)
- `<h3>Turnaje</h3>`; table rows = `team.tots` sorted by `tournament.date` desc; headers Turnaj | (empty) | Hráči | Umístění(right):
  link `tournamentResultsPath(t.pk, tot.pk)` text `full_name` | `tot.name` unless equal to `team.name` | player links (`PlayerLink`) joined with `, ` | `formatRank(rank)`.

- [ ] **Step 1: Failing tests** — `src/pages/teams.test.tsx`:

```tsx
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { mockGraphApi, renderWithProviders } from '../test/utils';
import TeamPage from './TeamPage';
import TeamsPage from './TeamsPage';

const bodyRows = async () => within((await screen.findAllByRole('rowgroup'))[1]).getAllByRole('row');

test('teams sorted by medals with alt names and tournament count', async () => {
  mockGraphApi();
  renderWithProviders(<TeamsPage />);
  const rows = await bodyRows();
  expect(rows[0]).toHaveTextContent('Ufo');
  expect(rows[0]).toHaveTextContent('Béčko (Ufo)');
  expect(within(rows[0]).getAllByRole('cell')[3]).toHaveTextContent('2');
  expect(rows[1]).toHaveTextContent('Kométa');
});

test('teams search matches short name and ignores diacritics', async () => {
  mockGraphApi();
  renderWithProviders(<TeamsPage />);
  await bodyRows();
  await userEvent.type(screen.getByPlaceholderText('hledat...'), 'kometa');
  expect(await bodyRows()).toHaveLength(1);
  await userEvent.clear(screen.getByPlaceholderText('hledat...'));
  await userEvent.type(screen.getByPlaceholderText('hledat...'), 'kom');
  expect((await bodyRows())[0]).toHaveTextContent('Kométa');
});

test('team detail lists tournaments newest first with players', async () => {
  mockGraphApi();
  renderWithProviders(<TeamPage />, { route: '/teams/10/Ufo', path: '/teams/:id/:slug?' });
  expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Ufo');
  const rows = await bodyRows();
  expect(rows[0]).toHaveTextContent('Nížkov 2024');
  expect(rows[0]).toHaveTextContent('Béčko (Ufo)');
  expect(rows[1]).toHaveTextContent('Brno 2023');
  expect(within(rows[1]).getByRole('link', { name: /Jana/ })).toHaveAttribute('href', '/players/101/Jana');
  expect(rows[1]).toHaveTextContent('1.');
});

test('unknown team id shows not found', async () => {
  mockGraphApi();
  renderWithProviders(<TeamPage />, { route: '/teams/abc', path: '/teams/:id/:slug?' });
  expect(await screen.findByRole('alert')).toHaveTextContent('Tým nenalezen.');
});
```

Run → FAIL.

- [ ] **Step 2: Implement**; routes `teams` → `<TeamsPage />`, `teams/:id/:slug?` → `<TeamPage />`. Team detail's table: use `<thead>`/`<tbody>` so the `rowgroup` query works.

- [ ] **Step 3: Verify** — `npm test && npm run typecheck && npm run lint` → PASS.

- [ ] **Step 4: Commit** — `git add src && git commit -m "feat: teams list and team detail pages"`

---

### Task 10: Tournaments list

**Files:**
- Create: `src/pages/TournamentsPage.tsx`, `src/pages/TournamentsPage.test.tsx`
- Modify: `src/router.tsx`

**Interfaces:**
- Consumes: `useGraph`, `DataTable`, `czechSort`, `tournamentResultsPath`.

Rows = `[...graph.tournaments].sort((a, b) => b.date.localeCompare(a.date))` (empty tournaments included); no search. Columns:

| id / header | sort | cell | meta |
|---|---|---|---|
| `name` "Jméno" | `czechSort` | link `tournamentResultsPath(pk)` text `full_name` | width 30% |
| `date` "Datum" | default (string) | raw `date` | width 20% |
| `teams` "Týmů" | none | `tots.length` | width 10%, right |
| `location` "Lokace" | none | `location ?? ''` | width 10% |
| `category` "Kategorie" | none | `category ?? ''` | width 10% |

- [ ] **Step 1: Failing test** — `src/pages/TournamentsPage.test.tsx`:

```tsx
import { screen, within } from '@testing-library/react';
import { expect, test } from 'vitest';
import { mockGraphApi, renderWithProviders } from '../test/utils';
import TournamentsPage from './TournamentsPage';

test('tournaments newest first, including empty ones', async () => {
  mockGraphApi();
  renderWithProviders(<TournamentsPage />);
  const rows = within((await screen.findAllByRole('rowgroup'))[1]).getAllByRole('row');
  expect(rows.map((r) => within(r).getAllByRole('cell')[0].textContent)).toEqual(['Hala 2025', 'Nížkov 2024', 'Brno 2023']);
  expect(within(rows[0]).getAllByRole('cell')[2]).toHaveTextContent('0');
  expect(within(rows[2]).getAllByRole('cell')[2]).toHaveTextContent('2');
  expect(within(rows[1]).getByRole('link')).toHaveAttribute('href', '/tournaments/2/results');
});
```

Run → FAIL.

- [ ] **Step 2: Implement**; route `tournaments` → `<TournamentsPage />`. Remove `Placeholder` imports from `router.tsx` only if no placeholder route remains (several remain for plan 2b+, so keep it).

- [ ] **Step 3: Verify** — `npm test && npm run typecheck && npm run lint && npm run build` → PASS.

- [ ] **Step 4: Commit** — `git add src && git commit -m "feat: tournaments list page"`

---

## Next

- Plan 2b: Tournament results (teams/matches/players/goalies/pairs, team filter by TOT pk), Groups (+ playoff bracket), Player stats, Goalie stats (needs `matchs` + goalie computation).
