import { useEffect, useRef, useState, type Dispatch } from 'react';
import { ApiError } from '../api/client';
import {
  addGoal,
  addPenalty,
  addShot,
  changeGoalie,
  editGoal,
  editMatch,
  editPenalty,
} from '../api/endpoints';
import type { MatchPatch } from '../api/types';
import type { GoalData, GoalieData, MatchEvent, PenaltyData, ShotData } from '../domain/matchEvents';
import type { RecorderAction, RecorderState } from '../domain/recorder';

export const RETRY_DELAYS = [2000, 5000, 10000, 30000];
export const SEND_TIMEOUT_MS = 15_000;
/** Consecutive transient failures of one item after which it is marked failed so the queue moves on. */
export const MAX_TRANSIENT_FAILURES = 5;

export class SyncTimeoutError extends Error {
  constructor() {
    super('Časový limit požadavku vypršel.');
    this.name = 'SyncTimeoutError';
  }
}

/** Aborts the request and rejects even if the underlying promise ignores the signal. */
export function withTimeout<T>(run: (signal: AbortSignal) => Promise<T>, ms = SEND_TIMEOUT_MS): Promise<T> {
  const ctrl = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      ctrl.abort();
      reject(new SyncTimeoutError());
    }, ms);
  });
  return Promise.race([run(ctrl.signal), timeout]).finally(() => clearTimeout(timer));
}

export type Work = { kind: 'patch'; patch: MatchPatch } | { kind: 'event'; event: MatchEvent };

export function nextWork(s: RecorderState): Work | null {
  if (s.matchPatch && !s.matchPatchError) return { kind: 'patch', patch: s.matchPatch };
  const event = s.events.find((e) => !e.saved && !e.error && e.type !== 'halftime' && e.type !== 'end');
  return event ? { kind: 'event', event } : null;
}

export async function sendWork(work: Work, s: RecorderState, signal?: AbortSignal): Promise<number | null> {
  if (work.kind === 'patch') {
    await editMatch(s.matchPk, work.patch, signal);
    return null;
  }
  const { event: e } = work;
  const match = s.matchPk;
  switch (e.type) {
    case 'goal': {
      const d = e.data as GoalData;
      const body = {
        match,
        shooter: d.shooter as number,
        time: e.time,
        ...(d.assistance != null && { assistance: d.assistance }),
        ...(d.goalType !== 'normal' && { type: d.goalType }),
      };
      if (e.pk) {
        await editGoal(e.pk, body, signal);
        return null;
      }
      return addGoal({ ...body, client_id: e.id }, signal);
    }
    case 'shot': {
      const d = e.data as ShotData;
      return addShot(
        {
          match,
          team: e.team as number,
          time: e.time,
          ...(d.shooter != null && { shooter: d.shooter }),
          client_id: e.id,
        },
        signal,
      );
    }
    case 'penalty': {
      const d = e.data as PenaltyData;
      const body = { match, player: d.player, card: d.card, reason: d.reason, time: e.time };
      if (e.pk) {
        await editPenalty(e.pk, body, signal);
        return null;
      }
      return addPenalty({ ...body, client_id: e.id }, signal);
    }
    case 'goalieChange': {
      const d = e.data as GoalieData;
      await changeGoalie(
        match,
        e.team as number,
        { goalie: d.goalie, time: e.time, client_id: e.id },
        signal,
      );
      return null;
    }
    default:
      return null;
  }
}

/** 4xx other than request timeout / rate limiting will not succeed on retry. */
export const isPermanent = (err: unknown) =>
  err instanceof ApiError &&
  err.status >= 400 &&
  err.status < 500 &&
  err.status !== 408 &&
  err.status !== 429;

export function useMatchSync(
  state: RecorderState,
  dispatch: Dispatch<RecorderAction>,
  opts: { enabled: boolean; onSynced?: () => void },
) {
  const [inFlightId, setInFlightId] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [wake, setWake] = useState(0);
  const busy = useRef(false);
  const attempt = useRef(0);
  const failures = useRef<{ id: string; count: number }>({ id: '', count: 0 });
  const mounted = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onSynced = useRef(opts.onSynced);
  useEffect(() => {
    onSynced.current = opts.onSynced;
  });
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(timer.current);
    };
  }, []);
  useEffect(() => {
    const onOnline = () => {
      clearTimeout(timer.current);
      setWake((w) => w + 1);
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, []);

  useEffect(() => {
    if (!opts.enabled || busy.current) return;
    const work = nextWork(state);
    if (!work) return;
    busy.current = true;
    clearTimeout(timer.current);
    const id = work.kind === 'event' ? work.event.id : 'patch';
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reflects an external request starting
    setInFlightId(id);
    withTimeout((signal) => sendWork(work, state, signal))
      .then((pk) => {
        busy.current = false;
        if (!mounted.current) return;
        setInFlightId(null);
        if (work.kind === 'patch') {
          dispatch({ type: 'patchOk', sent: work.patch });
        } else {
          dispatch({
            type: 'syncOk',
            id,
            pk,
            sent: { time: work.event.time, data: JSON.stringify(work.event.data) },
          });
        }
        attempt.current = 0;
        failures.current = { id: '', count: 0 };
        setOffline(false);
        onSynced.current?.();
      })
      .catch((err: unknown) => {
        busy.current = false;
        if (!mounted.current) return;
        setInFlightId(null);
        const fail = (message: string) =>
          dispatch(
            work.kind === 'patch' ? { type: 'patchFail', message } : { type: 'syncFail', id, message },
          );
        if (isPermanent(err)) {
          fail((err as Error).message);
          return;
        }
        // While the browser knows it is offline every request fails; just back off and wait for `online`.
        if (navigator.onLine !== false)
          failures.current =
            failures.current.id === id ? { id, count: failures.current.count + 1 } : { id, count: 1 };
        if (failures.current.count >= MAX_TRANSIENT_FAILURES) {
          failures.current = { id: '', count: 0 };
          attempt.current = 0;
          fail(`Uložení opakovaně selhává: ${(err as Error).message}`);
          return;
        }
        setOffline(true);
        const delay = RETRY_DELAYS[Math.min(attempt.current, RETRY_DELAYS.length - 1)];
        attempt.current += 1;
        timer.current = setTimeout(() => setWake((w) => w + 1), delay);
      });
  }, [state, wake, opts.enabled, dispatch]);

  const pending =
    state.events.filter((e) => !e.saved && !e.error && e.type !== 'halftime' && e.type !== 'end').length +
    (state.matchPatch && !state.matchPatchError ? 1 : 0);
  const errors = state.events.filter((e) => e.error).length + (state.matchPatchError ? 1 : 0);
  return { inFlightId, offline: offline && pending > 0, pending, errors };
}
