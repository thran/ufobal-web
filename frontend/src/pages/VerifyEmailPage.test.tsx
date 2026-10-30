import { screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { mockApi, renderWithProviders, testUser } from '../test/utils';
import VerifyEmailPage from './VerifyEmailPage';

afterEach(() => vi.unstubAllGlobals());

const render = () =>
  renderWithProviders(<VerifyEmailPage />, { route: '/verify-email/tok:en', path: '/verify-email/:token' });

test('confirms the e-mail once and logs in', async () => {
  const user = testUser({ first_name: 'Nový' });
  const fetchMock = mockApi({ email_verify: user });
  const { queryClient } = render();
  expect(await screen.findByText(/E-mail potvrzený/)).toBeInTheDocument();
  expect(queryClient.getQueryData(['user'])).toEqual(user);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test('used link offers to log in', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(
          '{"error":"E-mail už je potvrzený, stačí se přihlásit.","error_type":"already_verified"}',
          {
            status: 400,
          },
        ),
    ),
  );
  render();
  expect(await screen.findByRole('alert')).toHaveTextContent('E-mail už je potvrzený');
  expect(screen.getByRole('button', { name: 'Přihlásit se' })).toBeInTheDocument();
});
