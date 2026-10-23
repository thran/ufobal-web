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
