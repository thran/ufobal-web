import { screen, within } from '@testing-library/react';
import { expect, test } from 'vitest';
import type { GroupTotDto, GroupsDto } from '../api/types';
import { kometa, t1, ufo } from '../test/fixtures';
import { mockApi, renderWithProviders } from '../test/utils';
import GroupsPage from './GroupsPage';

const gt = (pk: number, team = ufo, name = team.name): GroupTotDto => ({
  pk,
  team,
  tournament: t1,
  captain: null,
  default_goalie: null,
  name,
  name_pure: name,
  name_short: null,
  rank: null,
});

const roundRobin: GroupsDto = {
  groups: [{ pk: 1, tournament: t1, teams: [gt(1000), gt(1001, kometa)], level: 1, name: 'Skupina A' }],
  matches: { '1000-1001': { '1': [3, 1, 0] }, '1001-1000': { '1': [1, 3, 0] } },
  stats: {
    '1000': { '1': { score: [3, 1], wins: 1, looses: 0, winsP: 0, loosesP: 0, draws: 0 } },
    '1001': { '1': { score: [1, 3], wins: 0, looses: 1, winsP: 0, loosesP: 0, draws: 0 } },
  },
};

const playoffEntries = Array.from({ length: 8 }, (_, i) => ({
  ...gt(2000 + i, ufo, `Tým ${i + 1}`),
  score: i % 2 ? 1 : 2,
  win: i % 2 === 0,
}));
const playoff: GroupsDto = {
  groups: [
    {
      pk: 2,
      tournament: t1,
      teams: playoffEntries,
      level: 2,
      name: 'Play-off',
      playoff: [playoffEntries, playoffEntries, playoffEntries],
    },
  ],
  matches: {},
  stats: {},
};

const render = () =>
  renderWithProviders(<GroupsPage />, { route: '/tournaments/1/groups', path: '/tournaments/:id/groups' });

test('round robin table', async () => {
  mockApi({ 'get_groups/1': roundRobin, 'tournament/1': t1 });
  render();
  expect(await screen.findByRole('heading', { name: 'Skupina A' })).toBeInTheDocument();
  expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Skupiny - Brno 2023');
  const rows = within(screen.getByRole('table')).getAllByRole('row');
  expect(rows[1]).toHaveTextContent('3 : 1');
  expect(rows[1]).toHaveTextContent('1 / 0 / 0');
  expect(within(rows[0]).getByRole('link', { name: 'Kométa' })).toHaveAttribute(
    'href',
    '/teams/11/Kom%C3%A9ta',
  );
});

test('playoff bracket with labels and bold winners', async () => {
  mockApi({ 'get_groups/1': playoff, 'tournament/1': t1 });
  render();
  expect(await screen.findByText('Finále')).toBeInTheDocument();
  expect(screen.getByText('O 7. místo')).toBeInTheDocument();
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
  expect(screen.getAllByText('Tým 1')[0].closest('.font-bold')).not.toBeNull();
});

test('missing tournament shows error', async () => {
  mockApi({});
  render();
  expect(await screen.findByRole('alert')).toBeInTheDocument();
});
