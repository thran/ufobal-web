import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { renderWithProviders, testUser } from '../test/utils';
import UserMenu from './UserMenu';

test('login dialog fields are empty after closing and reopening', async () => {
  renderWithProviders(<UserMenu />, { user: null });
  const openDialog = async () => {
    await userEvent.click(screen.getByRole('button', { name: 'Přihlášení' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: /přes jméno/ }));
  };
  await openDialog();
  await userEvent.type(screen.getByPlaceholderText('jméno'), 'pepa');
  await userEvent.type(screen.getByPlaceholderText('heslo'), 'tajne');
  await userEvent.keyboard('{Escape}');
  await openDialog();
  expect(screen.getByPlaceholderText('jméno')).toHaveValue('');
  expect(screen.getByPlaceholderText('heslo')).toHaveValue('');
});

test('admin entry in the user menu only for admins, as full page link', async () => {
  const { unmount } = renderWithProviders(<UserMenu />, { user: testUser({ is_manager: true }) });
  await userEvent.click(screen.getByRole('button', { name: /Jan Novák/ }));
  expect(screen.getByRole('menuitem', { name: 'Odhlásit se' })).toBeInTheDocument();
  expect(screen.queryByRole('menuitem', { name: 'Admin' })).not.toBeInTheDocument();
  unmount();

  renderWithProviders(<UserMenu />, { user: testUser({ is_admin: true, is_staff: true }) });
  await userEvent.click(screen.getByRole('button', { name: /Jan Novák/ }));
  expect(screen.getByRole('menuitem', { name: 'Admin' })).toHaveAttribute('href', '/admin/');
});
