import { beforeEach, expect, test, vi } from 'vitest';
import { toast } from 'sonner';
import { ApiError } from './api/client';
import { createQueryClient } from './queryClient';

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

beforeEach(() => vi.mocked(toast.error).mockClear());

const user = { first_name: 'A', last_name: 'B', is_staff: false, is_authorized: true, player: null };

test('seeds user from initial data, including anonymous null', () => {
  expect(createQueryClient({ user, liveTournamentPk: 1, test: false }).getQueryData(['user'])).toEqual(user);
  expect(createQueryClient({ user: null, liveTournamentPk: 1, test: false }).getQueryData(['user'])).toBeNull();
  expect(createQueryClient(null).getQueryData(['user'])).toBeUndefined();
});

test('401 from a query shows toast and invalidates user', async () => {
  const qc = createQueryClient(null);
  const spy = vi.spyOn(qc, 'invalidateQueries');
  await qc
    .fetchQuery({ queryKey: ['x'], queryFn: () => Promise.reject(new ApiError(401, 'Unauthorized')), retry: false })
    .catch(() => {});
  expect(toast.error).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({ queryKey: ['user'] });
});

test('mutation error shows server message', async () => {
  const qc = createQueryClient(null);
  await qc
    .getMutationCache()
    .build(qc, { mutationFn: () => Promise.reject(new ApiError(400, 'Hesla se liší.')) })
    .execute(undefined)
    .catch(() => {});
  expect(toast.error).toHaveBeenCalledWith('Hesla se liší.');
});

test('401 with error_type (wrong password) shows server message', async () => {
  const qc = createQueryClient(null);
  await qc
    .getMutationCache()
    .build(qc, { mutationFn: () => Promise.reject(new ApiError(401, 'Špatné jméno nebo heslo.', 'password_username_not_match')) })
    .execute(undefined)
    .catch(() => {});
  expect(toast.error).toHaveBeenCalledWith('Špatné jméno nebo heslo.');
});

test('4xx errors are not retried', async () => {
  const qc = createQueryClient(null);
  const queryFn = vi.fn(() => Promise.reject(new ApiError(404, 'Not found')));
  await qc.fetchQuery({ queryKey: ['y'], queryFn }).catch(() => {});
  expect(queryFn).toHaveBeenCalledTimes(1);
});
