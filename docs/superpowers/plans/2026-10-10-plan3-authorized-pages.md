# Plan 3 — Authorized Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the logged-in pages — tournament recording hub, live view, team registration, roster editing, player profile edit / attendance / pairing request, account pairing, referee feedback — and fix the backend bugs found on the way.

**Architecture:** Write endpoints in `src/api/endpoints.ts`, mutation hooks in `src/queries/mutations.ts` (each invalidates the affected queries and shows a success toast; errors are toasted globally by the existing `MutationCache`). Small shared form components (`GenderSelect`, `BirthdateAgeInput`, `PlayerCombobox`, `StarRating`). Pages compose graph data (`useGraph`) with fresh tournament / match queries.

**Tech Stack:** React 19, TS strict, React Router 7, TanStack Query 5, Headless UI 2 (Dialog, Combobox), sonner, Tailwind 4, Vitest. Backend Django 4.2, pytest-django.

**Spec:** `docs/superpowers/specs/2026-10-10-react-frontend-design.md`
**Research (old app behaviour, endpoints, exact texts):** `/tmp/claude-1000/-home-thran-projects-ufobal-web-frontend/afb38ef5-0a40-47b4-8bbe-1e26e7cfcf82/scratchpad/plan3-research.md` — referenced as **R§x**. Old sources: `~/projects/ufobal-web/ufobalapp/static/ufobalapp/{js,ng-parts}/`.

## Global Constraints

- Branches: frontend `react-rewrite`, backend `new-frontend`. Never push.
- UI text Czech (old typos corrected, e.g. "budeš", "systému", "Přišli jsme", "gólů a asistencí"); code English; comments only for non-obvious things.
- **User decisions:** backend permission model unchanged in this plan (only bugs fixed); live view auto-refresh **on** by default (15 s, "živě" checkbox to pause); roster player picker = searchable combobox; pair-account page is **public** with login on the page; referee feedback saved only by an explicit "Uložit" button; confirm dialog (`window.confirm`) before removing a player from a roster or removing an attendance; success toasts after saves; hub shows a "Bez hřiště" panel for matches without a valid field.
- Mutation errors: shown by the existing global `MutationCache` toast (server text). Pages must not add a second error toast.
- Write endpoints return the new pk as plain text (client parses `"123"` to number) or `"OK"`.
- After writes invalidate exactly the queries listed in Task 2.
- Commit trailer (after a blank line):
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01NHHZjCnSN7qrM8oz75zwSt`
- Backend tests: `cd ~/projects/ufobal-web && ~/miniconda3/envs/ufobal_web/bin/python -m pytest -q` (baseline 4 failed). Frontend: `npm test && npm run typecheck && npm run lint`.

## Review Focus

1. **Staff user without a paired player** opening referee feedback / hub — no crash; clear message (backend 400 text shown in ErrorBox). Tests in Tasks 1 and 10.
2. **Non-staff owner saving profile without touching birthdate** must not wipe it (birthdate not sent). Test in Task 8.
3. **closed_edit tournament**: hub redirects non-staff to results, live view never redirects; referee feedback shows read-only notice. Tests in Tasks 4, 5, 10.
4. **Pair token from URL while anonymous** survives login (localStorage) and is cleared after successful pairing. Test in Task 9.
5. **Server HTML error bodies** (Django 404 pages) never shown as toast text — generic message instead. Test in Task 2.

---

## File Structure

```
backend: ufobalapp/models.py (referee tuple), ufobalapp/views.py (pairing auth, referee feedback w/o player, add_match goalie validation order),
         ufobalapp/tests/test_authorized_fixes.py
src/api/client.ts            HTML error bodies → generic message
src/api/types.ts             + birthdate?, RefereeFeedbackDto, RefereeMatchDto, new-entity input types
src/api/endpoints.ts         + write endpoints, getRefereeFeedbacks
src/queries/data.ts          useMatches(pk, { refetchInterval }), useRefereeFeedbacks
src/queries/mutations.ts     new: mutation hooks
src/paths.ts                 + recordPath, livePath, registerPath, rosterPath, matchPath, refereeFeedbackPath
src/domain/age.ts            new: computeAge
src/components/forms/{GenderSelect,BirthdateAgeInput,PlayerCombobox}.tsx  new
src/components/StarRating.tsx new
src/pages/{TournamentRecordPage,TournamentLivePage,RegistrationPage,RosterPage,PairAccountPage,RefereeFeedbackPage}.tsx new
src/pages/PlayerPage.tsx     + edit form, attendance add/remove, pairing request
src/router.tsx               placeholders replaced; pair-account public
```

---

### Task 1: Backend bug fixes

**Files (repo `~/projects/ufobal-web`):**
- Modify: `ufobalapp/models.py` (~line 398, `Match.to_json` extended branch)
- Modify: `ufobalapp/views.py` (`create_pairing_request` ~912, `get_referee_feedbacks` ~1165, `save_referee_feedback` ~1186, `add_match` ~592)
- Create: `ufobalapp/tests/test_authorized_fixes.py`

**Changes (R§1.9–1.11, §6):**
1. `Match.to_json(extended=True)`: `data['referee'] = self.referee.to_json(simple=True) if self.referee else None` (remove the trailing-comma tuple); `referee_team` → `self.referee_team.to_json(simple=True) if self.referee_team else None`.
2. `create_pairing_request`: anonymous user → 401 `Unauthorized` (decorate with `@user_passes_test_or_401(lambda u: u.is_authenticated)`).
3. `get_referee_feedbacks` and `save_referee_feedback`: if `request.user` has no `player` (staff without player, TEST-mode anonymous) → 400 `Nejsi v žádném týmu` instead of 500. `save_referee_feedback` update branch: missing `pk` → 404 (`get_object_or_404`).
4. `add_match`: validate `goalie_one` / `goalie_two` (existence via `get_object_or_404(Player, …)` and roster membership) **before** `match.save()`, so a 400 never leaves a created match.

- [ ] **Step 1: Failing tests** — `ufobalapp/tests/test_authorized_fixes.py`:

```python
import json
from datetime import datetime

import pytest
from django.contrib.auth.models import User

from ufobalapp.models import Match, Player, Team, TeamOnTournament, Tournament


def make_tournament():
    return Tournament.objects.create(
        category=Tournament.BRNO, date=datetime(2023, 6, 10), registration_to=datetime(2023, 6, 1),
        name='T', location='L', field_count=2, description='d',
    )


@pytest.fixture()
def setup():
    t = make_tournament()
    tots = []
    for name in ('A', 'B', 'C'):
        tot = TeamOnTournament.objects.create(team=Team.objects.create(name=name), tournament=t)
        tots.append(tot)
    referee = Player.objects.create(name='r', lastname='r', nickname='Ref')
    return {'t': t, 'tots': tots, 'referee': referee}


def post(client, url, data):
    return client.post(url, json.dumps(data), content_type='application/json')


@pytest.mark.django_db
def test_extended_match_json_has_referee_object(setup):
    a, b, c = setup['tots']
    m = Match.objects.create(tournament=setup['t'], team_one=a, team_two=b, referee_team=c, referee=setup['referee'])
    data = m.to_json(events=False, extended=True)
    assert data['referee']['pk'] == setup['referee'].pk
    m.referee = None
    assert m.to_json(events=False, extended=True)['referee'] is None


@pytest.mark.django_db
def test_anonymous_pairing_request_is_401(client, setup):
    response = post(client, f'/api_frontend/create_pairing_request/{setup["referee"].pk}', {'text': None})
    assert response.status_code == 401


@pytest.mark.django_db
def test_referee_feedbacks_for_staff_without_player_is_400(client, setup):
    client.force_login(User.objects.create_user('admin', password='x', is_staff=True))
    response = client.get(f'/api_frontend/get_referee_feedbacks/{setup["t"].pk}')
    assert response.status_code == 400
    assert response.content.decode() == 'Nejsi v žádném týmu'
    response = post(client, '/api_frontend/save_referee_feedback', {'match': 1, 'feedback': {}})
    assert response.status_code == 400


