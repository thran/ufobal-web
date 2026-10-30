import { screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { mockApi, renderWithProviders } from '../test/utils';
import ConfirmEmailPage from './ConfirmEmailPage';

afterEach(() => vi.unstubAllGlobals());

const render = () =>
  renderWithProviders(<ConfirmEmailPage />, {
    route: '/confirm-email/tok:en',
    path: '/confirm-email/:token',
  });

test('confirms the new e-mail from the link', async () => {
  const fetchMock = mockApi({ email_change_confirm: { email: 'novy@example.cz' } });
  render();
  expect(await screen.findByText(/E-mail změněn na/)).toHaveTextContent('E-mail změněn na novy@example.cz');
  expect(JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)).toEqual(
    {
      token: 'tok:en',
    },
  );
});

test('invalid link says so and points to settings', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response('{"error":"Odkaz je neplatný nebo vypršel.","error_type":"token_invalid"}', {
          status: 400,
        }),
    ),
  );
  render();
  expect(await screen.findByRole('alert')).toHaveTextContent('Odkaz je neplatný nebo vypršel.');
  expect(screen.getByRole('link', { name: 'nastavení účtu' })).toHaveAttribute('href', '/settings');
});
