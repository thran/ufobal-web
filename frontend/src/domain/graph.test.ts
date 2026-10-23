import { expect, test } from 'vitest';
import { sampleRaw } from '../test/fixtures';
import { buildGraph, buildGraphCached, compareMedals, scoreWithoutTeam } from './graph';

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
  expect(ufoTeam.altNames).toEqual([{ name: 'Béčko', count: 1 }]);
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
  expect(scoreWithoutTeam(karel, graph)).toEqual([
    { tournament: graph.tournamentsById.get(1), goals: 4, assists: 0 },
  ]);
  expect(scoreWithoutTeam(graph.playersById.get(100)!, graph)).toEqual([]);
});

test('buildGraphCached returns the same graph for identical input refs and rebuilds when one changes', () => {
  const raw = sampleRaw();
  const first = buildGraphCached(raw);
  expect(buildGraphCached({ ...raw })).toBe(first);
  expect(buildGraphCached({ ...raw, goals: { ...raw.goals } })).not.toBe(first);
});

test('buildGraph does not mutate its inputs', () => {
  const raw = sampleRaw();
  const copy = structuredClone(raw);
  buildGraph(raw);
  expect(raw).toEqual(copy);
});
