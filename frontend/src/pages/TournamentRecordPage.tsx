import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import type { MatchDto, TournamentDto } from '../api/types';
import { isManager } from '../auth/permissions';
import { useUser } from '../auth/user';
import BackLink from '../components/BackLink';
import ErrorBox from '../components/ErrorBox';
import { FieldError, useValidation } from '../components/forms/validation';
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

const btn = 'btn text-sm';
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
      {matches.map((m, i) => (
        <Link
          key={m.pk}
          to={matchPath(tournamentPk, m.pk, true)}
          className="flex gap-2 py-1 text-inherit odd:bg-gray-50 hover:bg-gray-100 hover:text-inherit"
        >
          <span className="w-6 shrink-0">{i + 1}.</span>
          <span className="min-w-0 flex-1 text-right text-primary">{name(m.team_one)}</span>
          <span className="min-w-0 flex-1 text-primary">{name(m.team_two)}</span>
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
        </Link>
      ))}
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
  const fields = Array.from({ length: tournament.field_count }, (_, i) => String(i + 1));
  const v = useValidation({
    one: !one && 'Vyber tým.',
    two: (!two && 'Vyber tým.') || (two === one && 'Tým hraje sám se sebou.'),
    ref:
      (!ref && 'Vyber rozhodčí tým.') ||
      ((ref === one || ref === two) && 'Rozhodčí tým nesmí hrát tento zápas.'),
    place: !place && 'Vyber hřiště.',
  });

  const reset = () => {
    setOne('');
    setTwo('');
    setRef('');
    setPlace('');
    v.reset();
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.attempt()) return;
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

  const select = (key: 'one' | 'two' | 'ref', label: string, value: string, set: (v: string) => void) => (
    <div className="mb-3">
      <label className="block">
        {label}
        <select
          className="input"
          value={value}
          onChange={(e) => set(e.target.value)}
          onBlur={v.touch(key)}
          aria-invalid={!!v.error(key)}
        >
          <option value="">----</option>
          {tots.map((t) => (
            <option key={t.pk} value={t.pk}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <FieldError error={v.error(key)} />
    </div>
  );

  return (
    <Modal open={open} onClose={onClose} title="Nový zápas">
      <form onSubmit={submit}>
        {select('one', 'Tým 1', one, setOne)}
        {select('two', 'Tým 2', two, setTwo)}
        {select('ref', 'Rozhodčí tým', ref, setRef)}
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
          <FieldError error={v.error('place')} />
        </fieldset>
        <button type="submit" className="btn btn-primary" disabled={addMatch.isPending}>
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
  manager,
}: {
  tournament: TournamentDto;
  graph: Graph;
  matches: MatchDto[];
  manager: boolean;
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
      {(tournament.is_tournament_open || manager) && (
        <>
          <h3 className={heading}>Zápasy</h3>
          <button type="button" className="btn my-2" onClick={() => setDialog(true)}>
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
  const manager = isManager(user);
  if (tournament.closed_edit && !manager) return <Navigate replace to={tournamentResultsPath(id)} />;
  return <RecordHub tournament={tournament} graph={graph} matches={matchesQuery.data} manager={manager} />;
}