@pytest.mark.django_db
def test_add_match_with_bad_goalie_creates_nothing(client, setup):
    a, b, c = setup['tots']
    client.force_login(User.objects.create_user('admin', password='x', is_staff=True))
    outsider = Player.objects.create(name='o', lastname='o', nickname='Out')
    response = post(client, '/api_frontend/add_match', {
        'tournament': setup['t'].pk, 'team_one': a.pk, 'team_two': b.pk, 'referee_team': c.pk,
        'place': '1', 'goalie_one': outsider.pk,
    })
    assert response.status_code == 400
    assert Match.objects.count() == 0
    response = post(client, '/api_frontend/add_match', {
        'tournament': setup['t'].pk, 'team_one': a.pk, 'team_two': b.pk, 'referee_team': c.pk,
        'place': '1', 'goalie_one': 999999,
    })
    assert response.status_code == 404
    assert Match.objects.count() == 0
```

Adjust model creation if required fields are missing; keep the scenarios.

- [ ] **Step 2: Run, expect FAIL** — `~/miniconda3/envs/ufobal_web/bin/python -m pytest -q ufobalapp/tests/test_authorized_fixes.py`

- [ ] **Step 3: Implement** the four changes. For (3) add near the top of both views:

```python
    player = getattr(request.user, 'player', None)
    if player is None:
        return HttpResponseBadRequest('Nejsi v žádném týmu')
```

and use `player` instead of `request.user.player` in those views. (`hasattr`/`getattr` on a reverse one-to-one raises `RelatedObjectDoesNotExist`, which `getattr(..., None)` swallows only if it subclasses `AttributeError` — it does in Django.) Anonymous users have no `player` attribute → same path.

- [ ] **Step 4: Run all backend tests** — new tests PASS; failures = 4 baseline.

- [ ] **Step 5: Commit** (`~/projects/ufobal-web`) — `git add ufobalapp/models.py ufobalapp/views.py ufobalapp/tests/test_authorized_fixes.py` then `git commit -m "fix: referee json, pairing auth, feedback without player, add_match goalie validation"`

---

### Task 2: Write endpoints, types, mutation hooks, paths, computeAge

**Files:**
- Modify: `src/api/client.ts`, `src/api/client.test.ts`, `src/api/types.ts`, `src/api/endpoints.ts`, `src/queries/data.ts`, `src/paths.ts`
- Create: `src/queries/mutations.ts`, `src/queries/mutations.test.tsx`, `src/domain/age.ts`, `src/domain/age.test.ts`

**Interfaces:**
- `client.ts`: when a non-OK response body is text starting with `<` (HTML), throw `ApiError(status, 'Požadavek se nezdařil.')`.
- `types.ts`:

```ts
// add to PlayerDto:
  /** Only present in responses for staff users. */
  birthdate?: string | null;

export interface RefereeFeedbackContent {
  stars: number;
  positives: string[];
  negatives: string[];
  comment: string;
}

export interface RefereeFeedbackDto {
  pk: number;
  match: number;
  author_team: number;
  author: number;
  feedback: RefereeFeedbackContent;
}

export interface RefereeMatchDto {
  pk: number;
  tournament: number;
  start: string | null;
  end: string | null;
  place: string | null;
  team_one: TotDto;
  team_two: TotDto;
  referee_team: TotDto | null;
  referee: PlayerSimple | null;
  referee_feedback?: RefereeFeedbackDto;
}

export interface NewTeam { name: string; name_short?: string; description?: string }
export interface NewRegistration {
  tournament: number;
  team: number;
  name?: string;
  name_short?: string;
  contact_mail: string;
  contact_phone: string;
  strength: number;
}
export interface NewPlayer {
  nickname: string;
  name?: string;
  lastname?: string;
  gender?: 'man' | 'woman' | null;
  birthdate?: string | null;
}
export interface PlayerUpdate {
  pk: number;
  nickname?: string;
  name?: string;
  lastname?: string;
  gender?: 'man' | 'woman' | null;
  birthdate?: string | null;
}
export interface NewMatch { tournament: number; team_one: number; team_two: number; referee_team: number; place: string }
export interface RefereeFeedbackInput { pk?: number; match: number; feedback: RefereeFeedbackContent }
```

- `endpoints.ts` (all writes use `method: 'POST'` with `body`, except remove):

```ts
const pk = async (p: Promise<number | string>) => Number(await p);

export const addTeam = (t: NewTeam) => pk(api<number>('add_team', { method: 'POST', body: t }));
export const addTeamOnTournament = (r: NewRegistration) =>
  pk(api<number>('add_team_on_tournament', { method: 'POST', body: r }));
export const addPlayer = (p: NewPlayer) => pk(api<number>('add_player', { method: 'POST', body: p }));
export const addAttendance = (v: { player: number; team: number }) =>
  api<string>('add_attendance', { method: 'POST', body: v });
// Backend URL pattern contains a literal "(": remove_attendance/<player>-(<team>
export const removeAttendance = (v: { player: number; team: number }) =>
  api<string>(`remove_attendance/${v.player}-(${v.team}`, { method: 'DELETE' });
export const setCaptain = (v: { player: number; team: number }) =>
  api<string>('set_captain', { method: 'POST', body: v });
export const setDefaultGoalie = (v: { player: number; team: number }) =>
  api<string>('set_default_goalie', { method: 'POST', body: v });
export const savePlayer = (p: PlayerUpdate) => api<string>('save_player', { method: 'POST', body: p });
export const addMatch = (m: NewMatch) => pk(api<number>('add_match', { method: 'POST', body: m }));
export const pairUser = (token: string) =>
  api<PlayerDto>(`pair_user/${encodeURIComponent(token)}`, { method: 'POST', body: {} });
export const createPairingRequest = (v: { player: number; text: string }) =>
  api<string>(`create_pairing_request/${v.player}`, { method: 'POST', body: { text: v.text } });
export const getRefereeFeedbacks = (tournament: number, signal?: AbortSignal) =>
  api<RefereeMatchDto[]>(`get_referee_feedbacks/${tournament}`, { signal });
export const saveRefereeFeedback = (f: RefereeFeedbackInput) =>
  pk(api<number>('save_referee_feedback', { method: 'POST', body: f }));
```

- `data.ts`: `useMatches(pk: number, opts: { refetchInterval?: number | false } = {})`; `dataKeys.refereeFeedbacks(pk)`; `useRefereeFeedbacks(pk: number)` (`staleTime: 0`).
- `paths.ts`: `recordPath(t)`, `livePath(t)`, `registerPath(t)`, `rosterPath(t, tot)`, `matchPath(t, m, edit = false)`, `refereeFeedbackPath(t)` → `/tournaments/${t}/record|live|register`, `/tournaments/${t}/teams/${tot}`, `/tournaments/${t}/matches/${m}[/edit]`, `/tournaments/${t}/referee-feedback`.
- `age.ts`: `computeAge(birthdate: string | null | undefined, today = new Date()): number | null` — exact years by month/day like the server; null for empty/invalid.
- `mutations.ts`:

```ts
import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as ep from '../api/endpoints';
import { userQueryKey } from '../auth/user';
import { dataKeys } from './data';

function useWrite<V, R>(fn: (v: V) => Promise<R>, opts: { invalidate: (v: V, r: R) => QueryKey[]; success?: string }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (r, v) => {
      for (const key of opts.invalidate(v, r)) void qc.invalidateQueries({ queryKey: key });
      if (opts.success) toast.success(opts.success);
    },
  });
}

export const useAddTeam = () => useWrite(ep.addTeam, { invalidate: () => [], success: 'Tým vytvořen.' });
export const useRegisterTeam = () =>
  useWrite(ep.addTeamOnTournament, {
    invalidate: (v) => [dataKeys.tots, dataKeys.emptyTournaments, dataKeys.tournament(v.tournament)],
    success: 'Tým přihlášen.',
  });
