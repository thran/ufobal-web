import type { CardType, GoalType, MatchDto } from '../api/types';
import { hmsToMs } from './time';

export type EventType = 'goal' | 'shot' | 'penalty' | 'goalieChange' | 'halftime' | 'end';
export interface GoalData {
  shooter: number | null;
  assistance: number | null;
  goalType: GoalType;
}
export interface ShotData {
  shooter: number | null;
}
export interface PenaltyData {
  player: number;
  card: CardType;
  reason: string;
}
export interface GoalieData {
  goalie: number;
}
export type EventData = GoalData | ShotData | PenaltyData | GoalieData;

export interface MatchEvent {
  /** Client UUID (sent as client_id; echoed back by the server); `srv-<type>-<pk>` for server events without one. */
  id: string;
  type: EventType;
  time: string;
  team: number | null;
  data: EventData | null;
  pk: number | null;
  saved: boolean;
  /** Goal edited after creation (old flag; kept for compatibility of imported data). */
  onlyEdit?: boolean;
  /** Permanent sync error message. */
  error?: string | null;
}

export const CARDS: { id: CardType; text: string }[] = [
  { id: 'yellow', text: 'žlutá' },
  { id: 'red', text: 'červená' },
];
export const PENALTY_REASONS = [
  'Útočný faul',
  'Nebezpečná střela',
  'Obranný faul',
  'Držení',
  'Drsná hra',
  'Nesportovní chování',
  'Urážení rozhodčího',
  'Jiné',
];
export const cardText = (card: CardType) => (card === 'red' ? 'červená' : 'žlutá');
export const penaltyLengthMs = (card: CardType) => (card === 'red' ? 120_000 : 60_000);

export const sortEvents = (events: MatchEvent[]) =>
  [...events].sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));

const serverId = (type: EventType, pk: number) => `srv-${type}-${pk}`;

/** Old inTeam(team_one, player) ? team_one : team_two. */
export function teamOf(match: MatchDto, rosterOf: (tot: number | null) => number[], player: number | null) {
  return player != null && rosterOf(match.team_one).includes(player) ? match.team_one : match.team_two;
}

export function serverEvents(match: MatchDto, rosterOf: (tot: number | null) => number[]) {
  const events: MatchEvent[] = [];
  const base = { saved: true, error: null } as const;
  for (const g of match.goals) {
    events.push({
      ...base,
      id: g.client_id ?? serverId('goal', g.pk),
      type: 'goal',
      time: g.time ?? '00:00:00',
      pk: g.pk,
      team: teamOf(match, rosterOf, g.shooter),
      data: { shooter: g.shooter, assistance: g.assistance, goalType: g.type ?? 'normal' },
    });
  }
  for (const s of match.shots) {
    events.push({
      ...base,
      id: s.client_id ?? serverId('shot', s.pk),
      type: 'shot',
      time: s.time,
      pk: s.pk,
      team: s.team,
      data: { shooter: s.shooter },
    });
  }
  for (const p of match.penalties) {
    events.push({
      ...base,
      id: p.client_id ?? serverId('penalty', p.pk),
      type: 'penalty',
      time: p.time,
      pk: p.pk,
      team: teamOf(match, rosterOf, p.player),
      data: { player: p.player, card: p.card, reason: p.reason },
    });
  }
  const initialGoalies: Record<number, number | null> = {};
  for (const g of [...match.goalies].sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0))) {
    const team = teamOf(match, rosterOf, g.goalie);
    if (team == null) continue;
    if (g.start === '00:00:00') initialGoalies[team] = g.goalie;
    else
      events.push({
        ...base,
        id: g.client_id ?? serverId('goalieChange', g.pk),
        type: 'goalieChange',
        time: g.start,
        pk: g.pk,
        team,
        data: { goalie: g.goalie },
      });
  }
  if (match.halftime_length)
    events.push({
      ...base,
      id: 'halftime',
      type: 'halftime',
      time: match.halftime_length,
      team: null,
      data: null,
      pk: null,
    });
  if (match.length)
    events.push({ ...base, id: 'end', type: 'end', time: match.length, team: null, data: null, pk: null });
  return { events: sortEvents(events), initialGoalies };
}

/**
 * Local events win over server events with the same type+pk or id (edited locally / not yet acknowledged).
 * A local copy without pk adopts the server pk so later edits and deletes target the stored row.
 */
export function mergeLocal(server: MatchEvent[], local: MatchEvent[]): MatchEvent[] {
  const serverById = new Map(server.map((e) => [e.id, e]));
  const merged = local.map((e) => {
    const srv = serverById.get(e.id);
    return e.pk == null && srv?.pk != null && srv.type === e.type ? { ...e, pk: srv.pk } : e;
  });
  const localKeys = new Set(merged.filter((e) => e.pk != null).map((e) => `${e.type}-${e.pk}`));
  const localIds = new Set(merged.map((e) => e.id));
  return sortEvents([
    ...merged,
    ...server.filter((e) => !localKeys.has(`${e.type}-${e.pk}`) && !localIds.has(e.id)),
  ]);
}

export function computeGoalies(initial: Record<number, number | null>, events: MatchEvent[]) {
  const goalies = { ...initial };
  for (const e of sortEvents(events)) {
    if (e.type === 'goalieChange' && e.team != null) goalies[e.team] = (e.data as GoalieData).goalie;
  }
  return goalies;
}

export function eventCounts(events: MatchEvent[], team: number | null) {
  let goals = 0;
  let shots = 0;
  for (const e of events) {
    if (e.team !== team) continue;
    if (e.type === 'goal') goals += 1;
    if (e.type === 'shot') shots += 1;
  }
  return { goals, shots };
}

export function activePenalties(events: MatchEvent[], team: number | null, gameMs: number) {
  return events
    .filter((e) => e.type === 'penalty' && e.team === team)
    .map((e) => {
      const len = penaltyLengthMs((e.data as PenaltyData).card);
      const elapsed = gameMs - hmsToMs(e.time);
      return { event: e, remainingMs: len - elapsed, active: elapsed >= 0 && elapsed <= len };
    })
    .filter((p) => p.active)
    .sort((a, b) => (a.event.time < b.event.time ? 1 : -1));
}
