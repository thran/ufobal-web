import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createQueryClient } from '../queryClient';
import { SOCIAL_LOGIN_MESSAGE, useLogin, useLogout, useSocialLoginListener, useUser } from './user';

const fetchMock = vi.fn();
beforeEach(() => vi.stubGlobal('fetch', fetchMock));
afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

const user = { first_name: 'A', last_name: 'B', is_staff: false, is_authorized: true, player: null };

function setup(initialUser?: typeof user | null) {
  const qc = createQueryClient(
    initialUser === undefined ? null : { user: initialUser, liveTournamentPk: null, test: false },
  );
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  return { qc, wrapper };
}

test('useUser fetches user_profile when no initial data', async () => {
  fetchMock.mockResolvedValueOnce(new Response('null', { status: 200 }));
  const { wrapper } = setup();
  const { result } = renderHook(() => useUser(), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toBeNull();
  expect(fetchMock.mock.calls[0][0]).toBe('/api_frontend/user_profile');
});

test('useUser uses initial data without fetching', () => {
  const { wrapper } = setup(user);
  const { result } = renderHook(() => useUser(), { wrapper });
  expect(result.current.data).toEqual(user);
  expect(fetchMock).not.toHaveBeenCalled();
});

test('login stores returned user', async () => {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(user), { status: 200 }));
  const { qc, wrapper } = setup(null);
  const { result } = renderHook(() => useLogin(), { wrapper });
  await act(() => result.current.mutateAsync({ username: 'a', password: 'b' }));
  expect(qc.getQueryData(['user'])).toEqual(user);
});

test('logout clears user', async () => {
  fetchMock.mockResolvedValueOnce(new Response('ok', { status: 202 }));
  const { qc, wrapper } = setup(user);
  const { result } = renderHook(() => useLogout(), { wrapper });
  await act(() => result.current.mutateAsync());
  expect(qc.getQueryData(['user'])).toBeNull();
});

test('social login message from same origin refetches user; other origins ignored', async () => {
  const { qc, wrapper } = setup(null);
  const spy = vi.spyOn(qc, 'invalidateQueries');
  renderHook(() => useSocialLoginListener(), { wrapper });
  window.dispatchEvent(new MessageEvent('message', { data: { type: SOCIAL_LOGIN_MESSAGE }, origin: 'https://evil.example' }));
  expect(spy).not.toHaveBeenCalled();
  window.dispatchEvent(new MessageEvent('message', { data: { type: SOCIAL_LOGIN_MESSAGE }, origin: window.location.origin }));
  expect(spy).toHaveBeenCalled();
});
