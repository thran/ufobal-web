import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import type { MatchDto, TournamentDto } from '../api/types';
import { isStaff } from '../auth/permissions';
import { useUser } from '../auth/user';
import BackLink from '../components/BackLink';
import ErrorBox from '../components/ErrorBox';
import Modal from '../components/Modal';
import Spinner from '../components/Spinner';
import type { Graph, TotVM } from '../domain/graph';
import { formatDate, formatDateTime } from '../format';
import {
  livePath,
  matchPath,
  refereeFeedbackPath,
  registerPath,
  rosterPath,
  tournamentResultsPath,
} from '../paths';
import { useGraph, useMatches, useTournament } from '../queries/data';
import { useAddMatch } from '../queries/mutations';

const btn = 'btn btn-secondary text-sm';
const heading = 'text-xl font-bold';

function MatchPanel({
  title,
  matches,
  tournamentPk,
  graph,
}: {
  title: string;
  matches: MatchDto[];
  tournamentPk: number;
  graph: Graph;
}) {
  const name = (pk: number | null) => (pk == null ? '' : (graph.totsById.get(pk)?.name_pure ?? ''));
  return (
    <section className="border border-gray-300 p-2">
      <h4 className="mb-2 font-bold">{title}</h4>
      {matches.map((m, i) => {
        const to = matchPath(tournamentPk, m.pk, true);
        return (
          <div key={m.pk} className="flex gap-2 py-1 odd:bg-gray-50">
            <span className="w-6 shrink-0">{i + 1}.</span>
            <span className="min-w-0 flex-1 text-right">
              <Link to={to}>{name(m.team_one)}</Link>
            </span>
            <span className="min-w-0 flex-1">
              <Link to={to}>{name(m.team_two)}</Link>
            </span>
            {m.referee_team != null && <span className="shrink-0">({name(m.referee_team)})</span>}
            <span className="shrink-0">
              {m.start && (
                <>
                  {m.score_one}:{m.score_two}
                  {m.with_shootout ? 'P' : ''}
                  {!m.end && ' hraje se'}
                </>
              )}
            </span>
          </div>
        );
      })}
    </section>
  );
}

