import { expect, test } from 'vitest';
import { groupCell, groupRecord, groupScore } from './groups';

const matches = {
  '1-2': { '1': [3, 1, 0] as [number, number, number] },
  '2-1': { '1': [1, 3, 0] as [number, number, number] },
  '1-3': { '1': [2, 2, 1] as [number, number, number] },
};
const stats = {
  '1': { '1': { score: [5, 3] as [number, number], wins: 1, looses: 0, winsP: 0, loosesP: 0, draws: 1 } },
  '3': { '1': { score: [2, 2] as [number, number], wins: 1, looses: 1, winsP: 1, loosesP: 1, draws: 0 } },
};

test('groupCell', () => {
  expect(groupCell(matches, 1, 2, 1)).toBe('3 : 1');
  expect(groupCell(matches, 1, 3, 1)).toBe('2 : 2 P');
  expect(groupCell(matches, 2, 3, 1)).toBe('');
  expect(groupCell(matches, 1, 2, 2)).toBe('');
});

test('groupRecord and groupScore', () => {
  expect(groupRecord(stats, 1, 1)).toBe('1 / 0 / 1');
  expect(groupRecord(stats, 3, 1)).toBe('1(1P) / 1(1P) / 0');
  expect(groupRecord(stats, 9, 1)).toBe('');
  expect(groupScore(stats, 1, 1)).toBe('5 : 3');
});
