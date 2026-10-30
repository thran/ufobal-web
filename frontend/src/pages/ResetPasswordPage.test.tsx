import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
import { Route, Routes } from 'react-router';
import { mockApi, renderWithProviders, testUser } from '../test/utils';
import ResetPasswordPage from './ResetPasswordPage';

afterEach(() => vi.unstubAllGlobals());

const render = () =>
  renderWithProviders(
    <Routes>
      <Route path="/reset-password/:uid/:token" element={<ResetPasswordPage />} />
      <Route path="/settings" element={<p>settings page</p>} />
    </Routes>,
    { route: '/reset-password/MTI/abc-123' },
  );

test('valid link: sets the password, logs in and goes to settings', async () => {
  const user = testUser({ has_password: true });
  const fetchMock = mockApi({
    password_reset_check: { valid: true, username: 'google-user', has_password: false },
    password_reset_confirm: user,
  });
  const { queryClient } = render();
  expect(await screen.findByText('google-user')).toBeInTheDocument();
  await userEvent.type(screen.getByLabelText('Nové heslo'), 'Ufobal-heslo-2026');
  await userEvent.type(screen.getByLabelText('Nové heslo znovu'), 'Ufobal-heslo-2026');
  await userEvent.click(screen.getByRole('button', { name: 'Nastavit heslo' }));
  expect(await screen.findByText('settings page')).toBeInTheDocument();
  const confirm = fetchMock.mock.calls.find(([url]) => String(url).endsWith('password_reset_confirm'));
  expect(JSON.parse((confirm as unknown as [string, RequestInit])[1].body as string)).toEqual({
    uid: 'MTI',
    token: 'abc-123',
    password: 'Ufobal-heslo-2026',
    password_check: 'Ufobal-heslo-2026',
  });
  expect(queryClient.getQueryData(['user'])).toEqual(user);
});

test('short or mismatched password is caught before sending', async () => {
  const fetchMock = mockApi({ password_reset_check: { valid: true, username: 'pepa', has_password: true } });
  render();
  await userEvent.type(await screen.findByLabelText('Nové heslo'), 'kratke');
  await userEvent.type(screen.getByLabelText('Nové heslo znovu'), 'jine');
  await userEvent.click(screen.getByRole('button', { name: 'Nastavit heslo' }));
  expect(screen.getByText(/aspoň 8 znaků/)).toBeInTheDocument();
  expect(screen.getByText(/Hesla se liší/)).toBeInTheDocument();
  expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('password_reset_confirm'))).toBe(false);
});

test('invalid link offers a new one', async () => {
  mockApi({ password_reset_check: { valid: false } });
  render();
  expect(await screen.findByRole('alert')).toHaveTextContent(/neplatný/);
  await userEvent.click(screen.getByRole('button', { name: 'Poslat nový odkaz' }));
  await waitFor(() => expect(screen.getByRole('dialog')).toHaveTextContent('Zapomenuté heslo'));
});
