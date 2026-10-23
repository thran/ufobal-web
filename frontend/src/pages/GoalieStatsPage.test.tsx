import { screen, within } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { sampleGoalieStats } from '../test/fixtures';
import { mockGraphApi, renderWithProviders } from '../test/utils';
import GoalieStatsPage from './GoalieStatsPage';

vi.useFakeTimers({ toFake: ['Date'] });
vi.setSystemTime(new Date('2025-03-01T12:00:00'));

const bodyRows = () => within(screen.getAllByRole('rowgroup')[1]).getAllByRole('row');

test('lists goalies meeting min matches with per-tournament success', async () => {
  mockGraphApi({ goalie_stats: sampleGoalieStats() });
  renderWithProviders(<GoalieStatsPage />, { route: '/stats/goalies?min=2' });
  expect(await screen.findByRole('link', { name: 'Brno 2023' })).toBeInTheDocument();
  const rows = bodyRows();
  expect(rows).toHaveLength(2);
  expect(rows[0]).toHaveTextContent('Pépa');
  expect(rows[0]).toHaveTextContent('80,0%');
  expect(rows[0]).toHaveTextContent('(2 / 10)');
  expect(within(rows[1]).getByRole('link')).toHaveTextContent('♀');
});

test('default min matches 10 hides goalies with few matches; zero-shot goalie never shown', async () => {
  mockGraphApi({ goalie_stats: sampleGoalieStats() });
  renderWithProviders(<GoalieStatsPage />, { route: '/stats/goalies' });
  await screen.findByRole('link', { name: 'Nížkov 2024' });
  const rows = bodyRows();
  expect(rows).toHaveLength(1);
  expect(rows[0]).toHaveTextContent('Jana');
  expect(screen.queryByText('Karel')).not.toBeInTheDocument();
});

test('goalie stats error shows retry box', async () => {
  mockGraphApi();
  renderWithProviders(<GoalieStatsPage />, { route: '/stats/goalies' });
  expect(await screen.findByRole('alert')).toBeInTheDocument();
});
