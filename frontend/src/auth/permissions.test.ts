import { expect, test } from 'vitest';
import type { User } from '../api/types';
import { canRecord, isLoggedIn, isOwnPlayer, isStaff } from './permissions';

const base: User = { first_name: 'A', last_name: 'B', is_staff: false, is_authorized: false, player: null };
const player = { pk: 7, name: 'a', lastname: 'b', nickname: 'c', age: 20, full_name: 'a b', gender: 'man', is_paired: true };

test('anonymous', () => {
  expect(isLoggedIn(null)).toBe(false);
  expect(isStaff(null)).toBe(false);
  expect(canRecord(undefined)).toBe(false);
  expect(isOwnPlayer(null, 7)).toBe(false);
});

test('logged in user without player', () => {
  expect(isLoggedIn(base)).toBe(true);
  expect(canRecord(base)).toBe(false);
  expect(isOwnPlayer(base, 7)).toBe(false);
});

test('authorized user with player', () => {
  const u = { ...base, is_authorized: true, player };
  expect(canRecord(u)).toBe(true);
  expect(isOwnPlayer(u, 7)).toBe(true);
  expect(isOwnPlayer(u, 8)).toBe(false);
});

test('staff', () => {
  expect(isStaff({ ...base, is_staff: true })).toBe(true);
});
