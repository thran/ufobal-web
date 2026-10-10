import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import type { MatchEvent } from '../../domain/matchEvents';
import { ClockControls } from './ClockControls';
import { EventList } from './EventList';
import { GoalieRow } from './GoalieRow';
import { MatchStatus } from './MatchStatus';
import { PenaltyCountdowns } from './PenaltyCountdowns';
import { PlayerTiles } from './PlayerTiles';
import { Scoreboard } from './Scoreboard';
import { SyncStatus } from './SyncStatus';
import { TeamNames } from './TeamNames';

test('ClockControls shows formatted time, toggles on digits and adjusts', async () => {
  const onToggle = vi.fn();
  const onAdjust = vi.fn();
  render(
    <ClockControls remainingMs={65_400} running={false} phase={1} onToggle={onToggle} onAdjust={onAdjust} />,
  );
  const digits = screen.getByRole('button', { name: 'Čas zápasu' });
  expect(digits).toHaveTextContent('01:05.4');
  expect(digits).not.toHaveClass('text-alert');
  await userEvent.click(digits);
  expect(onToggle).toHaveBeenCalledTimes(1);
  await userEvent.click(screen.getByRole('button', { name: 'Spustit čas' }));
  expect(onToggle).toHaveBeenCalledTimes(2);
  await userEvent.click(screen.getByRole('button', { name: 'Přidat 5 s' }));
  await userEvent.click(screen.getByRole('button', { name: 'Ubrat 1 s' }));
  expect(onAdjust.mock.calls).toEqual([[5000], [-1000]]);
});

test('ClockControls: negative time is red, running shows pause, phase 0 highlights', () => {
  const { container } = render(
    <ClockControls remainingMs={-5000} running phase={0} onToggle={() => {}} onAdjust={() => {}} />,
  );
  expect(screen.getByRole('button', { name: 'Čas zápasu' })).toHaveClass('text-alert');
  expect(screen.getByRole('button', { name: 'Čas zápasu' }).textContent).toMatch(/^-/);
  expect(screen.getByRole('button', { name: 'Zastavit čas' })).toHaveClass('min-h-11', 'min-w-11');
  expect(container.querySelector('.pressbutton')).not.toBeNull();
});

test('Scoreboard percentage and totals', () => {
  const side = { colorClass: 'team-one' };
  render(
    <Scoreboard
      left={{ goals: 3, shots: 1, ...side }}
      right={{ goals: 0, shots: 0, colorClass: 'team-two' }}
    />,
  );
  expect(screen.getByTestId('stats-left')).toHaveTextContent('75% - 4');
  expect(screen.getByTestId('stats-right').textContent).toBe('% - 0');
});

test('EventList hides shots unless showShots, newest first', () => {
  const events: MatchEvent[] = [
    {
      id: 'g1',
      type: 'goal',
      time: '00:01:00',
      team: 1,
      data: { shooter: 10, assistance: 11, goalType: 'penalty' },
      pk: 1,
      saved: true,
    },
    { id: 's1', type: 'shot', time: '00:02:00', team: 2, data: { shooter: null }, pk: 2, saved: true },
  ];
  const props = {
    events,
    sides: { left: 1, right: 2 },
    teamColor: () => 'team-one',
    playerName: (pk: number | null) => `P${pk}`,
    editable: false,
  };
  const { rerender } = render(<EventList {...props} showShots={false} />);
  const mobile = within(screen.getByTestId('events-mobile'));
  expect(mobile.queryByText(/střela/)).toBeNull();
  expect(mobile.getByText(/gól:/)).toHaveTextContent('gól: P10 - P11 - penalta');
  expect(mobile.getByText('01:00')).toBeInTheDocument();
  rerender(<EventList {...props} showShots />);
  const rows = within(screen.getByTestId('events-mobile')).getAllByText(/gól:|střela/);
  expect(rows[0]).toHaveTextContent('střela');
  expect(rows[1]).toHaveTextContent('gól:');
  expect(screen.queryByRole('button', { name: 'Smazat' })).toBeNull();
});

