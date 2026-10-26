import { useQueryClient } from '@tanstack/react-query';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import { toast } from 'sonner';
import { expect, test, vi } from 'vitest';
import { API_BASE } from '../api/client';
import type { MatchDto, TournamentDto, User } from '../api/types';
import { matchDto, sampleRaw, t1 } from '../test/fixtures';
import { renderWithProviders, testUser } from '../test/utils';
import MatchRecordPage from './MatchRecordPage';

const openT1: TournamentDto = { ...t1, closed_edit: false, is_tournament_open: true, halftime_length: 10 };

const freshMatch = (o: Partial<MatchDto> = {}) =>
  matchDto({
    pk: 600,
    referee: 102,
    referee_team: 1001,
    goalies: [
      { pk: 1, goalie: 100, match: 600, start: '00:00:00', end: null },
      { pk: 2, goalie: 102, match: 600, start: '00:00:00', end: null },
    ],
    ...o,
  });

/** Graph + match API; `fail` lists paths answered with HTTP 500, `hold` delays a path until its promise resolves. */
function mockFetch(
  o: {
    tournament?: TournamentDto;
    match?: MatchDto;
    fail?: string[];
    hold?: Record<string, Promise<void>>;
  } = {},
) {
  const raw = sampleRaw();
  const tots = raw.tots.map((t) => (t.pk === 1001 ? { ...t, player_pks: [102] } : t));
  const responses: Record<string, unknown> = {
    players: raw.players,
    teamontournaments: tots,
    goals: raw.goals,
    get_empty_trournaments: raw.emptyTournaments,
    'tournament/1': o.tournament ?? openT1,
    'matchs?tournament=1': [o.match ?? freshMatch()],
    add_shot: 50,
    add_goal: 51,
    'edit_match/600': 'ok',
    'remove_shot/50': 'ok',
  };
  const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(
    async (input) => {
      const path = String(input).replace(API_BASE, '');
      if (o.hold?.[path]) await o.hold[path];
      if (o.fail?.includes(path)) return new Response('boom', { status: 500 });
      if (!(path in responses)) return new Response('not found', { status: 404 });
      return new Response(JSON.stringify(responses[path]), { status: 200 });
    },
  );
  vi.stubGlobal('fetch', fetchMock);
  return Object.assign(fetchMock, { responses });
}

const callsOf = (fetchMock: ReturnType<typeof mockFetch>, path: string) =>
  fetchMock.mock.calls.filter(([input]) => String(input) === API_BASE + path);

const bodiesOf = (fetchMock: ReturnType<typeof mockFetch>, path: string) =>
  fetchMock.mock.calls
    .filter(([input]) => String(input) === API_BASE + path)
    .map(([, init]) => JSON.parse(String(init?.body)) as Record<string, unknown>);

function Shell() {
  const { pathname } = useLocation();
  return (
    <>
      {pathname.endsWith('/edit') && <MatchRecordPage />}
      <div data-testid="loc">{pathname}</div>
    </>
  );
}

const render = (user: User = testUser({ is_authorized: true })) =>
  renderWithProviders(<Shell />, {
    route: '/tournaments/1/matches/600/edit',
    path: '/tournaments/:id/matches/:matchId/*',
    user,
  });

