import { expect, test } from 'vitest';
import { stoppedClock } from './clock';
import { currentGameTime, recorderReducer, type RecorderState } from './recorder';

const base = (o: Partial<RecorderState> = {}): RecorderState => ({
  matchPk: 500,
  tournamentPk: 1,
  teamOne: 1000,
  teamTwo: 1001,
  halftimeMinutes: 10,
  phase: 0,
  h1Length: null,
  length: null,
  start: null,
  end: null,
  referee: null,
  matchPatch: null,
  matchPatchError: null,
  clock: stoppedClock(600_000),
  events: [],
  initialGoalies: { 1000: 101, 1001: 102 },
  goalies: { 1000: 101, 1001: 102 },
  sidesSwapped: false,
  ...o,
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
    event: {
      id: 'g1',
      type: 'goalieChange',
      time: '00:01:00',
      team: 1000,
      data: { goalie: 100 },
      pk: null,
      saved: false,
    },
  });
  expect(s.goalies[1000]).toBe(100);
  s = recorderReducer(s, { type: 'syncOk', id: 'g1', pk: null });
  expect(s.events[0].saved).toBe(true);
  s = recorderReducer(s, {
    type: 'addEvent',
    event: {
      id: 'x',
      type: 'goal',
      time: '00:02:00',
      team: 1000,
      data: { shooter: 100, assistance: null, goalType: 'normal' },
      pk: null,
      saved: false,
    },
  });
  s = recorderReducer(s, { type: 'syncFail', id: 'x', message: 'Střelec se nenachází ani v jednom z týmů.' });
  expect(s.events[1].error).toMatch(/Střelec/);
  s = recorderReducer(s, { type: 'retryEvent', id: 'x' });
  expect(s.events[1].error).toBeNull();
  s = recorderReducer(s, { type: 'syncOk', id: 'x', pk: 77 });
  s = recorderReducer(s, {
    type: 'editEvent',
    id: 'x',
    time: '00:02:10',
    data: { shooter: 101, assistance: null, goalType: 'normal' },
  });
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

test('syncOk with sent snapshot keeps an event edited meanwhile unsaved', () => {
  const data = { shooter: 100, assistance: null, goalType: 'normal' as const };
  const goal = { id: 'g', type: 'goal' as const, time: '00:02:00', team: 1000, data, pk: null, saved: false };
  const init = recorderReducer(
    {
      matchPk: 1,
      tournamentPk: 1,
      teamOne: 1000,
      teamTwo: 1001,
      halftimeMinutes: 10,
      phase: 1,
      h1Length: null,
      length: null,
      start: null,
      end: null,
      referee: null,
      matchPatch: null,
      matchPatchError: null,
      clock: stoppedClock(600_000),
      events: [],
      initialGoalies: {},
      goalies: {},
      sidesSwapped: false,
    },
    { type: 'addEvent', event: goal },
  );
  const sent = { time: '00:02:00', data: JSON.stringify(data) };
  const same = recorderReducer(init, { type: 'syncOk', id: 'g', pk: 5, sent });
  expect(same.events[0]).toMatchObject({ saved: true, pk: 5 });
  const edited = recorderReducer(init, {
    type: 'editEvent',
    id: 'g',
    time: '00:02:00',
    data: { ...data, shooter: 101 },
  });
  const after = recorderReducer(edited, { type: 'syncOk', id: 'g', pk: 5, sent });
  expect(after.events[0]).toMatchObject({ saved: false, pk: 5 });
});
