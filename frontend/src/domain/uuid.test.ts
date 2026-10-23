import { afterEach, expect, test, vi } from 'vitest';
import { newId } from './uuid';

const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

afterEach(() => vi.unstubAllGlobals());

test('uses crypto.randomUUID when available', () => {
  expect(newId()).toMatch(V4);
});

test('falls back to getRandomValues without randomUUID', () => {
  vi.stubGlobal('crypto', { getRandomValues: (a: Uint8Array) => a.fill(0xff) });
  expect(newId()).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff');
});

test('falls back to Math.random without crypto', () => {
  vi.stubGlobal('crypto', undefined);
  const a = newId();
  expect(a).toMatch(V4);
  expect(newId()).not.toBe(a);
});
