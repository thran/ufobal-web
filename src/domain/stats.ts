import type { GoalieStatDto } from '../api/types';
import type { Graph, PlayerVM, TournamentVM } from './graph';

export type CategoryKey = 'nizkov' | 'brno' | 'hala' | 'liga' | 'other';
const CATEGORY_KEYS: CategoryKey[] = ['nizkov', 'brno', 'hala', 'liga', 'other'];

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  nizkov: 'Nížkov',
  brno: 'Brno',
  hala: 'Hala',
  liga: 'Liga',
  other: 'Další',
};

export interface StatsFilter {
  yearFrom: number | null;
  yearTo: number | null;
  categories: Record<CategoryKey, boolean>;
  man: boolean;
  woman: boolean;
  minMatches: number;
  team: string;
}

export function defaultStatsFilter(thisYear: number): StatsFilter {
  return {
    yearFrom: thisYear - 6,
    yearTo: thisYear,
    categories: { nizkov: true, brno: true, hala: false, liga: false, other: false },
    man: true,
    woman: true,
    minMatches: 10,
    team: '',
  };
}

export const STATS_PARAM_KEYS = ['from', 'to', 'cat', 'g', 'min', 'team'] as const;

const int = (s: string | null) => (s !== null && /^-?\d+$/.test(s) ? Number(s) : undefined);

export function parseStatsFilter(params: URLSearchParams, thisYear: number): StatsFilter {
  const f = defaultStatsFilter(thisYear);
  const year = (name: string, fallback: number | null) => {
    const raw = params.get(name);
    if (raw === null) return fallback;
    if (raw === '') return null;
    return int(raw) ?? fallback;
  };
  f.yearFrom = year('from', f.yearFrom);
  f.yearTo = year('to', f.yearTo);
  const cat = params.get('cat');
  if (cat !== null) {
    const enabled = new Set(cat.split(','));
    f.categories = Object.fromEntries(CATEGORY_KEYS.map((k) => [k, enabled.has(k)])) as Record<
      CategoryKey,
      boolean
    >;
  }
  const g = params.get('g');
  if (g !== null && g !== 'mw') {
    f.man = g === 'm';
    f.woman = g === 'w';
  }
  const min = int(params.get('min'));
  if (min !== undefined) f.minMatches = Math.max(0, min);
  f.team = params.get('team') ?? '';
  return f;
}

export function statsFilterParams(f: StatsFilter): Record<string, string> {
  return {
    from: f.yearFrom == null ? '' : String(f.yearFrom),
    to: f.yearTo == null ? '' : String(f.yearTo),
    cat: CATEGORY_KEYS.filter((k) => f.categories[k]).join(','),
    g: f.man && f.woman ? 'mw' : f.man ? 'm' : f.woman ? 'w' : '0',
    min: String(f.minMatches),
    team: f.team,
  };
}

export function filterTournaments(
  ts: TournamentVM[],
  f: StatsFilter,
  opts: { allowLiga: boolean },
): TournamentVM[] {
  return ts
    .filter((t) => {
      if (f.yearFrom != null && t.year < f.yearFrom) return false;
      if (f.yearTo != null && t.year > f.yearTo) return false;
      const slug = t.category_slugname;
      if (slug === 'trening') return false;
      if (slug === 'liga') return opts.allowLiga && f.categories.liga;
      if (slug) return f.categories[slug];
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function genderMatches(
  player: { gender: string | null },
  f: Pick<StatsFilter, 'man' | 'woman'>,
): boolean {
  return (f.man || player.gender === 'woman') && (f.woman || player.gender === 'man');
}

export interface PlayerStatsRow {
  player: PlayerVM;
  perTournament: Record<number, { goals?: number; assists?: number }>;
  goals: number;
  assists: number;
  canada: number;
}

export function playerStatsRows(players: PlayerVM[], tournaments: TournamentVM[]): PlayerStatsRow[] {
  return players.map((player) => {
    const row: PlayerStatsRow = { player, perTournament: {}, goals: 0, assists: 0, canada: 0 };
    for (const t of tournaments) {
      const goals = player.goals[t.pk];
      const assists = player.assists[t.pk];
      if (goals === undefined && assists === undefined) continue;
      row.perTournament[t.pk] = {
        ...(goals !== undefined && { goals }),
        ...(assists !== undefined && { assists }),
      };
      row.goals += goals ?? 0;
      row.assists += assists ?? 0;
    }
    row.canada = row.goals + row.assists;
    return row;
  });
}

export interface GoalieTournamentStat {
  matches: number;
  shots: number;
  goals: number;
  success: number;
}

export interface GoalieStatsRow extends GoalieTournamentStat {
  player: PlayerVM;
  perTournament: Record<number, GoalieTournamentStat>;
}

const success = (goals: number, shots: number) => (shots ? 1 - goals / shots : Number.NaN);

export function goalieStatsRows(
  stats: GoalieStatDto[],
  graph: Graph,
  tournaments: TournamentVM[],
): GoalieStatsRow[] {
  const allowed = new Set(tournaments.map((t) => t.pk));
  const rows = new Map<number, GoalieStatsRow>();
  for (const s of stats) {
    if (!allowed.has(s.tournament)) continue;
    const player = graph.playersById.get(s.goalie);
    if (!player) continue;
    let row = rows.get(s.goalie);
    if (!row) {
      row = { player, perTournament: {}, matches: 0, shots: 0, goals: 0, success: Number.NaN };
      rows.set(s.goalie, row);
    }
    row.perTournament[s.tournament] = {
      matches: s.matches,
      shots: s.shots,
      goals: s.goals,
      success: success(s.goals, s.shots),
    };
    row.matches += s.matches;
    row.shots += s.shots;
    row.goals += s.goals;
  }
  for (const row of rows.values()) row.success = success(row.goals, row.shots);
  return [...rows.values()];
}

export function tournamentsWithGoalieStats(
  stats: GoalieStatDto[],
  tournaments: TournamentVM[],
): TournamentVM[] {
  const present = new Set(stats.map((s) => s.tournament));
  return tournaments.filter((t) => present.has(t.pk));
}
