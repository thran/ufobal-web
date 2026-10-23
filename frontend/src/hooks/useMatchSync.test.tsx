import { act, renderHook, waitFor } from '@testing-library/react';
import { useReducer } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { stoppedClock } from '../domain/clock';
import type { MatchEvent } from '../domain/matchEvents';
import { recorderReducer, type RecorderState } from '../domain/recorder';
import { nextWork, useMatchSync } from './useMatchSync';

const fetchMock = vi.fn();
beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockImplementation(async () => new Response('1', { status: 200 }));
});
afterEach(() => {
  fetchMock.mockReset();
  vi.useRealTimers();
});

const ev = (id: string, o: Partial<MatchEvent> = {}): MatchEvent => ({
  id,
  type: 'shot',
  time: '00:01:00',
  team: 1000,
  data: { shooter: null },
  pk: null,
  saved: false,
  error: null,
  ...o,
});
const base = (o: Partial<RecorderState> = {}): RecorderState => ({
  matchPk: 500,
  tournamentPk: 1,
  teamOne: 1000,
  teamTwo: 1001,
  halftimeMinutes: 10,
  phase: 1,
  h1Length: null,
  length: null,
  start: 'A',
  end: null,
  referee: 102,
  matchPatch: null,
  matchPatchError: null,
  clock: stoppedClock(600_000),
  events: [],
  initialGoalies: {},
  goalies: {},
  sidesSwapped: false,
  ...o,
});

function useHarness(initial: RecorderState) {
  const [state, dispatch] = useReducer(recorderReducer, initial);
  const sync = useMatchSync(state, dispatch, { enabled: true });
  return { state, sync, dispatch };
}

const advance = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

const body = (i: number) => JSON.parse(fetchMock.mock.calls[i][1].body);

test('nextWork prefers patch, skips errored and saved events', () => {
  expect(nextWork(base({ matchPatch: { start: 'A' }, events: [ev('a')] }))).toMatchObject({ kind: 'patch' });
  expect(
    nextWork(base({ events: [ev('a', { saved: true }), ev('b', { error: 'x' }), ev('c')] })),
  ).toMatchObject({ kind: 'event', event: { id: 'c' } });
});

