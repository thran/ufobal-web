import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { renderWithProviders, testUser } from '../test/utils';
import TopBar from './TopBar';

test('shows main navigation', () => {
  renderWithProviders(<TopBar />);
  for (const name of ['Turnaje', 'Týmy', 'Hráči', 'Statistiky', 'Brankáři', 'Síň rekordů', 'Co a jak?']) {
    expect(screen.getAllByRole('link', { name })[0]).toBeInTheDocument();
  }
  expect(screen.getAllByRole('link', { name: 'Hráči' })[0]).toHaveAttribute('href', '/players');
});

test('live tournament link only when known', () => {
  const { unmount } = renderWithProviders(<TopBar />);
  expect(screen.queryByRole('link', { name: 'Aktuální turnaj' })).not.toBeInTheDocument();
  unmount();
  renderWithProviders(<TopBar />, { config: { liveTournamentPk: 42 } });
  expect(screen.getByRole('link', { name: 'Aktuální turnaj' })).toHaveAttribute('href', '/tournaments/42/record');
});

test('admin link only for staff, as full page link', () => {
  const { unmount } = renderWithProviders(<TopBar />, { user: testUser() });
  expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument();
  unmount();
  renderWithProviders(<TopBar />, { user: testUser({ is_staff: true }) });
  expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/managestats/');
});

test('anonymous user sees login menu', async () => {
  renderWithProviders(<TopBar />);
  await userEvent.click(screen.getByRole('button', { name: 'Přihlášení' }));
  expect(screen.getByRole('menuitem', { name: /Google/ })).toBeInTheDocument();
  expect(screen.getByRole('menuitem', { name: /Facebook/ })).toBeInTheDocument();
  expect(screen.getByRole('menuitem', { name: /jméno/ })).toBeInTheDocument();
  expect(screen.getByRole('menuitem', { name: /registrovat/ })).toBeInTheDocument();
});

test('logged user sees name with nickname and logout', async () => {
  const player = { pk: 7, name: 'Jan', lastname: 'Novák', nickname: 'Honza', age: 20, full_name: 'Jan Novák', gender: 'man', is_paired: true };
  renderWithProviders(<TopBar />, { user: testUser({ player }) });
  await userEvent.click(screen.getByRole('button', { name: /Jan Novák - Honza/ }));
  expect(screen.getByRole('menuitem', { name: 'Profil hráče' })).toBeInTheDocument();
  expect(screen.getByRole('menuitem', { name: 'Odhlásit se' })).toBeInTheDocument();
});
