import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type RowData,
  type SortingFn,
  type SortingState,
} from '@tanstack/react-table';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { searchKey } from '../domain/text';

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    align?: 'left' | 'right' | 'center';
    width?: string;
  }
}

export interface DataTableProps<T> {
  data: T[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<T, any>[];
  getRowId: (row: T) => string;
  urlPrefix?: string;
  pageSize?: number;
  displayedPages?: number;
  searchText?: (row: T) => string;
  searchPlaceholder?: string;
  defaultSort?: { id: string; desc: boolean };
  rank?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const czechSort: SortingFn<any> = (a, b, id) =>
  String(a.getValue(id) ?? '').localeCompare(String(b.getValue(id) ?? ''), 'cs');

const alignClass = { left: 'text-left', right: 'text-right', center: 'text-center' };

export default function DataTable<T>({
  data,
  columns,
  getRowId,
  urlPrefix = '',
  pageSize = 15,
  displayedPages = 10,
  searchText,
  searchPlaceholder = 'hledat...',
  defaultSort,
  rank = false,
}: DataTableProps<T>) {
  const [params, setParams] = useSearchParams();
  const key = (name: string) => urlPrefix + name;
  const update = (changes: Record<string, string | null>) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [name, value] of Object.entries(changes)) {
          if (value === null) next.delete(key(name));
          else next.set(key(name), value);
        }
        return next;
      },
      { replace: true },
    );

  const query = params.get(key('q')) ?? '';
  const rows = useMemo(() => {
    if (!searchText || !query) return data;
    const needle = searchKey(query);
    return data.filter((row) => searchText(row).includes(needle));
  }, [data, searchText, query]);

  const columnIds = new Set(columns.map((c) => c.id ?? ('accessorKey' in c ? String(c.accessorKey) : '')));
  const sortParam = params.get(key('sort'));
  const sorting: SortingState =
    sortParam === null
      ? defaultSort
        ? [defaultSort]
        : []
      : sortParam && columnIds.has(sortParam.replace(/^-/, ''))
        ? [{ id: sortParam.replace(/^-/, ''), desc: sortParam.startsWith('-') }]
        : [];

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const requestedPage = Number.parseInt(params.get(key('page')) ?? '1', 10);
  const pageIndex = Math.min(Math.max(Number.isFinite(requestedPage) ? requestedPage : 1, 1), pageCount) - 1;

  const allColumns = useMemo<ColumnDef<T, unknown>[]>(
    () =>
      rank
        ? [
            {
              id: '__rank',
              header: '#',
              enableSorting: false,
              meta: { align: 'right' },
              cell: ({ row, table }) =>
                `${table.getPrePaginationRowModel().rows.findIndex((r) => r.id === row.id) + 1}.`,
            },
            ...columns,
          ]
        : columns,
    [columns, rank],
  );

  // TanStack Table returns non-memoizable functions; the React Compiler lint rule does not apply here.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: rows,
    columns: allColumns,
    getRowId,
    state: { sorting, pagination: { pageIndex, pageSize } },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      const s = next[0];
      update({ sort: s ? `${s.desc ? '-' : ''}${s.id}` : '', page: null });
    },
    onPaginationChange: (updater) => {
      const next = typeof updater === 'function' ? updater({ pageIndex, pageSize }) : updater;
      update({ page: next.pageIndex > 0 ? String(next.pageIndex + 1) : null });
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    autoResetPageIndex: false,
  });

  const windowStart = Math.max(
    0,
    Math.min(pageIndex - Math.floor(displayedPages / 2), pageCount - displayedPages),
  );
  const pages = Array.from({ length: Math.min(displayedPages, pageCount) }, (_, i) => windowStart + i);
  const pageButton = 'min-w-8 px-2 py-1 hover:bg-secondary disabled:opacity-40';

  return (
    <div>
      {searchText && (
        <div className="relative mb-2 max-w-[300px]">
          <input
            className="input pr-8"
            placeholder={searchPlaceholder}
            value={query}
            onChange={(e) => update({ q: e.target.value || null, page: null })}
          />
          {query && (
            <button
              type="button"
              aria-label="Zrušit hledání"
              className="absolute top-1/2 right-2 -translate-y-1/2 text-gray-500"
              onClick={() => update({ q: null, page: null })}
            >
              ×
            </button>
          )}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-[#f5f5f5]">
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => {
                  const meta = header.column.columnDef.meta;
                  const sorted = header.column.getIsSorted();
                  const label = flexRender(header.column.columnDef.header, header.getContext());
                  return (
                    <th
                      key={header.id}
                      style={meta?.width ? { width: meta.width } : undefined}
                      aria-sort={
                        sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined
                      }
                      className={`px-2 py-2 font-bold ${alignClass[meta?.align ?? 'left']}`}
                    >
                      {header.column.getCanSort() ? (
                        <button
                          type="button"
                          className="cursor-pointer select-none"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {label}
                          {sorted === 'asc' ? ' ▲' : sorted === 'desc' ? ' ▼' : ''}
                        </button>
                      ) : (
                        label
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="even:bg-[#f9f9f9]">
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className={`px-2 py-2 ${alignClass[cell.column.columnDef.meta?.align ?? 'left']}`}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pageCount > 1 && (
        <nav aria-label="Stránkování" className="mt-2 flex justify-center gap-1">
          <button
            type="button"
            className={pageButton}
            disabled={pageIndex === 0}
            onClick={() => table.setPageIndex(0)}
          >
            «
          </button>
          <button
            type="button"
            className={pageButton}
            disabled={pageIndex === 0}
            onClick={() => table.previousPage()}
          >
            ‹
          </button>
          {pages.map((p) => (
            <button
              key={p}
              type="button"
              className={`${pageButton} ${p === pageIndex ? 'bg-primary text-white hover:bg-primary' : ''}`}
              aria-current={p === pageIndex ? 'page' : undefined}
              onClick={() => table.setPageIndex(p)}
            >
              {p + 1}
            </button>
          ))}
          <button
            type="button"
            className={pageButton}
            disabled={pageIndex >= pageCount - 1}
            onClick={() => table.nextPage()}
          >
            ›
          </button>
          <button
            type="button"
            className={pageButton}
            disabled={pageIndex >= pageCount - 1}
            onClick={() => table.setPageIndex(pageCount - 1)}
          >
            »
          </button>
        </nav>
      )}
    </div>
  );
}
