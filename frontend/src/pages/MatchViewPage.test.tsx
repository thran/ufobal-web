import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { recordedMatch, t1 } from '../test/fixtures';
import { mockGraphApi, renderWithProviders, testUser } from '../test/utils';
import MatchViewPage from './MatchViewPage';

const render = (matchId = 500, user = null as ReturnType<typeof testUser> | null) =>
  renderWithProviders(<MatchViewPage />, {
    route: `/tournaments/1/matches/${matchId}`,
    path: '/tournaments/:id/matches/:matchId',
    user,
  });

const mock = (closed_edit = true) =>
  mockGraphApi({ 'tournament/1': { ...t1, closed_edit }, 'matchs?tournament=1': [recordedMatch()] });

test('renders events, score, referee, live toggle; shots hidden until ticked', async () => {
  mock();
  render();
  const list = within(await screen.findByTestId('events-mobile'));
  expect(list.getByText(/gól:/)).toBeInTheDocument();
  expect(list.getByText(/žlutá karta/)).toBeInTheDocument();
  expect(list.getByText(/změna brankáře/)).toBeInTheDocument();
  expect(list.getByText('konec poločasu')).toBeInTheDocument();
  expect(screen.getByText('1', { selector: '.text-5xl' })).toBeInTheDocument();
  expect(screen.getByText('0', { selector: '.text-5xl' })).toBeInTheDocument();
  expect(screen.getByText(/píská:/)).toHaveTextContent('Karel');
  expect(screen.getByRole('checkbox', { name: 'živě' })).toBeChecked();
  expect(screen.queryByRole('link', { name: 'Zaznamenávat' })).not.toBeInTheDocument();
  expect(list.queryByText(/střela/)).not.toBeInTheDocument();
  await userEvent.click(
    within(screen.getByTestId('toggles-mobile')).getByRole('checkbox', { name: 'střely' }),
  );
  expect(list.getByText(/střela/)).toBeInTheDocument();
});

test('unknown match shows not found', async () => {
  mock();
  render(999);
  expect(await screen.findByText('Zápas nenalezen.')).toBeInTheDocument();
});

test('record link for authorized user when tournament is open', async () => {
  mock(false);
  render(500, testUser({ is_authorized: true }));
  expect(await screen.findByRole('link', { name: 'Zaznamenávat' })).toHaveAttribute(
    'href',
    '/tournaments/1/matches/500/edit',
  );
});

test('failed background refetch of tournament keeps the match visible', async () => {
  const fetchMock = mock();
  const { queryClient } = render();
  expect(await screen.findByTestId('events-mobile')).toBeInTheDocument();
  fetchMock.mockImplementation(async () => new Response('boom', { status: 500 }));
  await act(async () => {
    await queryClient.refetchQueries({ queryKey: ['tournament', 1] });
    await new Promise((r) => setTimeout(r, 20));
  });
  expect(queryClient.getQueryState(['tournament', 1])?.status).toBe('error');
  expect(screen.getByTestId('events-mobile')).toBeInTheDocument();
});

test('closed_edit hides the record link from authorized non-staff', async () => {
  mock(true);
  render(500, testUser({ is_authorized: true }));
  await screen.findByTestId('events-mobile');
  expect(screen.queryByRole('link', { name: 'Zaznamenávat' })).not.toBeInTheDocument();
});

test('closed_edit still shows the record link to staff', async () => {
  mock(true);
  render(500, testUser({ is_authorized: true, is_staff: true }));
  expect(await screen.findByRole('link', { name: 'Zaznamenávat' })).toBeInTheDocument();
});
