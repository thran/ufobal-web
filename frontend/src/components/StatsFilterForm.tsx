import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import {
  CATEGORY_LABELS,
  parseStatsFilter,
  statsFilterParams,
  type CategoryKey,
  type StatsFilter,
} from '../domain/stats';
import { useDebouncedInput } from '../hooks/useDebouncedInput';

const RESET_KEYS = {
  players: ['g', 'min', 'team', 'q'],
  tournaments: ['from', 'to', 'cat'],
} as const satisfies Record<string, readonly string[]>;
export type StatsFilterGroup = keyof typeof RESET_KEYS;

const PERSIST_MS = 24 * 60 * 60 * 1000;
const persistKey = (page: string) => `ufo:statsFilter:${page}`;

function loadPersisted(page: string): string | null {
  try {
    const raw = localStorage.getItem(persistKey(page));
    if (!raw) return null;
    const { at, search } = JSON.parse(raw) as { at: number; search: string };
    return Date.now() - at < PERSIST_MS && typeof search === 'string' ? search : null;
  } catch {
    return null;
  }
}

function savePersisted(page: string, search: string) {
  try {
    localStorage.setItem(persistKey(page), JSON.stringify({ at: Date.now(), search }));
  } catch {
    /* storage unavailable or full */
  }
}

/**
 * Stats filter stored in the URL; writes replace the history entry and reset pagination.
 * Filters and sort (not the page) are remembered for 24 hours and restored when the URL has none.
 */
export function useStatsFilter(
  page: 'players' | 'goalies',
): [StatsFilter, (patch: Partial<StatsFilter>) => void, (group: StatsFilterGroup) => void] {
  const [params, setParams] = useSearchParams();
  const [restore] = useState(() => (params.size ? null : loadPersisted(page)));
  // Not a layout effect: React Router ignores navigation before its own effects have run.
  useEffect(() => {
    if (restore) setParams(new URLSearchParams(restore), { replace: true });
  }, [restore, setParams]);
  const paramsKey = params.toString();
  const restoring = useRef(restore != null);
  useEffect(() => {
    // Skip the empty URL seen before the restore lands.
    if (restoring.current) {
      restoring.current = false;
      return;
    }
    const next = new URLSearchParams(paramsKey);
    next.delete('page');
    savePersisted(page, next.toString());
  }, [page, paramsKey]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const filter = useMemo(() => parseStatsFilter(params, new Date().getFullYear()), [paramsKey]);
  const set = useCallback(
    (patch: Partial<StatsFilter>) => {
      setParams(
        (prev) => {
          const current = parseStatsFilter(prev, new Date().getFullYear());
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(statsFilterParams({ ...current, ...patch }))) next.set(k, v);
          next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );
  const reset = useCallback(
    (group: StatsFilterGroup) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const k of RESET_KEYS[group]) next.delete(k);
          next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );
  return [filter, set, reset];
}

/** Player name search shared with DataTable through the `q` URL param. */
function useNameSearch() {
  const [params, setParams] = useSearchParams();
  return useDebouncedInput(params.get('q') ?? '', (v) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (v) next.set('q', v);
        else next.delete('q');
        next.delete('page');
        return next;
      },
      { replace: true },
    ),
  );
}

/** Empty clears the bound; non-numeric input leaves the filter unchanged. */
function yearPatch(v: string): number | null | undefined {
  if (v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
}

const CATEGORY_ORDER: CategoryKey[] = ['nizkov', 'brno', 'hala', 'liga', 'other'];

function CrossIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5" stroke="currentColor" strokeWidth={3.5} aria-hidden>
      <path d="M2 2l12 12M14 2L2 14" />
    </svg>
  );
}

const fieldsetClass = 'relative mb-4 border border-[#ddd] px-5 pt-2 pb-5';
const legendClass = 'bg-white px-1 font-bold';
const labelClass = 'block text-sm text-[#4d4d4d]';
const resetClass = 'absolute top-0 right-3 cursor-pointer p-1 text-gray-500 hover:text-black';