export const useAddPlayer = () => useWrite(ep.addPlayer, { invalidate: () => [dataKeys.players], success: 'Hráč vytvořen.' });
export const useAddAttendance = () => useWrite(ep.addAttendance, { invalidate: () => [dataKeys.tots], success: 'Hráč přidán.' });
export const useRemoveAttendance = () =>
  useWrite(ep.removeAttendance, { invalidate: () => [dataKeys.tots], success: 'Hráč odebrán.' });
export const useSetCaptain = () => useWrite(ep.setCaptain, { invalidate: () => [dataKeys.tots], success: 'Uloženo.' });
export const useSetDefaultGoalie = () =>
  useWrite(ep.setDefaultGoalie, { invalidate: () => [dataKeys.tots], success: 'Uloženo.' });
export const useSavePlayer = () =>
  useWrite(ep.savePlayer, { invalidate: () => [dataKeys.players, userQueryKey], success: 'Uloženo.' });
export const useAddMatch = () =>
  useWrite(ep.addMatch, { invalidate: (v) => [dataKeys.matches(v.tournament)], success: 'Zápas vytvořen.' });
export const useCreatePairingRequest = () =>
  useWrite(ep.createPairingRequest, { invalidate: () => [], success: 'Žádost o spárování odeslána.' });
export const useSaveRefereeFeedback = (tournament: number) =>
  useWrite(ep.saveRefereeFeedback, {
    invalidate: () => [dataKeys.refereeFeedbacks(tournament)],
    success: 'Hodnocení uloženo.',
  });

/** Pairing changes the user's permissions, so everything is refetched. */
export function usePairUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ep.pairUser,
    onSuccess: () => {
      void qc.invalidateQueries();
      toast.success('Účet spárován.');
    },
  });
}
```

- [ ] **Step 1: Failing tests**

`src/domain/age.test.ts`:

```ts
import { expect, test } from 'vitest';
import { computeAge } from './age';

test('computeAge counts full years by month and day', () => {
  const today = new Date(2025, 5, 15);
  expect(computeAge('2000-06-15', today)).toBe(25);
  expect(computeAge('2000-06-16', today)).toBe(24);
  expect(computeAge('', today)).toBeNull();
  expect(computeAge('junk', today)).toBeNull();
  expect(computeAge(null, today)).toBeNull();
});
```

Append to `src/api/client.test.ts`:

```ts
test('HTML error body becomes a generic message', async () => {
  respond(404, '<!doctype html><title>Not Found</title>');
  const err = (await api('x').catch((e) => e)) as ApiError;
  expect(err.status).toBe(404);
  expect(err.message).toBe('Požadavek se nezdařil.');
});
```

`src/queries/mutations.test.tsx`:

```tsx
import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createQueryClient } from '../queryClient';
import { dataKeys } from './data';
import { useAddMatch, useRemoveAttendance, useRegisterTeam } from './mutations';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const fetchMock = vi.fn();
beforeEach(() => vi.stubGlobal('fetch', fetchMock));
afterEach(() => fetchMock.mockReset());

