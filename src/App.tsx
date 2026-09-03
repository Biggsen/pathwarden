import { useEffect, useState } from "react";
import type { Path } from "./domain/path";
import { pathsFromEsccFeatureCollection } from "./escc/adapter";
import PathMap from "./components/PathMap";

function formatLength(metres?: number): string {
  if (metres == null) return "Unknown length";
  if (metres >= 1000) return `${(metres / 1000).toFixed(2)} km`;
  return `${Math.round(metres)} m`;
}

function formatType(type: Path["type"]): string {
  switch (type) {
    case "footpath":
      return "Footpath";
    case "bridleway":
      return "Bridleway";
    case "restricted_byway":
      return "Restricted byway";
    case "byway":
      return "Byway";
    default:
      return "Unknown";
  }
}

export default function App() {
  const [paths, setPaths] = useState<Path[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<Path | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPaths() {
      try {
        const response = await fetch("/samples/hellingly.geojson");
        if (!response.ok) {
          throw new Error(`Failed to load paths (${response.status})`);
        }
        const collection = (await response.json()) as GeoJSON.FeatureCollection;
        if (!cancelled) {
          setPaths(pathsFromEsccFeatureCollection(collection));
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Failed to load paths");
        }
      }
    }

    void loadPaths();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="relative flex h-full flex-col bg-slate-100 text-slate-900">
      <header className="z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Footpath Warden</h1>
          <p className="text-sm text-slate-500">Hellingly · map prototype</p>
        </div>
        <p className="text-sm text-slate-600">
          {paths.length > 0 ? `${paths.length} paths` : "Loading…"}
        </p>
      </header>

      <main className="relative min-h-0 flex-1">
        {loadError ? (
          <div className="flex h-full items-center justify-center p-6 text-center text-red-700">
            {loadError}
          </div>
        ) : paths.length === 0 ? (
          <div className="flex h-full items-center justify-center p-6 text-slate-500">
            Loading Hellingly paths…
          </div>
        ) : (
          <PathMap
            paths={paths}
            selectedPathId={selectedPath?.id ?? null}
            onSelectPath={setSelectedPath}
          />
        )}

        {selectedPath ? (
          <aside className="absolute inset-x-3 bottom-3 z-10 rounded-xl border border-slate-200 bg-white p-4 shadow-lg sm:inset-x-auto sm:right-3 sm:bottom-3 sm:w-80">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Path
            </p>
            <h2 className="mt-1 text-xl font-semibold">{selectedPath.pathCode}</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Name</dt>
                <dd className="text-right font-medium">{selectedPath.name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Type</dt>
                <dd className="text-right font-medium">
                  {formatType(selectedPath.type)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Length</dt>
                <dd className="text-right font-medium">
                  {formatLength(selectedPath.lengthMetres)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Parish</dt>
                <dd className="text-right font-medium">{selectedPath.parish}</dd>
              </div>
            </dl>
            <button
              type="button"
              className="mt-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={() => setSelectedPath(null)}
            >
              Close
            </button>
          </aside>
        ) : paths.length > 0 ? (
          <p className="pointer-events-none absolute inset-x-3 bottom-3 z-10 rounded-lg bg-white/90 px-3 py-2 text-center text-sm text-slate-600 shadow sm:inset-x-auto sm:left-3 sm:right-auto">
            Tap a path to see its code
          </p>
        ) : null}
      </main>

      <footer className="border-t border-slate-200 bg-white px-4 py-2 text-xs text-slate-500">
        Rights of Way data is provided for guidance and is not the legal Definitive
        Map. © East Sussex County Council / Open Government Licence.
      </footer>
    </div>
  );
}