function AddMatchDialog({
  open,
  onClose,
  tournament,
  tots,
}: {
  open: boolean;
  onClose: () => void;
  tournament: TournamentDto;
  tots: TotVM[];
}) {
  const navigate = useNavigate();
  const addMatch = useAddMatch();
  const [one, setOne] = useState('');
  const [two, setTwo] = useState('');
  const [ref, setRef] = useState('');
  const [place, setPlace] = useState('');
  const [clash, setClash] = useState(false);
  const fields = Array.from({ length: tournament.field_count }, (_, i) => String(i + 1));
  const complete = !!(one && two && ref && place);

  const reset = () => {
    setOne('');
    setTwo('');
    setRef('');
    setPlace('');
    setClash(false);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (new Set([one, two, ref]).size < 3) {
      setClash(true);
      return;
    }
    setClash(false);
    addMatch.mutate(
      {
        tournament: tournament.pk,
        team_one: Number(one),
        team_two: Number(two),
        referee_team: Number(ref),
        place,
      },
      {
        onSuccess: (newPk) => {
          reset();
          onClose();
          if (tournament.is_tournament_open) void navigate(matchPath(tournament.pk, newPk, true));
        },
      },
    );
  };

  const select = (label: string, value: string, set: (v: string) => void) => (
    <label className="mb-3 block">
      {label}
      <select className="input" value={value} onChange={(e) => set(e.target.value)}>
        <option value="">----</option>
        {tots.map((t) => (
          <option key={t.pk} value={t.pk}>
            {t.name}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <Modal open={open} onClose={onClose} title="Nový zápas">
      <form onSubmit={submit}>
        {select('Tým 1', one, setOne)}
        {select('Tým 2', two, setTwo)}
        {select('Rozhodčí tým', ref, setRef)}
        <fieldset className="mb-3">
          <legend>Hřiště</legend>
          <div className="flex gap-4">
            {fields.map((f) => (
              <label key={f}>
                <input
                  type="radio"
                  name="place"
                  value={f}
                  checked={place === f}
                  onChange={() => setPlace(f)}
                />{' '}
                {f}
              </label>
            ))}
          </div>
        </fieldset>
        {clash && <p className="mb-3 text-red-600">Některý z vybraných týmů se shoduje.</p>}
        <button type="submit" className="btn btn-primary" disabled={!complete || addMatch.isPending}>
          Vytvořit
        </button>
      </form>
    </Modal>
  );
}

function RecordHub({
  tournament,
  graph,
  matches,
  staff,
}: {
  tournament: TournamentDto;
  graph: Graph;
  matches: MatchDto[];
  staff: boolean;
}) {
  const id = tournament.pk;
  const [dialog, setDialog] = useState(false);
  const tots = useMemo(
    () => [...(graph.tournamentsById.get(id)?.tots ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'cs')),
    [graph, id],
  );
  const fields = Array.from({ length: tournament.field_count }, (_, i) => String(i + 1));
  const sorted = useMemo(() => [...matches].sort((a, b) => a.pk - b.pk), [matches]);
  const noField = sorted.filter((m) => m.place == null || !fields.includes(m.place));

  return (
    <>
      <BackLink fallback={tournamentResultsPath(id)} />
      <div className="float-right flex gap-2">
        <Link to={refereeFeedbackPath(id)} className={btn}>
          Hodnocení rozhodčích
        </Link>
        <Link to={livePath(id)} className={btn}>
          Divácký pohled
        </Link>
        <Link to={tournamentResultsPath(id)} className={btn}>
          Statistiky
        </Link>
        <Link to={`/tournaments/${id}/groups`} className={btn}>
          Skupiny
        </Link>
      </div>
      <h1 className="text-center text-3xl">{tournament.full_name}</h1>
      <hr className="my-3 border-gray-300" />
      {(tournament.is_tournament_open || staff) && (
        <>
          <h3 className={heading}>Zápasy</h3>
          <button type="button" className="btn btn-secondary my-2" onClick={() => setDialog(true)}>
            + Nový zápas
          </button>
          <div className="grid gap-4 md:grid-cols-2">
            {fields.map((f) => (
              <MatchPanel
                key={f}
                title={`Hřiště ${f}`}
                matches={sorted.filter((m) => m.place === f)}
                tournamentPk={id}
                graph={graph}
              />
            ))}
            {noField.length > 0 && (
              <MatchPanel title="Bez hřiště" matches={noField} tournamentPk={id} graph={graph} />
            )}
          </div>
          <hr className="my-3 border-gray-300" />
        </>
      )}
      {tournament.registration_open && (
        <p>
          <Link to={registerPath(id)}>přihlásit se na turnaj</Link>
          {` - do ${formatDate(tournament.registration_to)}`}
        </p>
      )}
      {tournament.registration_scheduled && (
        <p>přihlašování začne {formatDateTime(tournament.registration_from)}</p>
      )}
      <h3 className={heading}>Týmy</h3>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
        {tots.map((t) => (
          <Link key={t.pk} to={rosterPath(id, t.pk)}>
            {t.name}
          </Link>
        ))}
      </div>
      {dialog && <AddMatchDialog open onClose={() => setDialog(false)} tournament={tournament} tots={tots} />}
    </>
  );
}

export default function TournamentRecordPage() {
  const id = Number(useParams().id);
  const tournamentQuery = useTournament(id);
  const { graph, error: graphError, refetch: refetchGraph } = useGraph();
  const matchesQuery = useMatches(id);
  const user = useUser().data ?? null;

  const tournament = tournamentQuery.data;
  // A failed background refetch must not hide already loaded data.
  const error =
    (tournament ? null : tournamentQuery.error) ??
    graphError ??
    (matchesQuery.data ? null : matchesQuery.error);
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
  if (!tournament || !graph || !matchesQuery.data) return <Spinner />;
  const staff = isStaff(user);
  if (tournament.closed_edit && !staff) return <Navigate replace to={tournamentResultsPath(id)} />;
  return <RecordHub tournament={tournament} graph={graph} matches={matchesQuery.data} staff={staff} />;
}
