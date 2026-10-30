import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
import { mockApi, renderWithProviders, testUser } from '../test/utils';
import SettingsPage from './SettingsPage';

afterEach(() => vi.unstubAllGlobals());

const body = (fetchMock: ReturnType<typeof mockApi>) => {
  const call = fetchMock.mock.calls.find(([url]) => String(url).endsWith('password_change'));
  return JSON.parse((call as unknown as [string, RequestInit])[1].body as string);
};

test('changing the password asks for the current one', async () => {
  const fetchMock = mockApi({ password_change: testUser() });
  renderWithProviders(<SettingsPage />, { user: testUser({ has_password: true }) });
  await userEvent.type(screen.getByLabelText('Nové heslo'), 'Ufobal-heslo-2026');
  await userEvent.type(screen.getByLabelText('Nové heslo znovu'), 'Ufobal-heslo-2026');
  await userEvent.click(screen.getByRole('button', { name: 'Změnit heslo' }));
  expect(screen.getByText(/Vyplň současné heslo/)).toBeInTheDocument();
  await userEvent.type(screen.getByLabelText('Současné heslo'), 'stare');
  await userEvent.click(screen.getByRole('button', { name: 'Změnit heslo' }));
  await waitFor(() => expect(screen.getByLabelText('Nové heslo')).toHaveValue(''));
  expect(body(fetchMock)).toEqual({
    old_password: 'stare',
    password: 'Ufobal-heslo-2026',
    password_check: 'Ufobal-heslo-2026',
  });
});

test('account without a password sets its first one', async () => {
  const fetchMock = mockApi({ password_change: testUser({ has_password: true }) });
  const { queryClient } = renderWithProviders(<SettingsPage />, { user: testUser({ has_password: false }) });
  expect(screen.queryByLabelText('Současné heslo')).not.toBeInTheDocument();
  await userEvent.type(screen.getByLabelText('Nové heslo'), 'Ufobal-heslo-2026');
  await userEvent.type(screen.getByLabelText('Nové heslo znovu'), 'Ufobal-heslo-2026');
  await userEvent.click(screen.getByRole('button', { name: 'Nastavit heslo' }));
  await waitFor(() => expect(queryClient.getQueryData(['user'])).toMatchObject({ has_password: true }));
  expect(body(fetchMock)).toEqual({ password: 'Ufobal-heslo-2026', password_check: 'Ufobal-heslo-2026' });
});
