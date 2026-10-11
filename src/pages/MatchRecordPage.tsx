import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { toast } from 'sonner';
import type { MatchDto, TournamentDto } from '../api/types';
import { isStaff } from '../auth/permissions';
import { useUser } from '../auth/user';
import BackLink from '../components/BackLink';
import ErrorBox from '../components/ErrorBox';
import { ClockControls } from '../components/match/ClockControls';
import { ConfirmDialog } from '../components/match/dialogs/ConfirmDialog';
import { EditGoalDialog } from '../components/match/dialogs/EditGoalDialog';
import { EditPenaltyDialog } from '../components/match/dialogs/EditPenaltyDialog';
import { GoalDialog } from '../components/match/dialogs/GoalDialog';
import { GoalieChangeDialog } from '../components/match/dialogs/GoalieChangeDialog';
import { PenaltyDialog } from '../components/match/dialogs/PenaltyDialog';
import { RefereeDialog } from '../components/match/dialogs/RefereeDialog';
import { EventList } from '../components/match/EventList';
import { GoalieRow } from '../components/match/GoalieRow';
import { ICONS } from '../components/match/icons';
import { MatchStatus } from '../components/match/MatchStatus';
import { PenaltyCountdowns } from '../components/match/PenaltyCountdowns';
import { Scoreboard } from '../components/match/Scoreboard';
import { SwitchToggle } from '../components/match/SwitchToggle';
import { SyncStatus } from '../components/match/SyncStatus';
import { TeamNames } from '../components/match/TeamNames';
import Spinner from '../components/Spinner';
import { gameTimeMs, remaining } from '../domain/clock';
import type { Graph } from '../domain/graph';
import {
  activePenalties,
  eventCounts,
  type EventData,
  type MatchEvent,
  type PenaltyData,
} from '../domain/matchEvents';
import { currentGameTime, recorderReducer, type RecorderState } from '../domain/recorder';
import {
  importOldRecorder,
  initRecorder,
  loadRecorder,
  removeStoredEvent,
  saveRecorder,
} from '../domain/recorderStorage';
import { nowDateTime } from '../domain/time';
import { newId } from '../domain/uuid';
import { useMatchSync } from '../hooks/useMatchSync';
import { useNow } from '../hooks/useNow';
import { matchPath, recordPath } from '../paths';
import { useGraph, useMatches, useTournament } from '../queries/data';
import { invalidateMatchData, useRemoveMatchEvent } from '../queries/mutations';

export default function MatchRecordPage() {
  const params = useParams();
  const id = Number(params.id);
  const matchId = Number(params.matchId);
  const { data: user } = useUser();
  const tournamentQuery = useTournament(id);
  const { graph, error: graphError, refetch: refetchGraph } = useGraph();
  // Recorder state is initialised once, so it must start from fresh server data, not a stale cache.
  const matchesQuery = useMatches(id, { refetchOnMount: 'always', timeoutMs: 15_000 });

  const matches = matchesQuery.data;
  const match = matches?.find((m) => m.pk === matchId);
  const tournament = tournamentQuery.data;

  // A failed background refetch must not hide already loaded data.
  const error =
    (tournament ? null : tournamentQuery.error) ??
    (graph ? null : graphError) ??
    (matches ? null : matchesQuery.error);
  if (error)
    return (
      <ErrorBox
        error={error}
        onRetry={() => {
          void tournamentQuery.refetch();
          void refetchGraph();
          void matchesQuery.refetch();
        }}
      />
    );
  if (tournament?.closed_edit && !isStaff(user)) return <Navigate replace to={matchPath(id, matchId)} />;
  const fresh = matchesQuery.isFetchedAfterMount || matchesQuery.fetchStatus !== 'fetching';
  if (!tournament || !graph || !matches || !fresh) return <Spinner />;
  if (!match)
    return (
      <>
        <BackLink fallback={recordPath(id)} />
        <div role="alert" className="my-4 text-center">
          Zápas nenalezen.
        </div>
      </>
    );
  return <Recorder key={match.pk} match={match} tournament={tournament} graph={graph} />;
}