function setup() {
  const qc = createQueryClient(null);
  const spy = vi.spyOn(qc, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  return { spy, wrapper };
}

test('register team returns new pk, invalidates lists and toasts', async () => {
  fetchMock.mockResolvedValueOnce(new Response('123', { status: 200 }));
  const { spy, wrapper } = setup();
  const { result } = renderHook(() => useRegisterTeam(), { wrapper });
  let pk = 0;
  await act(async () => {
    pk = await result.current.mutateAsync({
      tournament: 5, team: 7, contact_mail: 'a@b.cz', contact_phone: '1', strength: 2,
    });
  });
  expect(pk).toBe(123);
  expect(spy).toHaveBeenCalledWith({ queryKey: dataKeys.tots });
  expect(spy).toHaveBeenCalledWith({ queryKey: dataKeys.tournament(5) });
  expect(toast.success).toHaveBeenCalledWith('Tým přihlášen.');
});

test('remove attendance uses the literal "(" URL and DELETE', async () => {
  fetchMock.mockResolvedValueOnce(new Response('OK', { status: 200 }));
  const { wrapper } = setup();
  const { result } = renderHook(() => useRemoveAttendance(), { wrapper });
  await act(() => result.current.mutateAsync({ player: 12, team: 34 }));
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe('/api_frontend/remove_attendance/12-(34');
  expect(init.method).toBe('DELETE');
});

test('add match invalidates that tournament matches', async () => {
  fetchMock.mockResolvedValueOnce(new Response('77', { status: 200 }));
  const { spy, wrapper } = setup();
  const { result } = renderHook(() => useAddMatch(), { wrapper });
  await act(() => result.current.mutateAsync({ tournament: 5, team_one: 1, team_two: 2, referee_team: 3, place: '1' }));
  expect(spy).toHaveBeenCalledWith({ queryKey: dataKeys.matches(5) });
});
```

Run → FAIL.

- [ ] **Step 2: Implement** everything listed in Interfaces (types appended; `NewTeam`… exported from `types.ts`; import them in `endpoints.ts`).

- [ ] **Step 3: Verify** — `npm test && npm run typecheck && npm run lint` → PASS.

- [ ] **Step 4: Commit** — `git add src` then `git commit -m "feat: write endpoints, mutation hooks, paths and computeAge"`

---

### Task 3: Shared form components

**Files:**
- Create: `src/components/forms/GenderSelect.tsx`, `src/components/forms/BirthdateAgeInput.tsx`, `src/components/forms/PlayerCombobox.tsx`, `src/components/forms/forms.test.tsx`

**Interfaces:**
- `GenderSelect({ value, onChange, id }: { value: 'man' | 'woman' | null; onChange: (v: 'man' | 'woman' | null) => void; id?: string })` — `<select className="input">` with options `----` (''), `muž` (man), `žena` (woman).
- `BirthdateAgeInput({ value, onChange, idPrefix }: { value: string; onChange: (v: string) => void; idPrefix: string })` — two fields side by side: "Datum narození" (`type="date"`, id `${idPrefix}-birthdate`) and "Věk" (disabled input showing `computeAge(value) ?? ''`, id `${idPrefix}-age`). Labels linked via `htmlFor`.
- `PlayerCombobox({ players, value, onChange, label, exclude }: { players: PlayerVM[]; value: PlayerVM | null; onChange: (p: PlayerVM | null) => void; label: string; exclude?: Set<number> })` — Headless UI `Combobox`; input `aria-label={label}` placeholder "hledat hráče..."; options filtered by `searchKey(query)` substring of `player.search` (nickname) **or** `searchKey(player.full_name)`, excluding `exclude` pks, max 20 shown, sorted by `full_name` (cs); option label `full_name`; when query is empty show nothing (no list of thousands).

- [ ] **Step 1: Failing tests** — `src/components/forms/forms.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { expect, test } from 'vitest';
import { buildGraph, type PlayerVM } from '../../domain/graph';
import { sampleRaw } from '../../test/fixtures';
import BirthdateAgeInput from './BirthdateAgeInput';
import GenderSelect from './GenderSelect';
import PlayerCombobox from './PlayerCombobox';

test('GenderSelect maps values', async () => {
  function Harness() {
    const [v, setV] = useState<'man' | 'woman' | null>(null);
    return (
      <>
        <GenderSelect value={v} onChange={setV} />
        <output>{String(v)}</output>
      </>
    );
  }
  render(<Harness />);
  await userEvent.selectOptions(screen.getByRole('combobox'), 'žena');
  expect(screen.getByRole('status')).toHaveTextContent('woman');
});

test('BirthdateAgeInput shows computed age', () => {
  render(<BirthdateAgeInput value="2000-01-01" onChange={() => {}} idPrefix="p" />);
  expect(screen.getByLabelText('Datum narození')).toHaveValue('2000-01-01');
  expect(Number((screen.getByLabelText('Věk') as HTMLInputElement).value)).toBeGreaterThanOrEqual(25);
});

test('PlayerCombobox searches without diacritics and excludes pks', async () => {
  const players = buildGraph(sampleRaw()).players;
  function Harness() {
    const [p, setP] = useState<PlayerVM | null>(null);
    return (
      <>
        <PlayerCombobox players={players} value={p} onChange={setP} label="Hráč" exclude={new Set([101])} />
        <span data-testid="sel">{p?.nickname ?? ''}</span>
      </>
    );
  }
  render(<Harness />);
  const input = screen.getByRole('combobox', { name: 'Hráč' });
  await userEvent.type(input, 'pepa');
  await userEvent.click(await screen.findByRole('option', { name: /Pépa/ }));
  expect(screen.getByTestId('sel')).toHaveTextContent('Pépa');
  await userEvent.clear(input);
  await userEvent.type(input, 'jana');
  expect(screen.queryByRole('option')).not.toBeInTheDocument();
});
```

(`<output>` has implicit role `status`.) Run → FAIL.

- [ ] **Step 2: Implement** the three components (Headless UI v2 `Combobox`, `ComboboxInput`, `ComboboxOptions`, `ComboboxOption`; `displayValue={(p) => p?.full_name ?? ''}`; `onClose` resets query).

- [ ] **Step 3: Verify** — `npm test && npm run typecheck && npm run lint` → PASS.

- [ ] **Step 4: Commit** — `git add src` then `git commit -m "feat: gender, birthdate and player combobox form components"`

---

### Task 4: Tournament record hub (+ add-match dialog)

**Files:**
- Create: `src/pages/TournamentRecordPage.tsx`, `src/pages/TournamentRecordPage.test.tsx`
- Modify: `src/router.tsx` (route `tournaments/:id/record`, keep `RequireAuth level="authorized"` wrapper)

**Behaviour (R§3.1):**
- Data: `useTournament(id)` (fresh flags), `useGraph()` (TOTs), `useMatches(id)`, `useUser()`. Spinner until tournament + graph + matches loaded; errors → `ErrorBox` with retry.
- If `tournament.closed_edit && !isStaff(user)` → `<Navigate replace to={tournamentResultsPath(id)} />`.
- Layout: `BackLink fallback={tournamentResultsPath(id)}`; right buttons (links styled `btn btn-secondary text-sm`), visual order: "Hodnocení rozhodčích" (`refereeFeedbackPath`), "Divácký pohled" (`livePath`), "Statistiky" (`tournamentResultsPath`), "Skupiny" (`/tournaments/:id/groups`); centered `<h1 className="text-3xl">{full_name}</h1>`; `<hr>`.
- Matches section only if `is_tournament_open || isStaff(user)`: `<h3>Zápasy</h3>`, button "+ Nový zápas" (opens dialog); grid `md:grid-cols-2 gap-4` with one panel per field `1..field_count` (`<section>` with `<h4>Hřiště {n}</h4>`), plus a panel `<h4>Bez hřiště</h4>` for matches whose `place` is not one of `"1".."field_count"` (only rendered if non-empty). Rows sorted by pk, numbered per panel `1.`, `2.`…: team_one `name_pure` (right) and team_two `name_pure` (both links to `matchPath(id, m.pk, true)`), `({referee_team name_pure})`, and if `start`: `{score_one}:{score_two}` + `P` if `with_shootout`, plus ` hraje se` if `start && !end`. TOT names from `graph.totsById`.
- Registration block: if `registration_open`: link "přihlásit se na turnaj" → `registerPath(id)` + ` - do {formatDate(registration_to)}`; if `registration_scheduled`: "přihlašování začne {formatDateTime(registration_from)}".
- `<h3>Týmy</h3>`: grid `grid-cols-2 md:grid-cols-3 lg:grid-cols-4` of tournament TOTs sorted by name (cs), each link `tot.name` → `rosterPath(id, tot.pk)`.
- Add-match dialog (`Modal` title "Nový zápas"): selects "Tým 1", "Tým 2", "Rozhodčí tým" (options `----` + TOTs by name, label `tot.name`), radio group "Hřiště" (one per field number); button "Vytvořit" disabled until all four set or while pending; client-side check that the three teams differ → inline red text "Některý z vybraných týmů se shoduje." (no request). On success: close, reset; if `is_tournament_open` navigate to `matchPath(id, newPk, true)`.

- [ ] **Step 1: Failing tests** — `src/pages/TournamentRecordPage.test.tsx`:

```tsx
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router';
import { expect, test } from 'vitest';
import { matchDto, t1 } from '../test/fixtures';
import { mockGraphApi, renderWithProviders, testUser } from '../test/utils';
import TournamentRecordPage from './TournamentRecordPage';

function Loc() {
  return <div data-testid="loc">{useLocation().pathname}</div>;
}

const openT1 = { ...t1, is_tournament_open: true, closed_edit: false, field_count: 2, registration_open: true, registration_to: '2023-06-09' };
const matches = [
  matchDto({ pk: 500, place: '1', score_one: 3, score_two: 1, start: '2023-06-10 09:00:00+00:00', end: '2023-06-10 09:20:00+00:00' }),
  matchDto({ pk: 501, place: '2', team_one: 1001, team_two: 1000, start: '2023-06-10 09:30:00+00:00', score_one: 1, score_two: 0 }),
  matchDto({ pk: 502, place: null }),
];

const render = (tournament = openT1, user = testUser({ is_authorized: true })) => {
  const fetchMock = mockGraphApi({ 'tournament/1': tournament, 'matchs?tournament=1': matches, add_match: 999 });
  renderWithProviders(
    <>
      <TournamentRecordPage />
      <Loc />
    </>,
    { route: '/tournaments/1/record', path: '/tournaments/:id/record', user },
  );
  return fetchMock;
};

test('matches grouped by field with no-field panel, scores and running state', async () => {
  render();
  const field1 = (await screen.findByRole('heading', { name: 'Hřiště 1' })).closest('section')!;
  expect(field1).toHaveTextContent('1.');
  expect(field1).toHaveTextContent('3:1');
  const field2 = screen.getByRole('heading', { name: 'Hřiště 2' }).closest('section')!;
  expect(field2).toHaveTextContent('hraje se');
  expect(within(field2).getAllByRole('link')[0]).toHaveAttribute('href', '/tournaments/1/matches/501/edit');
  expect(screen.getByRole('heading', { name: 'Bez hřiště' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'přihlásit se na turnaj' })).toHaveAttribute('href', '/tournaments/1/register');
  expect(screen.getByRole('link', { name: 'Kométa' })).toHaveAttribute('href', '/tournaments/1/teams/1001');
});

test('closed_edit redirects non-staff to results', async () => {
  render({ ...openT1, closed_edit: true });
  await screen.findByTestId('loc');
  expect(await screen.findByText('/tournaments/1/results')).toBeInTheDocument();
});

test('add match dialog rejects duplicate teams without a request', async () => {
  const fetchMock = render();
  await userEvent.click(await screen.findByRole('button', { name: /Nový zápas/ }));
  const dialog = await screen.findByRole('dialog');
  await userEvent.selectOptions(within(dialog).getByLabelText('Tým 1'), '1000');
  await userEvent.selectOptions(within(dialog).getByLabelText('Tým 2'), '1000');
  await userEvent.selectOptions(within(dialog).getByLabelText('Rozhodčí tým'), '1001');
  await userEvent.click(within(dialog).getByLabelText('1'));
  await userEvent.click(within(dialog).getByRole('button', { name: 'Vytvořit' }));
  expect(within(dialog).getByText('Některý z vybraných týmů se shoduje.')).toBeInTheDocument();
  expect(fetchMock.mock.calls.some(([u]) => String(u).endsWith('add_match'))).toBe(false);
});
```

The fixture tournament t1 has only two TOTs (1000, 1001), so the success path adds a third TOT:

```tsx
test('add match success navigates to match edit', async () => {
  const raw = sampleRaw();
  const tots = [...raw.tots, totDto({ pk: 1004, team: teamDto({ pk: 12, name: 'Třetí' }), tournament: t1 })];
  mockGraphApi({ teamontournaments: tots, 'tournament/1': openT1, 'matchs?tournament=1': matches, add_match: 999 });
  renderWithProviders(
    <>
      <TournamentRecordPage />
      <Loc />
    </>,
    { route: '/tournaments/1/record', path: '/tournaments/:id/record', user: testUser({ is_authorized: true }) },
  );
  await userEvent.click(await screen.findByRole('button', { name: /Nový zápas/ }));
  const dialog = await screen.findByRole('dialog');
  await userEvent.selectOptions(within(dialog).getByLabelText('Tým 1'), '1000');
  await userEvent.selectOptions(within(dialog).getByLabelText('Tým 2'), '1001');
  await userEvent.selectOptions(within(dialog).getByLabelText('Rozhodčí tým'), '1004');
  await userEvent.click(within(dialog).getByLabelText('2'));
  await userEvent.click(within(dialog).getByRole('button', { name: 'Vytvořit' }));
  expect(await screen.findByText('/tournaments/1/matches/999/edit')).toBeInTheDocument();
});
```

(import `sampleRaw`, `teamDto`, `totDto` from fixtures; `mockApi` matches POST paths too — the mocked `add_match` returns `999`.)

Run → FAIL.

- [ ] **Step 2: Implement** the page; replace the route placeholder element (inside `RequireAuth level="authorized"`).

- [ ] **Step 3: Verify** — `npm test && npm run typecheck && npm run lint` → PASS.

- [ ] **Step 4: Commit** — `git add src` then `git commit -m "feat: tournament record hub with add-match dialog"`

---

### Task 5: Live view

**Files:**
- Create: `src/pages/TournamentLivePage.tsx`, `src/pages/TournamentLivePage.test.tsx`
- Modify: `src/router.tsx` (route `tournaments/:id/live`, public)

**Behaviour (R§3.2, old bugs fixed):** public; never redirects. `useTournament(id)`, `useGraph()`, `useMatches(id, { refetchInterval: live ? 15_000 : false })` where `live` is a checkbox state "živě" (default **checked**, `aria-label="živě"`). Show matches data even if a background refetch failed (ErrorBox only when no data).
- Layout: `BackLink fallback={tournamentResultsPath(id)}`; right buttons "Skupiny", "Statistiky" (results), "Správa turnaje" (`recordPath`); the "živě" checkbox; `<h1>`; three `<section>`s with `<h4>`: "Probíhající zápasy" (start && !end), "Ukončené zápasy" (end), "Budoucí zápasy" (!start), each sorted pk desc; empty sections show "—" in gray. Row: `place`, team_one / team_two `name_pure` links → `matchPath(id, pk)` (view), if start `a:b` (+`P`), if ongoing `hraje se`, `({referee_team name_pure})`.

- [ ] **Step 1: Failing tests** — `src/pages/TournamentLivePage.test.tsx`:

```tsx
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { matchDto, t1 } from '../test/fixtures';
import { mockGraphApi, renderWithProviders } from '../test/utils';
import TournamentLivePage from './TournamentLivePage';

const matches = [
  matchDto({ pk: 500, place: '1', start: 's', end: 'e', score_one: 3, score_two: 1 }),
  matchDto({ pk: 501, place: '2', start: 's', score_one: 1, score_two: 0 }),
  matchDto({ pk: 502, place: '1' }),
];

const render = () =>
  renderWithProviders(<TournamentLivePage />, { route: '/tournaments/1/live', path: '/tournaments/:id/live' });

test('matches split by state, links to view page, refresh on by default', async () => {
  mockGraphApi({ 'tournament/1': { ...t1, closed_edit: true }, 'matchs?tournament=1': matches });
  render();
  const ongoing = (await screen.findByRole('heading', { name: 'Probíhající zápasy' })).closest('section')!;
  expect(ongoing).toHaveTextContent('hraje se');
  const ended = screen.getByRole('heading', { name: 'Ukončené zápasy' }).closest('section')!;
  expect(ended).toHaveTextContent('3:1');
  const future = screen.getByRole('heading', { name: 'Budoucí zápasy' }).closest('section')!;
  expect(future.querySelector('a')).toHaveAttribute('href', '/tournaments/1/matches/502');
  expect(screen.getByRole('checkbox', { name: 'živě' })).toBeChecked();
  await userEvent.click(screen.getByRole('checkbox', { name: 'živě' }));
  expect(screen.getByRole('checkbox', { name: 'živě' })).not.toBeChecked();
});
```

Run → FAIL.

- [ ] **Step 2: Implement**; replace the route placeholder.

- [ ] **Step 3: Verify** — `npm test && npm run typecheck && npm run lint` → PASS.

- [ ] **Step 4: Commit** — `git add src` then `git commit -m "feat: live tournament view with auto refresh"`

---

### Task 6: Registration (+ new team dialog)

**Files:**
- Create: `src/pages/RegistrationPage.tsx`, `src/pages/RegistrationPage.test.tsx`
- Modify: `src/router.tsx` (route `tournaments/:id/register`, keep `RequireAuth level="authorized"`)

**Behaviour (R§3.3):** centered `max-w-xl`. `useTournament(id)` + `useGraph()`.
- If `registration_scheduled`: "Přihlašování na turnaj začne {formatDateTime(registration_from)}." If neither open nor scheduled: "Přihlašování na turnaj bylo již uzavřeno."
- If open: `<h3>{full_name}</h3>`; form:
  - "Tým" select (`----` + teams from `graph.teams` plus teams created in this page session, sorted by name cs, label `team.name`) and link-button "vytvořit nový tým" (opens dialog).
  - "Jméno na tomto turnaji (pouze pokud se liší od běžného jména týmu)" (placeholder = selected team name) → `name` (omit when empty).
  - "Zkrácené jméno na tomto turnaji (pouze pokud se liší od běžného zkráceného jména týmu)" (placeholder = team `name_short`) → `name_short` (omit when empty).
  - "Kontaktní email" (`type="email"`, required), "Kontaktní telefon" (required), "Odhad síly (1 - 4)" (`type="number"`, min 1, max 4, required) + ordered list: 1. Budeme na bedně 2. Budeme ve finálové skupině (top 8) 3. Budeme kolem poloviny 4. Přišli jsme si jen zahrát, na nějaké umístění to nevidíme.
  - "Přihlásit" disabled unless team selected, email valid (`input.validity.valid` / simple regex), phone non-empty, strength integer 1–4, or while pending.
  - Success → navigate to `rosterPath(id, newTotPk)`.
- New team dialog (`Modal` "Nový tým"): "Jméno" (required), "Zkrácené jméno" (placeholder "nepovinné, např. (JZM, DIK, DvT, ...)"), "Popis (volitelné)" textarea; "Vytvořit" disabled without name; on success add `{ pk, name, name_short }` to the local list and select it.

- [ ] **Step 1: Failing tests** — `src/pages/RegistrationPage.test.tsx`:

```tsx
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router';
import { expect, test } from 'vitest';
import { t3 } from '../test/fixtures';
import { mockGraphApi, renderWithProviders, testUser } from '../test/utils';
import RegistrationPage from './RegistrationPage';

function Loc() {
  return <div data-testid="loc">{useLocation().pathname}</div>;
}

const open = { ...t3, registration_open: true, registration_to: '2025-01-10' };

const render = (tournament = open) => {
  const fetchMock = mockGraphApi({ 'tournament/3': tournament, add_team: 55, add_team_on_tournament: 1234 });
  renderWithProviders(
    <>
      <RegistrationPage />
      <Loc />
    </>,
    { route: '/tournaments/3/register', path: '/tournaments/:id/register', user: testUser({ is_authorized: true }) },
  );
  return fetchMock;
};

test('closed registration message', async () => {
  render({ ...t3, registration_open: false, registration_scheduled: false });
  expect(await screen.findByText('Přihlašování na turnaj bylo již uzavřeno.')).toBeInTheDocument();
});

test('register existing team and go to roster', async () => {
  const fetchMock = render();
  await userEvent.selectOptions(await screen.findByLabelText('Tým'), '10');
  const submit = screen.getByRole('button', { name: 'Přihlásit' });
  expect(submit).toBeDisabled();
  await userEvent.type(screen.getByLabelText('Kontaktní email'), 'a@b.cz');
  await userEvent.type(screen.getByLabelText('Kontaktní telefon'), '123');
  await userEvent.type(screen.getByLabelText('Odhad síly (1 - 4)'), '2');
  await userEvent.click(submit);
  expect(await screen.findByText('/tournaments/3/teams/1234')).toBeInTheDocument();
  const call = fetchMock.mock.calls.find(([u]) => String(u).endsWith('add_team_on_tournament'))!;
  expect(JSON.parse(call[1].body)).toEqual({ tournament: 3, team: 10, contact_mail: 'a@b.cz', contact_phone: '123', strength: 2 });
});

test('create new team selects it', async () => {
  render();
  await userEvent.click(await screen.findByRole('button', { name: 'vytvořit nový tým' }));
  const dialog = await screen.findByRole('dialog');
  await userEvent.type(within(dialog).getByLabelText('Jméno'), 'Nováčci');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Vytvořit' }));
  expect(await screen.findByRole('option', { name: 'Nováčci', selected: true })).toBeInTheDocument();
});
```

Run → FAIL.

- [ ] **Step 2: Implement**; replace the route placeholder.

- [ ] **Step 3: Verify** — `npm test && npm run typecheck && npm run lint` → PASS.

- [ ] **Step 4: Commit** — `git add src` then `git commit -m "feat: team registration page with new team dialog"`

---

### Task 7: Roster page (+ new player dialog)

**Files:**
- Create: `src/pages/RosterPage.tsx`, `src/pages/RosterPage.test.tsx`
- Modify: `src/router.tsx` (route `tournaments/:id/teams/:totId`, keep authorized wrapper)

**Behaviour (R§3.4):** `useGraph()`; `tot = graph.totsById.get(totId)` with `tot.tournament.pk === id`, else "Tým nenalezen." alert.
- Link "‹ zpět" → `recordPath(id)` (not history). `<h1>{tournament full_name} - {tot.name}</h1>`. Single column `max-w-xl`.
- `<h3>Hráči</h3>`: `PlayerCombobox` (label "Hráč", excluding current roster) + button "Přidat" (disabled without selection or while pending) → `useAddAttendance({ player, team: tot.pk })`, then clear selection. Link-button "Nový hráč" opens dialog.
- Roster list sorted by `full_name` (cs): button "×" (`aria-label="Odebrat {nickname}"`) → `window.confirm('Opravdu odebrat hráče {nickname} z týmu?')` → `useRemoveAttendance`; `PlayerLink`.
- `<h3>Kapitán</h3>` select (`----` + roster, preselected `tot.captain`) + button "Nastavit" (disabled when nothing selected) → `useSetCaptain`. `<h3>Výchozí brankář</h3>` same with `tot.default_goalie` → `useSetDefaultGoalie`. (Labels: selects `aria-label` "Kapitán" / "Výchozí brankář".)
- New player dialog (`Modal` "Nový hráč"): hint "Ujisti se prosím, že hráč určitě není v systému."; "Přezdívka" (placeholder "povinné") + `GenderSelect` (label "Pohlaví"); "Jméno", "Příjmení"; `BirthdateAgeInput`; italic "Datum narození nebude zveřejňováno (pouze jako věk)."; "Vytvořit" disabled without nickname. On success: `useAddAttendance({ player: newPk, team: tot.pk })`, close, reset.

- [ ] **Step 1: Failing tests** — `src/pages/RosterPage.test.tsx`:

```tsx
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { mockGraphApi, renderWithProviders, testUser } from '../test/utils';
import RosterPage from './RosterPage';

const render = () => {
  const fetchMock = mockGraphApi({ add_attendance: 'OK', 'remove_attendance/101-(1000': 'OK', set_captain: 'OK', add_player: 321 });
  renderWithProviders(<RosterPage />, {
    route: '/tournaments/1/teams/1000',
    path: '/tournaments/:id/teams/:totId',
    user: testUser({ is_authorized: true }),
  });
  return fetchMock;
};

const bodyOf = (fetchMock: ReturnType<typeof render>, suffix: string) =>
  JSON.parse(fetchMock.mock.calls.find(([u]) => String(u).endsWith(suffix))![1].body);

test('shows roster, adds a player via combobox', async () => {
  const fetchMock = render();
  expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Brno 2023 - Ufo');
  expect(screen.getByRole('link', { name: /Pépa/ })).toBeInTheDocument();
  await userEvent.type(screen.getByRole('combobox', { name: 'Hráč' }), 'karel');
  await userEvent.click(await screen.findByRole('option', { name: /Karel/ }));
  await userEvent.click(screen.getByRole('button', { name: 'Přidat' }));
  expect(bodyOf(fetchMock, 'add_attendance')).toEqual({ player: 102, team: 1000 });
});

test('remove asks for confirmation', async () => {
  const fetchMock = render();
  const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
  await userEvent.click(await screen.findByRole('button', { name: 'Odebrat Jana' }));
  expect(fetchMock.mock.calls.some(([u]) => String(u).includes('remove_attendance'))).toBe(false);
  await userEvent.click(screen.getByRole('button', { name: 'Odebrat Jana' }));
  expect(confirm).toHaveBeenCalledTimes(2);
  expect(fetchMock.mock.calls.some(([u]) => String(u).endsWith('remove_attendance/101-(1000'))).toBe(true);
});

test('set captain sends selected player', async () => {
  const fetchMock = render();
  await userEvent.selectOptions(await screen.findByLabelText('Kapitán'), '101');
  await userEvent.click(screen.getAllByRole('button', { name: 'Nastavit' })[0]);
  expect(bodyOf(fetchMock, 'set_captain')).toEqual({ player: 101, team: 1000 });
});

test('new player is created and added to roster', async () => {
  const fetchMock = render();
  await userEvent.click(await screen.findByRole('button', { name: 'Nový hráč' }));
  const dialog = await screen.findByRole('dialog');
  await userEvent.type(within(dialog).getByLabelText('Přezdívka'), 'Nováček');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Vytvořit' }));
  await waitFor(() => expect(fetchMock.mock.calls.some(([u]) => String(u).endsWith('add_attendance'))).toBe(true));
  expect(bodyOf(fetchMock, 'add_player')).toMatchObject({ nickname: 'Nováček' });
  expect(bodyOf(fetchMock, 'add_attendance')).toEqual({ player: 321, team: 1000 });
});
```

Run → FAIL.

- [ ] **Step 2: Implement**; replace the route placeholder.

- [ ] **Step 3: Verify** — `npm test && npm run typecheck && npm run lint` → PASS.

- [ ] **Step 4: Commit** — `git add src` then `git commit -m "feat: roster page with player combobox and new player dialog"`

---

### Task 8: Player page — edit, attendance, pairing request

**Files:**
- Modify: `src/pages/PlayerPage.tsx`, `src/pages/players.test.tsx`
- Create: `src/pages/PlayerEditForm.tsx`, `src/pages/PlayerPairingDialog.tsx`

**Behaviour (R§3.5, bugs fixed):** `canEdit = isStaff(user) || isOwnPlayer(user, player.pk)`.
- Header right: if `canEdit` and not editing → button "upravit profil"; if `user && !user.player && !player.is_paired` → button "spárovat" opens `PlayerPairingDialog`.
- `PlayerEditForm` (replaces header details while editing): local state initialized from the player; fields "Přezdívka", "Jméno", "Příjmení", `GenderSelect` ("Pohlaví"), `BirthdateAgeInput`; for non-staff (birthdate never received) the date input starts empty with hint "Datum narození vyplň jen pokud ho chceš změnit."; italic "Datum narození nebude nikde zveřejňováno (pouze jako věk)."; buttons "Uložit" and "zrušit změny" (discards local state). Save sends `{ pk, nickname, name, lastname, gender }` plus `birthdate` **only if the date field was changed** (empty → `null`). Success → leave edit mode.
- Tournaments table: extra last column (when `canEdit`) with "×" button `aria-label="Smazat účast {tournament full_name}"` → `window.confirm('Opravdu chcete smazat tuto účast na turnaji?')` → `useRemoveAttendance({ player: pk, team: tot.pk })`.
- Historical attendance (only when `canEdit`): `<h4>Přidávání historických turnajů</h4>`; select "Turnaj" (`----` + all `graph.tournaments` by date desc, label `full_name`) → select "Tým" (`----` + selected tournament's TOTs by name, label `tot.name`) → button "přidat" (disabled until both chosen) → `useAddAttendance`.
- `PlayerPairingDialog` (`Modal` "Spárovat s hráčem"): textarea labelled "Nějaké dodatečné informace pro spárování s hráčem? Třeba odkaz někam, kde je tvoje jméno i fotka."; "Odeslat žádost" → `useCreatePairingRequest({ player: pk, text })` → close; "Zrušit" closes without request.
- Fix the existing text "golů a assistencí" → "gólů a asistencí" (update the existing test expectation accordingly).

- [ ] **Step 1: Failing tests** — append to `src/pages/players.test.tsx` (keep existing tests; update the "golů a assistencí" assertion to "gólů a asistencí"):

```tsx
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { testUser } from '../test/utils';

const ownUser = testUser({ is_authorized: true, player: { pk: 100, name: 'Josef', lastname: 'Novák', nickname: 'Pépa', age: 30, full_name: 'Pépa - Josef Novák', gender: 'man', is_paired: true } });

test('owner edits profile without sending birthdate', async () => {
  const fetchMock = mockGraphApi({ save_player: 'OK' });
  renderWithProviders(<PlayerPage />, { route: '/players/100/Pepa', path: '/players/:id/:slug?', user: ownUser });
  await userEvent.click(await screen.findByRole('button', { name: 'upravit profil' }));
  const nick = screen.getByLabelText('Přezdívka');
  await userEvent.clear(nick);
  await userEvent.type(nick, 'Pepík');
  await userEvent.click(screen.getByRole('button', { name: 'Uložit' }));
  const call = fetchMock.mock.calls.find(([u]) => String(u).endsWith('save_player'))!;
  const body = JSON.parse(call[1].body);
  expect(body).toMatchObject({ pk: 100, nickname: 'Pepík' });
  expect('birthdate' in body).toBe(false);
});

test('other users see no edit controls; unpaired user can request pairing', async () => {
  const fetchMock = mockGraphApi({ 'create_pairing_request/102': 'OK' });
  renderWithProviders(<PlayerPage />, { route: '/players/102/Karel', path: '/players/:id/:slug?', user: testUser() });
  await screen.findByRole('heading', { name: 'Karel' });
  expect(screen.queryByRole('button', { name: 'upravit profil' })).not.toBeInTheDocument();
  expect(screen.queryByText('Přidávání historických turnajů')).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'spárovat' }));
  await userEvent.type(screen.getByLabelText(/dodatečné informace/), 'odkaz');
  await userEvent.click(screen.getByRole('button', { name: 'Odeslat žádost' }));
  const call = fetchMock.mock.calls.find(([u]) => String(u).endsWith('create_pairing_request/102'))!;
  expect(JSON.parse(call[1].body)).toEqual({ text: 'odkaz' });
});

