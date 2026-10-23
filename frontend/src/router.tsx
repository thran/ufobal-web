import { Navigate, type RouteObject } from 'react-router';
import RequireAuth from './auth/RequireAuth';
import Layout from './components/Layout';
import RouteError from './components/RouteError';
import FaqPage from './pages/FaqPage';
import GroupsPage from './pages/GroupsPage';
import HallOfRecordsPage from './pages/HallOfRecordsPage';
import HomePage from './pages/HomePage';
import MatchRecordPage from './pages/MatchRecordPage';
import MatchViewPage from './pages/MatchViewPage';
import NotFound from './pages/NotFound';
import PairAccountPage from './pages/PairAccountPage';
import PlayerPage from './pages/PlayerPage';
import GoalieStatsPage from './pages/GoalieStatsPage';
import PlayerStatsPage from './pages/PlayerStatsPage';
import PlayersPage from './pages/PlayersPage';
import TournamentLivePage from './pages/TournamentLivePage';
import TournamentRecordPage from './pages/TournamentRecordPage';
import TournamentResultsPage from './pages/TournamentResultsPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import RefereeFeedbackPage from './pages/RefereeFeedbackPage';
import RegistrationPage from './pages/RegistrationPage';
import RosterPage from './pages/RosterPage';
import TeamPage from './pages/TeamPage';
import TournamentsPage from './pages/TournamentsPage';
import TeamsPage from './pages/TeamsPage';
import { legacyRoutes } from './routes/legacyRedirects';

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
      { path: 'pair-account/:token?', element: <PairAccountPage /> },
      { path: 'players', element: <PlayersPage /> },
      { path: 'players/:id/:slug?', element: <PlayerPage /> },
      { path: 'teams', element: <TeamsPage /> },
      { path: 'teams/:id/:slug?', element: <TeamPage /> },
      { path: 'tournaments', element: <TournamentsPage /> },
      { path: 'tournaments/:id/results/:teamId?', element: <TournamentResultsPage /> },
      {
        path: 'tournaments/:id/record',
        element: (
          <RequireAuth level="authorized">
            <TournamentRecordPage />
          </RequireAuth>
        ),
      },
      { path: 'tournaments/:id/live', element: <TournamentLivePage /> },
      { path: 'tournaments/:id/groups', element: <GroupsPage /> },
      {
        path: 'tournaments/:id/register',
        element: (
          <RequireAuth level="authorized">
            <RegistrationPage />
          </RequireAuth>
        ),
      },
      {
        path: 'tournaments/:id/teams/:totId',
        element: (
          <RequireAuth level="authorized">
            <RosterPage />
          </RequireAuth>
        ),
      },
      { path: 'tournaments/:id/matches/:matchId', element: <MatchViewPage /> },
      {
        path: 'tournaments/:id/matches/:matchId/edit',
        element: (
          <RequireAuth level="authorized">
            <MatchRecordPage />
          </RequireAuth>
        ),
      },
      {
        path: 'tournaments/:id/referee-feedback',
        element: (
          <RequireAuth level="authorized">
            <RefereeFeedbackPage />
          </RequireAuth>
        ),
      },
      { path: 'stats/players', element: <PlayerStatsPage /> },
      { path: 'stats/goalies', element: <GoalieStatsPage /> },
      ...legacyRoutes,
      { path: '*', element: <NotFound /> },
    ],
  },
];
