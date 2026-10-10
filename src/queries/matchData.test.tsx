import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { expect, test } from 'vitest';
import { createQueryClient } from '../queryClient';
import { sampleGoalieStats, sampleMatches } from '../test/fixtures';
import { mockApi } from '../test/utils';
import { useGoalieStats, useMatches } from './data';

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={createQueryClient(null)}>{children}</QueryClientProvider>
);

test('useMatches requests matches filtered by tournament', async () => {
  const fetchMock = mockApi({ 'matchs?tournament=1': sampleMatches() });
  const { result } = renderHook(() => useMatches(1), { wrapper });
  await waitFor(() => expect(result.current.data).toHaveLength(3));
  expect(String(fetchMock.mock.calls[0][0])).toBe('/api_frontend/matchs?tournament=1');
});

test('useGoalieStats with and without tournament', async () => {
  mockApi({
    goalie_stats: sampleGoalieStats(),
    'goalie_stats?tournament=1': sampleGoalieStats().slice(0, 2),
  });
  const all = renderHook(() => useGoalieStats(), { wrapper });
  const one = renderHook(() => useGoalieStats(1), { wrapper });
  await waitFor(() => expect(all.result.current.data).toHaveLength(3));
  await waitFor(() => expect(one.result.current.data).toHaveLength(2));
});
