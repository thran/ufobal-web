import { expect, test } from 'vitest';
import { formatClock, hmsToMs, isValidHms, msToHms, nowDateTime, shortTime } from './time';

test('hms conversions incl. wrap-around like moment.utc', () => {
  expect(hmsToMs('00:01:05')).toBe(65_000);
  expect(hmsToMs(null)).toBe(0);
  expect(msToHms(65_999)).toBe('00:01:05');
  expect(msToHms(-5000)).toBe('23:59:55');
  expect(shortTime('00:12:34')).toBe('12:34');
  expect(isValidHms('00:12:34')).toBe(true);
  expect(isValidHms('12:34')).toBe(false);
});

test('formatClock matches old directive', () => {
  expect(formatClock(480_000)).toEqual({ text: '08:00.0', negative: false });
  expect(formatClock(61_234)).toEqual({ text: '01:01.2', negative: false });
  expect(formatClock(-1500)).toEqual({ text: '-00:02.4', negative: true });
});

test('nowDateTime formats local time', () => {
  expect(nowDateTime(new Date(2025, 4, 1, 8, 5, 9))).toBe('2025-05-01 08:05:09');
});
