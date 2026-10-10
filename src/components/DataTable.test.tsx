import { createColumnHelper } from '@tanstack/react-table';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router';
import { expect, test } from 'vitest';
import { searchKey } from '../domain/text';
import { renderWithProviders } from '../test/utils';
import DataTable, { czechSort } from './DataTable';

interface Row {
  id: number;
  name: string;
  score: number;
}
const rows: Row[] = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  name: `Hráč ${i + 1}`,
  score: (i * 7) % 20,
}));
rows[0].name = 'Pépa';

const h = createColumnHelper<Row>();
const columns = [
  h.accessor('name', { header: 'Jméno', sortingFn: czechSort }),
  h.accessor('score', { header: 'Body', sortDescFirst: true, meta: { align: 'right' } }),
];

function Location() {
  const l = useLocation();
  return <div data-testid="loc">{l.search}</div>;
}

function setup(route = '/', extra: Partial<Parameters<typeof DataTable<Row>>[0]> = {}) {
  return renderWithProviders(
    <>
      <DataTable
        data={rows}
        columns={columns}
        getRowId={(r) => String(r.id)}
        searchText={(r) => searchKey(r.name)}
        {...extra}
      />
      <Location />
    </>,
    { route },
  );
}

const bodyRows = () => within(screen.getAllByRole('rowgroup')[1]).getAllByRole('row');

test('shows first page of 15 rows and pagination', () => {
  setup();
  expect(bodyRows()).toHaveLength(15);
  expect(screen.getByRole('navigation', { name: 'Stránkování' })).toBeInTheDocument();
});

test('page from URL, clamped when out of range', () => {
  setup('/?page=999');
  expect(bodyRows()).toHaveLength(5);
  expect(screen.getByRole('button', { name: '2' })).toHaveAttribute('aria-current', 'page');
});

test('clicking a desc-first header sorts desc and writes URL', async () => {
  setup();
  await userEvent.click(screen.getByRole('button', { name: /Body/ }));
  expect(screen.getByTestId('loc')).toHaveTextContent('sort=-score');
  expect(within(bodyRows()[0]).getAllByRole('cell')[1]).toHaveTextContent('19');
});

test('unknown sort param is ignored', () => {
  setup('/?sort=nonexistent');
  expect(within(bodyRows()[0]).getAllByRole('cell')[0]).toHaveTextContent('Pépa');
});

test('defaultSort applies when no sort param; empty param means natural order', () => {
  const { unmount } = setup('/', { defaultSort: { id: 'score', desc: true } });
  expect(within(bodyRows()[0]).getAllByRole('cell')[1]).toHaveTextContent('19');
  unmount();
  setup('/?sort=', { defaultSort: { id: 'score', desc: true } });
  expect(within(bodyRows()[0]).getAllByRole('cell')[0]).toHaveTextContent('Pépa');
});

test('search ignores diacritics, resets page, can be cleared', async () => {
  setup('/?page=2');
  await userEvent.type(screen.getByPlaceholderText('hledat...'), 'pepa');
  expect(bodyRows()).toHaveLength(1);
  expect(screen.getByTestId('loc')).not.toHaveTextContent('page=');
  await userEvent.click(screen.getByRole('button', { name: 'Zrušit hledání' }));
  expect(bodyRows()).toHaveLength(15);
});

test('url prefix isolates params', async () => {
  setup('/', { urlPrefix: 'p' });
  await userEvent.click(screen.getByRole('button', { name: /Body/ }));
  expect(screen.getByTestId('loc')).toHaveTextContent('psort=-score');
});

test('rank column numbers searched+sorted rows', async () => {
  setup('/?sort=-score', { rank: true });
  expect(within(bodyRows()[0]).getAllByRole('cell')[0]).toHaveTextContent('1.');
  await userEvent.click(screen.getByRole('button', { name: '2' }));
  expect(within(bodyRows()[0]).getAllByRole('cell')[0]).toHaveTextContent('16.');
});

test('no pagination when one page; no search box without searchText', () => {
  renderWithProviders(<DataTable data={rows.slice(0, 3)} columns={columns} getRowId={(r) => String(r.id)} />);
  expect(screen.queryByRole('navigation', { name: 'Stránkování' })).not.toBeInTheDocument();
  expect(screen.queryByPlaceholderText('hledat...')).not.toBeInTheDocument();
});