test('owner removes attendance after confirm and adds historical attendance', async () => {
  const fetchMock = mockGraphApi({ 'remove_attendance/100-(1002': 'OK', add_attendance: 'OK' });
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  renderWithProviders(<PlayerPage />, { route: '/players/100/Pepa', path: '/players/:id/:slug?', user: ownUser });
  await userEvent.click(await screen.findByRole('button', { name: 'Smazat účast Nížkov 2024' }));
  expect(fetchMock.mock.calls.some(([u]) => String(u).endsWith('remove_attendance/100-(1002'))).toBe(true);
  await userEvent.selectOptions(screen.getByLabelText('Turnaj'), '1');
  await userEvent.selectOptions(screen.getByLabelText('Tým'), '1001');
  await userEvent.click(screen.getByRole('button', { name: 'přidat' }));
  const call = fetchMock.mock.calls.find(([u]) => String(u).endsWith('add_attendance'))!;
  expect(JSON.parse(call[1].body)).toEqual({ player: 100, team: 1001 });
});
```

Run → FAIL.

- [ ] **Step 2: Implement** the form, dialog and page changes.

- [ ] **Step 3: Verify** — `npm test && npm run typecheck && npm run lint` → PASS.

- [ ] **Step 4: Commit** — `git add src` then `git commit -m "feat: player profile edit, attendance and pairing request"`

---

### Task 9: Pair account page (public)

**Files:**
- Create: `src/pages/PairAccountPage.tsx`, `src/pages/PairAccountPage.test.tsx`
- Modify: `src/router.tsx` (route `pair-account/:token?` **without** `RequireAuth`)

**Behaviour (R§3.6, bugs fixed):**
- `LS_KEY = 'ufo:pairToken'`. On mount: if URL `token` → save to localStorage (try/catch) and use it; else prefill from localStorage.
- `<h2>Párování</h2>`.
- Anonymous: "Pokud chceš spárovat tvůj účet s nějakým hráčem v systému, musíš se nejdříve přihlásit." + buttons "přes Google" / "přes Facebook" (`openSocialLogin`), "přes jméno" (opens `LoginDialog`), "registrovat" (opens `SignupDialog`).
- Logged in with player: "Tvůj účet je spárovaný s hráčem " + `PlayerLink` and nothing else.
- Logged in without player: paragraph "Před tím než budeš moci dělat akce v systému (měnit osobní informace, přihlašovat tým, zaznamenávat zápas, ...), je potřeba, aby sis svůj účet spároval s hráčem v systému. Pokud máš kód, tak ho zadej níže. Jinak se můžeš najít mezi " + link "hráči" (`/players`) + " a kliknout na „spárovat“. Pokud se nemůžeš najít nebo máš jiný problém, prosím obrať se na " + link "správce systému" (`mailto:thran@centrum.cz`) + "."; input `aria-label="kód"` placeholder "kód" + button "Spárovat" (disabled without code or pending) → `usePairUser(code)`; on success clear localStorage and navigate to `playerPath(player)`; on error also render inline red text "Spárování se nezdařilo - {error.message}" below the input (the global toast shows the same server text; both are fine).

- [ ] **Step 1: Failing tests** — `src/pages/PairAccountPage.test.tsx`:

```tsx
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router';
import { expect, test } from 'vitest';
import type { User } from '../api/types';
import { playerDto } from '../test/fixtures';
import { mockApi, renderWithProviders, testUser } from '../test/utils';
import PairAccountPage from './PairAccountPage';

