import {
  flexRender,
  getCoreRowModel,
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
import { useDebouncedInput } from '../hooks/useDebouncedInput';

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
  rank?: boolean | 'beforeSearch';
  extraFilter?: (row: T) => boolean;
  searchLabel?: string;
  /** Filter by `searchText` but leave the input to the page (it writes the same `q` param). */
  hideSearchInput?: boolean;
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
  extraFilter,
  searchLabel = 'Hledat',
  hideSearchInput = false,
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
  const [draft, setDraft] = useDebouncedInput(query, (v) => update({ q: v || null, page: null }));

  const sortParam = params.get(key('sort'));
  const sorting = useMemo<SortingState>(() => {
    if (sortParam === null) return defaultSort ? [defaultSort] : [];
    const id = sortParam.replace(/^-/, '');
    const columnIds = new Set(columns.map((c) => c.id ?? ('accessorKey' in c ? String(c.accessorKey) : '')));
    return sortParam && columnIds.has(id) ? [{ id, desc: sortParam.startsWith('-') }] : [];
  }, [sortParam, defaultSort, columns]);

  // TanStack Table returns non-memoizable functions; the React Compiler lint rule does not apply here.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getRowId,
    state: { sorting },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      const s = next[0];
      update({ sort: s ? `${s.desc ? '-' : ''}${s.id}` : '', page: null });
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableMultiSort: false,
  });

  const sortedRows = table.getSortedRowModel().rows;
  const rankById = useMemo(() => new Map(sortedRows.map((r, i) => [r.id, i + 1])), [sortedRows]);
  const needle = searchKey(query);
  const visibleRows = useMemo(
    () =>
      sortedRows.filter(
        (r) =>
          (!searchText || !needle || searchText(r.original).includes(needle)) &&
          (!extraFilter || extraFilter(r.original)),
      ),
    [sortedRows, searchText, needle, extraFilter],
  );
  const pageCount = Math.max(1, Math.ceil(visibleRows.length / pageSize));
  const requestedPage = Number.parseInt(params.get(key('page')) ?? '1', 10);
  const pageIndex = Math.min(Math.max(Number.isFinite(requestedPage) ? requestedPage : 1, 1), pageCount) - 1;
  const pageRows = visibleRows.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
  const setPage = (index: number) => update({ page: index > 0 ? String(index + 1) : null });
  const rankOf = (rowId: string, i: number) =>
    rank === 'beforeSearch' ? rankById.get(rowId) : pageIndex * pageSize + i + 1;

  const windowStart = Math.max(
    0,
    Math.min(pageIndex - Math.floor(displayedPages / 2), pageCount - displayedPages),
  );
  const pages = Array.from({ length: Math.min(displayedPages, pageCount) }, (_, i) => windowStart + i);
  const pageButton = 'min-w-8 px-2 py-1 hover:bg-secondary disabled:opacity-40';

  return (
    <div>
      {searchText && !hideSearchInput && (
        <div className="relative mb-2 max-w-[300px]">
          <input
            className="input pr-8"
            placeholder={searchPlaceholder}
            value={draft}
            aria-label={searchLabel}
            onChange={(e) => setDraft(e.target.value)}
          />
          {draft && (
            <button
              type="button"
              aria-label="Zrušit hledání"
              className="absolute top-1/2 right-2 -translate-y-1/2 text-gray-500"
              onClick={() => {
                setDraft('');
                update({ q: null, page: null });
              }}
            >
              ×
            </button>
          )}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="table-basic">
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {rank && <th className="px-2 py-2 text-right">#</th>}
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
                      className={alignClass[meta?.align ?? 'left']}
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
            {pageRows.map((row, i) => (
              <tr key={row.id}>
                {rank && <td className="text-right">{rankOf(row.id, i)}.</td>}
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className={alignClass[cell.column.columnDef.meta?.align ?? 'left']}>
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
            aria-label="První stránka"
            disabled={pageIndex === 0}
            onClick={() => setPage(0)}
          >
            «
          </button>
          <button
            type="button"
            className={pageButton}
            aria-label="Předchozí stránka"
            disabled={pageIndex === 0}
            onClick={() => setPage(pageIndex - 1)}
          >
            ‹
          </button>
          {pages.map((p) => (
            <button
              key={p}
              type="button"
              className={`${pageButton} ${p === pageIndex ? 'bg-primary text-white hover:bg-primary' : ''}`}
              aria-current={p === pageIndex ? 'page' : undefined}
              onClick={() => setPage(p)}
            >
              {p + 1}
            </button>
          ))}
          <button
            type="button"
            className={pageButton}
            aria-label="Další stránka"
            disabled={pageIndex >= pageCount - 1}
            onClick={() => setPage(pageIndex + 1)}
          >
            ›
          </button>
          <button
            type="button"
            className={pageButton}
            aria-label="Poslední stránka"
            disabled={pageIndex >= pageCount - 1}
            onClick={() => setPage(pageCount - 1)}
          >
            »
          </button>
        </nav>
      )}
    </div>
  );
}
