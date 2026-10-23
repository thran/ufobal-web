import { Combobox, ComboboxInput, ComboboxOption, ComboboxOptions } from '@headlessui/react';
import { useMemo, useState } from 'react';
import type { PlayerVM } from '../../domain/graph';
import { searchKey } from '../../domain/text';

const MAX_OPTIONS = 20;

/** Autocomplete over players, matching nickname or full name without diacritics. */
export default function PlayerCombobox({
  players,
  value,
  onChange,
  label,
  exclude,
}: {
  players: PlayerVM[];
  value: PlayerVM | null;
  onChange: (p: PlayerVM | null) => void;
  label: string;
  exclude?: Set<number>;
}) {
  const [query, setQuery] = useState('');
  const options = useMemo(() => {
    const q = searchKey(query.trim());
    if (!q) return [];
    return players
      .filter((p) => !exclude?.has(p.pk) && (p.search.includes(q) || searchKey(p.full_name).includes(q)))
      .sort((a, b) => a.full_name.localeCompare(b.full_name, 'cs'))
      .slice(0, MAX_OPTIONS);
  }, [players, query, exclude]);

  return (
    <Combobox value={value} onChange={onChange} onClose={() => setQuery('')} immediate>
      <div className="relative">
        <ComboboxInput
          className="input"
          aria-label={label}
          placeholder="hledat hráče..."
          displayValue={(p: PlayerVM | null) => p?.full_name ?? ''}
          onChange={(e) => setQuery(e.target.value)}
        />
        {options.length > 0 && (
          <ComboboxOptions className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded border bg-white shadow">
            {options.map((p) => (
              <ComboboxOption
                key={p.pk}
                value={p}
                className="cursor-pointer px-3 py-1 data-[focus]:bg-gray-100"
              >
                {p.full_name}
              </ComboboxOption>
            ))}
          </ComboboxOptions>
        )}
      </div>
    </Combobox>
  );
}