function Loc() {
  return <div data-testid="loc">{useLocation().pathname}</div>;
}

const render = (route: string, user: User | null = testUser()) =>
  renderWithProviders(
    <>
      <PairAccountPage />
      <Loc />
    </>,
    { route, path: '/pair-account/:token?', user },
  );

test('anonymous visitor sees login options and token is remembered', () => {
  mockApi({});
  render('/pair-account/ABCDE', null);
  expect(screen.getByText(/musíš se nejdříve přihlásit/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Google/ })).toBeInTheDocument();
  expect(localStorage.getItem('ufo:pairToken')).toBe('ABCDE');
});

test('logged-in user pairs with remembered token, token cleared, redirected to player', async () => {
  localStorage.setItem('ufo:pairToken', 'ABCDE');
  mockApi({ 'pair_user/ABCDE': playerDto({ pk: 100, nickname: 'Pépa' }), user_profile: testUser() });
  render('/pair-account');
  expect(screen.getByRole('textbox', { name: 'kód' })).toHaveValue('ABCDE');
  await userEvent.click(screen.getByRole('button', { name: 'Spárovat' }));
  expect(await screen.findByText('/players/100/P%C3%A9pa')).toBeInTheDocument();
  expect(localStorage.getItem('ufo:pairToken')).toBeNull();
});

