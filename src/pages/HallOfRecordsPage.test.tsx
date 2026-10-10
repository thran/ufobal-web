import { screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { playerDto, t1, ufo } from '../test/fixtures';
import { mockApi, renderWithProviders } from '../test/utils';
import HallOfRecordsPage from './HallOfRecordsPage';

const player = playerDto({ pk: 100, nickname: 'Pépa', full_name: 'Pépa - Josef Novák' });

test('renders records with links; missing records skipped', async () => {
  mockApi({
    hall_of_glory: {
      max_teams_per_tournament: { value: 24, instances: [t1] },
      max_avg_goals_per_team: { value: 3.456, instances: [ufo] },
      max_goal_per_tournament_player: { value: 17, instances: [[player, t1]] },
    },
  });
  renderWithProviders(<HallOfRecordsPage />);
  expect(await screen.findByText('24 týmů na turnaji')).toBeInTheDocument();
  expect(screen.getAllByRole('link', { name: 'Brno 2023' })[0]).toHaveAttribute(
    'href',
    '/tournaments/1/results',
  );
  expect(screen.getByText('3,5 gólů na zápas týmu')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Ufo' })).toHaveAttribute('href', '/teams/10/Ufo');
  expect(screen.getByRole('link', { name: 'Pépa - Josef Novák' })).toHaveAttribute(
    'href',
    '/players/100/P%C3%A9pa',
  );
  expect(screen.queryByText(/Tým s nejvíce zápasy/)).not.toBeInTheDocument();
});