export default function StatsFilterForm({
  filter,
  onChange,
  onReset,
  showLiga,
  showMinMatches,
}: {
  filter: StatsFilter;
  onChange: (patch: Partial<StatsFilter>) => void;
  onReset: (group: StatsFilterGroup) => void;
  showLiga: boolean;
  showMinMatches: boolean;
}) {
  const [name, setName] = useNameSearch();
  const [team, setTeam] = useDebouncedInput(filter.team, (v) => onChange({ team: v }));
  const [minMatches, setMinMatches] = useDebouncedInput(String(filter.minMatches), (v) =>
    onChange({ minMatches: Math.max(0, Number(v) || 0) }),
  );
  const [yearFrom, setYearFrom] = useDebouncedInput(
    filter.yearFrom == null ? '' : String(filter.yearFrom),
    (v) => {
      const year = yearPatch(v);
      if (year !== undefined) onChange({ yearFrom: year });
    },
  );
  const [yearTo, setYearTo] = useDebouncedInput(filter.yearTo == null ? '' : String(filter.yearTo), (v) => {
    const year = yearPatch(v);
    if (year !== undefined) onChange({ yearTo: year });
  });
  const categories = CATEGORY_ORDER.filter((k) => k !== 'liga' || showLiga);

  return (
    <div className="gap-8 md:grid md:grid-cols-2">
      <fieldset className={fieldsetClass}>
        <legend className={legendClass}>Filtrování hráčů</legend>
        <button
          type="button"
          className={resetClass}
          aria-label="Zrušit filtrování hráčů"
          title="Zrušit filtrování hráčů"
          onClick={() => onReset('players')}
        >
          <CrossIcon />
        </button>
        <div className="absolute top-0.5 right-11 flex gap-3 text-sm">
          <label className="flex items-center gap-1">
            ♀
            <input
              type="checkbox"
              checked={filter.woman}
              onChange={() => onChange({ woman: !filter.woman })}
              aria-label="Ženy"
            />
          </label>
          <label className="flex items-center gap-1">
            ♂
            <input
              type="checkbox"
              checked={filter.man}
              onChange={() => onChange({ man: !filter.man })}
              aria-label="Muži"
            />
          </label>
        </div>
        <div className={`mt-5 grid gap-4 ${showMinMatches ? 'grid-cols-[3fr_3fr_2fr]' : 'grid-cols-2'}`}>
          <label className={labelClass}>
            Jméno hráče
            <input
              type="search"
              className="input"
              placeholder="jméno"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className={labelClass}>
            Jméno týmu
            <input
              type="search"
              className="input"
              placeholder="tým"
              value={team}
              onChange={(e) => setTeam(e.target.value)}
            />
          </label>
          {showMinMatches && (
            <label className={labelClass}>
              Zápasů
              <input
                type="number"
                min={0}
                className="input"
                value={minMatches}
                onChange={(e) => setMinMatches(e.target.value)}
              />
            </label>
          )}
        </div>
      </fieldset>
      <fieldset className={fieldsetClass}>
        <legend className={legendClass}>Filtrování turnajů</legend>
        <button
          type="button"
          className={resetClass}
          aria-label="Obnovit výchozí filtr turnajů"
          title="Obnovit výchozí filtr turnajů"
          onClick={() => onReset('tournaments')}
        >
          <CrossIcon />
        </button>
        <div className="mt-5 grid grid-cols-[1fr_1fr_2fr] items-start gap-4">
          <label className={labelClass}>
            od roku
            <input
              type="number"
              className="input"
              placeholder="rok"
              value={yearFrom}
              onChange={(e) => setYearFrom(e.target.value)}
            />
          </label>
          <label className={labelClass}>
            do roku
            <input
              type="number"
              className="input"
              placeholder="rok"
              value={yearTo}
              onChange={(e) => setYearTo(e.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-x-2 gap-y-1">
            {categories.map((k) => (
              <label key={k} className={`${labelClass} flex flex-col items-center`}>
                {CATEGORY_LABELS[k]}
                <input
                  type="checkbox"
                  checked={filter.categories[k]}
                  onChange={() =>
                    onChange({ categories: { ...filter.categories, [k]: !filter.categories[k] } })
                  }
                />
              </label>
            ))}
          </div>
        </div>
      </fieldset>
    </div>
  );
}
