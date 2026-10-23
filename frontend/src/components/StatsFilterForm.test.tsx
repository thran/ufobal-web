import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router';
import { expect, test } from 'vitest';
import { renderWithProviders } from '../test/utils';
import StatsFilterForm, { useStatsFilter } from './StatsFilterForm';

function Probe() {
  const [filter, set, reset] = useStatsFilter('players');
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

test('filters are remembered and restored when the URL has none', async () => {
  const first = renderWithProviders(<Probe />, { route: '/?g=w&sort=-G&page=3' });
  await waitFor(() => expect(localStorage.getItem('ufo:statsFilter:players')).toContain('g=w&sort=-G'));
  expect(localStorage.getItem('ufo:statsFilter:players')).not.toContain('page');
  first.unmount();
  renderWithProviders(<Probe />, { route: '/' });
  await waitFor(() => expect(screen.getByTestId('search')).toHaveTextContent(/^\?g=w&sort=-G$/));
});

test('remembered filters expire after a day and never override the URL', async () => {
  localStorage.setItem(
    'ufo:statsFilter:players',
    JSON.stringify({ at: Date.now() - 25 * 60 * 60 * 1000, search: 'g=w' }),
  );
  const first = renderWithProviders(<Probe />, { route: '/' });
  expect(screen.getByTestId('search')).toBeEmptyDOMElement();
  first.unmount();
  localStorage.setItem('ufo:statsFilter:players', JSON.stringify({ at: Date.now(), search: 'g=w' }));
  renderWithProviders(<Probe />, { route: '/?g=m' });
  expect(screen.getByTestId('search')).toHaveTextContent(/^\?g=m$/);
});