test('pairing error is shown inline', async () => {
  mockApi({});
  render('/pair-account/XXXXX');
  await userEvent.click(screen.getByRole('button', { name: 'Spárovat' }));
  expect(await screen.findByText(/Spárování se nezdařilo/)).toBeInTheDocument();
});
```

Run → FAIL.

- [ ] **Step 2: Implement**; update the route (no `RequireAuth`).

- [ ] **Step 3: Verify** — `npm test && npm run typecheck && npm run lint` → PASS (update `src/router.test.tsx` if it asserts that `/pair-account` requires login).

- [ ] **Step 4: Commit** — `git add src` then `git commit -m "feat: public pair account page with remembered token"`

---

### Task 10: Referee feedback page (+ StarRating)

**Files:**
- Create: `src/components/StarRating.tsx`, `src/components/StarRating.test.tsx`, `src/pages/RefereeFeedbackPage.tsx`, `src/pages/RefereeFeedbackPage.test.tsx`
- Modify: `src/router.tsx` (route `tournaments/:id/referee-feedback`, keep authorized wrapper)

**Interfaces:**
- `StarRating({ value, onChange, readOnly }: { value: number; onChange: (v: number) => void; readOnly?: boolean })` — `role="slider"`, `aria-label="Celkové hodnocení"`, `aria-valuemin=0.5`, `aria-valuemax=5`, `aria-valuenow={value}`, `aria-valuetext="{value} z 5"`, `tabIndex=0`; ArrowRight/ArrowUp +0.5, ArrowLeft/ArrowDown −0.5 (clamped 0.5–5); visual: gray "★★★★★" with a gold overlay of width `value/5*100%`; click sets `ceil(x/width*10)/2` clamped; plus buttons "−" (`aria-label="Snížit hodnocení"`) and "+" (`aria-label="Zvýšit hodnocení"`) beside it. Starting value 0 shows empty stars; first +/arrow press goes to 0.5.

**Page behaviour (R§3.7):** `useTournament(id)`, `useRefereeFeedbacks(id)`.
- `BackLink fallback={tournamentResultsPath(id)}`; button "Obnovit" (refetch); `<h1>Hodnocení rozhodčích - {full_name}</h1>`; error → `ErrorBox` (shows server text, e.g. "Nejsi v žádném týmu").
- If `tournament.closed_edit`: notice "Turnaj je uzavřený, hodnocení už nelze měnit." and links disabled (no dialog).
- One line per match (sorted by pk): `<b>{referee_team name_pure}</b>: {team_one name_pure} - {team_two name_pure} - ` + button-link "hodnotit" (no feedback) or "upravit" (has feedback, line gray).
- Dialog (`Modal` titled with referee team name): "hlavní rozhodčí: " `<b>{referee full_name}</b>` (if referee); "Pozitiva" list of text inputs (each with "×" `aria-label="Odebrat pozitivum"`) + button "Přidat pozitivum" (adds empty input and focuses it); "Negativa" same ("Přidat negativum", "Odebrat negativum"); "Komentář" textarea; "Celkové hodnocení" `StarRating`; button "Uložit" disabled while `stars === 0` or pending → `useSaveRefereeFeedback(id)({ pk: existing?.pk, match: m.pk, feedback: { stars, positives: nonEmpty, negatives: nonEmpty, comment } })` → close. Closing without saving discards local edits (state lives in the dialog).

- [ ] **Step 1: Failing tests**

`src/components/StarRating.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { expect, test } from 'vitest';
import StarRating from './StarRating';

