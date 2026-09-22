import { useMemo, useState } from "react";

interface ParishPickerProps {
  catalog: string[];
  owned: string[];
  active: string;
  catalogLoading: boolean;
  catalogError: string | null;
  onClose: () => void;
  onSwitch: (parish: string) => void;
  onToggleOwned: (parish: string, owned: boolean) => void;
}

export default function ParishPicker({
  catalog,
  owned,
  active,
  catalogLoading,
  catalogError,
  onClose,
  onSwitch,
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
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/40 p-3 sm:items-center"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85%] w-full max-w-md flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
        role="dialog"
        aria-labelledby="parish-picker-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            <h2 id="parish-picker-title" className="text-base font-semibold">
              Parishes
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Switch between parishes you ward, or look up another.
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Your parishes
          </p>
          <ul className="mt-2 space-y-1">
            {owned.map((parish) => {
              const current = parish.toLowerCase() === active.toLowerCase();
              return (
                <li
                  key={parish}
                  className="flex items-center gap-2 rounded-lg border border-slate-100 px-2 py-1.5"
                >
                  <button
                    type="button"
                    className={`min-w-0 flex-1 rounded-md px-2 py-1.5 text-left text-sm font-medium ${
                      current
                        ? "bg-slate-900 text-white"
                        : "text-slate-800 hover:bg-slate-50"
                    }`}
                    onClick={() => onSwitch(parish)}
                  >
                    {parish}
                    {current ? " · current" : ""}
                  </button>
                  <label className="flex shrink-0 items-center gap-1.5 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked
                      disabled={lastOwned && current}
                      onChange={() => onToggleOwned(parish, false)}
                    />
                    Warden
                  </label>
                </li>
              );
            })}
          </ul>

          <label className="mt-5 block text-sm">
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
                          onChange={(event) =>
                            onToggleOwned(parish, event.target.checked)
                          }
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
      </div>
    </div>
  );
}
