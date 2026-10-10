import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router';
import { expect, test } from 'vitest';
import { mockGraphApi, renderWithProviders } from '../test/utils';
import TeamPage from './TeamPage';
import TeamsPage from './TeamsPage';

function Location() {
  return <div data-testid="loc">{useLocation().search}</div>;
}

const bodyRows = async () => within((await screen.findAllByRole('rowgroup'))[1]).getAllByRole('row');

test('teams sorted by medals with alt names and tournament count', async () => {
  mockGraphApi();
  renderWithProviders(<TeamsPage />);
  const rows = await bodyRows();
  expect(rows[0]).toHaveTextContent('Ufo');
  expect(rows[0]).toHaveTextContent('Béčko (Ufo)');
  expect(within(rows[0]).getAllByRole('cell')[3]).toHaveTextContent('2');
  expect(rows[1]).toHaveTextContent('Kométa');
});

test('Umístění header sorts best first, then reversed', async () => {
  mockGraphApi();
  renderWithProviders(
    <>
      <TeamsPage />
      <Location />
    </>,
  );
  await bodyRows();
  await userEvent.click(screen.getByRole('button', { name: /Umístění/ }));
  expect(screen.getByTestId('loc')).toHaveTextContent('sort=medals');
  expect((await bodyRows())[0]).toHaveTextContent('Ufo');
  await userEvent.click(screen.getByRole('button', { name: /Umístění/ }));
  expect((await bodyRows())[0]).toHaveTextContent('Kométa');
});

test('teams search matches short name and ignores diacritics', async () => {
  mockGraphApi();
  renderWithProviders(<TeamsPage />);
  await bodyRows();
  await userEvent.type(screen.getByPlaceholderText('hledat...'), 'kometa');
  await waitFor(async () => expect(await bodyRows()).toHaveLength(1));
  await userEvent.clear(screen.getByPlaceholderText('hledat...'));
  await userEvent.type(screen.getByPlaceholderText('hledat...'), 'kom');
  await waitFor(async () => expect((await bodyRows())[0]).toHaveTextContent('Kométa'));
});

test('team detail lists tournaments newest first with players', async () => {
  mockGraphApi();
  renderWithProviders(<TeamPage />, { route: '/teams/10/Ufo', path: '/teams/:id/:slug?' });
  expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Ufo');
  const rows = await bodyRows();
  expect(rows[0]).toHaveTextContent('Nížkov 2024');
  expect(rows[0]).toHaveTextContent('Béčko (Ufo)');
  expect(rows[1]).toHaveTextContent('Brno 2023');
  expect(within(rows[1]).getByRole('link', { name: /Jana/ })).toHaveAttribute('href', '/players/101/Jana');
  expect(rows[1]).toHaveTextContent('1.');
});

test('unknown team id shows not found', async () => {
  mockGraphApi();
  renderWithProviders(<TeamPage />, { route: '/teams/abc', path: '/teams/:id/:slug?' });
  expect(await screen.findByRole('alert')).toHaveTextContent('Tým nenalezen.');
});
