import { createColumnHelper } from '@tanstack/react-table';
import { useMemo } from 'react';
import DataTable, { czechSort } from '../components/DataTable';
import ErrorBox from '../components/ErrorBox';
import PlayerLink from '../components/PlayerLink';
import Spinner from '../components/Spinner';
import type { PlayerVM } from '../domain/graph';
import { useGraph } from '../queries/data';

const h = createColumnHelper<PlayerVM>();

const columns = [
  h.accessor('nickname', {
    id: 'nickname',
    header: 'Jméno',
    sortingFn: czechSort,
    cell: (c) => <PlayerLink player={c.row.original} />,
    meta: { width: '30%' },
  }),
  h.accessor((p) => p.teams.map((t) => `${t.team.name} (${t.count}x)`).join(', '), {
    id: 'teams',
    header: 'Týmy',
    enableSorting: false,
    meta: { width: '40%' },
  }),
  h.accessor('goalsSum', { header: 'Góly', sortDescFirst: true, meta: { align: 'right' } }),
  h.accessor('assistsSum', { header: 'Asistence', sortDescFirst: true, meta: { align: 'right' } }),
  h.accessor('canada', { header: 'Kanada', sortDescFirst: true, meta: { align: 'right' } }),
  h.accessor('penaltyCount', { header: 'Karty', sortDescFirst: true, meta: { align: 'right' } }),
];

export default function PlayersPage() {
  const { graph, error, isPending, refetch } = useGraph();
  const rows = useMemo(() => (graph ? [...graph.players].sort((a, b) => b.canada - a.canada) : []), [graph]);
  if (error) return <ErrorBox error={error} onRetry={refetch} />;
  if (isPending || !graph) return <Spinner />;
  return (
    <>
      <h1 className="text-3xl">Hráči</h1>
      <DataTable data={rows} columns={columns} getRowId={(p) => String(p.pk)} searchText={(p) => p.search} />
    </>
  );
}
