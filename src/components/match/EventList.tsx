import type { ReactNode } from 'react';
import {
  cardText,
  sortEvents,
  type GoalData,
  type GoalieData,
  type MatchEvent,
  type PenaltyData,
  type ShotData,
} from '../../domain/matchEvents';
import { shortTime } from '../../domain/time';
import { ICONS } from './icons';

interface Props {
  events: MatchEvent[];
  /** Team ids currently shown on the left and right. */
  sides: { left: number | null; right: number | null };
  teamColor: (team: number | null) => string;
  playerName: (pk: number | null) => string;
  showShots: boolean;
  editable: boolean;
  inFlightId?: string | null;
  onEdit?: (event: MatchEvent) => void;
  onRemove?: (event: MatchEvent) => void;
  onRetry?: (id: string) => void;
  onDiscard?: (id: string) => void;
}

export function EventList({
  events,
  sides,
  teamColor,
  playerName,
  showShots,
  editable,
  inFlightId,
  onEdit,
  onRemove,
  onRetry,
  onDiscard,
}: Props) {
  const visible = sortEvents(events)
    .reverse()
    .filter((e) => showShots || e.type !== 'shot');

  const describe = (e: MatchEvent): ReactNode => {
    switch (e.type) {
      case 'goal': {
        const d = e.data as GoalData;
        return (
          <>
            gól: <b>{playerName(d.shooter)}</b>
            {d.assistance != null && ` - ${playerName(d.assistance)}`}
            {d.goalType === 'penalty' && ' - penalta'}
            {d.goalType === 'shootout' && ' - penaltový rozstřel'}
          </>
        );
      }
      case 'shot': {
        const d = e.data as ShotData;
        return <>střela{d.shooter != null && `: ${playerName(d.shooter)}`}</>;
      }
      case 'penalty': {
        const d = e.data as PenaltyData;
        return (
          <>
            {ICONS.card} {cardText(d.card)} karta: <b>{playerName(d.player)}</b> - {d.reason}
          </>
        );
      }
      case 'goalieChange':
        return (
          <>
            {ICONS.goalie} změna brankáře: <b>{playerName((e.data as GoalieData).goalie)}</b>
          </>
        );
      case 'halftime':
        return (
          <>
            <hr />
            <b>konec poločasu</b>
          </>
        );
      case 'end':
        return <b>konec zápasu</b>;
    }
  };

  const text = (e: MatchEvent) => (
    <div className={teamColor(e.team)}>
      {describe(e)}
      {e.error && (
        <div className="text-alert">
          {e.error}{' '}
          <button type="button" className="cursor-pointer underline" onClick={() => onRetry?.(e.id)}>
            Zkusit znovu
          </button>
          <button type="button" className="ml-2 cursor-pointer underline" onClick={() => onDiscard?.(e.id)}>
            Zahodit
          </button>
        </div>
      )}
    </div>
  );

  const unlink = (e: MatchEvent) =>
    !e.saved && (
      <span
        title="Neuloženo"
        aria-label="Neuloženo"
        className="flex min-h-11 min-w-11 items-center justify-center text-warning"
      >
        {ICONS.unlink}
      </span>
    );

  const canRemove = (e: MatchEvent) => e.type === 'goal' || e.type === 'shot' || e.type === 'penalty';
  const canEdit = (e: MatchEvent) => e.type === 'goal' || e.type === 'penalty';
  const remove = (e: MatchEvent) =>
    editable &&
    canRemove(e) && (
      <button
        type="button"
        aria-label="Smazat"
        className="min-h-11 min-w-11 cursor-pointer disabled:opacity-40"
        disabled={e.id === inFlightId}
        onClick={() => onRemove?.(e)}
      >
        {ICONS.remove}
      </button>
    );
  const edit = (e: MatchEvent) =>
    editable &&
    canEdit(e) && (
      <button
        type="button"
        aria-label="Upravit"
        className="min-h-11 min-w-11 cursor-pointer disabled:opacity-40"
        disabled={e.id === inFlightId}
        onClick={() => onEdit?.(e)}
      >
        {ICONS.edit}
      </button>
    );

  return (
    <div>
      <div data-testid="events-mobile" className="md:hidden">
        {visible.map((e) => (
          <div
            key={e.id}
            className="grid grid-cols-[minmax(9.5rem,max-content)_3rem_1fr] items-center gap-2 py-1 even:bg-black/10"
          >
            <div className="flex gap-2">
              {unlink(e)}
              {remove(e)}
              {edit(e)}
            </div>
            <div>{shortTime(e.time)}</div>
            {text(e)}
          </div>
        ))}
      </div>
      <div data-testid="events-desktop" className="hidden md:block">
        {visible.map((e) => {
          if (e.team == null)
            return (
              <div key={e.id} className="py-1 text-center even:bg-black/10">
                <span>{shortTime(e.time)}</span>
                {text(e)}
              </div>
            );
          return (
            <div
              key={e.id}
              className="grid grid-cols-[1fr_minmax(13rem,max-content)_1fr] gap-2 py-1 even:bg-black/10 hover:bg-yellow-200/25"
            >
              <div className="text-right">{e.team === sides.left && text(e)}</div>
              <div className="flex items-center justify-center gap-2">
                {unlink(e)}
                {edit(e)}
                <span>{shortTime(e.time)}</span>
                {remove(e)}
              </div>
              <div className="text-left">{e.team !== sides.left && text(e)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
