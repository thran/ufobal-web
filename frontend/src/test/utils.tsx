import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { vi } from 'vitest';
import { API_BASE } from '../api/client';
import type { User } from '../api/types';
import { AppConfigProvider, type AppConfig } from '../AppContext';
import { createQueryClient } from '../queryClient';
import { sampleRaw } from './fixtures';

export function renderWithProviders(
  ui: ReactElement,
  opts: { user?: User | null; route?: string; path?: string; config?: Partial<AppConfig> } = {},
) {
  const queryClient = createQueryClient({
    user: opts.user ?? null,
    liveTournamentPk: null,
    test: false,
  });
  const config: AppConfig = { liveTournamentPk: null, test: false, ...opts.config };
  const result = render(
    <QueryClientProvider client={queryClient}>
      <AppConfigProvider value={config}>
        <MemoryRouter initialEntries={[opts.route ?? '/']}>{opts.path ? <Routes><Route path={opts.path} element={ui} /></Routes> : ui}</MemoryRouter>
      </AppConfigProvider>
    </QueryClientProvider>,
  );
  return { ...result, queryClient };
}

export const testUser = (overrides: Partial<User> = {}): User => ({
  first_name: 'Jan',
  last_name: 'Novák',
  is_staff: false,
  is_admin: false,
  is_manager: false,
  is_authorized: false,
  player: null,
  ...overrides,
});

export function mockApi(responses: Record<string, unknown>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const path = String(input).replace(API_BASE, '');
    if (!(path in responses)) return new Response('not found', { status: 404 });
    return new Response(JSON.stringify(responses[path]), { status: 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

export function mockGraphApi(extra: Record<string, unknown> = {}) {
  const raw = sampleRaw();
  return mockApi({
    players: raw.players,
    teamontournaments: raw.tots,
    goals: raw.goals,
    get_empty_trournaments: raw.emptyTournaments,
    ...extra,
  });
}
