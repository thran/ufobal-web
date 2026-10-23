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

test('player reset clears player params, name search and page', async () => {
  renderWithProviders(<Probe />, { route: '/?from=2020&g=w&team=ufo&q=jana&page=2&keep=1' });
  await userEvent.click(screen.getByRole('button', { name: 'Zrušit filtrování hráčů' }));
  expect(screen.getByTestId('search')).toHaveTextContent(/^\?from=2020&keep=1$/);
});

test('tournament reset clears only tournament params', async () => {
  renderWithProviders(<Probe />, { route: '/?from=2020&cat=brno&g=w&page=2' });
  await userEvent.click(screen.getByRole('button', { name: 'Obnovit výchozí filtr turnajů' }));
  expect(screen.getByTestId('search')).toHaveTextContent(/^\?g=w$/);
});

test('name search writes q and resets page', async () => {
  renderWithProviders(<Probe />, { route: '/?page=3' });
  await userEvent.type(screen.getByRole('searchbox', { name: 'Jméno hráče' }), 'jana');
  await waitFor(() => expect(screen.getByTestId('search')).toHaveTextContent(/^\?q=jana$/));
});

test('decimal year is truncated, not dropped', async () => {
  renderWithProviders(<Probe />, { route: '/' });
  const input = screen.getByRole('spinbutton', { name: 'od roku' });
  await userEvent.clear(input);
  await userEvent.type(input, '2015.7');
  await waitFor(() => expect(screen.getByTestId('search')).toHaveTextContent(/from=2015(&|$)/));
});
