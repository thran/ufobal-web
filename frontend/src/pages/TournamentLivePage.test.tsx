import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { matchDto, t1 } from '../test/fixtures';
import { mockGraphApi, renderWithProviders } from '../test/utils';
import TournamentLivePage from './TournamentLivePage';

const matches = [
  matchDto({ pk: 500, place: '1', start: 's', end: 'e', score_one: 3, score_two: 1 }),
  matchDto({ pk: 501, place: '2', start: 's', score_one: 1, score_two: 0 }),
  matchDto({ pk: 502, place: '1' }),
];

const render = () =>
  renderWithProviders(<TournamentLivePage />, {
    route: '/tournaments/1/live',
    path: '/tournaments/:id/live',
  });

test('matches split by state, links to view page, refresh on by default', async () => {
  mockGraphApi({ 'tournament/1': { ...t1, closed_edit: true }, 'matchs?tournament=1': matches });
  render();
  const ongoing = (await screen.findByRole('heading', { name: 'Probíhající zápasy' })).closest('section')!;
  expect(ongoing).toHaveTextContent('hraje se');
  const ended = screen.getByRole('heading', { name: 'Ukončené zápasy' }).closest('section')!;
  expect(ended).toHaveTextContent('3:1');
  const future = screen.getByRole('heading', { name: 'Budoucí zápasy' }).closest('section')!;
  expect(future.querySelector('a')).toHaveAttribute('href', '/tournaments/1/matches/502');
  expect(screen.getByRole('checkbox', { name: 'živě' })).toBeChecked();
  await userEvent.click(screen.getByRole('checkbox', { name: 'živě' }));
  expect(screen.getByRole('checkbox', { name: 'živě' })).not.toBeChecked();
});

test('ended match without start is not future; referee part only when set', async () => {
  mockGraphApi({
    'tournament/1': { ...t1, closed_edit: true },
    'matchs?tournament=1': [
      ...matches,
      matchDto({ pk: 503, place: '1', end: 'e' }),
      matchDto({ pk: 504, place: '1', referee_team: 1001 }),
    ],
  });
  render();
  const future = (await screen.findByRole('heading', { name: 'Budoucí zápasy' })).closest('section')!;
  expect(future.querySelectorAll('a[href$="/503"]')).toHaveLength(0);
  expect(future.querySelectorAll('a[href$="/502"]')).toHaveLength(2);
  expect(future).toHaveTextContent('(KOM)');
  expect(future).not.toHaveTextContent('()');
});