test('sends patch then events in order, one at a time, with client_id', async () => {
  fetchMock.mockImplementation(async () => new Response('11', { status: 200 }));
  const { result } = renderHook(() =>
    useHarness(base({ matchPatch: { start: 'A' }, events: [ev('a'), ev('b', { time: '00:02:00' })] })),
  );
  await waitFor(() => expect(result.current.state.events.every((e) => e.saved)).toBe(true));
  expect(fetchMock.mock.calls.map(([u]) => String(u))).toEqual([
    '/api_frontend/edit_match/500',
    '/api_frontend/add_shot',
    '/api_frontend/add_shot',
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
  vi.useFakeTimers();
  fetchMock
    .mockRejectedValueOnce(new TypeError('Failed to fetch'))
    .mockResolvedValue(new Response('13', { status: 200 }));
  const { result } = renderHook(() => useHarness(base({ events: [ev('a')] })));
  await advance(0);
  expect(result.current.sync.offline).toBe(true);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  await advance(2100);
  expect(result.current.state.events[0].saved).toBe(true);
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(result.current.sync.offline).toBe(false);
});

test('goalie change posts to change_goalie/<match>-<team>', async () => {
  fetchMock.mockResolvedValue(new Response('OK', { status: 200 }));
  const { result } = renderHook(() =>
    useHarness(base({ events: [ev('g', { type: 'goalieChange', data: { goalie: 100 } })] })),
  );
  await waitFor(() => expect(result.current.state.events[0].saved).toBe(true));
  expect(String(fetchMock.mock.calls[0][0])).toBe('/api_frontend/change_goalie/500-1000');
  expect(body(0)).toEqual({ goalie: 100, time: '00:01:00', client_id: 'g' });
});

test('event edited while in flight stays unsaved and is re-sent as an edit', async () => {
  let release!: (r: Response) => void;
  fetchMock
    .mockImplementationOnce(() => new Promise<Response>((res) => (release = res)))
    .mockResolvedValue(new Response('OK', { status: 200 }));
  const goal = ev('g', {
    type: 'goal',
    data: { shooter: 100, assistance: null, goalType: 'normal' },
  });
  const { result } = renderHook(() => useHarness(base({ events: [goal] })));
  await waitFor(() => expect(result.current.sync.inFlightId).toBe('g'));
  act(() =>
    result.current.dispatch({
      type: 'editEvent',
      id: 'g',
      time: '00:01:00',
      data: { shooter: 101, assistance: null, goalType: 'normal' },
    }),
  );
  await act(async () => release(new Response('77', { status: 200 })));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  expect(String(fetchMock.mock.calls[1][0])).toBe('/api_frontend/edit_goal/77');
  expect(body(1).shooter).toBe(101);
  await waitFor(() => expect(result.current.state.events[0].saved).toBe(true));
  expect(result.current.state.events[0].pk).toBe(77);
});

test('online event retries immediately during backoff; second failure waits 5 s', async () => {
  vi.useFakeTimers();
  fetchMock
    .mockRejectedValueOnce(new TypeError('Failed to fetch'))
    .mockRejectedValueOnce(new TypeError('Failed to fetch'))
    .mockResolvedValue(new Response('13', { status: 200 }));
  const { result } = renderHook(() => useHarness(base({ events: [ev('a')] })));
  await advance(0);
  expect(result.current.sync.offline).toBe(true);
  await advance(2100);
  expect(fetchMock).toHaveBeenCalledTimes(2);
  await advance(4000);
  expect(fetchMock).toHaveBeenCalledTimes(2);
  await advance(1100);
  expect(result.current.state.events[0].saved).toBe(true);
  expect(fetchMock).toHaveBeenCalledTimes(3);
});

test('online event triggers immediate retry', async () => {
  vi.useFakeTimers();
  fetchMock
    .mockRejectedValueOnce(new TypeError('Failed to fetch'))
    .mockResolvedValue(new Response('13', { status: 200 }));
  const { result } = renderHook(() => useHarness(base({ events: [ev('a')] })));
  await advance(0);
  expect(result.current.sync.offline).toBe(true);
  act(() => {
    window.dispatchEvent(new Event('online'));
  });
  await advance(0);
  expect(result.current.state.events[0].saved).toBe(true);
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

test('429 is transient', async () => {
  vi.useFakeTimers();
  fetchMock.mockResolvedValueOnce(new Response('slow down', { status: 429 }));
  const { result } = renderHook(() => useHarness(base({ events: [ev('a')] })));
  await advance(0);
  expect(result.current.sync.offline).toBe(true);
  expect(result.current.state.events[0].error).toBeNull();
});

test('a request that never settles times out after 15 s, passes a signal, and is retried', async () => {
  vi.useFakeTimers();
  fetchMock.mockImplementationOnce(() => new Promise<Response>(() => {}));
  const { result } = renderHook(() => useHarness(base({ events: [ev('a')] })));
  await advance(0);
  expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  expect(result.current.sync.inFlightId).toBe('a');
  await advance(14_900);
  expect(result.current.sync.offline).toBe(false);
  await advance(200);
  expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
  expect(result.current.sync.offline).toBe(true);
  expect(result.current.sync.inFlightId).toBeNull();
  expect(result.current.state.events[0].error).toBeNull();
  await advance(2100);
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(result.current.state.events[0].saved).toBe(true);
});

test('five consecutive transient failures on the same event mark it failed and the queue moves on', async () => {
  vi.useFakeTimers();
  fetchMock.mockImplementation(async (_url: string, init: RequestInit) =>
    JSON.parse(String(init.body)).client_id === 'a'
      ? new Response('boom', { status: 500 })
      : new Response('14', { status: 200 }),
  );
  const { result } = renderHook(() => useHarness(base({ events: [ev('a'), ev('b', { time: '00:02:00' })] })));
  await advance(0);
  for (const delay of [2000, 5000, 10000]) await advance(delay + 50);
  expect(fetchMock).toHaveBeenCalledTimes(4);
  expect(result.current.state.events[0].error).toBeNull();
  await advance(30_050);
  expect(fetchMock).toHaveBeenCalledTimes(6);
  expect(result.current.state.events[0].error).toBe('Uložení opakovaně selhává: boom');
  expect(result.current.state.events[1].saved).toBe(true);
});

test('failure counter resets after a success of the same item', async () => {
  vi.useFakeTimers();
  const results = ['500', '500', '500', '500', 'ok', '500', 'ok'];
  fetchMock.mockImplementation(async () =>
    results.shift() === 'ok' ? new Response('OK', { status: 200 }) : new Response('boom', { status: 500 }),
  );
  const { result } = renderHook(() => useHarness(base({ matchPatch: { start: 'A' } })));
  await advance(0);
  for (const delay of [2000, 5000, 10000, 30000]) await advance(delay + 50);
  expect(result.current.state.matchPatch).toBeNull();
  act(() => result.current.dispatch({ type: 'setReferee', referee: 101 }));
  await advance(0);
  expect(fetchMock).toHaveBeenCalledTimes(6);
  expect(result.current.state.matchPatchError).toBeNull();
  await advance(2050);
  expect(result.current.state.matchPatch).toBeNull();
});

test('patch failing transiently five times is marked failed and events continue', async () => {
  vi.useFakeTimers();
  fetchMock.mockImplementation(async (url: string) =>
    String(url).includes('edit_match')
      ? Promise.reject(new TypeError('Failed to fetch'))
      : new Response('16', { status: 200 }),
  );
  const { result } = renderHook(() => useHarness(base({ matchPatch: { start: 'A' }, events: [ev('a')] })));
  await advance(0);
  for (const delay of [2000, 5000, 10000, 30000]) await advance(delay + 50);
  expect(result.current.state.matchPatchError).toBe('Uložení opakovaně selhává: Failed to fetch');
  await advance(0);
  expect(result.current.state.events[0].saved).toBe(true);
});

test('failures while the browser is offline do not poison the item; online resumes', async () => {
  vi.useFakeTimers();
  const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  try {
    fetchMock.mockImplementation(async () => Promise.reject(new TypeError('Failed to fetch')));
    const { result } = renderHook(() => useHarness(base({ events: [ev('a')] })));
    await advance(0);
    for (let i = 0; i < 6; i++) await advance(30_050);
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(6);
    expect(result.current.state.events[0].error).toBeNull();
    expect(result.current.sync.offline).toBe(true);
    onLine.mockReturnValue(true);
    fetchMock.mockImplementation(async () => new Response('17', { status: 200 }));
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    await advance(0);
    expect(result.current.state.events[0]).toMatchObject({ saved: true, error: null });
  } finally {
    onLine.mockRestore();
  }
});

test('offline clears when the server answers with a permanent error while other items are pending', async () => {
  vi.useFakeTimers();
  fetchMock
    .mockRejectedValueOnce(new TypeError('Failed to fetch'))
    .mockResolvedValueOnce(new Response('bad', { status: 400 }))
    .mockImplementation(() => new Promise<Response>(() => {}));
  const { result } = renderHook(() => useHarness(base({ events: [ev('a'), ev('b', { time: '00:02:00' })] })));
  await advance(0);
  expect(result.current.sync.offline).toBe(true);
  await advance(2050);
  expect(result.current.state.events[0].error).toBe('bad');
  expect(result.current.sync.pending).toBe(1);
  expect(result.current.sync.offline).toBe(false);
});

test('offline clears when an item is given up after repeated transient failures', async () => {
  vi.useFakeTimers();
  fetchMock.mockImplementation(async (_url: string, init: RequestInit) =>
    JSON.parse(String(init.body)).client_id === 'a'
      ? new Response('boom', { status: 500 })
      : new Promise<Response>(() => {}),
  );
  const { result } = renderHook(() => useHarness(base({ events: [ev('a'), ev('b', { time: '00:02:00' })] })));
  await advance(0);
  for (const delay of [2000, 5000, 10000, 30000]) await advance(delay + 50);
  expect(result.current.state.events[0].error).toMatch(/opakovaně selhává/);
  expect(result.current.sync.pending).toBe(1);
  expect(result.current.sync.offline).toBe(false);
});
