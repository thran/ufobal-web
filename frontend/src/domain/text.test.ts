import { expect, test } from 'vitest';
import { searchKey } from './text';

test('searchKey lowercases and strips Czech diacritics', () => {
  expect(searchKey('Pépa Kométa ŘŽČ')).toBe('pepa kometa rzc');
  expect(searchKey('')).toBe('');
});
