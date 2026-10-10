import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { dataKeys } from '../queries/data';
import { sampleRaw } from '../test/fixtures';
import { mockGraphApi, renderWithProviders, testUser } from '../test/utils';
import RosterPage from './RosterPage';

const render = () => {
  const fetchMock = mockGraphApi({
    add_attendance: 'OK',
    'remove_attendance/101-(1000': 'OK',
    set_captain: 'OK',
    add_player: 321,
  });
  renderWithProviders(<RosterPage />, {
    route: '/tournaments/1/teams/1000',
    path: '/tournaments/:id/teams/:totId',
    user: testUser({ is_authorized: true }),
  });
  return fetchMock;
};

const bodyOf = (fetchMock: ReturnType<typeof render>, suffix: string) =>
  JSON.parse(
    (fetchMock.mock.calls as unknown as [unknown, RequestInit][]).find(([u]) =>
      String(u).endsWith(suffix),
    )![1].body as string,
  );

test('shows roster, adds a player via combobox', async () => {
  const fetchMock = render();
  expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Brno 2023 - Ufo');
  expect(screen.getByRole('link', { name: /Pépa/ })).toBeInTheDocument();
  await userEvent.type(screen.getByRole('combobox', { name: 'Hráč' }), 'karel');
  await userEvent.click(await screen.findByRole('option', { name: /Karel/ }));
  await userEvent.click(screen.getByRole('button', { name: 'Přidat' }));
  expect(bodyOf(fetchMock, 'add_attendance')).toEqual({ player: 102, team: 1000 });
});

test('remove asks for confirmation', async () => {
  const fetchMock = render();
  const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
  await userEvent.click(await screen.findByRole('button', { name: 'Odebrat Jana' }));
  expect(fetchMock.mock.calls.some(([u]) => String(u).includes('remove_attendance'))).toBe(false);
  await userEvent.click(screen.getByRole('button', { name: 'Odebrat Jana' }));
  expect(confirm).toHaveBeenCalledTimes(2);
  expect(fetchMock.mock.calls.some(([u]) => String(u).endsWith('remove_attendance/101-(1000'))).toBe(true);
});

test('set captain sends selected player', async () => {
  const fetchMock = render();
  await userEvent.selectOptions(await screen.findByLabelText('Kapitán'), '101');
  await userEvent.click(screen.getAllByRole('button', { name: 'Nastavit' })[0]);
  expect(bodyOf(fetchMock, 'set_captain')).toEqual({ player: 101, team: 1000 });
});

test('new player is created and added to roster', async () => {
  const fetchMock = render();
  await userEvent.click(await screen.findByRole('button', { name: 'Nový hráč' }));
  const dialog = await screen.findByRole('dialog');
  await userEvent.type(within(dialog).getByLabelText('Přezdívka'), 'Nováček');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Vytvořit' }));
  await waitFor(() =>
    expect(fetchMock.mock.calls.some(([u]) => String(u).endsWith('add_attendance'))).toBe(true),
  );
  expect(bodyOf(fetchMock, 'add_player')).toMatchObject({ nickname: 'Nováček' });
  expect(bodyOf(fetchMock, 'add_attendance')).toEqual({ player: 321, team: 1000 });
});

test('captain select resyncs when server data changes', async () => {
  mockGraphApi({});
  const { queryClient } = renderWithProviders(<RosterPage />, {
    route: '/tournaments/1/teams/1000',
    path: '/tournaments/:id/teams/:totId',
    user: testUser({ is_authorized: true }),
  });
  expect(await screen.findByLabelText('Kapitán')).toHaveValue('100');
  const updated = sampleRaw().tots.map((t) => (t.pk === 1000 ? { ...t, captain: 101 } : t));
  act(() => queryClient.setQueryData(dataKeys.tots, updated));
  await waitFor(() => expect(screen.getByLabelText('Kapitán')).toHaveValue('101'));
});

test('new player dialog draft is discarded on cancel', async () => {
  render();
  await userEvent.click(await screen.findByRole('button', { name: 'Nový hráč' }));
  await userEvent.type(within(await screen.findByRole('dialog')).getByLabelText('Přezdívka'), 'Rozepsaný');
  await userEvent.keyboard('{Escape}');
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  await userEvent.click(screen.getByRole('button', { name: 'Nový hráč' }));
  expect(within(await screen.findByRole('dialog')).getByLabelText('Přezdívka')).toHaveValue('');
});
