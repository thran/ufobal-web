import { describe, expect, test } from 'vitest';
import { recordedMatch, t1 } from '../test/fixtures';
import { startClock, stoppedClock } from './clock';
import { recorderReducer } from './recorder';
import {
  importOldRecorder,
  initRecorder,
  loadRecorder,
  removeStoredEvent,
  saveRecorder,
  storageKey,
} from './recorderStorage';

const rosters: Record<number, number[]> = { 1000: [100, 101], 1001: [102] };
const rosterOf = (tot: number | null) => (tot == null ? [] : (rosters[tot] ?? []));
const tournament = { ...t1, halftime_length: 10 };

test('fresh init derives phase 2 from server halftime', () => {
  const s = initRecorder({ match: recordedMatch(), tournament, rosterOf, stored: null, imported: null });
  expect(s.phase).toBe(2);
  expect(s.events.some((e) => e.type === 'halftime')).toBe(true);
  expect(s.goalies[1000]).toBe(100);
});

test('save/load round trip keeps running clock and only unsaved events, never in-flight state', () => {
  let s = initRecorder({
    match: { ...recordedMatch(), halftime_length: null },
    tournament,
    rosterOf,
    stored: null,
    imported: null,
  });
  s = { ...s, clock: startClock(stoppedClock(500_000), 1_000) };
  s = recorderReducer(s, {
    type: 'addEvent',
    event: {
      id: 'u1',
      type: 'shot',
      time: '00:05:00',
      team: 1000,
      data: { shooter: null },
      pk: null,
      saved: false,
    },
  });
  saveRecorder(s);
  const stored = loadRecorder(500)!;
  expect(stored.clock.running).toBe(true);
  expect(stored.events.map((e) => e.id)).toEqual(['u1']);
  const restored = initRecorder({
    match: { ...recordedMatch(), halftime_length: null },
    tournament,
    rosterOf,
    stored,
    imported: null,
  });
  expect(restored.events.find((e) => e.id === 'u1')).toBeTruthy();
  expect(restored.events.filter((e) => e.type === 'goal')).toHaveLength(1);
  expect(JSON.parse(localStorage.getItem(storageKey(500))!).events[0]).not.toHaveProperty('inFlight');
});

test('old app data is imported once and old keys are kept', () => {
  localStorage.setItem('time500', '00:06:00');
  localStorage.setItem(
    'events500',
    JSON.stringify([
      {
        type: 'goal',
        time: '00:06:00',
        saved: false,
        team: 1000,
        data: { shooter: 100, match: 500, team: 1000, time: '00:06:00' },
      },
    ]),
  );
  localStorage.setItem('match500', JSON.stringify({ pk: 500, referee: 102, changed: true }));
  const imported = importOldRecorder(500)!;
  expect(imported.events[0]).toMatchObject({
    type: 'goal',
    team: 1000,
    saved: false,
    data: { shooter: 100, assistance: null, goalType: 'normal' },
  });
  expect(imported.time).toBe('00:06:00');
  expect(imported.patch).toEqual({ referee: 102 });
  expect(importOldRecorder(500)).toBeNull();
  expect(localStorage.getItem('events500')).not.toBeNull();
});

test('import keeps only well-formed match fields', () => {
  localStorage.setItem(
    'match501',
    JSON.stringify({
      start: '2023-06-10 09:00:00',
      end: 'garbage',
      halftime_length: '00:10:00',
      length: '99:99',
    }),
  );
  expect(importOldRecorder(501)!.patch).toEqual({
    start: '2023-06-10 09:00:00',
    halftime_length: '00:10:00',
  });
  localStorage.setItem('match502', JSON.stringify({ start: '2023-06-10T09:00:00Z', length: '00:20:00' }));
  expect(importOldRecorder(502)!.patch).toEqual({ length: '00:20:00' });
});

test('import drops old events missing their required player or goalie, or with an invalid time', () => {
  localStorage.setItem(
    'events503',
    JSON.stringify([
      { type: 'penalty', time: '00:01:00', team: 1000, data: { card: 'red', reason: 'x' } },
      { type: 'goalieChange', time: '00:02:00', team: 1000, data: {} },
      { type: 'penalty', time: '00:03:00', team: 1000, data: { player: 100, card: 'red', reason: 'x' } },
      { type: 'goalieChange', time: '00:04:00', team: 1000, data: { goalie: 101 } },
      { type: 'shot', time: 'bad', team: 1000, data: {} },
    ]),
  );
  const imported = importOldRecorder(503)!;
  expect(imported.events.map((e) => [e.type, e.time])).toEqual([
    ['penalty', '00:03:00'],
    ['goalieChange', '00:04:00'],
  ]);
});

