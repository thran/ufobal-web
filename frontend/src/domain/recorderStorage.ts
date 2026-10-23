import type { MatchDto, MatchPatch, TournamentDto } from '../api/types';
import { initialClock, type ClockState, type Phase } from './clock';
import { computeGoalies, mergeLocal, serverEvents, type EventData, type MatchEvent } from './matchEvents';
import { marker, type RecorderState } from './recorder';
import { isValidHms } from './time';
import { newId } from './uuid';

export const storageKey = (pk: number) => `ufo:match:${pk}`;
const importedKey = (pk: number) => `ufo:match:${pk}:imported`;

export interface StoredRecorder {
  v: 1;
  phase: Phase;
  h1Length: string | null;
  length: string | null;
  start: string | null;
  end: string | null;
  referee: number | null;
  matchPatch: MatchPatch | null;
  clock: ClockState;
  /** Unsaved events only. */
  events: MatchEvent[];
  sidesSwapped: boolean;
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable or full */
  }
}

export function saveRecorder(s: RecorderState) {
  const stored: StoredRecorder = {
    v: 1,
    phase: s.phase,
    h1Length: s.h1Length,
    length: s.length,
    start: s.start,
    end: s.end,
    referee: s.referee,
    matchPatch: s.matchPatch,
    clock: s.clock,
    events: s.events.filter((e) => !e.saved),
    sidesSwapped: s.sidesSwapped,
  };
  write(storageKey(s.matchPk), JSON.stringify(stored));
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

function isStoredRecorder(v: unknown): v is StoredRecorder {
  if (!isObject(v) || v.v !== 1) return false;
  if (v.phase !== null && v.phase !== 0 && v.phase !== 1 && v.phase !== 2) return false;
  const c = v.clock;
  if (
    !isObject(c) ||
    typeof c.running !== 'boolean' ||
    typeof c.remainingMs !== 'number' ||
    typeof c.startedAt !== 'number' ||
    typeof c.remainingAtStart !== 'number'
  )
    return false;
  return (
    Array.isArray(v.events) &&
    v.events.every(
      (e) =>
        isObject(e) && typeof e.id === 'string' && typeof e.type === 'string' && typeof e.time === 'string',
    )
  );
}

export function loadRecorder(pk: number): StoredRecorder | null {
  const raw = read(storageKey(pk));
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isStoredRecorder(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Removes one event from the stored recorder data (used after the recorder unmounted). */
export function removeStoredEvent(pk: number, id: string) {
  const stored = loadRecorder(pk);
  if (!stored) return;
  write(storageKey(pk), JSON.stringify({ ...stored, events: stored.events.filter((e) => e.id !== id) }));
}

interface OldEvent {
  type: MatchEvent['type'];
  time: string;
  team?: number;
  onlyEdit?: boolean;
  data?: Record<string, unknown>;
}

/** One-time import of the old AngularJS recorder data (same origin). Old keys are left untouched. */
export function importOldRecorder(
  pk: number,
): { events: MatchEvent[]; time: string | null; patch: MatchPatch | null } | null {
  if (read(importedKey(pk))) return null;
  const rawEvents = read(`events${pk}`);
  const time = read(`time${pk}`);
  const rawMatch = read(`match${pk}`);
  if (!rawEvents && !time && !rawMatch) return null;
  write(importedKey(pk), '1');
  let events: MatchEvent[] = [];
  try {
    events = ((JSON.parse(rawEvents ?? '[]') as OldEvent[]) ?? []).flatMap((e) => convertOldEvent(e));
  } catch {
    events = [];
  }
  let patch: MatchPatch | null = null;
  try {
    const m = rawMatch ? (JSON.parse(rawMatch) as Record<string, unknown>) : null;
    if (m) {
      patch = {};
      for (const k of ['start', 'end'] as const) {
        if (typeof m[k] === 'string' && DATE_TIME.test(m[k])) patch[k] = m[k];
      }
      for (const k of ['halftime_length', 'length'] as const) {
        if (typeof m[k] === 'string' && isValidHms(m[k])) patch[k] = m[k];
      }
      if (typeof m.referee === 'number') patch.referee = m.referee;
      if (!Object.keys(patch).length) patch = null;
    }
  } catch {
    patch = null;
  }
  return { events, time: time && isValidHms(time) ? time : null, patch };
}

const DATE_TIME = /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/;

function convertOldEvent(e: OldEvent): MatchEvent[] {
  if (typeof e?.time !== 'string' || !isValidHms(e.time)) return [];
  const d = e.data ?? {};
  const num = (v: unknown) => (typeof v === 'number' ? v : null);
  let data: EventData;
  switch (e.type) {
    case 'goal':
      data = {
        shooter: num(d.shooter),
        assistance: num(d.assistance),
        goalType: (d.type as 'penalty' | 'shootout') ?? 'normal',
      };
      break;
    case 'shot':
      data = { shooter: num(d.shooter) };
      break;
    case 'penalty': {
      const player = num(d.player);
      if (player == null) return [];
      data = {
        player,
        card: d.card === 'red' ? 'red' : 'yellow',
        reason: String(d.reason ?? ''),
      };
      break;
    }
    case 'goalieChange': {
      const goalie = num(d.goalie);
      if (goalie == null) return [];
      data = { goalie };
      break;
    }
    default:
      return [];
  }
  return [
    {
      id: newId(),
      type: e.type,
      time: e.time,
      team: e.team ?? null,
      data,
      pk: num(d.pk),
      saved: false,
      onlyEdit: e.onlyEdit,
      error: null,
    },
  ];
}

export function initRecorder(o: {
  match: MatchDto;
  tournament: TournamentDto;
  rosterOf: (tot: number | null) => number[];
  stored: StoredRecorder | null;
  imported: ReturnType<typeof importOldRecorder>;
}): RecorderState {
  const { match, tournament } = o;
  const server = serverEvents(match, o.rosterOf);
  const common = {
    matchPk: match.pk,
    tournamentPk: tournament.pk,
    teamOne: match.team_one,
    teamTwo: match.team_two,
    halftimeMinutes: tournament.halftime_length,
    initialGoalies: server.initialGoalies,
    matchPatchError: null,
  };
  // Local data wins only while it holds unsaved changes; otherwise the server is the source of truth.
  const unsaved = o.stored && (o.stored.matchPatch != null || o.stored.events.length > 0);
  if (o.stored && unsaved) {
    const markers = [
      ...(o.stored.h1Length ? [marker('halftime', o.stored.h1Length)] : []),
      ...(o.stored.length ? [marker('end', o.stored.length)] : []),
    ].filter((m) => !server.events.some((e) => e.type === m.type));
    const events = mergeLocal([...server.events, ...markers], o.stored.events);
    return {
      ...common,
      phase: o.stored.phase,
      h1Length: o.stored.h1Length,
      length: o.stored.length,
      start: o.stored.start,
      end: o.stored.end,
      referee: o.stored.referee,
      matchPatch: o.stored.matchPatch,
      clock: o.stored.clock,
      events,
      goalies: computeGoalies(server.initialGoalies, events),
      sidesSwapped: o.stored.sidesSwapped,
    };
  }
  const p = o.imported?.patch ?? null;
  const events = mergeLocal(server.events, o.imported?.events ?? []);
  const latestTime = [o.imported?.time ?? '00:00:00', ...events.map((e) => e.time)].reduce((a, b) =>
    b > a ? b : a,
  );
  const h1Length = p?.halftime_length ?? match.halftime_length;
  const length = p?.length ?? match.length;
  const start = p?.start ?? match.start;
  const derived = initialClock({
    halftimeMinutes: tournament.halftime_length,
    h1Length,
    length,
    start,
    latestTime,
  });
  const { phase } = derived;
  // Keep a stored (possibly running) clock across reloads unless the server moved the match on.
  const clock = o.stored && o.stored.phase === phase ? o.stored.clock : derived.clock;
  return {
    ...common,
    phase,
    h1Length,
    length,
    start,
    end: p?.end ?? match.end,
    referee: p?.referee ?? match.referee,
    matchPatch: p,
    clock,
    events,
    goalies: computeGoalies(server.initialGoalies, events),
    sidesSwapped: o.stored?.sidesSwapped ?? false,
  };
}
