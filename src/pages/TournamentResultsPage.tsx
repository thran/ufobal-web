import { createColumnHelper } from '@tanstack/react-table';
import { Fragment, useMemo } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import BackLink from '../components/BackLink';
import DataTable, { czechSort } from '../components/DataTable';
import ErrorBox from '../components/ErrorBox';
import PlayerLink from '../components/PlayerLink';
import Spinner from '../components/Spinner';
import type { Graph, TotVM, TournamentVM } from '../domain/graph';
import { genderMatches, parseStatsFilter } from '../domain/stats';
import {
  compareSuccess,
  formatPercent,
  goalieRows,
  pairRows,
  sortTotsByRank,
  teamScores,
  tournamentPlayerRows,
  tournamentSummary,
  type GoalieRow,
  type PairRow,
  type PlayerScoreRow,
} from '../domain/tournament';
import { formatRank } from '../format';
import { teamPath, tournamentResultsPath } from '../paths';
import { useGoalieStats, useGraph, useMatches, usePairs } from '../queries/data';

const playerHelper = createColumnHelper<PlayerScoreRow>();
const playerColumns = [
  playerHelper.accessor((r) => r.player.nickname, {
    id: 'nickname',
    header: 'Jméno',
    sortingFn: czechSort,
    cell: ({ row }) => <PlayerLink player={row.original.player} />,
  }),
  playerHelper.accessor('goals', {
    id: 'goals',
    header: 'góly',
    sortDescFirst: true,
    meta: { align: 'right' },
  }),
  playerHelper.accessor('assists', {
    id: 'assists',
    header: 'asistence',
    sortDescFirst: true,
    meta: { align: 'right' },
  }),
  playerHelper.accessor('canada', {
    id: 'canada',
    header: 'kanada',
    sortDescFirst: true,
    meta: { align: 'right' },
  }),
];
const playerRowId = (r: PlayerScoreRow) => String(r.player.pk);

const goalieHelper = createColumnHelper<GoalieRow>();
const goalieColumns = [
  goalieHelper.accessor((r) => r.player.nickname, {
    id: 'nickname',
    header: 'Jméno',
    sortingFn: czechSort,
    cell: ({ row }) => <PlayerLink player={row.original.player} />,
  }),
  goalieHelper.accessor('matches', {
    id: 'matches',
    header: 'zápasů',
    sortDescFirst: true,
    meta: { align: 'right' },
  }),
  goalieHelper.accessor('shots', {
    id: 'shots',
    header: 'střel',
    sortDescFirst: true,
    meta: { align: 'right' },
  }),
  goalieHelper.accessor('goals', {
    id: 'goals',
    header: 'gólů',
    sortDescFirst: true,
    meta: { align: 'right' },
  }),
  goalieHelper.accessor('success', {
    id: 'success',
    header: 'úspěšnost',
    sortDescFirst: true,
    sortingFn: (a, b) => compareSuccess(a.original.success, b.original.success),
    cell: ({ row }) => formatPercent(row.original.success),
    meta: { align: 'right' },
  }),
];
const goalieRowId = (r: GoalieRow) => String(r.player.pk);

const pairHelper = createColumnHelper<PairRow>();
const pairColumns = [
  pairHelper.accessor((r) => r.player1.nickname, {
    id: 'player1',
    header: 'Hráč 1',
    enableSorting: false,
    cell: ({ row }) => (
      <>
        <PlayerLink player={row.original.player1} />
        {row.original.goalsFirst ? ` (${row.original.goalsFirst})` : ''}
      </>
    ),
  }),
  pairHelper.accessor((r) => r.player2.nickname, {
    id: 'player2',
    header: 'Hráč 2',
    enableSorting: false,
    cell: ({ row }) => (
      <>
        <PlayerLink player={row.original.player2} />
        {row.original.goalsSecond ? ` (${row.original.goalsSecond})` : ''}
      </>
    ),
  }),
  pairHelper.accessor('points', {
    id: 'points',
    header: 'body',
    sortDescFirst: true,
    meta: { align: 'right' },
  }),
];
const pairRowId = (r: PairRow) => r.id;

const btn = 'btn btn-secondary text-sm';
const heading = 'text-xl font-bold';