test('stored restore rebuilds halftime/end markers the server does not know yet', () => {
  const match = { ...recordedMatch(), halftime_length: null, length: null };
  let s = initRecorder({ match, tournament, rosterOf, stored: null, imported: null });
  s = {
    ...s,
    phase: null,
    h1Length: '00:10:00',
    length: '00:20:00',
    matchPatch: { halftime_length: '00:10:00', length: '00:20:00' },
  };
  saveRecorder(s);
  const restored = initRecorder({ match, tournament, rosterOf, stored: loadRecorder(500), imported: null });
  expect(restored.events.filter((e) => e.type === 'halftime').map((e) => e.time)).toEqual(['00:10:00']);
  expect(restored.events.filter((e) => e.type === 'end').map((e) => e.time)).toEqual(['00:20:00']);
  const again = initRecorder({
    match: { ...match, halftime_length: '00:10:00' },
    tournament,
    rosterOf,
    stored: loadRecorder(500),
    imported: null,
  });
  expect(again.events.filter((e) => e.type === 'halftime')).toHaveLength(1);
});

test('removeStoredEvent drops one event from current storage and never creates data', () => {
  removeStoredEvent(500, 'x');
  expect(localStorage.getItem(storageKey(500))).toBeNull();
  let s = initRecorder({ match: recordedMatch(), tournament, rosterOf, stored: null, imported: null });
  const shot = (id: string) => ({
    id,
    type: 'shot' as const,
    time: '00:05:00',
    team: 1000,
    data: { shooter: null },
    pk: null,
    saved: false,
  });
  s = recorderReducer(s, { type: 'addEvent', event: shot('u1') });
  s = recorderReducer(s, { type: 'addEvent', event: shot('u2') });
  saveRecorder({ ...s, referee: 101 });
  removeStoredEvent(500, 'u1');
  const stored = loadRecorder(500)!;
  expect(stored.events.map((e) => e.id)).toEqual(['u2']);
  expect(stored.referee).toBe(101);
});

describe('loadRecorder shape guard', () => {
  const valid = () => {
    const s = initRecorder({ match: recordedMatch(), tournament, rosterOf, stored: null, imported: null });
    saveRecorder(s);
    return JSON.parse(localStorage.getItem(storageKey(500))!) as Record<string, unknown>;
  };
  const put = (o: Record<string, unknown>) => localStorage.setItem(storageKey(500), JSON.stringify(o));

  test('accepts a well-formed record', () => {
    put(valid());
    expect(loadRecorder(500)).not.toBeNull();
  });

  test.each([
    ['missing events', (o: Record<string, unknown>) => delete o.events],
    ['events not an array', (o: Record<string, unknown>) => (o.events = {})],
    ['event without id', (o: Record<string, unknown>) => (o.events = [{ type: 'shot', time: '00:01:00' }])],
    ['missing clock', (o: Record<string, unknown>) => delete o.clock],
    ['clock without running flag', (o: Record<string, unknown>) => (o.clock = {})],
    ['partial clock', (o: Record<string, unknown>) => (o.clock = { running: false })],
    ['bad phase', (o: Record<string, unknown>) => (o.phase = 7)],
    ['missing phase', (o: Record<string, unknown>) => delete o.phase],
  ])('%s returns null and init falls back to server data', (_name, mutate) => {
    const o = valid();
    mutate(o);
    put(o);
    const stored = loadRecorder(500);
    expect(stored).toBeNull();
    const s = initRecorder({ match: recordedMatch(), tournament, rosterOf, stored, imported: null });
    expect(s.phase).toBe(2);
  });
});

test('stored data without unsaved changes yields to the server, keeping the clock when the phase matches', () => {
  const match = { ...recordedMatch(), halftime_length: null, length: null, referee: 102 };
  let s = initRecorder({ match, tournament, rosterOf, stored: null, imported: null });
  s = { ...s, referee: null, clock: startClock(stoppedClock(300_000), 1_000), sidesSwapped: true };
  saveRecorder(s);
  const restored = initRecorder({ match, tournament, rosterOf, stored: loadRecorder(500), imported: null });
  expect(restored.referee).toBe(102);
  expect(restored.phase).toBe(1);
  expect(restored.clock.running).toBe(true);
  expect(restored.sidesSwapped).toBe(true);
  const ended = initRecorder({
    match: { ...match, halftime_length: '00:10:00', length: '00:20:00' },
    tournament,
    rosterOf,
    stored: loadRecorder(500),
    imported: null,
  });
  expect(ended.phase).toBe(null);
  expect(ended.clock.running).toBe(false);
});

test('stored data with an unsaved match patch still wins over the server', () => {
  const match = { ...recordedMatch(), halftime_length: null, length: null, referee: 102 };
  let s = initRecorder({ match, tournament, rosterOf, stored: null, imported: null });
  s = { ...s, referee: 101, matchPatch: { referee: 101 } };
  saveRecorder(s);
  const restored = initRecorder({ match, tournament, rosterOf, stored: loadRecorder(500), imported: null });
  expect(restored.referee).toBe(101);
});
