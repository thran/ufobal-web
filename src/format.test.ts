import { expect, test } from 'vitest';
import { formatDate, formatDateTime, formatNumber, formatRank } from './format';

const nbsp = '\u00a0';

test('formatNumber uses Czech grouping and decimals', () => {
  expect(formatNumber(12345)).toBe(`12${nbsp}345`);
  expect(formatNumber(93.44, 1)).toBe('93,4');
  expect(formatNumber(null)).toBe('');
  expect(formatNumber(Number.NaN)).toBe('');
});

test('formatDate formats ISO date, tolerates junk', () => {
  expect(formatDate('2023-06-10')).toBe('10. 6. 2023');
  expect(formatDate('None')).toBe('');
  expect(formatDate(null)).toBe('');
});

test('formatDateTime formats local datetime', () => {
  expect(formatDateTime('2024-05-01T08:05:00')).toBe('1. 5. 2024 8:05');
  expect(formatDateTime(undefined)).toBe('');
});

test('formatRank', () => {
  expect(formatRank(1)).toBe('1.');
  expect(formatRank(null)).toBe('-');
});
