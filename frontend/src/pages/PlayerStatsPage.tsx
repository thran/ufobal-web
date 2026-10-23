import { createColumnHelper } from '@tanstack/react-table';
import { useMemo } from 'react';
import { Link } from 'react-router';
import DataTable, { czechSort } from '../components/DataTable';
import ErrorBox from '../components/ErrorBox';
import PlayerLink from '../components/PlayerLink';
import Spinner from '../components/Spinner';
import StatsFilterForm, { useStatsFilter } from '../components/StatsFilterForm';
import { filterTournaments, genderMatches, playerStatsRows, type PlayerStatsRow } from '../domain/stats';
import { searchKey } from '../domain/text';
import { tournamentResultsPath } from '../paths';
import { useGraph } from '../queries/data';

const helper = createColumnHelper<PlayerStatsRow>();
const searchText = (r: PlayerStatsRow) => r.player.search;
const getRowId = (r: PlayerStatsRow) => String(r.player.pk);
const defaultSort = { id: 'canada', desc: true };

const numberColumn = (id: 'goals' | 'assists' | 'canada', header: string) =>
  helper.accessor(id, { id, header, sortDescFirst: true, meta: { align: 'center' } });

export default function PlayerStatsPage() {
  const { graph, error, isPending, refetch } = useGraph();
  const [filter, setFilter, resetFilter] = useStatsFilter('players');

  const tournaments = useMemo(
    () => (graph ? filterTournaments(graph.tournaments, filter, { allowLiga: true }) : []),
    [graph, filter],
  );
  const rows = useMemo(
    () =>
      graph ? playerStatsRows(graph.players, tournaments).filter((r) => genderMatches(r.player, filter)) : [],
    [graph, tournaments, filter],
  );
  const team = filter.team;
  const extraFilter = useMemo(
    () => (team ? (r: PlayerStatsRow) => r.player.teamsSearch.includes(searchKey(team)) : undefined),
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
            if (!s) return null;
            return (
              <>
                {s.goals ? <b>{s.goals}</b> : null}
                {s.goals && s.assists ? '+' : null}
                {s.assists || null}
              </>
            );
          },
          meta: { align: 'right' },
        }),
      ),
      numberColumn('goals', 'G'),
      numberColumn('assists', 'A'),
      numberColumn('canada', 'K'),
    ],
    [tournaments],
  );

  if (error) return <ErrorBox error={error} onRetry={refetch} />;
  if (isPending || !graph) return <Spinner />;
  return (
    <>
      <h1 className="text-3xl">Statistiky hráčů</h1>
      <StatsFilterForm
        filter={filter}
        onChange={setFilter}
        onReset={resetFilter}
        showLiga
        showMinMatches={false}
      />
      <div className="overflow-x-auto">
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
      </div>
    </>
  );
}
