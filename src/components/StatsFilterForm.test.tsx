import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router';
import { expect, test } from 'vitest';
import { renderWithProviders } from '../test/utils';
import StatsFilterForm, { useStatsFilter } from './StatsFilterForm';

function Probe() {
  const [filter, set, reset] = useStatsFilter();
  const { search } = useLocation();
  return (
    <>
      <output data-testid="search">{search}</output>
      <StatsFilterForm filter={filter} onChange={set} onReset={reset} showLiga showMinMatches />
    </>
  );
}

test('reset clears stats params, name search and page', async () => {
  renderWithProviders(<Probe />, { route: '/?from=2020&g=w&team=ufo&q=jana&page=2&keep=1' });
  await userEvent.click(screen.getByRole('button', { name: 'Obnovit výchozí filtr' }));
  expect(screen.getByTestId('search')).toHaveTextContent(/^\?keep=1$/);
});

test('decimal year is truncated, not dropped', async () => {
  renderWithProviders(<Probe />, { route: '/' });
  const input = screen.getByRole('spinbutton', { name: 'od roku' });
  await userEvent.clear(input);
  await userEvent.type(input, '2015.7');
  await waitFor(() => expect(screen.getByTestId('search')).toHaveTextContent(/from=2015(&|$)/));
});
