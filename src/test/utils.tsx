import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router';
import type { User } from '../api/types';
import { AppConfigProvider, type AppConfig } from '../AppContext';
import { createQueryClient } from '../queryClient';

export function renderWithProviders(
  ui: ReactElement,
  opts: { user?: User | null; route?: string; config?: Partial<AppConfig> } = {},
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
        <MemoryRouter initialEntries={[opts.route ?? '/']}>{ui}</MemoryRouter>
      </AppConfigProvider>
    </QueryClientProvider>,
  );
  return { ...result, queryClient };
}

export const testUser = (overrides: Partial<User> = {}): User => ({
  first_name: 'Jan',
  last_name: 'Novák',
  is_staff: false,
  is_authorized: false,
  player: null,
  ...overrides,
});
