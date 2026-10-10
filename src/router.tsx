import type { RouteObject } from 'react-router';
import Layout from './components/Layout';
import NotFound from './pages/NotFound';
import Placeholder from './pages/Placeholder';
import { legacyRoutes } from './routes/legacyRedirects';

const page = (path: string, title: string): RouteObject => ({ path, element: <Placeholder title={title} /> });

export const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { index: true, element: <Placeholder title="Ufo-IS" /> },
      page('privacy-policy', 'Privacy policy'),
      page('faq', 'Co a jak?'),
      page('intro', 'Úvod'),
      page('hall-of-records', 'Síň rekordů'),
      page('pair-account/:token?', 'Spárovat účet'),
      page('players', 'Hráči'),
      page('players/:id/:slug?', 'Hráč'),
      page('teams', 'Týmy'),
      page('teams/:id/:slug?', 'Tým'),
      page('tournaments', 'Turnaje'),
      page('tournaments/:id/results/:teamId?', 'Výsledky turnaje'),
      page('tournaments/:id/record', 'Správa turnaje'),
      page('tournaments/:id/live', 'Turnaj živě'),
      page('tournaments/:id/groups', 'Skupiny'),
      page('tournaments/:id/register', 'Přihlášení na turnaj'),
      page('tournaments/:id/teams/:totId', 'Soupiska týmu'),
      page('tournaments/:id/matches/:matchId', 'Zápas'),
      page('tournaments/:id/matches/:matchId/edit', 'Záznam zápasu'),
      page('tournaments/:id/referee-feedback', 'Hodnocení rozhodčích'),
      page('stats/players', 'Statistiky'),
      page('stats/goalies', 'Brankáři'),
      ...legacyRoutes,
      { path: '*', element: <NotFound /> },
    ],
  },
];
