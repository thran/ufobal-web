import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
import type { Account } from '../api/auth';
import { mockApi, renderWithProviders, testUser } from '../test/utils';
import SettingsPage from './SettingsPage';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const account = (overrides: Partial<Account> = {}): Account => ({
  username: 'pepa',
  email: 'pepa@example.cz',
  has_password: true,
  social: [],
  ...overrides,
});

const body = (fetchMock: ReturnType<typeof mockApi>, path: string) => {
  const call = [...fetchMock.mock.calls].reverse().find(([url]) => String(url).endsWith(path));
  return JSON.parse((call as unknown as [string, RequestInit])[1].body as string);
};

const section = (name: string) => screen.getByRole('heading', { name }).closest('section')!;

test('changing the password asks for the current one', async () => {
  const fetchMock = mockApi({ account: account(), password_change: testUser() });
  renderWithProviders(<SettingsPage />, { user: testUser({ has_password: true }) });
  await userEvent.type(await screen.findByLabelText('Nové heslo'), 'Ufobal-heslo-2026');
  await userEvent.type(screen.getByLabelText('Nové heslo znovu'), 'Ufobal-heslo-2026');
  await userEvent.click(screen.getByRole('button', { name: 'Změnit heslo' }));
  expect(screen.getByText(/Vyplň současné heslo/)).toBeInTheDocument();
  await userEvent.type(screen.getByLabelText('Současné heslo'), 'stare');
  await userEvent.click(screen.getByRole('button', { name: 'Změnit heslo' }));
  await waitFor(() => expect(screen.getByLabelText('Nové heslo')).toHaveValue(''));
  expect(body(fetchMock, 'password_change')).toEqual({
    old_password: 'stare',
    password: 'Ufobal-heslo-2026',
    password_check: 'Ufobal-heslo-2026',
  });
});

test('account without a password sets its first one', async () => {
  const fetchMock = mockApi({
    account: account({ has_password: false }),
    password_change: testUser({ has_password: true }),
  });
  const { queryClient } = renderWithProviders(<SettingsPage />, { user: testUser({ has_password: false }) });
  await userEvent.type(await screen.findByLabelText('Nové heslo'), 'Ufobal-heslo-2026');
  expect(screen.queryByLabelText('Současné heslo')).not.toBeInTheDocument();
  await userEvent.type(screen.getByLabelText('Nové heslo znovu'), 'Ufobal-heslo-2026');
  await userEvent.click(screen.getByRole('button', { name: 'Nastavit heslo' }));
  await waitFor(() => expect(queryClient.getQueryData(['user'])).toMatchObject({ has_password: true }));
  expect(body(fetchMock, 'password_change')).toEqual({
    password: 'Ufobal-heslo-2026',
    password_check: 'Ufobal-heslo-2026',
  });
});

test('player section links the paired player or the pairing', async () => {
  mockApi({ account: account() });
  const player = {
    pk: 735,
    name: 'Jonáš',
    lastname: 'Holcner',
    nickname: 'Wizy',
    full_name: 'Jonáš Holcner',
  };
  const { unmount } = renderWithProviders(<SettingsPage />, {
    user: testUser({ player: { ...player, age: null, gender: 'man', is_paired: true } }),
  });
  expect(
    await within(await waitFor(() => section('Hráč'))).findByRole('link', { name: /Wizy/ }),
  ).toBeInTheDocument();
  unmount();
  renderWithProviders(<SettingsPage />, { user: testUser({ player: null }) });
  expect(await screen.findByRole('link', { name: 'Spárovat účet' })).toHaveAttribute('href', '/pair-account');
});

test('e-mail change sends a confirmation link', async () => {
  const fetchMock = mockApi({ account: account(), email_change: { ok: true } });
  renderWithProviders(<SettingsPage />, { user: testUser() });
  expect(await screen.findByText('pepa@example.cz')).toBeInTheDocument();
  await userEvent.type(screen.getByLabelText('Nový e-mail'), 'novy@example.cz');
  await userEvent.click(screen.getByRole('button', { name: 'Poslat potvrzovací odkaz' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Na novy@example.cz jsme poslali odkaz');
  expect(body(fetchMock, 'email_change')).toEqual({ email: 'novy@example.cz' });
});

test('linked accounts: disconnect Google, connect Facebook by redirect', async () => {
  const google = { id: 7, provider: 'google-oauth2' as const, uid: 'pepa@gmail.com' };
  const fetchMock = mockApi({ account: account({ social: [google] }), social_disconnect: account() });
  const assign = vi.fn();
  vi.stubGlobal('location', { ...window.location, assign });
  renderWithProviders(<SettingsPage />, { user: testUser() });
  await screen.findByText('pepa@gmail.com');
  const linked = within(section('Propojené účty'));

  await userEvent.click(linked.getByRole('button', { name: 'Propojit Facebook' }));
  expect(assign).toHaveBeenCalledWith('/login/facebook/?next=%2Fsettings');

  await userEvent.click(linked.getByRole('button', { name: 'Odpojit Google' }));
  expect(await linked.findByRole('button', { name: 'Propojit Google' })).toBeInTheDocument();
  expect(body(fetchMock, 'social_disconnect')).toEqual({ id: 7 });
});
