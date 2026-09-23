import { useMemo, useState } from "react";

interface ParishPickerProps {
  catalog: string[];
  owned: string[];
  catalogLoading: boolean;
  catalogError: string | null;
  onToggleOwned: (parish: string, owned: boolean) => void;
}

export default function ParishPicker({
  catalog,
  owned,
  catalogLoading,
  catalogError,
  onToggleOwned,
}: ParishPickerProps) {
  const [query, setQuery] = useState("");
  const lastOwned = owned.length <= 1;

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const names = catalog.length > 0 ? catalog : owned;
    if (!needle) return names;
    return names.filter((name) => name.toLowerCase().includes(needle));
  }, [catalog, owned, query]);

  return (
    <div className="max-h-80 overflow-y-auto pr-1">
      <label className="block text-sm">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Find a parish
        </span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Hailsham, Polegate…"
          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </label>

      {catalogLoading ? (
        <p className="mt-3 text-sm text-slate-500">Loading East Sussex parishes…</p>
      ) : catalogError ? (
        <p className="mt-3 text-sm text-red-700">{catalogError}</p>
      ) : (
        <ul className="mt-2 divide-y divide-slate-50">
          {matches.length === 0 ? (
            <li className="px-1 py-3 text-sm text-slate-500">No matching parish</li>
          ) : (
            matches.map((parish) => {
              const isOwned = owned.some(
                (name) => name.toLowerCase() === parish.toLowerCase(),
              );
              return (
                <li key={parish} className="flex items-center gap-3 py-2">
                  <span className="min-w-0 flex-1 text-sm font-medium text-slate-800">
                    {parish}
                  </span>
                  <label className="flex shrink-0 items-center gap-1.5 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={isOwned}
                      disabled={isOwned && lastOwned}
                      onChange={(event) => onToggleOwned(parish, event.target.checked)}
                    />
                    I am a warden of this parish
                  </label>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
