import { Navigate, type RouteObject } from 'react-router';
import RequireAuth from './auth/RequireAuth';
import Layout from './components/Layout';
import RouteError from './components/RouteError';
import FaqPage from './pages/FaqPage';
import GroupsPage from './pages/GroupsPage';
import HallOfRecordsPage from './pages/HallOfRecordsPage';
import HomePage from './pages/HomePage';
import NotFound from './pages/NotFound';
import Placeholder from './pages/Placeholder';
import PlayerPage from './pages/PlayerPage';
import GoalieStatsPage from './pages/GoalieStatsPage';
import PlayerStatsPage from './pages/PlayerStatsPage';
import PlayersPage from './pages/PlayersPage';
import TournamentResultsPage from './pages/TournamentResultsPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TeamPage from './pages/TeamPage';
import TournamentsPage from './pages/TournamentsPage';
import TeamsPage from './pages/TeamsPage';
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
      { path: 'hall-of-records', element: <HallOfRecordsPage /> },
      page('pair-account/:token?', 'Spárovat účet', 'login'),
      { path: 'players', element: <PlayersPage /> },
      { path: 'players/:id/:slug?', element: <PlayerPage /> },
      { path: 'teams', element: <TeamsPage /> },
      { path: 'teams/:id/:slug?', element: <TeamPage /> },
      { path: 'tournaments', element: <TournamentsPage /> },
      { path: 'tournaments/:id/results/:teamId?', element: <TournamentResultsPage /> },
      page('tournaments/:id/record', 'Správa turnaje', 'authorized'),
      page('tournaments/:id/live', 'Turnaj živě'),
      { path: 'tournaments/:id/groups', element: <GroupsPage /> },
      page('tournaments/:id/register', 'Přihlášení na turnaj', 'authorized'),
      page('tournaments/:id/teams/:totId', 'Soupiska týmu', 'authorized'),
      page('tournaments/:id/matches/:matchId', 'Zápas'),
      page('tournaments/:id/matches/:matchId/edit', 'Záznam zápasu', 'authorized'),
      page('tournaments/:id/referee-feedback', 'Hodnocení rozhodčích', 'authorized'),
      { path: 'stats/players', element: <PlayerStatsPage /> },
      { path: 'stats/goalies', element: <GoalieStatsPage /> },
      ...legacyRoutes,
      { path: '*', element: <NotFound /> },
    ],
  },
];
