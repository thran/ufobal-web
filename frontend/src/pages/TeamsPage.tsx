import { createColumnHelper } from '@tanstack/react-table';
import { useMemo } from 'react';
import { Link } from 'react-router';
import DataTable, { czechSort } from '../components/DataTable';
import ErrorBox from '../components/ErrorBox';
import Medals from '../components/Medals';
import Spinner from '../components/Spinner';
import { compareMedals, type TeamVM } from '../domain/graph';
import { teamPath } from '../paths';
import { useGraph } from '../queries/data';

const h = createColumnHelper<TeamVM>();

const searchText = (t: TeamVM) => t.search;

const columns = [
  h.accessor('name', {
    id: 'name',
    header: 'Jméno',
    sortingFn: czechSort,
    cell: (c) => <Link to={teamPath(c.row.original)}>{c.row.original.name}</Link>,
    meta: { width: '20%' },
  }),
  h.accessor((t) => t.altNames.map((n) => n.name).join(', '), {
    id: 'altNames',
    header: '',
    enableSorting: false,
    meta: { width: '40%' },
  }),
  h.accessor((t) => t.medals, {
    id: 'medals',
    header: 'Umístění',
    sortingFn: (a, b) => compareMedals(a.original.medals, b.original.medals),
    sortDescFirst: false,
    cell: ({ row }) => <Medals medals={row.original.medals} />,
    meta: { width: '30%' },
  }),
  h.accessor((t) => t.tots.length, {
    id: 'tournaments',
    header: 'Počet turnajů',
    enableSorting: false,
    meta: { align: 'right' },
  }),
];

export default function TeamsPage() {
  const { graph, error, isPending, refetch } = useGraph();
  const rows = useMemo(
    () => (graph ? [...graph.teams].sort((a, b) => compareMedals(a.medals, b.medals)) : []),
    [graph],
  );
  if (error) return <ErrorBox error={error} onRetry={refetch} />;
  if (isPending || !graph) return <Spinner />;
  return (
    <>
      <h1 className="text-3xl">Týmy</h1>
      <DataTable data={rows} columns={columns} getRowId={(t) => String(t.pk)} searchText={searchText} />
    </>
  );
}
