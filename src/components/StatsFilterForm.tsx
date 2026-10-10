import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import {
  CATEGORY_LABELS,
  parseStatsFilter,
  STATS_PARAM_KEYS,
  statsFilterParams,
  type CategoryKey,
  type StatsFilter,
} from '../domain/stats';
import { useDebouncedInput } from '../hooks/useDebouncedInput';

/** Stats filter stored in the URL; writes replace the history entry and reset pagination. */
export function useStatsFilter(): [StatsFilter, (patch: Partial<StatsFilter>) => void, () => void] {
  const [params, setParams] = useSearchParams();
  const paramsKey = params.toString();
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
  const reset = useCallback(() => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const k of STATS_PARAM_KEYS) next.delete(k);
        next.delete('q');
        next.delete('page');
        return next;
      },
      { replace: true },
    );
  }, [setParams]);
  return [filter, set, reset];
}

/** Empty clears the bound; non-numeric input leaves the filter unchanged. */
function yearPatch(v: string): number | null | undefined {
  if (v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
}

const CATEGORY_ORDER: CategoryKey[] = ['nizkov', 'brno', 'hala', 'liga', 'other'];

export default function StatsFilterForm({
  filter,
  onChange,
  onReset,
  showLiga,
  showMinMatches,
}: {
  filter: StatsFilter;
  onChange: (patch: Partial<StatsFilter>) => void;
  onReset: () => void;
  showLiga: boolean;
  showMinMatches: boolean;
}) {
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

  return (
    <div className="mb-4 gap-4 md:grid md:grid-cols-2">
      <fieldset className="border p-3">
        <legend className="px-1">Filtrování hráčů</legend>
        <div className="flex flex-wrap items-center gap-3">
          <label>
            <input
              type="checkbox"
              checked={filter.man}
              onChange={() => onChange({ man: !filter.man })}
              aria-label="Muži"
            />
            ♂
          </label>
          <label>
            <input
              type="checkbox"
              checked={filter.woman}
              onChange={() => onChange({ woman: !filter.woman })}
              aria-label="Ženy"
            />
            ♀
          </label>
          <label className="flex items-center gap-2">
            Jméno týmu
            <input
              className="input"
              placeholder="tým"
              aria-label="Jméno týmu"
              value={team}
              onChange={(e) => setTeam(e.target.value)}
            />
          </label>
          {showMinMatches && (
            <label className="flex items-center gap-2">
              Zápasů
              <input
                type="number"
                min={0}
                className="input w-24"
                aria-label="Zápasů"
                value={minMatches}
                onChange={(e) => setMinMatches(e.target.value)}
              />
            </label>
          )}
        </div>
      </fieldset>
      <fieldset className="border p-3">
        <legend className="px-1">Filtrování turnajů</legend>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2">
            od roku
            <input
              type="number"
              className="input w-24"
              placeholder="rok"
              aria-label="od roku"
              value={yearFrom}
              onChange={(e) => setYearFrom(e.target.value)}
            />
          </label>
          <label className="flex items-center gap-2">
            do roku
            <input
              type="number"
              className="input w-24"
              placeholder="rok"
              aria-label="do roku"
              value={yearTo}
              onChange={(e) => setYearTo(e.target.value)}
            />
          </label>
          {CATEGORY_ORDER.filter((k) => k !== 'liga' || showLiga).map((k) => (
            <label key={k}>
              <input
                type="checkbox"
                checked={filter.categories[k]}
                onChange={() =>
                  onChange({ categories: { ...filter.categories, [k]: !filter.categories[k] } })
                }
              />{' '}
              {CATEGORY_LABELS[k]}
            </label>
          ))}
          <button
            type="button"
            className="btn btn-secondary"
            aria-label="Obnovit výchozí filtr"
            onClick={onReset}
          >
            ×
          </button>
        </div>
      </fieldset>
    </div>
  );
}