function Harness() {
  const [v, setV] = useState(0);
  return <StarRating value={v} onChange={setV} />;
}

test('buttons and keyboard change rating in halves within bounds', async () => {
  render(<Harness />);
  const slider = screen.getByRole('slider', { name: 'Celkové hodnocení' });
  await userEvent.click(screen.getByRole('button', { name: 'Zvýšit hodnocení' }));
  expect(slider).toHaveAttribute('aria-valuenow', '0.5');
  slider.focus();
  for (let i = 0; i < 12; i++) await userEvent.keyboard('{ArrowRight}');
  expect(slider).toHaveAttribute('aria-valuenow', '5');
  await userEvent.click(screen.getByRole('button', { name: 'Snížit hodnocení' }));
  expect(slider).toHaveAttribute('aria-valuenow', '4.5');
});
```

`src/pages/RefereeFeedbackPage.test.tsx`:

```tsx
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import type { RefereeMatchDto } from '../api/types';
import { kometa, playerDto, t1, totDto, ufo, teamDto } from '../test/fixtures';
import { mockApi, renderWithProviders, testUser } from '../test/utils';
import RefereeFeedbackPage from './RefereeFeedbackPage';

const refTot = totDto({ pk: 1004, team: teamDto({ pk: 12, name: 'Rozhodčí' }), tournament: t1 });
const feedbackMatches: RefereeMatchDto[] = [
  {
    pk: 500, tournament: 1, start: 's', end: 'e', place: '1',
    team_one: totDto({ pk: 1000, team: ufo, tournament: t1 }), team_two: totDto({ pk: 1001, team: kometa, tournament: t1 }),
    referee_team: refTot, referee: playerDto({ pk: 102, nickname: 'Karel', full_name: 'Karel K' }),
  },
];

const render = (tournament = { ...t1, closed_edit: false }) => {
  const fetchMock = mockApi({ 'tournament/1': tournament, 'get_referee_feedbacks/1': feedbackMatches, save_referee_feedback: 9 });
  renderWithProviders(<RefereeFeedbackPage />, {
    route: '/tournaments/1/referee-feedback',
    path: '/tournaments/:id/referee-feedback',
    user: testUser({ is_authorized: true }),
  });
  return fetchMock;
};

test('rate a referee team', async () => {
  const fetchMock = render();
  await userEvent.click(await screen.findByRole('button', { name: 'hodnotit' }));
  const dialog = await screen.findByRole('dialog');
  expect(dialog).toHaveTextContent('hlavní rozhodčí: Karel K');
  const save = within(dialog).getByRole('button', { name: 'Uložit' });
  expect(save).toBeDisabled();
  await userEvent.click(within(dialog).getByRole('button', { name: 'Přidat pozitivum' }));
  await userEvent.keyboard('Férový');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Přidat negativum' }));
  for (let i = 0; i < 8; i++) await userEvent.click(within(dialog).getByRole('button', { name: 'Zvýšit hodnocení' }));
  await userEvent.click(save);
  const call = fetchMock.mock.calls.find(([u]) => String(u).endsWith('save_referee_feedback'))!;
  expect(JSON.parse(call[1].body)).toEqual({
    match: 500,
    feedback: { stars: 4, positives: ['Férový'], negatives: [], comment: '' },
  });
});

test('closed tournament is read-only', async () => {
  render({ ...t1, closed_edit: true });
  expect(await screen.findByText('Turnaj je uzavřený, hodnocení už nelze měnit.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'hodnotit' })).toBeDisabled();
});

test('server error text shown', async () => {
  mockApi({ 'tournament/1': t1 });
  renderWithProviders(<RefereeFeedbackPage />, {
    route: '/tournaments/1/referee-feedback',
    path: '/tournaments/:id/referee-feedback',
    user: testUser({ is_staff: true, is_authorized: true }),
  });
  expect(await screen.findByRole('alert')).toBeInTheDocument();
});
```

Run → FAIL.

- [ ] **Step 2: Implement** the component and page; replace the route placeholder.

- [ ] **Step 3: Verify** — `npm test && npm run typecheck && npm run lint && npm run build` → PASS.

- [ ] **Step 4: Commit** — `git add src` then `git commit -m "feat: referee feedback page with star rating"`

---

## Next

- Plan 4: match page (view + edit recording: timer, events, localStorage sync), including goalie_stats cache invalidation and query invalidation after match edits (carried from plan 2b).
