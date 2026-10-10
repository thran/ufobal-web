import { createColumnHelper } from '@tanstack/react-table';
import { useMemo } from 'react';
import { Link } from 'react-router';
import DataTable, { czechSort } from '../components/DataTable';
import ErrorBox from '../components/ErrorBox';
import Spinner from '../components/Spinner';
import type { TournamentVM } from '../domain/graph';
import { tournamentResultsPath } from '../paths';
import { useGraph } from '../queries/data';

const h = createColumnHelper<TournamentVM>();

const columns = [
  h.accessor('full_name', {
    id: 'name',
    header: 'Jméno',
    sortingFn: czechSort,
    cell: (c) => <Link to={tournamentResultsPath(c.row.original.pk)}>{c.row.original.full_name}</Link>,
    meta: { width: '30%' },
  }),
  h.accessor('date', {
    id: 'date',
    header: 'Datum',
    meta: { width: '20%' },
  }),
  h.accessor((t) => t.tots.length, {
    id: 'teams',
    header: 'Týmů',
    enableSorting: false,
    meta: { width: '10%', align: 'right' },
  }),
  h.accessor((t) => t.location ?? '', {
    id: 'location',
    header: 'Lokace',
    enableSorting: false,
    meta: { width: '10%' },
  }),
  h.accessor((t) => t.category ?? '', {
    id: 'category',
    header: 'Kategorie',
    enableSorting: false,
    meta: { width: '10%' },
  }),
];

export default function TournamentsPage() {
  const { graph, error, isPending, refetch } = useGraph();
  const rows = useMemo(
    () => (graph ? [...graph.tournaments].sort((a, b) => b.date.localeCompare(a.date)) : []),
    [graph],
  );
  if (error) return <ErrorBox error={error} onRetry={refetch} />;
  if (isPending || !graph) return <Spinner />;
  return (
    <>
      <h1 className="text-3xl">Turnaje</h1>
      <DataTable data={rows} columns={columns} getRowId={(t) => String(t.pk)} />
    </>
  );
}