type DialogState =
  | { kind: 'goal' | 'penalty' | 'goalie'; team: number; time: string }
  | { kind: 'editGoal' | 'editPenalty'; event: MatchEvent }
  | { kind: 'referee' }
  | { kind: 'confirm'; text: string; onConfirm: () => void }
  | null;

const canChangeGoalieOrRefereeIn = (s: RecorderState, editMode: boolean) => editMode || s.phase !== null;

function Recorder({
  match,
  tournament,
  graph,
}: {
  match: MatchDto;
  tournament: TournamentDto;
  graph: Graph;
}) {
  const id = tournament.pk;
  const qc = useQueryClient();
  const removeMutation = useRemoveMatchEvent(id);

  const [initial] = useState(() => {
    const stored = loadRecorder(match.pk);
    return initRecorder({
      match,
      tournament,
      rosterOf: (tot) => (tot == null ? [] : (graph.totsById.get(tot)?.playerPks ?? [])),
      stored,
      // Only when nothing is stored: the import sets a marker that would discard old data later.
      imported: stored ? null : importOldRecorder(match.pk),
    });
  });
  const [state, dispatch] = useReducer(recorderReducer, initial);
  useEffect(() => saveRecorder(state), [state]);

  // Refetching match data while recording is wasted work (the recorder never re-reads it),
  // so other pages are refreshed once when leaving.
  const synced = useRef(false);
  useEffect(
    () => () => {
      if (!synced.current) return;
      synced.current = false;
      void invalidateMatchData(qc, id);
    },
    [qc, id],
  );
  const onSynced = useCallback(() => {
    synced.current = true;
  }, []);
  const sync = useMatchSync(state, dispatch, { enabled: true, onSynced });

  // Latest values for callbacks that outlive the render that created them (confirm dialog, DELETE).
  const latest = useRef({ state, inFlightId: sync.inFlightId, mounted: true });
  useEffect(() => {
    latest.current = { state, inFlightId: sync.inFlightId, mounted: true };
  });
  useEffect(
    () => () => {
      latest.current.mounted = false;
    },
    [],
  );

  // A stopped clock freezes game time (and penalty countdowns), so ticking is needed only while running.
  const tick = useNow(200, state.clock.running);
  // Right after a start `tick` predates startedAt; clamping avoids a visible jump on the first frame.
  const now = state.clock.running ? Math.max(tick, state.clock.startedAt) : tick;

  const [editMode, setEditMode] = useState(false);
  const [showShots, setShowShots] = useState(false);
  const [dialog, setDialog] = useState<DialogState>(() =>
    initial.referee == null && match.referee_team != null && canChangeGoalieOrRefereeIn(initial, false)
      ? { kind: 'referee' }
      : null,
  );
  const close = () => setDialog(null);

  const canAct = editMode || state.phase === 1 || state.phase === 2;
  const canChangeGoalieOrReferee = canChangeGoalieOrRefereeIn(state, editMode);

  const playerName = (pk: number | null) => (pk == null ? '' : (graph.playersById.get(pk)?.nickname ?? ''));
  const totName = (pk: number | null) => (pk == null ? '' : (graph.totsById.get(pk)?.name_pure ?? ''));
  const playersOf = (tot: number | null) =>
    [...(tot == null ? [] : (graph.totsById.get(tot)?.players ?? []))]
      .sort((a, b) => a.nickname.localeCompare(b.nickname, 'cs'))
      .map((p) => ({ pk: p.pk, nickname: p.nickname }));
  const teamColor = (team: number | null) =>
    team === state.teamOne ? 'team-one' : team === state.teamTwo ? 'team-two' : '';

  const leftTeam = (state.sidesSwapped ? state.teamTwo : state.teamOne) ?? 0;
  const rightTeam = (state.sidesSwapped ? state.teamOne : state.teamTwo) ?? 0;
  const gameMs = gameTimeMs(state.halftimeMinutes, remaining(state.clock, now), state.phase, state.h1Length);

  const confirm = (text: string, action: () => void) =>
    setDialog({
      kind: 'confirm',
      text,
      onConfirm: () => {
        setDialog(null);
        action();
      },
    });
  const openAt = (kind: 'goal' | 'penalty' | 'goalie', team: number) =>
    setDialog({ kind, team, time: gameTimeNow(state) });
  const add = (type: MatchEvent['type'], team: number, time: string, data: EventData) =>
    dispatch({
      type: 'addEvent',
      event: { id: newId(), type, time, team, data, pk: null, saved: false, error: null },
    });

  const toggleClock = () => {
    if (state.clock.running) {
      dispatch({ type: 'clockStop', now: Date.now() });
      return;
    }
    if (state.goalies[state.teamOne ?? -1] == null || state.goalies[state.teamTwo ?? -1] == null) {
      toast.error('Není nastaven brankář.');
      return;
    }
    if (state.phase === 0)
      confirm('Začít zápas?', () => dispatch({ type: 'kickoff', now: Date.now(), at: nowDateTime() }));
    else dispatch({ type: 'clockStart', now: Date.now() });
  };

  const nextPhase = () =>
    confirm(state.phase === 1 ? 'Opravdu přejít do druhého poločasu?' : 'Opravdu chcete ukončit zápas?', () =>
      dispatch({ type: 'nextPhase', now: Date.now(), at: nowDateTime() }),
    );

  const shot = (team: number) => {
    add('shot', team, gameTimeNow(state), { shooter: null });
    toast.success('Střela uložena');
  };

  const remove = (target: MatchEvent) =>
    confirm('Opravdu smazat?', () => {
      const { state: current, inFlightId } = latest.current;
      const e = current.events.find((x) => x.id === target.id);
      if (!e) return;
      if (e.id === inFlightId) {
        toast.error('Událost se právě ukládá, zkus to za chvíli.');
        return;
      }
      const done = () => {
        dispatch({ type: 'removeEvent', id: e.id });
        // After unmount the save effect no longer runs, so drop the event from storage directly.
        if (!latest.current.mounted) removeStoredEvent(current.matchPk, e.id);
      };
      const type = e.type;
      if (e.pk != null && isRemovable(type))
        removeMutation
          .mutateAsync({ type, pk: e.pk })
          .then(done)
          .catch(() => {
            /* reported by the global mutation error toast */
          });
      else done();
    });

  // A failed edit of a stored event is dropped locally; the server copy shows up again after a reload.
  const discard = (eventId: string) => {
    const e = state.events.find((x) => x.id === eventId);
    dispatch({ type: 'removeEvent', id: eventId });
    if (e?.pk != null) toast.info('Úprava zahozena, načti stránku znovu pro aktuální stav.');
  };

  const edit = (e: MatchEvent) => {
    if (e.id === sync.inFlightId) return;
    if (e.type === 'goal') setDialog({ kind: 'editGoal', event: e });
    else if (e.type === 'penalty') setDialog({ kind: 'editPenalty', event: e });
  };

  const actions = (team: number, mirrored: boolean) => {
    const name = totName(team);
    const buttons = [
      <button
        key="card"
        type="button"
        aria-label={`Karta ${name}`}
        className="min-h-11 min-w-11 cursor-pointer"
        onClick={() => openAt('penalty', team)}
      >
        {ICONS.card}
      </button>,
      <button
        key="shot"
        type="button"
        aria-label={`Střela ${name}`}
        className="pressbutton"
        onClick={() => shot(team)}
      >
        střela
      </button>,
      <button
        key="goal"
        type="button"
        aria-label={`Gól ${name}`}
        className="pressbutton"
        onClick={() => openAt('goal', team)}
      >
        gól
      </button>,
    ];
    return (
      <div
        className={`flex flex-wrap items-center gap-1 text-xl ${mirrored ? 'justify-start' : 'justify-end'} ${teamColor(team)}`}
      >
        {mirrored ? buttons.reverse() : buttons}
      </div>
    );
  };

  const penaltyItems = (team: number) =>
    activePenalties(state.events, team, gameMs).map((p) => ({
      id: p.event.id,
      playerName: playerName((p.event.data as PenaltyData).player),
      remainingMs: p.remainingMs,
    }));

  const refereeName = state.referee != null ? playerName(state.referee) : '';
  const refereeLine = (
    <>
      píská: {totName(match.referee_team)}
      {refereeName && (
        <>
          {' - '}
          <b>{refereeName}</b>
        </>
      )}
    </>
  );
  const dialogTeam = dialog && 'team' in dialog ? dialog.team : null;
  const editTeam = dialog && 'event' in dialog ? dialog.event.team : null;

  return (
    <>
      <BackLink fallback={recordPath(id)} />
      <SyncStatus
        pending={sync.pending}
        errors={sync.errors}
        offline={sync.offline}
        patchError={state.matchPatchError}
        onRetryPatch={() => dispatch({ type: 'retryPatch' })}
      />
      <MatchStatus phase={state.phase} onNextPhase={nextPhase} />
      {state.phase === null && (
        <div className="text-center">
          <Link to={recordPath(id)} className="text-primary hover:text-primary-dark">
            ‹ zpět na přehled
          </Link>
        </div>
      )}
      {state.phase !== null && (
        <ClockControls
          remainingMs={remaining(state.clock, now)}
          running={state.clock.running}
          phase={state.phase}
          onToggle={toggleClock}
          onAdjust={(delta) => dispatch({ type: 'clockAdjust', delta })}
        />
      )}
      <hr className="my-3 border-gray-300" />
      {match.referee_team != null && (
        <p className="my-2 text-center">
          {canChangeGoalieOrReferee ? (
            <button type="button" className="cursor-pointer" onClick={() => setDialog({ kind: 'referee' })}>
              {refereeLine}
            </button>
          ) : (
            refereeLine
          )}
        </p>
      )}
      <GoalieRow
        left={{
          team: leftTeam,
          goalieName: nameOrNull(state, leftTeam, playerName),
          colorClass: teamColor(leftTeam),
        }}
        right={{
          team: rightTeam,
          goalieName: nameOrNull(state, rightTeam, playerName),
          colorClass: teamColor(rightTeam),
        }}
        onChange={canChangeGoalieOrReferee ? (team) => openAt('goalie', team) : undefined}
      />
      <TeamNames
        left={{ name: totName(leftTeam), colorClass: teamColor(leftTeam) }}
        right={{ name: totName(rightTeam), colorClass: teamColor(rightTeam) }}
        onSwap={() => dispatch({ type: 'swapSides' })}
        aside={<SwitchToggle label="úpravy" checked={editMode} onChange={setEditMode} />}
      />
      <div data-testid="toggles-mobile" className="my-1 flex justify-center gap-4 text-sm md:hidden">
        <label>
          <input type="checkbox" checked={editMode} onChange={(e) => setEditMode(e.target.checked)} /> úpravy
        </label>
        <label>
          <input type="checkbox" checked={showShots} onChange={(e) => setShowShots(e.target.checked)} />{' '}
          střely
        </label>
      </div>
      {(state.phase === 1 || state.phase === 2) && (
        <PenaltyCountdowns
          left={{ items: penaltyItems(leftTeam), colorClass: teamColor(leftTeam) }}
          right={{ items: penaltyItems(rightTeam), colorClass: teamColor(rightTeam) }}
        />
      )}
      <Scoreboard
        left={{ ...eventCounts(state.events, leftTeam), colorClass: teamColor(leftTeam) }}
        right={{ ...eventCounts(state.events, rightTeam), colorClass: teamColor(rightTeam) }}
        aside={<SwitchToggle label="střely" checked={showShots} onChange={setShowShots} />}
      />
      {canAct && (
        <div className="my-2 grid grid-cols-2 gap-2 md:grid-cols-[5fr_2fr_5fr]">
          {actions(leftTeam, false)}
          <div className="hidden md:block" />
          {actions(rightTeam, true)}
        </div>
      )}
      <hr className="my-3 border-gray-300" />
      <EventList
        events={state.events}
        sides={{ left: leftTeam, right: rightTeam }}
        teamColor={teamColor}
        playerName={playerName}
        showShots={showShots}
        editable={editMode}
        inFlightId={sync.inFlightId}
        onEdit={edit}
        onRemove={remove}
        onRetry={(eventId) => dispatch({ type: 'retryEvent', id: eventId })}
        onDiscard={discard}
      />

      <ConfirmDialog
        open={dialog?.kind === 'confirm'}
        text={dialog?.kind === 'confirm' ? dialog.text : ''}
        onConfirm={() => dialog?.kind === 'confirm' && dialog.onConfirm()}
        onClose={close}
      />
      <RefereeDialog
        open={dialog?.kind === 'referee'}
        players={playersOf(match.referee_team)}
        value={state.referee}
        onSave={(referee) => {
          dispatch({ type: 'setReferee', referee });
          close();
        }}
        onClose={close}
      />
      <GoalDialog
        open={dialog?.kind === 'goal'}
        teamName={totName(dialogTeam)}
        players={playersOf(dialogTeam)}
        onSave={(data) => {
          if (dialog?.kind !== 'goal') return;
          add('goal', dialog.team, dialog.time, data);
          close();
          toast.success('Gól uložen');
        }}
        onClose={close}
      />
      <PenaltyDialog
        open={dialog?.kind === 'penalty'}
        teamName={totName(dialogTeam)}
        players={playersOf(dialogTeam)}
        onSave={(data) => {
          if (dialog?.kind !== 'penalty') return;
          add('penalty', dialog.team, dialog.time, data);
          close();
          toast.success('Karta uložena');
        }}
        onClose={close}
      />
      <GoalieChangeDialog
        open={dialog?.kind === 'goalie'}
        teamName={totName(dialogTeam)}
        players={playersOf(dialogTeam)}
        currentGoalie={dialogTeam == null ? null : state.goalies[dialogTeam]}
        onSave={(goalie) => {
          if (dialog?.kind !== 'goalie') return;
          add('goalieChange', dialog.team, dialog.time, { goalie });
          close();
          toast.success('Brankář změněn');
        }}
        onClose={close}
      />
      {dialog?.kind === 'editGoal' && (
        <EditGoalDialog
          open
          teamName={totName(editTeam)}
          players={playersOf(editTeam)}
          event={dialog.event}
          onSave={(time, data) => {
            dispatch({ type: 'editEvent', id: dialog.event.id, time, data });
            close();
          }}
          onClose={close}
        />
      )}
      {dialog?.kind === 'editPenalty' && (
        <EditPenaltyDialog
          open
          teamName={totName(editTeam)}
          players={playersOf(editTeam)}
          event={dialog.event}
          onSave={(time, data) => {
            dispatch({ type: 'editEvent', id: dialog.event.id, time, data });
            close();
          }}
          onClose={close}
        />
      )}
    </>
  );
}

const isRemovable = (t: MatchEvent['type']): t is 'goal' | 'shot' | 'penalty' =>
  t === 'goal' || t === 'shot' || t === 'penalty';

/** Game time at the moment of a user action (event handlers only). */
const gameTimeNow = (s: RecorderState) => currentGameTime(s, Date.now());

function nameOrNull(s: RecorderState, team: number, playerName: (pk: number | null) => string) {
  const goalie = s.goalies[team];
  return goalie != null ? playerName(goalie) : null;
}
