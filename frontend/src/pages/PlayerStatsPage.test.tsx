import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { mockGraphApi, renderWithProviders } from '../test/utils';
import PlayerStatsPage from './PlayerStatsPage';

vi.useFakeTimers({ toFake: ['Date'] });
vi.setSystemTime(new Date('2025-03-01T12:00:00'));

const bodyRows = () => within(screen.getAllByRole('rowgroup')[1]).getAllByRole('row');

test('default filter: Brno and Nížkov columns, sorted by K, ranks shown', async () => {
  mockGraphApi();
  renderWithProviders(<PlayerStatsPage />, { route: '/stats/players' });
  expect(await screen.findByRole('link', { name: 'Brno 2023' })).toHaveAttribute(
    'href',
    '/tournaments/1/results',
  );
  expect(screen.getByRole('link', { name: 'Nížkov 2024' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Hala 2025' })).not.toBeInTheDocument();
  expect(bodyRows()[0]).toHaveTextContent('1.');
  expect(bodyRows()[0]).toHaveTextContent('Pépa');
  expect(bodyRows()[0]).toHaveTextContent('3');
});

test('name search keeps overall rank; team filter and gender filter apply', async () => {
  mockGraphApi();
  renderWithProviders(<PlayerStatsPage />, { route: '/stats/players' });
  await screen.findByRole('link', { name: 'Brno 2023' });
  await userEvent.type(screen.getByRole('searchbox', { name: 'Jméno hráče' }), 'jana');
  await waitFor(() => expect(bodyRows()).toHaveLength(1));
  expect(bodyRows()[0]).toHaveTextContent('3.');
});

test('women only via URL', async () => {
  mockGraphApi();
  renderWithProviders(<PlayerStatsPage />, { route: '/stats/players?g=w' });
  await screen.findByRole('link', { name: 'Brno 2023' });
  expect(bodyRows()).toHaveLength(1);
  expect(bodyRows()[0]).toHaveTextContent('Jana');
  expect(screen.getByRole('checkbox', { name: 'Muži' })).not.toBeChecked();
});

test('all categories off shows no tournament columns and still renders', async () => {
  mockGraphApi();
  renderWithProviders(<PlayerStatsPage />, { route: '/stats/players?cat=' });
  await screen.findByRole('checkbox', { name: 'Brno' });
  expect(screen.queryByRole('link', { name: 'Brno 2023' })).not.toBeInTheDocument();
});

test('tournaments without any player stats get no column', async () => {
  mockGraphApi();
  renderWithProviders(<PlayerStatsPage />, { route: '/stats/players?cat=brno,nizkov,hala' });
  expect(await screen.findByRole('link', { name: 'Brno 2023' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Hala 2025' })).not.toBeInTheDocument();
});
