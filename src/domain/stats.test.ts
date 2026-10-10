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
