import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import { renderWithProviders } from '../test/utils';
import UserMenu from './UserMenu';

beforeEach(() => {
  // Headless UI anchored menus need ResizeObserver, missing in jsdom.
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

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
