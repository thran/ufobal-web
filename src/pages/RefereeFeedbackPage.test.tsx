import { act, screen, within } from '@testing-library/react';
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
  const { queryClient } = renderWithProviders(<RefereeFeedbackPage />, {
    route: '/tournaments/1/referee-feedback',
    path: '/tournaments/:id/referee-feedback',
    user: testUser({ is_authorized: true }),
  });
  return Object.assign(fetchMock, { queryClient });
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

test('second added positive gets focus and order is kept', async () => {
  const fetchMock = render();
  await userEvent.click(await screen.findByRole('button', { name: 'hodnotit' }));
  const dialog = await screen.findByRole('dialog');
  const add = within(dialog).getByRole('button', { name: 'Přidat pozitivum' });
  await userEvent.click(add);
  await userEvent.keyboard('Prvni');
  await userEvent.click(add);
  await userEvent.keyboard('Druhy');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Zvýšit hodnocení' }));
  await userEvent.click(within(dialog).getByRole('button', { name: 'Uložit' }));
  const call = (fetchMock.mock.calls as unknown as [unknown, RequestInit][]).find(([u]) =>
    String(u).endsWith('save_referee_feedback'),
  )!;
  expect(JSON.parse(call[1].body as string).feedback.positives).toEqual(['Prvni', 'Druhy']);
});

test('editing existing feedback is prefilled and sends pk', async () => {
  const withFeedback = [
    {
      ...feedbackMatches[0]!,
      referee_feedback: {
        pk: 5,
        match: 500,
        author_team: 1000,
        author: 100,
        feedback: { stars: 3, positives: ['a'], negatives: [], comment: 'c' },
      },
    },
  ];
  const fetchMock = mockApi({
    'tournament/1': { ...t1, closed_edit: false },
    'get_referee_feedbacks/1': withFeedback,
    save_referee_feedback: 5,
  });
  renderWithProviders(<RefereeFeedbackPage />, {
    route: '/tournaments/1/referee-feedback',
    path: '/tournaments/:id/referee-feedback',
    user: testUser({ is_authorized: true }),
  });
  await userEvent.click(await screen.findByRole('button', { name: 'upravit' }));
  const dialog = await screen.findByRole('dialog');
  expect(within(dialog).getByDisplayValue('a')).toBeInTheDocument();
  expect(within(dialog).getByDisplayValue('c')).toBeInTheDocument();
  expect(within(dialog).getByRole('slider')).toHaveAttribute('aria-valuenow', '3');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Uložit' }));
  const call = (fetchMock.mock.calls as unknown as [unknown, RequestInit][]).find(([u]) =>
    String(u).endsWith('save_referee_feedback'),
  )!;
  expect(JSON.parse(call[1].body as string)).toMatchObject({ pk: 5, match: 500 });
});

test('empty match list shows a hint', async () => {
  mockApi({ 'tournament/1': t1, 'get_referee_feedbacks/1': [] });
  renderWithProviders(<RefereeFeedbackPage />, {
    route: '/tournaments/1/referee-feedback',
    path: '/tournaments/:id/referee-feedback',
    user: testUser({ is_authorized: true }),
  });
  expect(await screen.findByText('Žádné odehrané zápasy k hodnocení.')).toBeInTheDocument();
});

test('list inputs have distinct numbered labels', async () => {
  render();
  await userEvent.click(await screen.findByRole('button', { name: 'hodnotit' }));
  const dialog = await screen.findByRole('dialog');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Přidat pozitivum' }));
  await userEvent.click(within(dialog).getByRole('button', { name: 'Přidat pozitivum' }));
  await userEvent.click(within(dialog).getByRole('button', { name: 'Přidat negativum' }));
  expect(within(dialog).getByRole('textbox', { name: 'Pozitivum 1' })).toBeInTheDocument();
  expect(within(dialog).getByRole('textbox', { name: 'Pozitivum 2' })).toBeInTheDocument();
  expect(within(dialog).getByRole('textbox', { name: 'Negativum 1' })).toBeInTheDocument();
});

test('failed background refetch of tournament keeps the page', async () => {
  const fetchMock = render();
  await screen.findByRole('button', { name: 'hodnotit' });
  fetchMock.mockImplementation(async () => new Response('boom', { status: 404 }));
  await act(() => fetchMock.queryClient.invalidateQueries({ queryKey: ['tournament', 1] }));
  await act(() => new Promise((r) => setTimeout(r, 20)));
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'hodnotit' })).toBeInTheDocument();
});
