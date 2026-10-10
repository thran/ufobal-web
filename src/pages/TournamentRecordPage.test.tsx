import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router';
import { expect, test } from 'vitest';
import { matchDto, sampleRaw, t1, teamDto, totDto } from '../test/fixtures';
import { mockGraphApi, renderWithProviders, testUser } from '../test/utils';
import TournamentRecordPage from './TournamentRecordPage';

// Renders the page only on its own route so the location stays visible after navigating away.
function Shell() {
  const { pathname } = useLocation();
  return (
    <>
      {pathname.endsWith('/record') && <TournamentRecordPage />}
      <div data-testid="loc">{pathname}</div>
    </>
  );
}

const openT1 = {
  ...t1,
  is_tournament_open: true,
  closed_edit: false,
  field_count: 2,
  registration_open: true,
  registration_to: '2023-06-09',
};
const matches = [
  matchDto({
    pk: 500,
    place: '1',
    score_one: 3,
    score_two: 1,
    start: '2023-06-10 09:00:00+00:00',
    end: '2023-06-10 09:20:00+00:00',
  }),
  matchDto({
    pk: 501,
    place: '2',
    team_one: 1001,
    team_two: 1000,
    start: '2023-06-10 09:30:00+00:00',
    score_one: 1,
    score_two: 0,
  }),
  matchDto({ pk: 502, place: null }),
];

const render = (tournament = openT1, user = testUser({ is_authorized: true })) => {
  const fetchMock = mockGraphApi({
    'tournament/1': tournament,
    'matchs?tournament=1': matches,
    add_match: 999,
  });
  renderWithProviders(<Shell />, { route: '/tournaments/1/record', path: '/tournaments/:id/*', user });
  return fetchMock;
};

test('matches grouped by field with no-field panel, scores and running state', async () => {
  render();
  const field1 = (await screen.findByRole('heading', { name: 'Hřiště 1' })).closest('section')!;
  expect(field1).toHaveTextContent('1.');
  expect(field1).toHaveTextContent('3:1');
  const field2 = screen.getByRole('heading', { name: 'Hřiště 2' }).closest('section')!;
  expect(field2).toHaveTextContent('hraje se');
  expect(within(field2).getAllByRole('link')[0]).toHaveAttribute('href', '/tournaments/1/matches/501/edit');
  expect(screen.getByRole('heading', { name: 'Bez hřiště' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'přihlásit se na turnaj' })).toHaveAttribute(
    'href',
    '/tournaments/1/register',
  );
  expect(screen.getByRole('link', { name: 'Kométa' })).toHaveAttribute('href', '/tournaments/1/teams/1001');
});

test('closed_edit redirects non-staff to results', async () => {
  render({ ...openT1, closed_edit: true });
  await screen.findByTestId('loc');
  expect(await screen.findByText('/tournaments/1/results')).toBeInTheDocument();
});

test('add match dialog rejects duplicate teams without a request', async () => {
  const fetchMock = render();
  await userEvent.click(await screen.findByRole('button', { name: /Nový zápas/ }));
  const dialog = await screen.findByRole('dialog');
  await userEvent.selectOptions(within(dialog).getByLabelText('Tým 1'), '1000');
  await userEvent.selectOptions(within(dialog).getByLabelText('Tým 2'), '1000');
  await userEvent.selectOptions(within(dialog).getByLabelText('Rozhodčí tým'), '1001');
  await userEvent.click(within(dialog).getByLabelText('1'));
  await userEvent.click(within(dialog).getByRole('button', { name: 'Vytvořit' }));
  expect(within(dialog).getByText('Některý z vybraných týmů se shoduje.')).toBeInTheDocument();
  expect(fetchMock.mock.calls.some(([u]) => String(u).endsWith('add_match'))).toBe(false);
});

test('add match success navigates to match edit', async () => {
  const raw = sampleRaw();
  const tots = [...raw.tots, totDto({ pk: 1004, team: teamDto({ pk: 12, name: 'Třetí' }), tournament: t1 })];
  mockGraphApi({
    teamontournaments: tots,
    'tournament/1': openT1,
    'matchs?tournament=1': matches,
    add_match: 999,
  });
  renderWithProviders(<Shell />, {
    route: '/tournaments/1/record',
    path: '/tournaments/:id/*',
    user: testUser({ is_authorized: true }),
  });
  await userEvent.click(await screen.findByRole('button', { name: /Nový zápas/ }));
  const dialog = await screen.findByRole('dialog');
  await userEvent.selectOptions(within(dialog).getByLabelText('Tým 1'), '1000');
  await userEvent.selectOptions(within(dialog).getByLabelText('Tým 2'), '1001');
  await userEvent.selectOptions(within(dialog).getByLabelText('Rozhodčí tým'), '1004');
  await userEvent.click(within(dialog).getByLabelText('2'));
  await userEvent.click(within(dialog).getByRole('button', { name: 'Vytvořit' }));
  expect(await screen.findByText('/tournaments/1/matches/999/edit')).toBeInTheDocument();
});
