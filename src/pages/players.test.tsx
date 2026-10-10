import { screen, within } from '@testing-library/react';
import { expect, test } from 'vitest';
import { mockGraphApi, renderWithProviders } from '../test/utils';
import PlayerPage from './PlayerPage';
import PlayersPage from './PlayersPage';

test('players list sorted by canada with teams and stats', async () => {
  mockGraphApi();
  renderWithProviders(<PlayersPage />);
  const rows = within((await screen.findAllByRole('rowgroup'))[1]).getAllByRole('row');
  expect(rows[0]).toHaveTextContent('Pépa');
  expect(rows[0]).toHaveTextContent('Ufo (2x)');
  expect(within(rows[0]).getAllByRole('cell')[4]).toHaveTextContent('5');
  expect(rows[2]).toHaveTextContent('Jana');
});

test('player detail shows tournaments, cards and score without team', async () => {
  mockGraphApi();
  renderWithProviders(<PlayerPage />, { route: '/players/100/Pepa', path: '/players/:id/:slug?' });
  expect(await screen.findByRole('heading', { name: 'Pépa' })).toBeInTheDocument();
  expect(screen.getByText(/Josef Novák/)).toHaveTextContent('(30)');
  expect(screen.getByRole('link', { name: 'Nížkov 2024' })).toHaveAttribute(
    'href',
    '/tournaments/2/results/1002',
  );
  expect(screen.getByRole('link', { name: 'Béčko (Ufo)' })).toHaveAttribute(
    'href',
    '/teams/10/B%C3%A9%C4%8Dko%20(Ufo)',
  );
  expect(screen.getByText('žlutá')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'detail' })).toHaveAttribute('href', '/tournaments/1/matches/500');
});

test('player with no teams, goals in a tournament without roster', async () => {
  mockGraphApi();
  renderWithProviders(<PlayerPage />, { route: '/players/102/Karel', path: '/players/:id/:slug?' });
  expect(await screen.findByText('What? Turnaje se skórem, ale bez týmu')).toBeInTheDocument();
  expect(screen.getByText('Brno 2023 - 4 golů a 0 assistencí')).toBeInTheDocument();
  expect(screen.getByRole('columnheader', { name: 'Zdůvodnění' })).toBeInTheDocument();
});

test('unknown player id shows not found', async () => {
  mockGraphApi();
  renderWithProviders(<PlayerPage />, { route: '/players/999999', path: '/players/:id/:slug?' });
  expect(await screen.findByRole('alert')).toHaveTextContent('Hráč nenalezen.');
});
