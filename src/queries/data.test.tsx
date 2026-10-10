import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { expect, test } from 'vitest';
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
