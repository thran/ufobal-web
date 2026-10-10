import { expect, test } from 'vitest';
import { computeAge } from './age';

test('computeAge counts full years by month and day', () => {
  const today = new Date(2025, 5, 15);
  expect(computeAge('2000-06-15', today)).toBe(25);
  expect(computeAge('2000-06-16', today)).toBe(24);
  expect(computeAge('', today)).toBeNull();
  expect(computeAge('junk', today)).toBeNull();
  expect(computeAge(null, today)).toBeNull();
});
