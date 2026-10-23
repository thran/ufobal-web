import type { GoalieStatDto, MatchDto, PairDto } from '../api/types';
import { formatNumber } from '../format';
import type { Graph, PlayerVM, TotVM, TournamentVM } from './graph';

export interface TeamScore {
  scored: number;
  received: number;
}

export function teamScores(matches: MatchDto[]): Map<number, TeamScore> {
  const scores = new Map<number, TeamScore>();
  const add = (tot: number | null, scored: number, received: number) => {
    if (tot == null) return;
    const s = scores.get(tot) ?? { scored: 0, received: 0 };
    s.scored += scored;
    s.received += received;
    scores.set(tot, s);
  };
  for (const m of matches) {
    const a = m.score_one ?? 0;
    const b = m.score_two ?? 0;
    add(m.team_one, a, b);
    add(m.team_two, b, a);
  }
  return scores;
}

export function tournamentSummary(t: TournamentVM, matches: MatchDto[]) {
  return {
    teamCount: t.tots.length,
    matchCount: matches.length,
    playerCount: t.tots.reduce((n, tot) => n + tot.players.length, 0),
    goalCount: matches.reduce((n, m) => n + (m.score_one ?? 0) + (m.score_two ?? 0), 0),
  };
}

export function sortTotsByRank(tots: TotVM[]): TotVM[] {
  const rank = (t: TotVM) => t.rank ?? Number.MAX_SAFE_INTEGER;
  return [...tots].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, 'cs'));
}

export interface PlayerScoreRow {
  player: PlayerVM;
  goals: number;
  assists: number;
  canada: number;
}

export function tournamentPlayerRows(graph: Graph, tournamentPk: number): PlayerScoreRow[] {
  return graph.players
    .map((player) => {
      const goals = player.goals[tournamentPk] ?? 0;
      const assists = player.assists[tournamentPk] ?? 0;
      return { player, goals, assists, canada: goals + assists };
    })
    .filter((r) => r.canada > 0)
    .sort((a, b) => b.canada - a.canada);
}

export function compareSuccess(a: number, b: number): number {
  const na = Number.isNaN(a);
  const nb = Number.isNaN(b);
  if (na || nb) return na === nb ? 0 : na ? -1 : 1;
  return a - b;
}

export interface GoalieRow {
  player: PlayerVM;
  team: number | null;
  matches: number;
  shots: number;
  goals: number;
  success: number;
}

export function goalieRows(stats: GoalieStatDto[], graph: Graph): GoalieRow[] {
  return stats
    .flatMap((s) => {
      const player = graph.playersById.get(s.goalie);
      if (!player) return [];
      const success = s.shots ? 1 - s.goals / s.shots : Number.NaN;
      return [{ player, team: s.team, matches: s.matches, shots: s.shots, goals: s.goals, success }];
    })
    .sort((a, b) => compareSuccess(b.success, a.success));
}

export interface PairRow {
  id: string;
  player1: PlayerVM;
  player2: PlayerVM;
  points: number;
  goalsFirst?: number;
  goalsSecond?: number;
}

export function pairRows(pairs: PairDto[], graph: Graph): PairRow[] {
  return pairs
    .flatMap((p) => {
      const player1 = graph.playersById.get(p.players[0]);
      const player2 = graph.playersById.get(p.players[1]);
      if (!player1 || !player2) return [];
      return [
        {
          id: `${p.players[0]}-${p.players[1]}`,
          player1,
          player2,
          points: p.points,
          goalsFirst: p.goals_first,
          goalsSecond: p.goals_second,
        },
      ];
    })
    .sort((a, b) => b.points - a.points);
}

export function formatPercent(ratio: number): string {
  return Number.isNaN(ratio) ? '' : `${formatNumber(ratio * 100, 1)}%`;
}
