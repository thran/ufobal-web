import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router';
import { expect, test } from 'vitest';
import type { User } from '../api/types';
import { playerDto } from '../test/fixtures';
import { mockApi, renderWithProviders, testUser } from '../test/utils';
import PairAccountPage from './PairAccountPage';

function Loc() {
  return <div data-testid="loc">{useLocation().pathname}</div>;
}

// Own Routes so that navigating away from the page still renders the location probe.
const render = (route: string, user: User | null = testUser()) =>
  renderWithProviders(
    <>
      <Routes>
        <Route path="/pair-account/:token?" element={<PairAccountPage />} />
      </Routes>
      <Loc />
    </>,
    { route, user },
  );

test('anonymous visitor sees login options and token is remembered', () => {
  mockApi({});
  render('/pair-account/ABCDE', null);
  expect(screen.getByText(/musíš se nejdříve přihlásit/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Google/ })).toBeInTheDocument();
  expect(localStorage.getItem('ufo:pairToken')).toBe('ABCDE');
});

test('logged-in user pairs with remembered token, token cleared, redirected to player', async () => {
  localStorage.setItem('ufo:pairToken', 'ABCDE');
  mockApi({ 'pair_user/ABCDE': playerDto({ pk: 100, nickname: 'Pépa' }), user_profile: testUser() });
  render('/pair-account');
  expect(screen.getByRole('textbox', { name: 'kód' })).toHaveValue('ABCDE');
  await userEvent.click(screen.getByRole('button', { name: 'Spárovat' }));
  expect(await screen.findByText('/players/100/P%C3%A9pa')).toBeInTheDocument();
  expect(localStorage.getItem('ufo:pairToken')).toBeNull();
});

test('pairing error is shown inline', async () => {
  mockApi({});
  render('/pair-account/XXXXX');
  await userEvent.click(screen.getByRole('button', { name: 'Spárovat' }));
  expect(await screen.findByText(/Spárování se nezdařilo/)).toBeInTheDocument();
});

test('already paired user: URL token is not stored and a stored one is cleared', () => {
  localStorage.setItem('ufo:pairToken', 'OLD');
  mockApi({});
  render(
    '/pair-account/ABCDE',
    testUser({
      player: {
        pk: 100,
        name: 'Josef',
        lastname: 'Novák',
        nickname: 'Pépa',
        age: 30,
        full_name: 'Pépa - Josef Novák',
        gender: 'man',
        is_paired: true,
      },
    }),
  );
  expect(localStorage.getItem('ufo:pairToken')).toBeNull();
});
