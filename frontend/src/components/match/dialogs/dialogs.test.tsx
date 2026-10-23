import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import type { MatchEvent } from '../../../domain/matchEvents';
import { ConfirmDialog } from './ConfirmDialog';
import { EditGoalDialog } from './EditGoalDialog';
import { EditPenaltyDialog } from './EditPenaltyDialog';
import { GoalDialog } from './GoalDialog';
import { GoalieChangeDialog } from './GoalieChangeDialog';
import { PenaltyDialog } from './PenaltyDialog';
import { RefereeDialog } from './RefereeDialog';

const players = [
  { pk: 1, nickname: 'Alfa' },
  { pk: 2, nickname: 'Beta' },
  { pk: 3, nickname: 'Gama' },
];

test('ConfirmDialog calls onConfirm and onClose', async () => {
  const onConfirm = vi.fn();
  const onClose = vi.fn();
  render(<ConfirmDialog open text="Začít zápas?" onConfirm={onConfirm} onClose={onClose} />);
  expect(screen.getByText('Začít zápas?')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Ano' }));
  expect(onConfirm).toHaveBeenCalledTimes(1);
  await userEvent.click(screen.getByRole('button', { name: 'Zrušit' }));
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('ConfirmDialog renders nothing when closed', () => {
  render(<ConfirmDialog open={false} text="X?" onConfirm={vi.fn()} onClose={vi.fn()} />);
  expect(screen.queryByText('X?')).toBeNull();
});

test('GoalDialog: shooter then assistant saves a normal goal', async () => {
  const onSave = vi.fn();
  render(<GoalDialog open teamName="Tým A" players={players} onSave={onSave} onClose={vi.fn()} />);
  expect(screen.getByText('Gól - Tým A - střelec')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Alfa' }));
  expect(screen.getByText('Gól - Tým A - asistence')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Alfa' })).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'Beta' }));
  expect(onSave).toHaveBeenCalledWith({ shooter: 1, assistance: 2, goalType: 'normal' });
});

test.each([
  ['nikdo', 'normal'],
  ['penalta', 'penalty'],
  ['rozstřel', 'shootout'],
])('GoalDialog: "%s" saves without assistance', async (label, goalType) => {
  const onSave = vi.fn();
  render(<GoalDialog open teamName="Tým A" players={players} onSave={onSave} onClose={vi.fn()} />);
  await userEvent.click(screen.getByRole('button', { name: 'Alfa' }));
  await userEvent.click(screen.getByRole('button', { name: label }));
  expect(onSave).toHaveBeenCalledWith({ shooter: 1, assistance: null, goalType });
});

test('GoalDialog: back button returns to shooter step', async () => {
  render(<GoalDialog open teamName="Tým A" players={players} onSave={vi.fn()} onClose={vi.fn()} />);
  await userEvent.click(screen.getByRole('button', { name: 'Alfa' }));
  await userEvent.click(screen.getByRole('button', { name: '‹ zpět na střelce' }));
  expect(screen.getByText('Gól - Tým A - střelec')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Alfa' })).toBeInTheDocument();
});

test('GoalDialog resets its draft after close', async () => {
  const { rerender } = render(
    <GoalDialog open teamName="Tým A" players={players} onSave={vi.fn()} onClose={vi.fn()} />,
  );
  await userEvent.click(screen.getByRole('button', { name: 'Alfa' }));
  await act(async () => {
    rerender(
      <GoalDialog open={false} teamName="Tým A" players={players} onSave={vi.fn()} onClose={vi.fn()} />,
    );
  });
  expect(screen.queryByRole('dialog')).toBeNull();
  await act(async () => {
    rerender(<GoalDialog open teamName="Tým A" players={players} onSave={vi.fn()} onClose={vi.fn()} />);
  });
  expect(screen.getByText('Gól - Tým A - střelec')).toBeInTheDocument();
  expect(screen.queryByText('Gól - Tým A - asistence')).toBeNull();
});

test('PenaltyDialog requires a reason and appends extra info', async () => {
  const onSave = vi.fn();
  render(<PenaltyDialog open teamName="Tým A" players={players} onSave={onSave} onClose={vi.fn()} />);
  await userEvent.click(screen.getByRole('button', { name: 'Beta' }));
  expect(screen.getByText('Karta - Tým A - Beta')).toBeInTheDocument();
  const give = screen.getByRole('button', { name: 'Udělit' });
  await userEvent.click(give);
  expect(screen.getByText(/Vyber odůvodnění/)).toBeInTheDocument();
  expect(onSave).not.toHaveBeenCalled();
  await userEvent.selectOptions(screen.getByLabelText('Odůvodnění'), 'Držení');
  expect(screen.queryByText(/Vyber odůvodnění/)).toBeNull();
  await userEvent.selectOptions(screen.getByLabelText('Karta'), 'červená');
  await userEvent.type(screen.getByPlaceholderText('dodatečné info'), 'opakovaně');
  await userEvent.click(give);
  expect(onSave).toHaveBeenCalledWith({ player: 2, card: 'red', reason: 'Držení - opakovaně' });
});

test('PenaltyDialog defaults to yellow card and plain reason', async () => {
  const onSave = vi.fn();
  render(<PenaltyDialog open teamName="Tým A" players={players} onSave={onSave} onClose={vi.fn()} />);
  await userEvent.click(screen.getByRole('button', { name: 'Beta' }));
  await userEvent.selectOptions(screen.getByLabelText('Odůvodnění'), 'Jiné');
  await userEvent.click(screen.getByRole('button', { name: 'Udělit' }));
  expect(onSave).toHaveBeenCalledWith({ player: 2, card: 'yellow', reason: 'Jiné' });
});

test('PenaltyDialog ignores whitespace-only extra info', async () => {
  const onSave = vi.fn();
  render(<PenaltyDialog open teamName="Tým A" players={players} onSave={onSave} onClose={vi.fn()} />);
  await userEvent.click(screen.getByRole('button', { name: 'Beta' }));
  await userEvent.selectOptions(screen.getByLabelText('Odůvodnění'), 'Držení');
  await userEvent.type(screen.getByPlaceholderText('dodatečné info'), '   ');
  await userEvent.click(screen.getByRole('button', { name: 'Udělit' }));
  expect(onSave).toHaveBeenCalledWith({ player: 2, card: 'yellow', reason: 'Držení' });
});

test('PenaltyDialog trims extra info', async () => {
  const onSave = vi.fn();
  render(<PenaltyDialog open teamName="Tým A" players={players} onSave={onSave} onClose={vi.fn()} />);
  await userEvent.click(screen.getByRole('button', { name: 'Beta' }));
  await userEvent.selectOptions(screen.getByLabelText('Odůvodnění'), 'Držení');
  await userEvent.type(screen.getByPlaceholderText('dodatečné info'), '  hrubě ');
  await userEvent.click(screen.getByRole('button', { name: 'Udělit' }));
  expect(onSave).toHaveBeenCalledWith({ player: 2, card: 'yellow', reason: 'Držení - hrubě' });
});

test('GoalieChangeDialog saves the picked player', async () => {
  const onSave = vi.fn();
  render(<GoalieChangeDialog open teamName="Tým A" players={players} onSave={onSave} onClose={vi.fn()} />);
  expect(screen.getByText('Změna brankáře - Tým A')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Gama' }));
  expect(onSave).toHaveBeenCalledWith(3);
});

test('GoalieChangeDialog does not offer the current goalie', () => {
  render(
    <GoalieChangeDialog
      open
      teamName="Tým A"
      players={players}
      currentGoalie={3}
      onSave={vi.fn()}
      onClose={vi.fn()}
    />,
  );
  expect(screen.queryByRole('button', { name: 'Gama' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Alfa' })).toBeInTheDocument();
});

test('RefereeDialog saves the chosen referee', async () => {
  const onSave = vi.fn();
  render(<RefereeDialog open players={players} value={null} onSave={onSave} onClose={vi.fn()} />);
  expect(screen.getByText('Volba hlavního rozhodčího')).toBeInTheDocument();
  await userEvent.selectOptions(screen.getByRole('combobox'), 'Beta');
  expect(onSave).toHaveBeenCalledWith(2);
});

const goalEvent: MatchEvent = {
  id: 'g1',
  type: 'goal',
  time: '00:10:00',
  team: 10,
  pk: 5,
  saved: true,
  data: { shooter: 1, assistance: 2, goalType: 'normal' },
};

test('EditGoalDialog rejects an invalid time and saves a valid one', async () => {
  const onSave = vi.fn();
  render(
    <EditGoalDialog
      open
      teamName="Tým A"
      players={players}
      event={goalEvent}
      onSave={onSave}
      onClose={vi.fn()}
    />,
  );
  const time = screen.getByLabelText('Čas');
  expect(time).toHaveValue('00:10:00');
  await userEvent.clear(time);
  await userEvent.type(time, '12:34');
  expect(screen.getByText('Neplatný čas (HH:MM:SS).')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Upravit' })).toBeDisabled();
  await userEvent.clear(time);
  await userEvent.type(time, '00:12:34');
  expect(screen.queryByText('Neplatný čas (HH:MM:SS).')).toBeNull();
  await userEvent.selectOptions(screen.getByLabelText('Asistence'), '----');
  await userEvent.selectOptions(screen.getByLabelText('Typ gólu'), 'Penalta');
  await userEvent.click(screen.getByRole('button', { name: 'Upravit' }));
  expect(onSave).toHaveBeenCalledWith('00:12:34', { shooter: 1, assistance: null, goalType: 'penalty' });
});

test('EditGoalDialog explains a missing shooter', async () => {
  const onSave = vi.fn();
  render(
    <EditGoalDialog
      open
      teamName="Tým A"
      players={players}
      event={goalEvent}
      onSave={onSave}
      onClose={vi.fn()}
    />,
  );
  await userEvent.selectOptions(screen.getByLabelText('Střelec'), '----');
  await userEvent.click(screen.getByRole('button', { name: 'Upravit' }));
  expect(screen.getByText(/Vyber střelce/)).toBeInTheDocument();
  expect(onSave).not.toHaveBeenCalled();
  await userEvent.selectOptions(screen.getByLabelText('Střelec'), 'Beta');
  await userEvent.click(screen.getByRole('button', { name: 'Upravit' }));
  expect(onSave).toHaveBeenCalled();
});

test('EditPenaltyDialog saves edited fields', async () => {
  const onSave = vi.fn();
  const event: MatchEvent = {
    ...goalEvent,
    id: 'p1',
    type: 'penalty',
    data: { player: 1, card: 'yellow', reason: 'Držení' },
  };
  render(
    <EditPenaltyDialog
      open
      teamName="Tým A"
      players={players}
      event={event}
      onSave={onSave}
      onClose={vi.fn()}
    />,
  );
  await userEvent.selectOptions(screen.getByLabelText('Hráč'), 'Gama');
  await userEvent.selectOptions(screen.getByLabelText('Karta'), 'červená');
  const reason = screen.getByLabelText('Odůvodnění');
  await userEvent.clear(reason);
  await userEvent.type(reason, 'Jiné');
  await userEvent.click(screen.getByRole('button', { name: 'Upravit' }));
  expect(onSave).toHaveBeenCalledWith('00:10:00', { player: 3, card: 'red', reason: 'Jiné' });
});

test('EditPenaltyDialog trims the reason and explains when it is empty', async () => {
  const onSave = vi.fn();
  const event: MatchEvent = {
    ...goalEvent,
    id: 'p1',
    type: 'penalty',
    data: { player: 1, card: 'yellow', reason: 'Držení' },
  };
  render(
    <EditPenaltyDialog
      open
      teamName="Tým A"
      players={players}
      event={event}
      onSave={onSave}
      onClose={vi.fn()}
    />,
  );
  const reason = screen.getByLabelText('Odůvodnění');
  await userEvent.clear(reason);
  await userEvent.type(reason, '   ');
  await userEvent.click(screen.getByRole('button', { name: 'Upravit' }));
  expect(screen.getByText(/Vyplň odůvodnění/)).toBeInTheDocument();
  expect(onSave).not.toHaveBeenCalled();
  await userEvent.type(reason, ' Jiné ');
  await userEvent.click(screen.getByRole('button', { name: 'Upravit' }));
  expect(onSave).toHaveBeenCalledWith('00:10:00', { player: 1, card: 'yellow', reason: 'Jiné' });
});
