import { act, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { API_BASE } from '../api/client';
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

test('failed user query shows error with retry instead of the login prompt', async () => {
  let failing = true;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toBe(`${API_BASE}user_profile`);
      if (failing) return new Response('boom', { status: 500 });
      return new Response(JSON.stringify(testUser({ is_authorized: true })), { status: 200 });
    }),
  );
  const { queryClient } = renderWithProviders(<RequireAuth level="authorized">{secret}</RequireAuth>);
  queryClient.setDefaultOptions({ queries: { retry: false } });
  await act(() => queryClient.resetQueries({ queryKey: ['user'] }));

  const alert = await screen.findByRole('alert');
  expect(alert).not.toHaveTextContent('Pro tuto stránku se musíš přihlásit.');
  failing = false;
  await userEvent.click(screen.getByRole('button', { name: 'Zkusit znovu' }));
  expect(await screen.findByText('tajné')).toBeInTheDocument();
});
