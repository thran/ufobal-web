import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { canRecord, isStaff } from '../auth/permissions';
import { useUser } from '../auth/user';
import BackLink from '../components/BackLink';
import ErrorBox from '../components/ErrorBox';
import { EventList } from '../components/match/EventList';
import { GoalieRow } from '../components/match/GoalieRow';
import { MatchStatus } from '../components/match/MatchStatus';
import { Scoreboard } from '../components/match/Scoreboard';
import { SwitchToggle } from '../components/match/SwitchToggle';
import { TeamNames } from '../components/match/TeamNames';
import Spinner from '../components/Spinner';
import { computeGoalies, eventCounts, serverEvents } from '../domain/matchEvents';
import { livePath, matchPath } from '../paths';
import { useGraph, useMatches, useTournament } from '../queries/data';

export default function MatchViewPage() {
  const params = useParams();
  const id = Number(params.id);
  const matchId = Number(params.matchId);
  const [live, setLive] = useState(true);
  const [showShots, setShowShots] = useState(false);
  const { data: user } = useUser();
  const tournamentQuery = useTournament(id);
  const { graph, error: graphError, refetch: refetchGraph } = useGraph();
  const matchesQuery = useMatches(id, { refetchInterval: live ? 15_000 : false });

  const matches = matchesQuery.data;
  const match = matches?.find((m) => m.pk === matchId);
  const tournament = tournamentQuery.data;

  const derived = useMemo(() => {
    if (!match || !graph) return null;
    const rosterOf = (tot: number | null) => (tot == null ? [] : (graph.totsById.get(tot)?.playerPks ?? []));
    const { events, initialGoalies } = serverEvents(match, rosterOf);
    return { events, goalies: computeGoalies(initialGoalies, events) };
  }, [match, graph]);

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
  if (!tournament || !graph || !matches) return <Spinner />;
  if (!match || !derived)
    return (
      <>
        <BackLink fallback={livePath(id)} />
        <div role="alert" className="my-4 text-center">
          Zápas nenalezen.
        </div>
      </>
    );

  const { events, goalies } = derived;
  const phase = match.length ? null : match.halftime_length ? 2 : match.start ? 1 : 0;
  const totName = (pk: number | null) => (pk == null ? '' : (graph.totsById.get(pk)?.name_pure ?? ''));
  const playerName = (pk: number | null) => (pk == null ? '' : (graph.playersById.get(pk)?.nickname ?? ''));
  const left = { team: match.team_one ?? 0, colorClass: 'team-one' };
  const right = { team: match.team_two ?? 0, colorClass: 'team-two' };
  const teamColor = (team: number | null) =>
    team === match.team_one ? 'team-one' : team === match.team_two ? 'team-two' : '';
  const goalieName = (team: number) => (goalies[team] != null ? playerName(goalies[team]) : null);
  const leftCounts = eventCounts(events, match.team_one);
  const rightCounts = eventCounts(events, match.team_two);
  const referee = match.referee != null ? graph.playersById.get(match.referee) : undefined;
  const showRecord = canRecord(user) && !(tournament.closed_edit && !isStaff(user));

  return (
    <>
      <BackLink fallback={livePath(id)} />
      <MatchStatus phase={phase} liveToggle={{ checked: live, onChange: setLive }} />
      {showRecord && (
        <div className="my-2 text-center">
          <Link to={matchPath(id, matchId, true)} className="btn text-sm">
            Zaznamenávat
          </Link>
        </div>
      )}
      {match.referee_team != null && (
        <p className="my-2 text-center">
          píská: {totName(match.referee_team)}
          {referee && (
            <>
              {' - '}
              <b>{referee.nickname}</b>
            </>
          )}
        </p>
      )}
      <GoalieRow
        left={{ ...left, goalieName: left.team == null ? null : goalieName(left.team) }}
        right={{ ...right, goalieName: right.team == null ? null : goalieName(right.team) }}
      />
      <TeamNames
        left={{ name: totName(match.team_one), colorClass: left.colorClass }}
        right={{ name: totName(match.team_two), colorClass: right.colorClass }}
      />
      <Scoreboard
        left={{ ...leftCounts, colorClass: left.colorClass }}
        right={{ ...rightCounts, colorClass: right.colorClass }}
        aside={<SwitchToggle label="střely" checked={showShots} onChange={setShowShots} />}
      />
      <label data-testid="toggles-mobile" className="my-2 block text-center md:hidden">
        <input
          type="checkbox"
          aria-label="střely"
          checked={showShots}
          onChange={(e) => setShowShots(e.target.checked)}
        />{' '}
        střely
      </label>
      <EventList
        events={events}
        sides={{ left: match.team_one, right: match.team_two }}
        teamColor={teamColor}
        playerName={playerName}
        showShots={showShots}
        editable={false}
      />
    </>
  );
}
