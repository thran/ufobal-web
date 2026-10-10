import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { mockGraphApi, renderWithProviders, testUser } from '../test/utils';
import PlayerPage from './PlayerPage';
import PlayersPage from './PlayersPage';

test('players list sorted by canada with teams and stats', async () => {
  mockGraphApi();
  renderWithProviders(<PlayersPage />);
  const rows = within((await screen.findAllByRole('rowgroup'))[1]).getAllByRole('row');
  expect(rows[0]).toHaveTextContent('Pépa');
  expect(rows[0]).toHaveTextContent('Ufo (2x)');
  expect(within(rows[0]).getAllByRole('cell')[4]).toHaveTextContent('5');
  expect(rows[2]).toHaveTextContent('Jana');
});

test('player detail shows tournaments, cards and score without team', async () => {
  mockGraphApi();
  renderWithProviders(<PlayerPage />, { route: '/players/100/Pepa', path: '/players/:id/:slug?' });
  expect(await screen.findByRole('heading', { name: 'Pépa' })).toBeInTheDocument();
  expect(screen.getByText(/Josef Novák/)).toHaveTextContent('(30)');
  expect(screen.getByRole('link', { name: 'Nížkov 2024' })).toHaveAttribute(
    'href',
    '/tournaments/2/results/1002',
  );
  expect(screen.getByRole('link', { name: 'Béčko (Ufo)' })).toHaveAttribute(
    'href',
    '/teams/10/B%C3%A9%C4%8Dko%20(Ufo)',
  );
  expect(screen.getByText('žlutá')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'detail' })).toHaveAttribute('href', '/tournaments/1/matches/500');
});

test('player with no teams, goals in a tournament without roster', async () => {
  mockGraphApi();
  renderWithProviders(<PlayerPage />, { route: '/players/102/Karel', path: '/players/:id/:slug?' });
  expect(await screen.findByText('What? Turnaje se skórem, ale bez týmu')).toBeInTheDocument();
  expect(screen.getByText('Brno 2023 - 4 gólů a 0 asistencí')).toBeInTheDocument();
  expect(screen.getByRole('columnheader', { name: 'Zdůvodnění' })).toBeInTheDocument();
});

test('unknown player id shows not found', async () => {
  mockGraphApi();
  renderWithProviders(<PlayerPage />, { route: '/players/999999', path: '/players/:id/:slug?' });
  expect(await screen.findByRole('alert')).toHaveTextContent('Hráč nenalezen.');
});

const ownUser = testUser({
  is_authorized: true,
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
});

test('owner edits profile without sending birthdate', async () => {
  const fetchMock = mockGraphApi({ save_player: 'OK' });
  renderWithProviders(<PlayerPage />, {
    route: '/players/100/Pepa',
    path: '/players/:id/:slug?',
    user: ownUser,
  });
  await userEvent.click(await screen.findByRole('button', { name: 'upravit profil' }));
  const nick = screen.getByLabelText('Přezdívka');
  await userEvent.clear(nick);
  await userEvent.type(nick, 'Pepík');
  await userEvent.click(screen.getByRole('button', { name: 'Uložit' }));
  const call = fetchMock.mock.calls.find(([u]) => String(u).endsWith('save_player'))!;
  const body = JSON.parse((call as unknown as [string, RequestInit])[1].body as string);
  expect(body).toMatchObject({ pk: 100, nickname: 'Pepík' });
  expect('birthdate' in body).toBe(false);
});

test('other users see no edit controls; unpaired user can request pairing', async () => {
  const fetchMock = mockGraphApi({ 'create_pairing_request/102': 'OK' });
  renderWithProviders(<PlayerPage />, {
    route: '/players/102/Karel',
    path: '/players/:id/:slug?',
    user: testUser(),
  });
  await screen.findByRole('heading', { name: 'Karel' });
  expect(screen.queryByRole('button', { name: 'upravit profil' })).not.toBeInTheDocument();
  expect(screen.queryByText('Přidávání historických turnajů')).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'spárovat' }));
  await userEvent.type(screen.getByLabelText(/dodatečné informace/), 'odkaz');
  await userEvent.click(screen.getByRole('button', { name: 'Odeslat žádost' }));
  const call = fetchMock.mock.calls.find(([u]) => String(u).endsWith('create_pairing_request/102'))!;
  expect(JSON.parse((call as unknown as [string, RequestInit])[1].body as string)).toEqual({ text: 'odkaz' });
});

test('owner removes attendance after confirm and adds historical attendance', async () => {
  const fetchMock = mockGraphApi({ 'remove_attendance/100-(1002': 'OK', add_attendance: 'OK' });
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  renderWithProviders(<PlayerPage />, {
    route: '/players/100/Pepa',
    path: '/players/:id/:slug?',
    user: ownUser,
  });
  await userEvent.click(await screen.findByRole('button', { name: 'Smazat účast Nížkov 2024' }));
  expect(fetchMock.mock.calls.some(([u]) => String(u).endsWith('remove_attendance/100-(1002'))).toBe(true);
  await userEvent.selectOptions(screen.getByLabelText('Turnaj'), '1');
  await userEvent.selectOptions(screen.getByLabelText('Tým'), '1001');
  await userEvent.click(screen.getByRole('button', { name: 'přidat' }));
  const call = fetchMock.mock.calls.find(([u]) => String(u).endsWith('add_attendance'))!;
  expect(JSON.parse((call as unknown as [string, RequestInit])[1].body as string)).toEqual({
    player: 100,
    team: 1001,
  });
});

test('pairing dialog draft is discarded on cancel', async () => {
  mockGraphApi({});
  renderWithProviders(<PlayerPage />, {
    route: '/players/102/Karel',
    path: '/players/:id/:slug?',
    user: testUser(),
  });
  await userEvent.click(await screen.findByRole('button', { name: 'spárovat' }));
  await userEvent.type(screen.getByLabelText(/dodatečné informace/), 'rozepsáno');
  await userEvent.click(screen.getByRole('button', { name: 'Zrušit' }));
  await userEvent.click(screen.getByRole('button', { name: 'spárovat' }));
  expect(await screen.findByLabelText(/dodatečné informace/)).toHaveValue('');
});
