import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import type { RefereeMatchDto } from '../api/types';
import { kometa, playerDto, t1, totDto, ufo, teamDto } from '../test/fixtures';
import { mockApi, renderWithProviders, testUser } from '../test/utils';
import RefereeFeedbackPage from './RefereeFeedbackPage';

const refTot = totDto({ pk: 1004, team: teamDto({ pk: 12, name: 'Rozhodčí' }), tournament: t1 });
const feedbackMatches: RefereeMatchDto[] = [
  {
    pk: 500,
    tournament: 1,
    start: 's',
    end: 'e',
    place: '1',
    team_one: totDto({ pk: 1000, team: ufo, tournament: t1 }),
    team_two: totDto({ pk: 1001, team: kometa, tournament: t1 }),
    referee_team: refTot,
    referee: playerDto({ pk: 102, nickname: 'Karel', full_name: 'Karel K' }),
  },
];

const render = (tournament = { ...t1, closed_edit: false }) => {
  const fetchMock = mockApi({
    'tournament/1': tournament,
    'get_referee_feedbacks/1': feedbackMatches,
    save_referee_feedback: 9,
  });
  renderWithProviders(<RefereeFeedbackPage />, {
    route: '/tournaments/1/referee-feedback',
    path: '/tournaments/:id/referee-feedback',
    user: testUser({ is_authorized: true }),
  });
  return fetchMock;
};

test('rate a referee team', async () => {
  const fetchMock = render();
  await userEvent.click(await screen.findByRole('button', { name: 'hodnotit' }));
  const dialog = await screen.findByRole('dialog');
  expect(dialog).toHaveTextContent('hlavní rozhodčí: Karel K');
  const save = within(dialog).getByRole('button', { name: 'Uložit' });
  expect(save).toBeDisabled();
  await userEvent.click(within(dialog).getByRole('button', { name: 'Přidat pozitivum' }));
  await userEvent.keyboard('Férový');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Přidat negativum' }));
  for (let i = 0; i < 8; i++)
    await userEvent.click(within(dialog).getByRole('button', { name: 'Zvýšit hodnocení' }));
  await userEvent.click(save);
  const call = (fetchMock.mock.calls as unknown as [unknown, RequestInit][]).find(([u]) =>
    String(u).endsWith('save_referee_feedback'),
  )!;
  expect(JSON.parse(call[1].body as string)).toEqual({
    match: 500,
    feedback: { stars: 4, positives: ['Férový'], negatives: [], comment: '' },
  });
});

test('closed tournament is read-only', async () => {
  render({ ...t1, closed_edit: true });
  expect(await screen.findByText('Turnaj je uzavřený, hodnocení už nelze měnit.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'hodnotit' })).toBeDisabled();
});

test('server error text shown', async () => {
  mockApi({ 'tournament/1': t1 });
  renderWithProviders(<RefereeFeedbackPage />, {
    route: '/tournaments/1/referee-feedback',
    path: '/tournaments/:id/referee-feedback',
    user: testUser({ is_staff: true, is_authorized: true }),
  });
  expect(await screen.findByRole('alert')).toBeInTheDocument();
});
