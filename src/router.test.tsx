import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, expect, test } from 'vitest';
import { AppConfigProvider } from './AppContext';
import { createQueryClient } from './queryClient';
import { routes } from './router';
import { mockApi } from './test/utils';

beforeEach(() => mockApi({}));

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const qc = createQueryClient({ user: null, liveTournamentPk: null, test: false });
  render(
    <QueryClientProvider client={qc}>
      <AppConfigProvider value={{ liveTournamentPk: null, test: false }}>
        <RouterProvider router={router} />
      </AppConfigProvider>
    </QueryClientProvider>,
  );
  return router;
}

test.each([
  ['/privacy_policy', '/privacy-policy'],
  ['/sin_slavy', '/hall-of-records'],
  ['/sparovat_ucet', '/pair-account'],
  ['/sparovat_ucet/abc', '/pair-account/abc'],
  ['/hraci', '/players'],
  ['/hrac/12/Pepa%20Nov%C3%A1k', '/players/12/Pepa%20Nov%C3%A1k'],
  ['/tymy', '/teams'],
  ['/tym/3/Ufo%20t%C3%BDm', '/teams/3/Ufo%20t%C3%BDm'],
  ['/turnaje', '/tournaments'],
  ['/turnaj/5', '/tournaments/5/record'],
  ['/turnaj/5/Brno%202024', '/tournaments/5/results'],
  ['/turnaj/5/Brno%202024/9', '/tournaments/5/results/9'],
  ['/turnaj-zive/5', '/tournaments/5/live'],
  ['/turnaj/5/tym/9', '/tournaments/5/teams/9'],
  ['/turnaj/prihlasovani/5', '/tournaments/5/register'],
  ['/turnaj/zapas/5/77', '/tournaments/5/matches/77'],
  ['/turnaj/zapas/5/77/edit', '/tournaments/5/matches/77/edit'],
  ['/skupiny/5', '/tournaments/5/groups'],
  ['/statistiky', '/stats/players'],
  ['/brankari', '/stats/goalies'],
  ['/hodnoceni_rozhodcich/5', '/tournaments/5/referee-feedback'],
])('redirects %s → %s', async (from, to) => {
  const router = renderAt(from);
  await waitFor(() => expect(router.state.location.pathname).toBe(to));
});

test('query string is preserved on redirect', async () => {
  const router = renderAt('/hraci?x=1');
  await waitFor(() => expect(router.state.location.search).toBe('?x=1'));
});

test('hash is preserved on redirect', async () => {
  const router = renderAt('/hraci#top');
  await waitFor(() => expect(router.state.location.hash).toBe('#top'));
});

test('unknown route shows 404', async () => {
  renderAt('/nonsense/path');
  expect(await screen.findByText('Stránka nenalezena')).toBeInTheDocument();
});

test('new route renders placeholder', async () => {
  renderAt('/tournaments/5/matches/7');
  expect(await screen.findByRole('heading', { name: 'Zápas' })).toBeInTheDocument();
});

test('protected route asks anonymous user to log in', async () => {
  renderAt('/tournaments/5/record');
  expect(await screen.findByRole('alert')).toHaveTextContent('přihlásit');
});

test('/intro redirects to /faq', async () => {
  const router = renderAt('/intro');
  await waitFor(() => expect(router.state.location.pathname).toBe('/faq'));
});
