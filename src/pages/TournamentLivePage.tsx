import { useState } from 'react';
import { Link, useParams } from 'react-router';
import type { MatchDto } from '../api/types';
import BackLink from '../components/BackLink';
import ErrorBox from '../components/ErrorBox';
import Spinner from '../components/Spinner';
import type { Graph } from '../domain/graph';
import { matchPath, recordPath, tournamentResultsPath } from '../paths';
import { useGraph, useMatches, useTournament } from '../queries/data';

const btn = 'btn btn-secondary text-sm';

function Section({
  title,
  matches,
  tournamentPk,
  graph,
  ongoing,
}: {
  title: string;
  matches: MatchDto[];
  tournamentPk: number;
  graph: Graph;
  ongoing?: boolean;
}) {
  const name = (pk: number | null) => (pk == null ? '' : (graph.totsById.get(pk)?.name_pure ?? ''));
  return (
    <section className="mb-4">
      <h4 className="mb-2 font-bold">{title}</h4>
      {matches.length === 0 && <p className="text-gray-500">—</p>}
      {[...matches]
        .sort((a, b) => b.pk - a.pk)
        .map((m) => {
          const to = matchPath(tournamentPk, m.pk);
          return (
            <div key={m.pk} className="flex gap-2 py-1 odd:bg-gray-50">
              <span className="w-8 shrink-0">{m.place}</span>
              <span className="min-w-0 flex-1 text-right">
                <Link to={to}>{name(m.team_one)}</Link>
              </span>
              <span className="min-w-0 flex-1">
                <Link to={to}>{name(m.team_two)}</Link>
              </span>
              <span className="shrink-0">({name(m.referee_team)})</span>
              <span className="shrink-0">
                {m.start && (
                  <>
                    {m.score_one}:{m.score_two}
                    {m.with_shootout ? 'P' : ''}
                    {ongoing && ' hraje se'}
                  </>
                )}
              </span>
            </div>
          );
        })}
    </section>
  );
}

export default function TournamentLivePage() {
  const id = Number(useParams().id);
  const [live, setLive] = useState(true);
  const tournamentQuery = useTournament(id);
  const { graph, error: graphError, refetch: refetchGraph } = useGraph();
  const matchesQuery = useMatches(id, { refetchInterval: live ? 15_000 : false });

  const matches = matchesQuery.data;
  const tournament = tournamentQuery.data;
  // A failed background refetch must not hide already loaded matches.
  const error = tournamentQuery.error ?? graphError ?? (matches ? null : matchesQuery.error);
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

  const props = { tournamentPk: id, graph };
  return (
    <>
      <BackLink fallback={tournamentResultsPath(id)} />
      <div className="float-right flex gap-2">
        <Link to={`/tournaments/${id}/groups`} className={btn}>
          Skupiny
        </Link>
        <Link to={tournamentResultsPath(id)} className={btn}>
          Statistiky
        </Link>
        <Link to={recordPath(id)} className={btn}>
          Správa turnaje
        </Link>
      </div>
      <label className="my-2 block">
        <input type="checkbox" aria-label="živě" checked={live} onChange={(e) => setLive(e.target.checked)} />{' '}
        živě
      </label>
      <h1 className="text-center text-3xl">{tournament.full_name}</h1>
      <hr className="my-3 border-gray-300" />
      <Section
        title="Probíhající zápasy"
        matches={matches.filter((m) => m.start && !m.end)}
        ongoing
        {...props}
      />
      <Section title="Ukončené zápasy" matches={matches.filter((m) => m.end)} {...props} />
      <Section title="Budoucí zápasy" matches={matches.filter((m) => !m.start)} {...props} />
    </>
  );
}
