import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { expect, test } from 'vitest';
import { teamPath, tournamentResultsPath } from '../paths';
import { renderWithProviders } from '../test/utils';
import BackLink from './BackLink';
import Medals from './Medals';
import PlayerLink from './PlayerLink';

test('paths encode names', () => {
  expect(teamPath({ pk: 3, name: 'Ufo tým' })).toBe('/teams/3/Ufo%20t%C3%BDm');
  expect(tournamentResultsPath(5)).toBe('/tournaments/5/results');
  expect(tournamentResultsPath(5, 9)).toBe('/tournaments/5/results/9');
});

test('PlayerLink shows gender sign and links to player', () => {
  renderWithProviders(<PlayerLink player={{ pk: 7, nickname: 'Jana', gender: 'woman' }} />);
  const link = screen.getByRole('link', { name: /Jana/ });
  expect(link).toHaveAttribute('href', '/players/7/Jana');
  expect(link).toHaveTextContent('♀');
});

test('Medals renders only non-zero places', () => {
  renderWithProviders(<Medals medals={[2, 0, 1, 0, 0]} />);
  expect(screen.getByTitle('1. místo')).toBeInTheDocument();
  expect(screen.getByTitle('3. místo')).toBeInTheDocument();
  expect(screen.queryByTitle('2. místo')).not.toBeInTheDocument();
  expect(screen.getByText(/2×/)).toBeInTheDocument();
});

test('BackLink falls back when there is no history', async () => {
  renderWithProviders(
    <Routes>
      <Route path="/players/1" element={<BackLink fallback="/players" />} />
      <Route path="/players" element={<p>seznam</p>} />
    </Routes>,
    { route: '/players/1' },
  );
  await userEvent.click(screen.getByRole('button', { name: '‹ zpět' }));
  expect(screen.getByText('seznam')).toBeInTheDocument();
});
