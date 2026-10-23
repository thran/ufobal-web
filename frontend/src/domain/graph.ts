import type { GoalsDto, PenaltyDto, PlayerDto, TeamDto, TotDto, TournamentDto } from '../api/types';
import { searchKey } from './text';

export interface PenaltyVM extends Omit<PenaltyDto, 'tournament'> {
  tournament: TournamentVM | null;
  tournamentPk: number;
}

export interface PlayerVM extends Omit<PlayerDto, 'penalties'> {
  penalties: PenaltyVM[];
  goals: Record<number, number>;
  assists: Record<number, number>;
  goalsSum: number;
  assistsSum: number;
  canada: number;
  penaltyCount: number;
  tots: TotVM[];
  teams: { team: TeamVM; count: number }[];
  search: string;
  teamsSearch: string;
}

export interface TeamVM extends TeamDto {
  tots: TotVM[];
  medals: number[];
  altNames: { name: string; count: number }[];
  search: string;
}

export interface TournamentVM extends TournamentDto {
  tots: TotVM[];
}

export interface TotVM extends Omit<TotDto, 'team' | 'tournament' | 'player_pks'> {
  team: TeamVM;
  tournament: TournamentVM;
  players: PlayerVM[];
  playerPks: number[];
}

export interface RawData {
  players: PlayerDto[];
  tots: TotDto[];
  goals: GoalsDto;
  emptyTournaments: TournamentDto[];
}

export interface Graph {
  players: PlayerVM[];
  playersById: Map<number, PlayerVM>;
  teams: TeamVM[];
  teamsById: Map<number, TeamVM>;
  tournaments: TournamentVM[];
  tournamentsById: Map<number, TournamentVM>;
  totsById: Map<number, TotVM>;
}

/** Groups items by key, ordered by count desc; ties keep first-appearance order. */
function countBy<T, K>(items: T[], key: (item: T) => K): { key: K; count: number }[] {
  const counts = new Map<K, number>();
  for (const item of items) {
    const k = key(item);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts].map(([k, count]) => ({ key: k, count })).sort((a, b) => b.count - a.count);
}

export function buildGraph(raw: RawData): Graph {
  const playersById = new Map<number, PlayerVM>();
  const players = raw.players.map((p) => {
    const vm: PlayerVM = {
      ...p,
      penalties: [],
      goals: {},
      assists: {},
      goalsSum: 0,
      assistsSum: 0,
      canada: 0,
      penaltyCount: p.penalties.length,
      tots: [],
      teams: [],
      search: searchKey(p.nickname),
      teamsSearch: '',
    };
    playersById.set(p.pk, vm);
    return vm;
  });

  const teams: TeamVM[] = [];
  const teamsById = new Map<number, TeamVM>();
  const ensureTeam = (t: TeamDto) => {
    let vm = teamsById.get(t.pk);
    if (!vm) {
      vm = { ...t, tots: [], medals: [0, 0, 0, 0, 0], altNames: [], search: '' };
      teamsById.set(t.pk, vm);
      teams.push(vm);
    }
    return vm;
  };

  const tournaments: TournamentVM[] = [];
  const tournamentsById = new Map<number, TournamentVM>();
  const ensureTournament = (t: TournamentDto) => {
    let vm = tournamentsById.get(t.pk);
    if (!vm) {
      vm = { ...t, tots: [] };
      tournamentsById.set(t.pk, vm);
      tournaments.push(vm);
    }
    return vm;
  };

  const totsById = new Map<number, TotVM>();
  for (const { team, tournament, player_pks, ...rest } of raw.tots) {
    const tot: TotVM = {
      ...rest,
      team: ensureTeam(team),
      tournament: ensureTournament(tournament),
      players: [],
      playerPks: player_pks,
    };
    tot.team.tots.push(tot);
    tot.tournament.tots.push(tot);
    if (tot.rank != null && tot.rank >= 1 && tot.rank <= 5) tot.team.medals[tot.rank - 1] += 1;
    for (const pk of player_pks) {
      const player = playersById.get(pk);
      if (!player) continue;
      tot.players.push(player);
      player.tots.push(tot);
    }
    totsById.set(tot.pk, tot);
  }
  for (const t of raw.emptyTournaments) ensureTournament(t);

  for (const { shooter, match__tournament, count } of raw.goals.goals) {
    const p = playersById.get(shooter);
    if (!p) continue;
    p.goals[match__tournament] = count;
    p.goalsSum += count;
    p.canada += count;
  }
  for (const { assistance, match__tournament, count } of raw.goals.assists) {
    const p = playersById.get(assistance);
    if (!p) continue;
    p.assists[match__tournament] = count;
    p.assistsSum += count;
    p.canada += count;
  }

  raw.players.forEach((dto, i) => {
    const p = players[i];
    p.penalties = dto.penalties.map((pen) => ({
      ...pen,
      tournament: tournamentsById.get(pen.tournament) ?? null,
      tournamentPk: pen.tournament,
    }));
    p.teams = countBy(p.tots, (tot) => tot.team).map(({ key, count }) => ({ team: key, count }));
    p.teamsSearch = p.teams.map((t) => searchKey(t.team.name)).join(' ');
  });

  for (const team of teams) {
    team.altNames = countBy(
      team.tots.filter((tot) => tot.name_pure !== team.name),
      (tot) => tot.name_pure,
    ).map(({ key, count }) => ({ name: key, count }));
    team.search = [team.name, team.name_short ?? '', ...team.altNames.map((n) => n.name)]
      .filter(Boolean)
      .map(searchKey)
      .join(' ');
  }

  return { players, playersById, teams, teamsById, tournaments, tournamentsById, totsById };
}

/** Negative when `a` has the better medal record (more golds, then silvers, ...). */
export function compareMedals(a: number[], b: number[]): number {
  for (let i = 0; i < 5; i++) {
    const diff = (b[i] ?? 0) - (a[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export function scoreWithoutTeam(player: PlayerVM, graph: Graph) {
  const onRoster = new Set(player.tots.map((tot) => tot.tournament.pk));
  const pks = new Set([...Object.keys(player.goals), ...Object.keys(player.assists)].map(Number));
  return [...pks]
    .filter((pk) => !onRoster.has(pk))
    .sort((a, b) => a - b)
    .flatMap((pk) => {
      const tournament = graph.tournamentsById.get(pk);
      return tournament
        ? [{ tournament, goals: player.goals[pk] ?? 0, assists: player.assists[pk] ?? 0 }]
        : [];
    });
}

let last: { raw: RawData; graph: Graph } | null = null;

/** buildGraph memoized on the identity of the four inputs (TanStack keeps refs stable until data changes). */
export function buildGraphCached(raw: RawData): Graph {
  if (
    last &&
    last.raw.players === raw.players &&
    last.raw.tots === raw.tots &&
    last.raw.goals === raw.goals &&
    last.raw.emptyTournaments === raw.emptyTournaments
  )
    return last.graph;
  const graph = buildGraph(raw);
  last = { raw, graph };
  return graph;
}
