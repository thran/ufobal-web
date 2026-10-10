import { screen, within } from '@testing-library/react';
import { expect, test } from 'vitest';
import { mockGraphApi, renderWithProviders } from '../test/utils';
import TournamentsPage from './TournamentsPage';

test('tournaments newest first, including empty ones', async () => {
  mockGraphApi();
  renderWithProviders(<TournamentsPage />);
  const rows = within((await screen.findAllByRole('rowgroup'))[1]).getAllByRole('row');
  expect(rows.map((r) => within(r).getAllByRole('cell')[0].textContent)).toEqual([
    'Hala 2025',
    'Nížkov 2024',
    'Brno 2023',
  ]);
  expect(within(rows[0]).getAllByRole('cell')[2]).toHaveTextContent('0');
  expect(within(rows[2]).getAllByRole('cell')[2]).toHaveTextContent('2');
  expect(within(rows[1]).getByRole('link')).toHaveAttribute('href', '/tournaments/2/results');
});
