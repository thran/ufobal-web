import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { renderWithProviders, testUser } from '../test/utils';
import LoginDialog from './LoginDialog';

const fetchMock = vi.fn();
beforeEach(() => vi.stubGlobal('fetch', fetchMock));
afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

test('submits credentials and closes on success', async () => {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(testUser()), { status: 200 }));
  const onClose = vi.fn();
  const { queryClient } = renderWithProviders(<LoginDialog open onClose={onClose} />);
  await userEvent.type(screen.getByPlaceholderText('jméno nebo e-mail'), 'pepa');
  await userEvent.type(screen.getByPlaceholderText('heslo'), 'tajne');
  await userEvent.click(screen.getByRole('button', { name: 'Přihlásit' }));
  await waitFor(() => expect(onClose).toHaveBeenCalled());
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ username: 'pepa', password: 'tajne' });
  expect(queryClient.getQueryData(['user'])).toEqual(testUser());
});

test('forgotten password sends the e-mail and shows the same answer for any address', async () => {
  fetchMock.mockResolvedValueOnce(new Response('{"ok":true}', { status: 200 }));
  renderWithProviders(<LoginDialog open onClose={vi.fn()} />);
  await userEvent.click(screen.getByRole('button', { name: 'Zapomenuté heslo?' }));
  await userEvent.type(screen.getByLabelText('e-mail'), ' pepa@example.cz ');
  await userEvent.click(screen.getByRole('button', { name: 'Poslat odkaz' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Pokud k e-mailu pepa@example.cz patří účet');
  expect(String(fetchMock.mock.calls[0][0])).toMatch(/password_reset$/);
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ email: 'pepa@example.cz' });
});

test('stays open on failure', async () => {
  fetchMock.mockResolvedValueOnce(
    new Response('{"error":"Špatné jméno nebo heslo.","error_type":"password_username_not_match"}', { status: 401 }),
  );
  const onClose = vi.fn();
  renderWithProviders(<LoginDialog open onClose={onClose} />);
  await userEvent.type(screen.getByPlaceholderText('jméno nebo e-mail'), 'pepa');
  await userEvent.type(screen.getByPlaceholderText('heslo'), 'x');
  await userEvent.click(screen.getByRole('button', { name: 'Přihlásit' }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  expect(onClose).not.toHaveBeenCalled();
});
