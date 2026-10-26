import { expect, test } from 'vitest';
import type { User } from '../api/types';
import { canRecord, isAdmin, isLoggedIn, isManager, isOwnPlayer } from './permissions';

const base: User = {
  first_name: 'A',
  last_name: 'B',
  is_staff: false,
  is_admin: false,
  is_manager: false,
  is_authorized: false,
  player: null,
};
const player = { pk: 7, name: 'a', lastname: 'b', nickname: 'c', age: 20, full_name: 'a b', gender: 'man', is_paired: true };

test('anonymous', () => {
  expect(isLoggedIn(null)).toBe(false);
  expect(isManager(null)).toBe(false);
  expect(isAdmin(null)).toBe(false);
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

test('manager', () => {
  expect(isManager(base)).toBe(false);
  expect(isManager({ ...base, is_manager: true })).toBe(true);
});

test('admin', () => {
  expect(isAdmin(base)).toBe(false);
  expect(isAdmin({ ...base, is_admin: true })).toBe(true);
});
