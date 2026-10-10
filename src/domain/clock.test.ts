import { expect, test } from 'vitest';
import {
  adjustClock,
  gameTimeMs,
  initialClock,
  remaining,
  startClock,
  stopClock,
  stoppedClock,
} from './clock';

test('wall-clock based start/stop/adjust', () => {
  let c = stoppedClock(600_000);
  c = startClock(c, 1000);
  expect(remaining(c, 61_000)).toBe(540_000);
  c = adjustClock(c, 5000);
  expect(remaining(c, 61_000)).toBe(545_000);
  c = stopClock(c, 61_000);
  expect(c.running).toBe(false);
  expect(remaining(c, 999_999)).toBe(545_000);
  expect(adjustClock(c, -1000).remainingMs).toBe(544_000);
});

test('gameTimeMs adds first half only in phase 2', () => {
  expect(gameTimeMs(10, 400_000, 1, null)).toBe(200_000);
  expect(gameTimeMs(10, 400_000, 2, '00:10:30')).toBe(830_000);
  expect(gameTimeMs(10, 400_000, null, '00:10:30')).toBe(200_000);
});

test('initialClock derives phase like old setTime', () => {
  expect(
    initialClock({ halftimeMinutes: 10, h1Length: null, length: null, start: null, latestTime: '00:00:00' }),
  ).toEqual({ phase: 0, clock: stoppedClock(600_000) });
  expect(
    initialClock({ halftimeMinutes: 10, h1Length: null, length: null, start: null, latestTime: '00:03:00' })
      .phase,
  ).toBe(1);
  expect(
    initialClock({ halftimeMinutes: 10, h1Length: null, length: null, start: 'x', latestTime: '00:00:00' })
      .phase,
  ).toBe(1);
  const h2 = initialClock({
    halftimeMinutes: 10,
    h1Length: '00:10:30',
    length: null,
    start: 'x',
    latestTime: '00:12:30',
  });
  expect(h2.phase).toBe(2);
  expect(h2.clock.remainingMs).toBe(600_000 - 750_000 + 630_000);
  expect(
    initialClock({
      halftimeMinutes: 10,
      h1Length: '00:10:00',
      length: '00:20:00',
      start: 'x',
      latestTime: '00:20:00',
    }).phase,
  ).toBeNull();
});
