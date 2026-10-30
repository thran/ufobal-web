import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
import { mockApi, renderWithProviders } from '../test/utils';
import SignupDialog from './SignupDialog';

afterEach(() => vi.unstubAllGlobals());

test('signup does not log in and asks to confirm the e-mail', async () => {
  mockApi({ signup: { verification_sent: true, email: 'novy@example.cz' } });
  const onClose = vi.fn();
  const { queryClient } = renderWithProviders(<SignupDialog open onClose={onClose} />);
  await userEvent.type(screen.getByLabelText('Uživatelské jméno'), 'novy');
  await userEvent.type(screen.getByLabelText('Email'), 'novy@example.cz');
  await userEvent.type(screen.getByLabelText('Heslo'), 'Ufobal-heslo-2026');
  await userEvent.type(screen.getByLabelText('Kontrola hesla'), 'Ufobal-heslo-2026');
  await userEvent.click(screen.getByRole('button', { name: 'Registrovat' }));
  expect(await screen.findByRole('status')).toHaveTextContent('na novy@example.cz jsme poslali odkaz');
  expect(onClose).not.toHaveBeenCalled();
  expect(queryClient.getQueryData(['user'])).toBeNull();
});
