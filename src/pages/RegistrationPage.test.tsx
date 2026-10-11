import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router';
import { expect, test } from 'vitest';
import { t3 } from '../test/fixtures';
import { mockGraphApi, renderWithProviders, testUser } from '../test/utils';
import RegistrationPage from './RegistrationPage';

function Loc() {
  return <div data-testid="loc">{useLocation().pathname}</div>;
}

const open = { ...t3, registration_open: true, registration_to: '2025-01-10' };

const render = (tournament = open) => {
  const fetchMock = mockGraphApi({ 'tournament/3': tournament, add_team: 55, add_team_on_tournament: 1234 });
  renderWithProviders(
    <>
      <RegistrationPage />
      <Loc />
    </>,
    {
      route: '/tournaments/3/register',
      path: '/tournaments/:id/*',
      user: testUser({ is_authorized: true }),
    },
  );
  return fetchMock;
};

test('closed registration message', async () => {
  render({ ...t3, registration_open: false, registration_scheduled: false });
  expect(await screen.findByText('Přihlašování na turnaj bylo již uzavřeno.')).toBeInTheDocument();
});

test('register existing team and go to roster', async () => {
  const fetchMock = render();
  await userEvent.selectOptions(await screen.findByLabelText('Tým'), '10');
  const submit = screen.getByRole('button', { name: 'Přihlásit' });
  await userEvent.type(screen.getByLabelText('Kontaktní email'), 'a@b.cz');
  await userEvent.type(screen.getByLabelText('Kontaktní telefon'), '123');
  await userEvent.type(screen.getByLabelText('Odhad síly (1 - 4)'), '2');
  await userEvent.click(submit);
  expect(await screen.findByText('/tournaments/3/teams/1234')).toBeInTheDocument();
  const call = fetchMock.mock.calls.find(([u]) =>
    String(u).endsWith('add_team_on_tournament'),
  )! as unknown as [string, RequestInit];
  expect(JSON.parse(call[1].body as string)).toEqual({
    tournament: 3,
    team: 10,
    contact_mail: 'a@b.cz',
    contact_phone: '123',
    strength: 2,
  });
});

test('create new team selects it', async () => {
  render();
  await userEvent.click(await screen.findByRole('button', { name: 'vytvořit nový tým' }));
  const dialog = await screen.findByRole('dialog');
  await userEvent.type(within(dialog).getByLabelText('Jméno'), 'Nováčci');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Vytvořit' }));
  expect(await screen.findByRole('option', { name: 'Nováčci', selected: true })).toBeInTheDocument();
});

test('creating a team from a filled form does not submit the registration', async () => {
  const fetchMock = render();
  await userEvent.selectOptions(await screen.findByLabelText('Tým'), '10');
  await userEvent.type(screen.getByLabelText('Kontaktní email'), 'a@b.cz');
  await userEvent.type(screen.getByLabelText('Kontaktní telefon'), '123');
  await userEvent.type(screen.getByLabelText('Odhad síly (1 - 4)'), '2');
  await userEvent.click(screen.getByRole('button', { name: 'vytvořit nový tým' }));
  const dialog = await screen.findByRole('dialog');
  await userEvent.type(within(dialog).getByLabelText('Jméno'), 'Nováčci');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Vytvořit' }));
  expect(await screen.findByRole('option', { name: 'Nováčci', selected: true })).toBeInTheDocument();
  expect(fetchMock.mock.calls.some(([u]) => String(u).endsWith('add_team_on_tournament'))).toBe(false);
});

test('new team dialog draft is discarded on close', async () => {
  render();
  await userEvent.click(await screen.findByRole('button', { name: 'vytvořit nový tým' }));
  await userEvent.type(within(await screen.findByRole('dialog')).getByLabelText('Jméno'), 'Rozepsaný');
  await userEvent.keyboard('{Escape}');
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  await userEvent.click(screen.getByRole('button', { name: 'vytvořit nový tým' }));
  expect(within(await screen.findByRole('dialog')).getByLabelText('Jméno')).toHaveValue('');
});

test('invalid fields are explained and nothing is sent', async () => {
  const fetchMock = render();
  await userEvent.type(await screen.findByLabelText('Kontaktní email'), 'foo@bar');
  await userEvent.tab();
  expect(screen.getByText(/Neplatný email/)).toBeInTheDocument();
  expect(screen.queryByText(/Vyplň kontaktní telefon/)).toBeNull();
  await userEvent.type(screen.getByLabelText('Odhad síly (1 - 4)'), '7');
  await userEvent.click(screen.getByRole('button', { name: 'Přihlásit' }));
  expect(screen.getByText(/Vyber tým/)).toBeInTheDocument();
  expect(screen.getByText(/Vyplň kontaktní telefon/)).toBeInTheDocument();
  expect(screen.getByText(/Zadej číslo 1 až 4/)).toBeInTheDocument();
  expect(screen.getByLabelText('Kontaktní email')).toHaveAttribute('aria-invalid', 'true');
  expect(fetchMock.mock.calls.some(([u]) => String(u).endsWith('add_team_on_tournament'))).toBe(false);
  await userEvent.clear(screen.getByLabelText('Kontaktní email'));
  await userEvent.type(screen.getByLabelText('Kontaktní email'), 'foo@bar.cz');
  expect(screen.queryByText(/Neplatný email/)).toBeNull();
});

test('new team dialog requires a name', async () => {
  const fetchMock = render();
  await userEvent.click(await screen.findByRole('button', { name: 'vytvořit nový tým' }));
  const dialog = await screen.findByRole('dialog');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Vytvořit' }));
  expect(within(dialog).getByText(/Vyplň jméno týmu/)).toBeInTheDocument();
  expect(fetchMock.mock.calls.some(([u]) => String(u).endsWith('add_team'))).toBe(false);
});