async function kickoff() {
  await userEvent.click(await screen.findByRole('button', { name: 'Čas zápasu' }));
  expect(await screen.findByText('Začít zápas?')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Ano' }));
}

test('kickoff confirms, saves start and runs the clock', async () => {
  const fetchMock = mockFetch();
  render();
  await kickoff();
  await waitFor(() => expect(bodiesOf(fetchMock, 'edit_match/600')).toHaveLength(1));
  expect(bodiesOf(fetchMock, 'edit_match/600')[0]).toHaveProperty('start');
  expect(screen.getByRole('button', { name: 'Zastavit čas' })).toBeInTheDocument();
});

test('shot is sent immediately and listed', async () => {
  const fetchMock = mockFetch();
  render();
  await kickoff();
  await userEvent.click(screen.getByRole('button', { name: 'Střela Ufo' }));
  await waitFor(() => expect(bodiesOf(fetchMock, 'add_shot')).toHaveLength(1));
  const body = bodiesOf(fetchMock, 'add_shot')[0];
  expect(body).toMatchObject({ match: 600, team: 1000 });
  expect(body.client_id).toEqual(expect.any(String));
  await userEvent.click(
    within(screen.getByTestId('toggles-mobile')).getByRole('checkbox', { name: 'střely' }),
  );
  expect(within(screen.getByTestId('events-mobile')).getByText('střela')).toBeInTheDocument();
});

test('goal flow sends shooter without assistance or type', async () => {
  const fetchMock = mockFetch();
  render();
  await kickoff();
  await userEvent.click(screen.getByRole('button', { name: 'Gól Ufo' }));
  const dialog = within(await screen.findByRole('dialog'));
  await userEvent.click(dialog.getByRole('button', { name: 'Pépa' }));
  await userEvent.click(dialog.getByRole('button', { name: 'nikdo' }));
  await waitFor(() => expect(bodiesOf(fetchMock, 'add_goal')).toHaveLength(1));
  const body = bodiesOf(fetchMock, 'add_goal')[0];
  expect(Object.keys(body).sort()).toEqual(['client_id', 'match', 'shooter', 'time']);
  expect(body).toMatchObject({ match: 600, shooter: 100 });
  expect(within(screen.getByTestId('events-mobile')).getByText('Pépa')).toBeInTheDocument();
});

test('clock does not start without goalies', async () => {
  const error = vi.spyOn(toast, 'error');
  const fetchMock = mockFetch({ match: freshMatch({ goalies: [] }) });
  render();
  await userEvent.click(await screen.findByRole('button', { name: 'Čas zápasu' }));
  expect(error).toHaveBeenCalledWith('Není nastaven brankář.');
  expect(screen.queryByText('Začít zápas?')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Spustit čas' })).toBeInTheDocument();
  expect(bodiesOf(fetchMock, 'edit_match/600')).toHaveLength(0);
});

test('closed_edit redirects non-managers to the view page', async () => {
  mockFetch({ tournament: { ...openT1, closed_edit: true } });
  render();
  await waitFor(() =>
    expect(screen.getByTestId('loc')).toHaveTextContent(/^\/tournaments\/1\/matches\/600$/),
  );
});

test('running clock and unsaved shot survive a reload', async () => {
  const fetchMock = mockFetch({ fail: ['add_shot'] });
  const first = render();
  await kickoff();
  await userEvent.click(screen.getByRole('button', { name: 'Střela Ufo' }));
  await waitFor(() => expect(bodiesOf(fetchMock, 'add_shot')).toHaveLength(1));
  await waitFor(() => expect(screen.getByText(/Offline/)).toBeInTheDocument());
  first.unmount();

  render();
  await userEvent.click(
    within(await screen.findByTestId('toggles-mobile')).getByRole('checkbox', { name: 'střely' }),
  );
  const list = within(screen.getByTestId('events-mobile'));
  expect(list.getByText('střela')).toBeInTheDocument();
  expect(list.getByLabelText('Neuloženo')).toHaveTextContent('⛓');
  expect(screen.getByRole('button', { name: 'Zastavit čas' })).toBeInTheDocument();
  expect(screen.getByText('1. poločas')).toBeInTheDocument();
});

test('action buttons are available before kickoff', async () => {
  mockFetch();
  render();
  expect(await screen.findByRole('button', { name: 'Gól Ufo' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Karta KOM' })).toBeInTheDocument();
});

test('ended match hides action buttons until edit mode', async () => {
  mockFetch({
    match: freshMatch({ start: '2023-06-10 09:00:00', halftime_length: '00:10:00', length: '00:20:00' }),
  });
  render();
  expect(await screen.findByText('zápas ukončen')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Gól Ufo' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Čas zápasu' })).not.toBeInTheDocument();
  await userEvent.click(
    within(screen.getByTestId('toggles-mobile')).getByRole('checkbox', { name: 'úpravy' }),
  );
  expect(screen.getByRole('button', { name: 'Gól Ufo' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Karta KOM' })).toBeInTheDocument();
});

test('failed background refetches keep the recorder mounted', async () => {
  const fetchMock = mockFetch();
  const { queryClient } = render();
  expect(await screen.findByRole('button', { name: 'Čas zápasu' })).toBeInTheDocument();
  delete fetchMock.responses.goals;
  delete fetchMock.responses['tournament/1'];
  await act(async () => {
    await queryClient.refetchQueries({ queryKey: ['goals'] });
    await queryClient.refetchQueries({ queryKey: ['tournament', 1] });
    // Let React Query's batched notifications reach the component.
    await new Promise((r) => setTimeout(r, 20));
  });
  expect(queryClient.getQueryState(['goals'])?.status).toBe('error');
  expect(queryClient.getQueryState(['tournament', 1])?.status).toBe('error');
  expect(screen.getByRole('button', { name: 'Čas zápasu' })).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('remove uses the current pk when the event synced while confirming', async () => {
  let release!: () => void;
  const fetchMock = mockFetch({ hold: { 'edit_match/600': new Promise<void>((r) => (release = r)) } });
  render();
  await kickoff();
  // The kickoff patch is still in flight, so the shot waits unsent (and is not in flight itself).
  await userEvent.click(screen.getByRole('button', { name: 'Střela Ufo' }));
  await userEvent.click(
    within(screen.getByTestId('toggles-mobile')).getByRole('checkbox', { name: 'úpravy' }),
  );
  await userEvent.click(
    within(screen.getByTestId('toggles-mobile')).getByRole('checkbox', { name: 'střely' }),
  );
  const list = within(screen.getByTestId('events-mobile'));
  await userEvent.click(list.getByRole('button', { name: 'Smazat' }));
  expect(await screen.findByText('Opravdu smazat?')).toBeInTheDocument();
  release();
  await waitFor(() => expect(list.queryByLabelText('Neuloženo')).not.toBeInTheDocument());
  await userEvent.click(screen.getByRole('button', { name: 'Ano' }));
  await waitFor(() => expect(callsOf(fetchMock, 'remove_shot/50')).toHaveLength(1));
  expect(callsOf(fetchMock, 'remove_shot/50')[0][1]?.method).toBe('DELETE');
  await waitFor(() => expect(list.queryByText('střela')).not.toBeInTheDocument());
});

test('match data is not invalidated during recording, only when leaving', async () => {
  const fetchMock = mockFetch();
  const { queryClient, unmount } = render();
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  await kickoff();
  await waitFor(() => expect(callsOf(fetchMock, 'edit_match/600')).toHaveLength(1));
  await waitFor(() => expect(screen.getByText('Vše uloženo')).toBeInTheDocument());
  await act(() => new Promise((r) => setTimeout(r, 1100)));
  expect(invalidate).not.toHaveBeenCalled();
  unmount();
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['matches', 1] });
});

test('recorder waits for fresh matches instead of initialising from cached data', async () => {
  let release!: () => void;
  mockFetch({
    match: freshMatch({
      start: '2023-06-10 09:00:00',
      goals: [{ pk: 9, shooter: 100, assistance: null, match: 600, time: '00:01:00', type: 'normal' }],
    }),
    hold: { 'matchs?tournament=1': new Promise<void>((r) => (release = r)) },
  });
  function Seed({ children }: { children: ReactNode }) {
    const qc = useQueryClient();
    useState(() => qc.setQueryData(['matches', 1], [freshMatch()]));
    return children;
  }
  renderWithProviders(
    <Seed>
      <Shell />
    </Seed>,
    {
      route: '/tournaments/1/matches/600/edit',
      path: '/tournaments/:id/matches/:matchId/*',
      user: testUser({ is_authorized: true }),
    },
  );
  await act(() => new Promise((r) => setTimeout(r, 50)));
  expect(screen.queryByRole('button', { name: 'Čas zápasu' })).not.toBeInTheDocument();
  release();
  const list = within(await screen.findByTestId('events-mobile'));
  expect(list.getByText('Pépa')).toBeInTheDocument();
});

test('removing an event the server no longer has (404) succeeds silently', async () => {
  const error = vi.spyOn(toast, 'error');
  const fetchMock = mockFetch({
    match: freshMatch({
      start: '2023-06-10 09:00:00',
      goals: [{ pk: 9, shooter: 100, assistance: null, match: 600, time: '00:01:00', type: 'normal' }],
    }),
  });
  render();
  const list = within(await screen.findByTestId('events-mobile'));
  await userEvent.click(
    within(screen.getByTestId('toggles-mobile')).getByRole('checkbox', { name: 'úpravy' }),
  );
  await userEvent.click(list.getByRole('button', { name: 'Smazat' }));
  await userEvent.click(await screen.findByRole('button', { name: 'Ano' }));
  await waitFor(() => expect(list.queryByText('Pépa')).not.toBeInTheDocument());
  expect(callsOf(fetchMock, 'remove_goal/9')).toHaveLength(1);
  expect(error).not.toHaveBeenCalled();
});

test('manager is not redirected on closed_edit', async () => {
  mockFetch({ tournament: { ...openT1, closed_edit: true } });
  render(testUser({ is_authorized: true, is_manager: true }));
  expect(await screen.findByRole('button', { name: 'Čas zápasu' })).toBeInTheDocument();
  expect(screen.getByTestId('loc')).toHaveTextContent('/tournaments/1/matches/600/edit');
});

test('remove and edit buttons appear only in edit mode', async () => {
  mockFetch({
    match: freshMatch({
      start: '2023-06-10 09:00:00',
      goals: [{ pk: 9, shooter: 100, assistance: null, match: 600, time: '00:01:00', type: 'normal' }],
    }),
  });
  render();
  const list = within(await screen.findByTestId('events-mobile'));
  expect(list.getByText('Pépa')).toBeInTheDocument();
  expect(list.queryByRole('button', { name: 'Smazat' })).not.toBeInTheDocument();
  expect(list.queryByRole('button', { name: 'Upravit' })).not.toBeInTheDocument();
  await userEvent.click(
    within(screen.getByTestId('toggles-mobile')).getByRole('checkbox', { name: 'úpravy' }),
  );
  expect(list.getByRole('button', { name: 'Smazat' })).toBeInTheDocument();
  expect(list.getByRole('button', { name: 'Upravit' })).toBeInTheDocument();
});

test('discarding a failed edit of a saved event removes it locally and asks for a reload', async () => {
  const info = vi.spyOn(toast, 'info');
  mockFetch({
    match: freshMatch({
      start: '2023-06-10 09:00:00',
      goals: [{ pk: 9, shooter: 100, assistance: null, match: 600, time: '00:01:00', type: 'normal' }],
    }),
  });
  render();
  const list = within(await screen.findByTestId('events-mobile'));
  await userEvent.click(
    within(screen.getByTestId('toggles-mobile')).getByRole('checkbox', { name: 'úpravy' }),
  );
  await userEvent.click(list.getByRole('button', { name: 'Upravit' }));
  const dialog = within(await screen.findByRole('dialog'));
  await userEvent.clear(dialog.getByLabelText('Čas'));
  await userEvent.type(dialog.getByLabelText('Čas'), '00:02:00');
  await userEvent.click(dialog.getByRole('button', { name: 'Upravit' }));
  // edit_goal/9 is answered with 404, a permanent error.
  await userEvent.click(await list.findByRole('button', { name: 'Zahodit' }));
  expect(list.queryByText('Pépa')).not.toBeInTheDocument();
  expect(info).toHaveBeenCalledWith('Úprava zahozena, načti stránku znovu pro aktuální stav.');
});

test('a matches request that never settles times out and shows the error box with retry', async () => {
  const fetchMock = mockFetch();
  const base = fetchMock.getMockImplementation()!;
  let hang = true;
  fetchMock.mockImplementation((input, init) => {
    if (hang && String(input) === API_BASE + 'matchs?tournament=1')
      return new Promise<Response>((_, reject) =>
        init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))),
      );
    return base(input, init);
  });
  vi.useFakeTimers({ shouldAdvanceTime: true });
  try {
    render();
    // 15 s timeout, 1 s retry delay, 15 s timeout again
    await act(async () => {
      await vi.advanceTimersByTimeAsync(31_500);
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Časový limit požadavku vypršel.');
    hang = false;
    await userEvent.click(screen.getByRole('button', { name: 'Zkusit znovu' }));
    expect(await screen.findByRole('button', { name: 'Čas zápasu' })).toBeInTheDocument();
  } finally {
    vi.useRealTimers();
  }
});
