import { createColumnHelper } from '@tanstack/react-table';
import { useMemo } from 'react';
import { Link } from 'react-router';
import DataTable, { czechSort } from '../components/DataTable';
import ErrorBox from '../components/ErrorBox';
import PlayerLink from '../components/PlayerLink';
import Spinner from '../components/Spinner';
import StatsFilterForm, { useStatsFilter } from '../components/StatsFilterForm';
import WideBox from '../components/WideBox';
import {
  filterTournaments,
  genderMatches,
  goalieStatsRows,
  tournamentsWithGoalieStats,
  type GoalieStatsRow,
} from '../domain/stats';
import { searchKey } from '../domain/text';
import { compareSuccess, formatPercent } from '../domain/tournament';
import { tournamentResultsPath } from '../paths';
import { useGoalieStats, useGraph } from '../queries/data';

const helper = createColumnHelper<GoalieStatsRow>();
const searchText = (r: GoalieStatsRow) => r.player.search;
const getRowId = (r: GoalieStatsRow) => String(r.player.pk);
const defaultSort = { id: 'success', desc: true };

const numberColumn = (id: 'matches' | 'shots' | 'goals', header: string) =>
  helper.accessor(id, { id, header, sortDescFirst: true, meta: { align: 'right' } });

export default function GoalieStatsPage() {
  const graphQuery = useGraph();
  const statsQuery = useGoalieStats();
  const { graph } = graphQuery;
  const stats = statsQuery.data;
  const [filter, setFilter, resetFilter] = useStatsFilter('goalies');

  const tournaments = useMemo(
    () =>
      graph && stats
        ? tournamentsWithGoalieStats(
            stats,
            filterTournaments(graph.tournaments, filter, { allowLiga: false }),
          )
        : [],
    [graph, stats, filter],
  );
  const rows = useMemo(
    () =>
      graph && stats
        ? goalieStatsRows(stats, graph, tournaments).filter(
            (r) => genderMatches(r.player, filter) && r.success > 0 && r.matches >= filter.minMatches,
          )
        : [],
    [graph, stats, tournaments, filter],
  );
  const team = filter.team;
  const extraFilter = useMemo(
    () => (team ? (r: GoalieStatsRow) => r.player.teamsSearch.includes(searchKey(team)) : undefined),
    [team],
  );
  const columns = useMemo(
    () => [
      helper.accessor((r) => r.player.nickname, {
        id: 'nickname',
        header: 'Jméno',
        sortingFn: czechSort,
        cell: ({ row }) => <PlayerLink player={row.original.player} />,
        meta: { width: '10%' },
      }),
      ...tournaments.map((t) =>
        helper.display({
          id: `t${t.pk}`,
          header: () => <Link to={tournamentResultsPath(t.pk)}>{t.full_name}</Link>,
          cell: ({ row }) => {
            const s = row.original.perTournament[t.pk];
            if (!s || !(s.success > 0)) return null;
            return (
              <>
                <b>{formatPercent(s.success)}</b>
                <br />
                <span className="text-xs">
                  ({s.goals} / {s.shots})
                </span>
              </>
            );
          },
          meta: { align: 'right' },
        }),
      ),
      numberColumn('matches', 'zápasů'),
      numberColumn('shots', 'střel'),
      numberColumn('goals', 'gólů'),
      helper.accessor('success', {
        id: 'success',
        header: 'úspěšnost',
        cell: ({ getValue }) => formatPercent(getValue()),
        sortingFn: (a, b) => compareSuccess(a.original.success, b.original.success),
        sortDescFirst: true,
        meta: { align: 'right' },
      }),
    ],
    [tournaments],
  );

  if (graphQuery.error) return <ErrorBox error={graphQuery.error} onRetry={graphQuery.refetch} />;
  if (statsQuery.error)
    return <ErrorBox error={statsQuery.error} onRetry={() => void statsQuery.refetch()} />;
  if (graphQuery.isPending || statsQuery.isPending || !graph || !stats) return <Spinner />;
  return (
    <>
      <h1 className="text-3xl">Statistiky brankářů</h1>
      <StatsFilterForm
        filter={filter}
        onChange={setFilter}
        onReset={resetFilter}
        showLiga={false}
        showMinMatches
      />
      <WideBox>
        <DataTable
          data={rows}
          columns={columns}
          getRowId={getRowId}
          rank="beforeSearch"
          searchText={searchText}
          hideSearchInput
          extraFilter={extraFilter}
          defaultSort={defaultSort}
        />
      </WideBox>
    </>
  );
}
