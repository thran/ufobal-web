import { Navigate, useLocation, useParams, type Params, type RouteObject } from 'react-router';

type Target = (p: Params<string>) => string;

const enc = (v: string | undefined) => encodeURIComponent(v ?? '');

function LegacyRedirect({ to }: { to: Target }) {
  const params = useParams();
  const { search, hash } = useLocation();
  return <Navigate replace to={to(params) + search + hash} />;
}

const LEGACY: [string, Target][] = [
  ['/privacy_policy', () => '/privacy-policy'],
  ['/sin_slavy', () => '/hall-of-records'],
  ['/sparovat_ucet', () => '/pair-account'],
  ['/sparovat_ucet/:token', (p) => `/pair-account/${enc(p.token)}`],
  ['/hraci', () => '/players'],
  ['/hrac/:id/:slug', (p) => `/players/${p.id}/${enc(p.slug)}`],
  ['/tymy', () => '/teams'],
  ['/tym/:id/:slug', (p) => `/teams/${p.id}/${enc(p.slug)}`],
  ['/turnaje', () => '/tournaments'],
  ['/turnaj/:id', (p) => `/tournaments/${p.id}/record`],
  ['/turnaj/:id/:slug', (p) => `/tournaments/${p.id}/results`],
  ['/turnaj/:id/:slug/:teamId', (p) => `/tournaments/${p.id}/results/${p.teamId}`],
  ['/turnaj-zive/:id', (p) => `/tournaments/${p.id}/live`],
  ['/turnaj/:id/tym/:totId', (p) => `/tournaments/${p.id}/teams/${p.totId}`],
  ['/turnaj/prihlasovani/:id', (p) => `/tournaments/${p.id}/register`],
  ['/turnaj/zapas/:id/:matchId', (p) => `/tournaments/${p.id}/matches/${p.matchId}`],
  ['/turnaj/zapas/:id/:matchId/edit', (p) => `/tournaments/${p.id}/matches/${p.matchId}/edit`],
  ['/skupiny/:id', (p) => `/tournaments/${p.id}/groups`],
  ['/statistiky', () => '/stats/players'],
  ['/brankari', () => '/stats/goalies'],
  ['/hodnoceni_rozhodcich/:id', (p) => `/tournaments/${p.id}/referee-feedback`],
];

export const legacyRoutes: RouteObject[] = LEGACY.map(([path, to]) => ({
  path,
  element: <LegacyRedirect to={to} />,
}));
