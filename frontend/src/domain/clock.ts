import { hmsToMs } from './time';

export interface ClockState {
  running: boolean;
  /** Remaining ms while stopped. */
  remainingMs: number;
  /** Epoch ms when started (only meaningful while running). */
  startedAt: number;
  remainingAtStart: number;
}

export type Phase = 0 | 1 | 2 | null;

export const stoppedClock = (remainingMs: number): ClockState => ({
  running: false,
  remainingMs,
  startedAt: 0,
  remainingAtStart: remainingMs,
});

export const remaining = (c: ClockState, now: number) =>
  c.running ? c.remainingAtStart - (now - c.startedAt) : c.remainingMs;

export const startClock = (c: ClockState, now: number): ClockState =>
  c.running
    ? c
    : { running: true, remainingMs: c.remainingMs, startedAt: now, remainingAtStart: c.remainingMs };

export const stopClock = (c: ClockState, now: number): ClockState =>
  c.running ? stoppedClock(remaining(c, now)) : c;

export const adjustClock = (c: ClockState, delta: number): ClockState =>
  c.running ? { ...c, remainingAtStart: c.remainingAtStart + delta } : stoppedClock(c.remainingMs + delta);

/** Old getTime(): elapsed game time; the 1st-half length is added only in phase 2 (old quirk kept). */
export function gameTimeMs(
  halftimeMinutes: number,
  remainingMs: number,
  phase: Phase,
  h1Length: string | null,
) {
  let ms = halftimeMinutes * 60_000 - Math.round(remainingMs);
  if (phase === 2) ms += hmsToMs(h1Length);
  return ms;
}

/** Old setTime(match): derive phase and a stopped clock from match state and the latest known game time. */
export function initialClock(o: {
  halftimeMinutes: number;
  h1Length: string | null;
  length: string | null;
  start: string | null;
  latestTime: string;
}): { phase: Phase; clock: ClockState } {
  const t = hmsToMs(o.latestTime);
  const phase: Phase = o.length ? null : o.h1Length ? 2 : t || o.start ? 1 : 0;
  return { phase, clock: stoppedClock(o.halftimeMinutes * 60_000 - t + hmsToMs(o.h1Length)) };
}
