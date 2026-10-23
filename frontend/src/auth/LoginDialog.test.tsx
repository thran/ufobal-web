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
  await userEvent.type(screen.getByPlaceholderText('jméno'), 'pepa');
  await userEvent.type(screen.getByPlaceholderText('heslo'), 'tajne');
  await userEvent.click(screen.getByRole('button', { name: 'Přihlásit' }));
  await waitFor(() => expect(onClose).toHaveBeenCalled());
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ username: 'pepa', password: 'tajne' });
  expect(queryClient.getQueryData(['user'])).toEqual(testUser());
});

test('stays open on failure', async () => {
  fetchMock.mockResolvedValueOnce(
    new Response('{"error":"Špatné jméno nebo heslo.","error_type":"password_username_not_match"}', { status: 401 }),
  );
  const onClose = vi.fn();
  renderWithProviders(<LoginDialog open onClose={onClose} />);
  await userEvent.type(screen.getByPlaceholderText('jméno'), 'pepa');
  await userEvent.type(screen.getByPlaceholderText('heslo'), 'x');
  await userEvent.click(screen.getByRole('button', { name: 'Přihlásit' }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  expect(onClose).not.toHaveBeenCalled();
});
