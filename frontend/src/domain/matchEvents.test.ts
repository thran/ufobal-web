import { expect, test } from 'vitest';
import { recordedMatch } from '../test/fixtures';
import {
  activePenalties,
  computeGoalies,
  eventCounts,
  mergeLocal,
  serverEvents,
  type MatchEvent,
} from './matchEvents';

const rosters: Record<number, number[]> = { 1000: [100, 101], 1001: [102] };
const rosterOf = (tot: number | null) => (tot == null ? [] : (rosters[tot] ?? []));

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
  const fresh: MatchEvent = {
    id: 'u1',
    type: 'shot',
    time: '00:01:00',
    team: 1000,
    data: { shooter: null },
    pk: null,
    saved: false,
  };
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

test('server events use client_id as id when present', () => {
  const m = recordedMatch();
  m.goals[0] = { ...m.goals[0], client_id: 'cg' };
  m.shots[0] = { ...m.shots[0], client_id: 'cs' };
  m.penalties[0] = { ...m.penalties[0], client_id: 'cp' };
  m.goalies[1] = { ...m.goalies[1], client_id: 'ci' };
  const ids = serverEvents(m, rosterOf).events.map((e) => e.id);
  expect(ids).toEqual(['cg', 'cs', 'cp', 'ci', 'halftime']);
});

test('mergeLocal dedups stored unsaved event against server row with same client_id and adopts pk', () => {
  const m = recordedMatch();
  m.shots[0] = { ...m.shots[0], client_id: 'u-shot' };
  const { events } = serverEvents(m, rosterOf);
  const local: MatchEvent = {
    id: 'u-shot',
    type: 'shot',
    time: '00:03:00',
    team: 1001,
    data: { shooter: null },
    pk: null,
    saved: false,
  };
  const merged = mergeLocal(events, [local]);
  const shots = merged.filter((e) => e.type === 'shot');
  expect(shots).toHaveLength(1);
  expect(shots[0]).toMatchObject({ id: 'u-shot', pk: 2, saved: false });
});

test('active penalties with equal times keep their input order', () => {
  const penalty = (id: string, player: number): MatchEvent => ({
    id,
    type: 'penalty',
    time: '00:04:00',
    team: 1000,
    data: { player, card: 'yellow', reason: 'x' },
    pk: null,
    saved: false,
  });
  const active = activePenalties([penalty('a', 100), penalty('b', 101)], 1000, 240_000 + 10_000);
  expect(active.map((p) => p.event.id)).toEqual(['a', 'b']);
});
