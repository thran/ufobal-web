import { Navigate, type RouteObject } from 'react-router';
import RequireAuth from './auth/RequireAuth';
import Layout from './components/Layout';
import RouteError from './components/RouteError';
import FaqPage from './pages/FaqPage';
import HomePage from './pages/HomePage';
import NotFound from './pages/NotFound';
import Placeholder from './pages/Placeholder';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
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
      { index: true, element: <HomePage /> },
      { path: 'privacy-policy', element: <PrivacyPolicyPage /> },
      { path: 'faq', element: <FaqPage /> },
      { path: 'intro', element: <Navigate replace to="/faq" /> },
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
