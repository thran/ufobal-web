import type { MatchPatch } from '../api/types';
import {
  gameTimeMs,
  remaining,
  startClock,
  stopClock,
  stoppedClock,
  adjustClock,
  type ClockState,
  type Phase,
} from './clock';
import { computeGoalies, sortEvents, type EventData, type MatchEvent } from './matchEvents';
import { msToHms } from './time';

export interface RecorderState {
  matchPk: number;
  tournamentPk: number;
  teamOne: number | null;
  teamTwo: number | null;
  halftimeMinutes: number;
  phase: Phase;
  h1Length: string | null;
  length: string | null;
  start: string | null;
  end: string | null;
  referee: number | null;
  matchPatch: MatchPatch | null;
  matchPatchError: string | null;
  clock: ClockState;
  events: MatchEvent[];
  initialGoalies: Record<number, number | null>;
  goalies: Record<number, number | null>;
  sidesSwapped: boolean;
}

export type RecorderAction =
  | { type: 'clockStart'; now: number }
  | { type: 'clockStop'; now: number }
  | { type: 'clockAdjust'; delta: number }
  | { type: 'kickoff'; now: number; at: string }
  | { type: 'nextPhase'; now: number; at: string }
  | { type: 'setReferee'; referee: number }
  | { type: 'addEvent'; event: MatchEvent }
  | { type: 'editEvent'; id: string; time: string; data: EventData }
  | { type: 'removeEvent'; id: string }
  | { type: 'syncOk'; id: string; pk: number | null; sent?: { time: string; data: string } }
  | { type: 'syncFail'; id: string; message: string }
  | { type: 'retryEvent'; id: string }
  | { type: 'patchOk'; sent: MatchPatch }
  | { type: 'patchFail'; message: string }
  | { type: 'retryPatch' }
  | { type: 'swapSides' };

export const currentGameTime = (s: RecorderState, now: number) =>
  msToHms(gameTimeMs(s.halftimeMinutes, remaining(s.clock, now), s.phase, s.h1Length));

export const marker = (type: 'halftime' | 'end', time: string): MatchEvent => ({
  id: type,
  type,
  time,
  team: null,
  data: null,
  pk: null,
  saved: true,
  error: null,
});

const withEvents = (s: RecorderState, events: MatchEvent[]): RecorderState => {
  const sorted = sortEvents(events);
  return { ...s, events: sorted, goalies: computeGoalies(s.initialGoalies, sorted) };
};

const patch = (s: RecorderState, p: MatchPatch): MatchPatch => ({ ...(s.matchPatch ?? {}), ...p });

export function recorderReducer(s: RecorderState, a: RecorderAction): RecorderState {
  switch (a.type) {
    case 'clockStart':
      return s.phase === 0 ? s : { ...s, clock: startClock(s.clock, a.now) };
    case 'clockStop':
      return { ...s, clock: stopClock(s.clock, a.now) };
    case 'clockAdjust':
      return { ...s, clock: adjustClock(s.clock, a.delta) };
    case 'kickoff':
      if (s.phase !== 0) return s;
      return {
        ...s,
        phase: 1,
        start: a.at,
        matchPatch: patch(s, { start: a.at }),
        clock: startClock(s.clock, a.now),
      };
    case 'nextPhase': {
      const clock = stopClock(s.clock, a.now);
      const time = msToHms(gameTimeMs(s.halftimeMinutes, clock.remainingMs, s.phase, s.h1Length));
      if (s.phase === 1) {
        return withEvents(
          {
            ...s,
            phase: 2,
            h1Length: time,
            clock: stoppedClock(s.halftimeMinutes * 60_000),
            matchPatch: patch(s, { halftime_length: time }),
          },
          [...s.events, marker('halftime', time)],
        );
      }
      if (s.phase === 2) {
        return withEvents(
          {
            ...s,
            phase: null,
            length: time,
            end: a.at,
            clock,
            matchPatch: patch(s, { length: time, end: a.at }),
          },
          [...s.events, marker('end', time)],
        );
      }
      return s;
    }
    case 'setReferee':
      return {
        ...s,
        referee: a.referee,
        matchPatch: patch(s, { referee: a.referee }),
        matchPatchError: null,
      };
    case 'addEvent':
      return withEvents(s, [...s.events, a.event]);
    case 'editEvent':
      return withEvents(
        s,
        s.events.map((e) =>
          e.id === a.id
            ? {
                ...e,
                time: a.time,
                data: a.data,
                saved: false,
                error: null,
                onlyEdit: e.type === 'goal' ? true : e.onlyEdit,
              }
            : e,
        ),
      );
    case 'removeEvent':
      return withEvents(
        s,
        s.events.filter((e) => e.id !== a.id),
      );
    case 'syncOk':
      return {
        ...s,
        events: s.events.map((e) =>
          e.id === a.id
            ? {
                ...e,
                saved: !a.sent || (e.time === a.sent.time && JSON.stringify(e.data) === a.sent.data),
                error: null,
                pk: a.pk ?? e.pk,
              }
            : e,
        ),
      };
    case 'syncFail':
      return { ...s, events: s.events.map((e) => (e.id === a.id ? { ...e, error: a.message } : e)) };
    case 'retryEvent':
      return { ...s, events: s.events.map((e) => (e.id === a.id ? { ...e, error: null } : e)) };
    case 'patchOk': {
      if (!s.matchPatch) return s;
      const rest = Object.fromEntries(
        Object.entries(s.matchPatch).filter(([k, v]) => a.sent[k as keyof MatchPatch] !== v),
      ) as MatchPatch;
      return { ...s, matchPatch: Object.keys(rest).length ? rest : null, matchPatchError: null };
    }
    case 'patchFail':
      return { ...s, matchPatchError: a.message };
    case 'retryPatch':
      return { ...s, matchPatchError: null };
    case 'swapSides':
      return { ...s, sidesSwapped: !s.sidesSwapped };
  }
}
