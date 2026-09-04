import { useEffect, useMemo, useState } from "react";
import type { Path } from "./domain/path";
import type { Inspection, InspectionCondition } from "./domain/inspection";
import {
  currentInspectionYear,
  latestInspection,
  pathStatusForYear,
  statusByPathId,
} from "./domain/inspection";
import { pathsFromEsccFeatureCollection } from "./escc/adapter";
import { localInspectionStore } from "./storage/inspectionStore";
import PathMap from "./components/PathMap";
import PathDetails from "./components/PathDetails";
import InspectionForm from "./components/InspectionForm";
import MapLegend from "./components/MapLegend";

export default function App() {
  const year = currentInspectionYear();
  const [paths, setPaths] = useState<Path[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<Path | null>(null);
  const [recording, setRecording] = useState(false);
  const [saving, setSaving] = useState(false);

  const statuses = useMemo(
    () => statusByPathId(inspections, year),
    [inspections, year],
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [pathResponse, stored] = await Promise.all([
          fetch("/samples/hellingly.geojson"),
          localInspectionStore.list(),
        ]);
        if (!pathResponse.ok) {
          throw new Error(`Failed to load paths (${pathResponse.status})`);
        }
        const collection = (await pathResponse.json()) as GeoJSON.FeatureCollection;
        if (!cancelled) {
          setPaths(pathsFromEsccFeatureCollection(collection));
          setInspections(stored);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Failed to load paths");
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedInspections = selectedPath
    ? inspections.filter((inspection) => inspection.pathId === selectedPath.id)
    : [];
  const selectedStatus = selectedPath
    ? pathStatusForYear(selectedInspections, year)
    : "not_inspected";

  async function saveInspection(input: {
    inspectedAt: string;
    condition: InspectionCondition;
    notes?: string;
  }) {
    if (!selectedPath) return;
    setSaving(true);
    try {
      const created = await localInspectionStore.create({
        pathId: selectedPath.id,
        inspectedAt: input.inspectedAt,
        condition: input.condition,
        notes: input.notes,
      });
      setInspections((current) => [...current, created]);
      setRecording(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative flex h-full flex-col bg-slate-100 text-slate-900">
      <header className="z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Footpath Warden</h1>
          <p className="text-sm text-slate-500">Hellingly · {year} inspections</p>
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
          <>
            <PathMap
              paths={paths}
              statuses={statuses}
              selectedPathId={selectedPath?.id ?? null}
              onSelectPath={(path) => {
                if (recording && path == null) return;
                setSelectedPath(path);
                setRecording(false);
              }}
            />
            <MapLegend />
          </>
        )}

        {selectedPath ? (
          <aside className="absolute inset-x-3 bottom-3 z-10 max-h-[70%] overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-lg sm:inset-x-auto sm:right-3 sm:bottom-3 sm:w-80">
            {recording ? (
              <InspectionForm
                pathCode={selectedPath.pathCode}
                saving={saving}
                onCancel={() => setRecording(false)}
                onSave={saveInspection}
              />
            ) : (
              <PathDetails
                path={selectedPath}
                year={year}
                status={selectedStatus}
                latestThisYear={latestInspection(selectedInspections, year)}
                lastInspection={latestInspection(selectedInspections)}
                onClose={() => setSelectedPath(null)}
                onRecord={() => setRecording(true)}
              />
            )}
          </aside>
        ) : paths.length > 0 ? (
          <p className="pointer-events-none absolute inset-x-3 bottom-3 z-10 rounded-lg bg-white/90 px-3 py-2 text-center text-sm text-slate-600 shadow sm:inset-x-auto sm:left-3 sm:right-auto">
            Tap a path to record an inspection
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
