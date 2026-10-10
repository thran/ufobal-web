import type { RouteObject } from 'react-router';
import RequireAuth from './auth/RequireAuth';
import Layout from './components/Layout';
import RouteError from './components/RouteError';
import NotFound from './pages/NotFound';
import Placeholder from './pages/Placeholder';
import { legacyRoutes } from './routes/legacyRedirects';

type Level = 'login' | 'authorized' | 'staff';

const page = (path: string, title: string, level?: Level): RouteObject => ({
  path,
  element: level ? (
    <RequireAuth level={level}>
      <Placeholder title={title} />
    </RequireAuth>
  ) : (
    <Placeholder title={title} />
  ),
});

export const routes: RouteObject[] = [
  {
    element: <Layout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Placeholder title="Ufo-IS" /> },
      page('privacy-policy', 'Privacy policy'),
      page('faq', 'Co a jak?'),
      page('intro', 'Úvod'),
      page('hall-of-records', 'Síň rekordů'),
      page('pair-account/:token?', 'Spárovat účet', 'login'),
      page('players', 'Hráči'),
      page('players/:id/:slug?', 'Hráč'),
      page('teams', 'Týmy'),
      page('teams/:id/:slug?', 'Tým'),
      page('tournaments', 'Turnaje'),
      page('tournaments/:id/results/:teamId?', 'Výsledky turnaje'),
      page('tournaments/:id/record', 'Správa turnaje', 'authorized'),
      page('tournaments/:id/live', 'Turnaj živě'),
      page('tournaments/:id/groups', 'Skupiny'),
      page('tournaments/:id/register', 'Přihlášení na turnaj', 'authorized'),
      page('tournaments/:id/teams/:totId', 'Soupiska týmu', 'authorized'),
      page('tournaments/:id/matches/:matchId', 'Zápas'),
      page('tournaments/:id/matches/:matchId/edit', 'Záznam zápasu', 'authorized'),
      page('tournaments/:id/referee-feedback', 'Hodnocení rozhodčích', 'authorized'),
      page('stats/players', 'Statistiky'),
      page('stats/goalies', 'Brankáři'),
      ...legacyRoutes,
      { path: '*', element: <NotFound /> },
    ],
  },
];