test('EventList renders penalty, goalie change, halftime and end texts; desktop columns follow sides', () => {
  const events: MatchEvent[] = [
    {
      id: 'p',
      type: 'penalty',
      time: '00:03:00',
      team: 1,
      data: { player: 10, card: 'red', reason: 'Držení' },
      pk: 3,
      saved: true,
    },
    { id: 'c', type: 'goalieChange', time: '00:04:00', team: 2, data: { goalie: 11 }, pk: 4, saved: true },
    { id: 'halftime', type: 'halftime', time: '00:10:00', team: null, data: null, pk: null, saved: true },
    { id: 'end', type: 'end', time: '00:20:00', team: null, data: null, pk: null, saved: true },
  ];
  render(
    <EventList
      events={events}
      sides={{ left: 2, right: 1 }}
      teamColor={() => ''}
      playerName={(pk) => `P${pk}`}
      showShots={false}
      editable={false}
    />,
  );
  const mobile = within(screen.getByTestId('events-mobile'));
  expect(mobile.getByText(/červená karta/)).toHaveTextContent('⚠ červená karta: P10 - Držení');
  expect(mobile.getByText(/změna brankáře/)).toHaveTextContent('⟳ změna brankáře: P11');
  expect(mobile.getByText('konec poločasu')).toBeInTheDocument();
  expect(mobile.getByText('konec zápasu')).toBeInTheDocument();
  const desktop = within(screen.getByTestId('events-desktop'));
  const penaltyRow = desktop.getByText(/červená karta/).closest('.grid')!;
  // team 1 is on the right when sides.right === 1
  expect(penaltyRow.children[2]).toContainElement(desktop.getByText(/červená karta/));
  const goalieRow = desktop.getByText(/změna brankáře/).closest('.grid')!;
  expect(goalieRow.children[0]).toContainElement(desktop.getByText(/změna brankáře/));
});

test('EventList shows sync state, error actions, and disables in-flight remove', async () => {
  const onRetry = vi.fn();
  const onDiscard = vi.fn();
  const events: MatchEvent[] = [
    {
      id: 'new',
      type: 'goal',
      time: '00:05:00',
      team: 1,
      data: { shooter: 10, assistance: null, goalType: 'normal' },
      pk: null,
      saved: false,
      error: 'Chyba serveru',
    },
    {
      id: 'old',
      type: 'shot',
      time: '00:04:00',
      team: 1,
      data: { shooter: null },
      pk: 7,
      saved: false,
      error: 'Nelze smazat',
    },
    {
      id: 'flying',
      type: 'penalty',
      time: '00:03:00',
      team: 1,
      data: { player: 10, card: 'yellow', reason: 'x' },
      pk: 8,
      saved: true,
    },
  ];
  render(
    <EventList
      events={events}
      sides={{ left: 1, right: 2 }}
      teamColor={() => ''}
      playerName={(pk) => `P${pk}`}
      showShots
      editable
      inFlightId="flying"
      onRetry={onRetry}
      onDiscard={onDiscard}
    />,
  );
  const mobile = within(screen.getByTestId('events-mobile'));
  expect(mobile.getAllByTitle('Neuloženo')).toHaveLength(2);
  expect(mobile.getAllByLabelText('Neuloženo')).toHaveLength(2);
  expect(mobile.getAllByRole('button', { name: 'Smazat' })[0]).toHaveClass('min-h-11', 'min-w-11');
  expect(mobile.getByText(/Chyba serveru/)).toHaveClass('text-alert');
  expect(mobile.getAllByRole('button', { name: 'Zkusit znovu' })).toHaveLength(2);
  // Errored events with a pk (failed edits) can be discarded too.
  expect(mobile.getAllByRole('button', { name: 'Zahodit' })).toHaveLength(2);
  await userEvent.click(mobile.getAllByRole('button', { name: 'Zkusit znovu' })[0]);
  expect(onRetry).toHaveBeenCalledWith('new');
  await userEvent.click(mobile.getAllByRole('button', { name: 'Zahodit' })[0]);
  expect(onDiscard).toHaveBeenCalledWith('new');
  const removes = mobile.getAllByRole('button', { name: 'Smazat' });
  expect(removes).toHaveLength(3);
  expect(removes.filter((b) => (b as HTMLButtonElement).disabled)).toHaveLength(1);
  // edit only for goal and penalty
  expect(mobile.getAllByRole('button', { name: 'Upravit' })).toHaveLength(2);
});

