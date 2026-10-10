import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { expect, test, vi } from 'vitest';
import { createQueryClient } from '../queryClient';
import { mockApi, mockGraphApi } from '../test/utils';
import { useGraph } from './data';

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={createQueryClient(null)}>{children}</QueryClientProvider>
);

test('useGraph loads all four lists and builds the graph', async () => {
  const fetchMock = mockGraphApi();
  const { result } = renderHook(() => useGraph(), { wrapper });
  expect(result.current.isPending).toBe(true);
  await waitFor(() => expect(result.current.graph).toBeDefined());
  expect(result.current.graph!.players).toHaveLength(3);
  expect(fetchMock).toHaveBeenCalledTimes(4);
});

test('useGraph exposes an error when a list fails', async () => {
  mockApi({ players: [], teamontournaments: [], goals: { goals: [], assists: [] } });
  const { result } = renderHook(() => useGraph(), { wrapper });
  await waitFor(() => expect(result.current.error).toBeTruthy());
  expect(result.current.graph).toBeUndefined();
  expect(result.current.isPending).toBe(false);
});

test('useGraph keeps the graph and hides the error when a refetch fails', async () => {
  mockGraphApi();
  const client = createQueryClient(null);
  const clientWrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useGraph(), { wrapper: clientWrapper });
  await waitFor(() => expect(result.current.graph).toBeDefined());

  const failing = vi.fn(async () => new Response('boom', { status: 500 }));
  vi.stubGlobal('fetch', failing);
  await act(async () => {
    await client.invalidateQueries();
  });
  await waitFor(() => expect(client.getQueryState(['players'])?.status).toBe('error'), { timeout: 4000 });
  expect(result.current.graph).toBeDefined();
  expect(result.current.error).toBeNull();
  expect(result.current.isPending).toBe(false);
}, 10000);
