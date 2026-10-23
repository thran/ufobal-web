import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router';
import { expect, test } from 'vitest';
import { sampleGoalieStats, sampleMatches, samplePairs } from '../test/fixtures';
import { mockGraphApi, renderWithProviders } from '../test/utils';
import TournamentResultsPage from './TournamentResultsPage';

function Loc() {
  const l = useLocation();
  return <div data-testid="loc">{l.pathname + l.search}</div>;
}

const api = () =>
  mockGraphApi({
    'matchs?tournament=1': sampleMatches(),
    'pairs/1': samplePairs(),
    'goalie_stats?tournament=1': sampleGoalieStats().slice(0, 2),
    'matchs?tournament=2': [],
    'pairs/2': [],
    'goalie_stats?tournament=2': [],
  });

const render = (route: string) =>
  renderWithProviders(
    <>
      <TournamentResultsPage />
      <Loc />
    </>,
    { route, path: '/tournaments/:id/results/:teamId?' },
  );

const section = (name: string) => screen.getByRole('heading', { name }).parentElement!;

test('shows summary, teams with scores, finished matches, players, goalies and pairs', async () => {
  api();
  render('/tournaments/1/results');
  expect(await screen.findByRole('heading', { name: 'Brno 2023' })).toBeInTheDocument();
  expect(await screen.findByText(/bylo vstřeleno/)).toHaveTextContent('bylo vstřeleno 8 branek');
  const teams = within(section('Týmy')).getAllByRole('row');
  expect(teams[1]).toHaveTextContent('1.');
  expect(teams[1]).toHaveTextContent('Ufo');
  expect(teams[1]).toHaveTextContent('5:3');
  const matches = within(section('Zápasy')).getAllByRole('row');
  expect(matches).toHaveLength(2);
  expect(matches[1]).toHaveTextContent('2 P');
  expect(within(matches[0]).getByRole('link', { name: 'detail' })).toHaveAttribute(
    'href',
    '/tournaments/1/matches/500',
  );
  expect(await screen.findByRole('heading', { name: 'Nejlepší brankáři' })).toBeInTheDocument();
  expect(screen.getByText('80,0%')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Nejproduktivnější dvojice' })).toBeInTheDocument();
});

test('team filter navigates to TOT pk and filters by pk', async () => {
  api();
  render('/tournaments/1/results?p_page=2');
  await screen.findByRole('heading', { name: 'Brno 2023' });
  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Tým' }), '1001');
  expect(screen.getByTestId('loc')).toHaveTextContent('/tournaments/1/results/1001');
  expect(screen.getByTestId('loc')).not.toHaveTextContent('p_page');
  const teams = within(section('Týmy')).getAllByRole('row');
  expect(teams).toHaveLength(2);
  expect(teams[1]).toHaveTextContent('Kométa');
  expect(within(section('Nejlepší hráči')).queryByText('Pépa')).not.toBeInTheDocument();
});

test('gender filter hides women', async () => {
  api();
  render('/tournaments/1/results?g=m');
  await screen.findByRole('heading', { name: 'Nejlepší hráči' });
  expect(within(section('Nejlepší hráči')).queryByText('Jana')).not.toBeInTheDocument();
  expect(screen.getByRole('checkbox', { name: 'Ženy' })).not.toBeChecked();
});

test('tournament without matches shows teams 0:0 and no summary/matches/goalies', async () => {
  api();
  render('/tournaments/2/results');
  expect(await screen.findByRole('heading', { name: 'Nížkov 2024' })).toBeInTheDocument();
  expect(within(section('Týmy')).getAllByRole('row')[1]).toHaveTextContent('0:0');
  expect(screen.queryByText(/bylo vstřeleno/)).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Zápasy' })).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Nejlepší brankáři' })).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Nejlepší hráči' })).toBeInTheDocument();
});

test('unknown tournament', async () => {
  api();
  render('/tournaments/999/results');
  expect(await screen.findByRole('alert')).toHaveTextContent('Turnaj nenalezen.');
});