test('SyncStatus variants', async () => {
  const onRetryPatch = vi.fn();
  const { rerender } = render(<SyncStatus pending={0} errors={0} offline={false} />);
  expect(screen.getByText('Vše uloženo')).toHaveClass('text-success');
  expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  rerender(<SyncStatus pending={2} errors={0} offline={false} />);
  expect(screen.getByText('Neuloženo: 2')).toBeInTheDocument();
  rerender(<SyncStatus pending={3} errors={0} offline />);
  expect(screen.getByText('Offline – čeká 3')).toBeInTheDocument();
  rerender(<SyncStatus pending={0} errors={1} offline={false} />);
  expect(screen.getByText('Chyby: 1')).toBeInTheDocument();
  expect(screen.queryByRole('alert')).toBeNull();
  rerender(
    <SyncStatus pending={0} errors={0} offline={false} patchError="boom" onRetryPatch={onRetryPatch} />,
  );
  expect(screen.getByRole('alert')).toHaveTextContent('Uložení zápasu selhalo: boom');
  await userEvent.click(screen.getByRole('button', { name: 'Zkusit znovu' }));
  expect(onRetryPatch).toHaveBeenCalled();
});

test('PlayerTiles: hidden placeholder and extra red tiles', async () => {
  const onPick = vi.fn();
  const onNobody = vi.fn();
  render(
    <PlayerTiles
      players={[
        { pk: 1, nickname: 'Adam' },
        { pk: 2, nickname: 'Bob' },
      ]}
      onPick={onPick}
      hiddenPk={1}
      extra={[{ label: 'nikdo', onClick: onNobody }]}
    />,
  );
  expect(screen.queryByText('Adam')).toBeNull();
  expect(screen.getByTestId('tile-placeholder')).toBeEmptyDOMElement();
  await userEvent.click(screen.getByRole('button', { name: 'Bob' }));
  expect(onPick).toHaveBeenCalledWith(2);
  const nobody = screen.getByRole('button', { name: 'nikdo' });
  expect(nobody).toHaveClass('pressbutton-red');
  await userEvent.click(nobody);
  expect(onNobody).toHaveBeenCalled();
});

test('MatchStatus variants', async () => {
  const onNext = vi.fn();
  const onLive = vi.fn();
  const { rerender } = render(
    <MatchStatus phase={1} onNextPhase={onNext} liveToggle={{ checked: false, onChange: onLive }} />,
  );
  expect(screen.getByRole('button', { name: '1. poločas' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Další poločas' }));
  expect(onNext).toHaveBeenCalled();
  await userEvent.click(screen.getByRole('checkbox', { name: 'živě' }));
  expect(onLive).toHaveBeenCalledWith(true);
  rerender(<MatchStatus phase={2} />);
  expect(screen.getByText('2. poločas').tagName).toBe('SPAN');
  expect(screen.queryByRole('button')).toBeNull();
  rerender(<MatchStatus phase={null} />);
  expect(screen.getByText('zápas ukončen')).toBeInTheDocument();
  rerender(<MatchStatus phase={0} />);
  expect(screen.queryByText(/poločas|ukončen/)).toBeNull();
});

test('GoalieRow, TeamNames, PenaltyCountdowns', async () => {
  const onChange = vi.fn();
  const onSwap = vi.fn();
  render(
    <>
      <GoalieRow
        left={{ team: 1, goalieName: 'Gus', colorClass: 'team-one' }}
        right={{ team: 2, goalieName: null, colorClass: 'team-two' }}
        onChange={onChange}
      />
      <TeamNames
        left={{ name: 'Modří', colorClass: 'team-one' }}
        right={{ name: 'Rudí', colorClass: 'team-two' }}
        onSwap={onSwap}
      />
      <PenaltyCountdowns
        left={{ items: [{ id: 'a', playerName: 'Adam', remainingMs: 59_900 }], colorClass: 'team-one' }}
        right={{ items: [], colorClass: 'team-two' }}
      />
    </>,
  );
  await userEvent.click(screen.getByRole('button', { name: 'Gus' }));
  expect(onChange).toHaveBeenCalledWith(1);
  await userEvent.click(screen.getByRole('button', { name: 'bez brankáře' }));
  expect(onChange).toHaveBeenLastCalledWith(2);
  await userEvent.click(screen.getByRole('button', { name: 'Prohodit strany' }));
  expect(onSwap).toHaveBeenCalled();
  expect(screen.getByText('Modří')).toHaveClass('team-one', 'font-bold', 'truncate');
  expect(screen.getByText('Modří')).toHaveAttribute('title', 'Modří');
  expect(screen.getByRole('button', { name: 'Prohodit strany' }).parentElement).not.toHaveClass('hidden');
  expect(screen.getByText(/00:59/)).toHaveTextContent('⚠ 00:59 - Adam');
});
