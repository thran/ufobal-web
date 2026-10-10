import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createQueryClient } from '../queryClient';
import { dataKeys } from './data';
import { useAddMatch, useRemoveAttendance, useRegisterTeam } from './mutations';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const fetchMock = vi.fn();
beforeEach(() => vi.stubGlobal('fetch', fetchMock));
afterEach(() => fetchMock.mockReset());

function setup() {
  const qc = createQueryClient(null);
  const spy = vi.spyOn(qc, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { spy, wrapper };
}

test('register team returns new pk, invalidates lists and toasts', async () => {
  fetchMock.mockResolvedValueOnce(new Response('123', { status: 200 }));
  const { spy, wrapper } = setup();
  const { result } = renderHook(() => useRegisterTeam(), { wrapper });
  let pk = 0;
  await act(async () => {
    pk = await result.current.mutateAsync({
      tournament: 5,
      team: 7,
      contact_mail: 'a@b.cz',
      contact_phone: '1',
      strength: 2,
    });
  });
  expect(pk).toBe(123);
  expect(spy).toHaveBeenCalledWith({ queryKey: dataKeys.tots });
  expect(spy).toHaveBeenCalledWith({ queryKey: dataKeys.tournament(5) });
  expect(toast.success).toHaveBeenCalledWith('Tým přihlášen.');
});

test('remove attendance uses the literal "(" URL and DELETE', async () => {
  fetchMock.mockResolvedValueOnce(new Response('OK', { status: 200 }));
  const { wrapper } = setup();
  const { result } = renderHook(() => useRemoveAttendance(), { wrapper });
  await act(() => result.current.mutateAsync({ player: 12, team: 34 }));
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe('/api_frontend/remove_attendance/12-(34');
  expect(init.method).toBe('DELETE');
});

test('add match invalidates that tournament matches', async () => {
  fetchMock.mockResolvedValueOnce(new Response('77', { status: 200 }));
  const { spy, wrapper } = setup();
  const { result } = renderHook(() => useAddMatch(), { wrapper });
  await act(() =>
    result.current.mutateAsync({ tournament: 5, team_one: 1, team_two: 2, referee_team: 3, place: '1' }),
  );
  expect(spy).toHaveBeenCalledWith({ queryKey: dataKeys.matches(5) });
});
