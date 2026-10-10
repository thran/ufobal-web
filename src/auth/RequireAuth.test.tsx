import { screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { renderWithProviders, testUser } from '../test/utils';
import RequireAuth from './RequireAuth';

const secret = <p>tajné</p>;

test('login level', () => {
  const { unmount } = renderWithProviders(<RequireAuth level="login">{secret}</RequireAuth>);
  expect(screen.getByRole('alert')).toHaveTextContent('Pro tuto stránku se musíš přihlásit.');
  unmount();
  renderWithProviders(<RequireAuth level="login">{secret}</RequireAuth>, { user: testUser() });
  expect(screen.getByText('tajné')).toBeInTheDocument();
});

test('authorized level: logged but unpaired user gets pairing hint', () => {
  renderWithProviders(<RequireAuth level="authorized">{secret}</RequireAuth>, { user: testUser() });
  expect(screen.getByRole('alert')).toHaveTextContent('spáruj');
  expect(screen.getByRole('link', { name: 'Spárovat účet' })).toHaveAttribute('href', '/pair-account');
});

test('authorized level passes for authorized user', () => {
  renderWithProviders(<RequireAuth level="authorized">{secret}</RequireAuth>, { user: testUser({ is_authorized: true }) });
  expect(screen.getByText('tajné')).toBeInTheDocument();
});

test('staff level', () => {
  const { unmount } = renderWithProviders(<RequireAuth level="staff">{secret}</RequireAuth>, { user: testUser({ is_authorized: true }) });
  expect(screen.getByRole('alert')).toHaveTextContent('jen pro administrátory');
  unmount();
  renderWithProviders(<RequireAuth level="staff">{secret}</RequireAuth>, { user: testUser({ is_staff: true }) });
  expect(screen.getByText('tajné')).toBeInTheDocument();
});