function TournamentResults({
  graph,
  tournament,
  selectedTot,
}: {
  graph: Graph;
  tournament: TournamentVM;
  selectedTot: TotVM | undefined;
}) {
  const id = tournament.pk;
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const matchesQuery = useMatches(id);
  const goalieQuery = useGoalieStats(id);
  const pairsQuery = usePairs(id);
  const gender = parseStatsFilter(params, new Date().getFullYear());
  const selectedPk = selectedTot?.pk;

  const matches = matchesQuery.data;
  const scores = useMemo(() => teamScores(matches ?? []), [matches]);
  const summary = useMemo(() => tournamentSummary(tournament, matches ?? []), [tournament, matches]);
  const tots = useMemo(() => sortTotsByRank(tournament.tots), [tournament]);
  const totsByName = useMemo(
    () => [...tournament.tots].sort((a, b) => a.name.localeCompare(b.name, 'cs')),
    [tournament],
  );
  const shownTots = selectedTot ? tots.filter((t) => t.pk === selectedTot.pk) : tots;

  const matchRows = useMemo(
    () =>
      (matches ?? [])
        .filter((m) => m.length != null)
        .filter((m) => selectedPk == null || m.team_one === selectedPk || m.team_two === selectedPk)
        .sort((a, b) => {
          if (a.start === b.start) return 0;
          if (a.start == null) return 1;
          if (b.start == null) return -1;
          return a.start < b.start ? -1 : 1;
        }),
    [matches, selectedPk],
  );

  const playerPks = selectedTot?.playerPks;
  const man = gender.man;
  const woman = gender.woman;
  const playerRows = useMemo(
    () =>
      tournamentPlayerRows(graph, id).filter(
        (r) => genderMatches(r.player, { man, woman }) && (!playerPks || playerPks.includes(r.player.pk)),
      ),
    [graph, id, man, woman, playerPks],
  );
  const goalies = useMemo(
    () =>
      goalieRows(goalieQuery.data ?? [], graph).filter((r) => selectedPk == null || r.team === selectedPk),
    [goalieQuery.data, graph, selectedPk],
  );
  const pairs = useMemo(
    () =>
      pairRows(pairsQuery.data ?? [], graph).filter(
        (r) => !playerPks || playerPks.includes(r.player1.pk) || playerPks.includes(r.player2.pk),
      ),
    [pairsQuery.data, graph, playerPks],
  );

  const totName = (pk: number | null) => (pk == null ? '' : (graph.totsById.get(pk)?.name_pure ?? ''));

  const selectTeam = (value: string) => {
    const next = new URLSearchParams(params);
    for (const k of ['p_page', 'g_page', 'd_page']) next.delete(k);
    void navigate(
      {
        pathname: tournamentResultsPath(id, value ? Number(value) : undefined),
        search: next.toString(),
      },
      { replace: true },
    );
  };
  const toggleGender = (which: 'man' | 'woman') => {
    const f = { man, woman, [which]: !(which === 'man' ? man : woman) };
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('g', f.man && f.woman ? 'mw' : f.man ? 'm' : f.woman ? 'w' : '0');
        next.delete('p_page');
        return next;
      },
      { replace: true },
    );
  };

  return (
    <>
      <BackLink fallback="/tournaments" />
      <div className="float-right flex gap-2">
        <Link to={`/tournaments/${id}/groups`} className={btn}>
          Skupiny
        </Link>
        {tournament.is_tournament_open && (
          <Link to={`/tournaments/${id}/record`} className={btn}>
            Spravovat
          </Link>
        )}
        {!tournament.closed_edit && (
          <Link to={`/tournaments/${id}/referee-feedback`} className={btn}>
            Hodnocení rozhodčích
          </Link>
        )}
      </div>
      <h1 className="text-3xl">{tournament.full_name}</h1>
      {matches && summary.goalCount > 0 && (
        <ul className="list-disc pl-6">
          <li>lokace: {tournament.location}</li>
          <li>kategorie: {tournament.category}</li>
          <li>
            <b>{summary.teamCount}</b> týmů odehrálo <b>{summary.matchCount}</b> zápasů
          </li>
          <li>
            celkem se zúčastnilo <b>{summary.playerCount}</b> hráčů
          </li>
          <li>
            bylo vstřeleno <b>{summary.goalCount}</b> branek
          </li>
        </ul>
      )}
      <hr className="my-3 border-gray-300" />
      <select
        aria-label="Tým"
        className="input mb-4 max-w-xs"
        value={selectedPk ?? ''}
        onChange={(e) => selectTeam(e.target.value)}
      >
        <option value="">Všechny týmy</option>
        {totsByName.map((t) => (
          <option key={t.pk} value={t.pk}>
            {t.name}
          </option>
        ))}
      </select>
      <div className="gap-6 md:grid md:grid-cols-12">
        <div className="md:col-span-7">
          <section>
            <h3 className={heading}>Týmy</h3>
            <table className="table-basic">
              <thead>
                <tr>
                  <th className="text-right">#</th>
                  <th>Jméno</th>
                  <th>Skóre</th>
                  <th>Hráči</th>
                </tr>
              </thead>
              <tbody>
                {shownTots.map((tot) => {
                  const s = scores.get(tot.pk);
                  return (
                    <tr key={tot.pk}>
                      <td className="text-right">{formatRank(tot.rank)}</td>
                      <td>
                        <Link to={teamPath({ pk: tot.team.pk, name: tot.name })}>{tot.name}</Link>
                      </td>
                      <td>
                        {s?.scored ?? 0}:{s?.received ?? 0}
                      </td>
                      <td>
                        {tot.players.map((p, i) => (
                          <Fragment key={p.pk}>
                            {i > 0 && ', '}
                            <PlayerLink player={p} />
                          </Fragment>
                        ))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
          {matchesQuery.isPending && <Spinner />}
          {matchesQuery.error && (
            <ErrorBox error={matchesQuery.error} onRetry={() => void matchesQuery.refetch()} />
          )}
          {matchRows.length > 0 && (
            <section>
              <h3 className={heading}>Zápasy</h3>
              <table className="table-basic">
                <tbody>
                  {matchRows.map((m) => (
                    <tr key={m.pk}>
                      <td className="text-right">{totName(m.team_one)}</td>
                      <td className="text-right">{m.score_one}</td>
                      <td>
                        {m.score_two}
                        {m.with_shootout ? ' P' : ''}
                      </td>
                      <td>{totName(m.team_two)}</td>
                      <td>
                        <Link to={`/tournaments/${id}/matches/${m.pk}`}>detail</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </div>
        <div className="md:col-span-5">
          <div className="float-right flex gap-3">
            <label>
              <input type="checkbox" checked={man} onChange={() => toggleGender('man')} aria-label="Muži" />♂
            </label>
            <label>
              <input
                type="checkbox"
                checked={woman}
                onChange={() => toggleGender('woman')}
                aria-label="Ženy"
              />
              ♀
            </label>
          </div>
          <section>
            <h3 className={heading}>Nejlepší hráči</h3>
            <DataTable
              data={playerRows}
              columns={playerColumns}
              getRowId={playerRowId}
              urlPrefix="p_"
              rank
              displayedPages={5}
            />
          </section>
          {goalies.length > 0 && (
            <section>
              <h3 className={heading}>Nejlepší brankáři</h3>
              <DataTable
                data={goalies}
                columns={goalieColumns}
                getRowId={goalieRowId}
                urlPrefix="g_"
                rank
                displayedPages={5}
              />
            </section>
          )}
          {pairs.length > 0 && (
            <section>
              <h3 className={heading}>Nejproduktivnější dvojice</h3>
              <DataTable
                data={pairs}
                columns={pairColumns}
                getRowId={pairRowId}
                urlPrefix="d_"
                rank
                displayedPages={5}
              />
            </section>
          )}
        </div>
      </div>
    </>
  );
}

export default function TournamentResultsPage() {
  const { id, teamId } = useParams();
  const { graph, error, isPending, refetch } = useGraph();
  if (error) return <ErrorBox error={error} onRetry={refetch} />;
  if (isPending || !graph) return <Spinner />;
  const tournament = graph.tournamentsById.get(Number(id));
  if (!tournament)
    return (
      <>
        <BackLink fallback="/tournaments" />
        <div role="alert" className="callout">
          Turnaj nenalezen.
        </div>
      </>
    );
  const selectedTot = teamId ? tournament.tots.find((t) => t.pk === Number(teamId)) : undefined;
  return <TournamentResults graph={graph} tournament={tournament} selectedTot={selectedTot} />;
}
