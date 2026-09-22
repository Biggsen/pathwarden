import { useEffect, useMemo, useState } from "react";
import type { Path } from "./domain/path";
import type { Inspection, InspectionCondition } from "./domain/inspection";
import {
  currentInspectionYear,
  latestInspection,
  pathStatusForYear,
  statusByPathId,
} from "./domain/inspection";
import {
  computeProgressMetrics,
  outstandingPaths as listOutstandingPaths,
  issuePaths as listIssuePaths,
} from "./domain/progress";
import { pathsFromEsccFeatureCollection } from "./escc/adapter";
import { fetchParishCatalog, fetchParishPaths } from "./escc/featureServer";
import { fetchParishBoundary } from "./geo/parishBoundary";
import { localInspectionStore } from "./storage/inspectionStore";
import {
  DEFAULT_PARISH,
  localParishStore,
} from "./storage/parishStore";
import PathMap from "./components/PathMap";
import PathDetails from "./components/PathDetails";
import InspectionForm from "./components/InspectionForm";
import MapLegend from "./components/MapLegend";
import Dashboard from "./components/Dashboard";
import type { DashboardList } from "./components/Dashboard";
import ParishPicker from "./components/ParishPicker";

export default function App() {
  const year = currentInspectionYear();
  const initialAssignment = localParishStore.read();
  const [ownedParishes, setOwnedParishes] = useState(initialAssignment.owned);
  const [activeParish, setActiveParish] = useState(initialAssignment.active);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [catalog, setCatalog] = useState<string[]>(
    () => localParishStore.readCatalog() ?? [],
  );
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [paths, setPaths] = useState<Path[]>([]);
  const [parishBoundary, setParishBoundary] =
    useState<GeoJSON.FeatureCollection | null>(null);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pathsLoading, setPathsLoading] = useState(true);
  const [selectedPath, setSelectedPath] = useState<Path | null>(null);
  const [focusPathId, setFocusPathId] = useState<string | null>(null);
  const [focusNonce, setFocusNonce] = useState(0);
  const [recording, setRecording] = useState(false);
  const [editingInspection, setEditingInspection] = useState<Inspection | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [dashboardList, setDashboardList] = useState<DashboardList>(null);
  const [showDashboard, setShowDashboard] = useState(true);

  const statuses = useMemo(
    () => statusByPathId(inspections, year),
    [inspections, year],
  );

  const metrics = useMemo(
    () => computeProgressMetrics(paths, inspections, year),
    [paths, inspections, year],
  );

  const outstanding = useMemo(
    () => listOutstandingPaths(paths, inspections, year),
    [paths, inspections, year],
  );

  const issues = useMemo(
    () => listIssuePaths(paths, inspections, year),
    [paths, inspections, year],
  );

  const parish = activeParish;

  useEffect(() => {
    let cancelled = false;
    void localInspectionStore.list().then((stored) => {
      if (!cancelled) setInspections(stored);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadSampleFallback(): Promise<{
      paths: Path[];
      boundary: GeoJSON.FeatureCollection | null;
    }> {
      const [pathResponse, boundaryResponse] = await Promise.all([
        fetch("/samples/hellingly.geojson"),
        fetch("/samples/hellingly-parish-boundary.geojson"),
      ]);
      if (!pathResponse.ok) {
        throw new Error(`Failed to load paths (${pathResponse.status})`);
      }
      const collection = (await pathResponse.json()) as GeoJSON.FeatureCollection;
      const boundary = boundaryResponse.ok
        ? ((await boundaryResponse.json()) as GeoJSON.FeatureCollection)
        : null;
      return {
        paths: pathsFromEsccFeatureCollection(collection),
        boundary,
      };
    }

    async function load() {
      setPathsLoading(true);
      setLoadError(null);
      setSelectedPath(null);
      setRecording(false);
      setEditingInspection(null);
      setDashboardList(null);
      try {
        const [collection, liveBoundary] = await Promise.all([
          fetchParishPaths(activeParish),
          fetchParishBoundary(activeParish).catch(() => null),
        ]);
        let nextPaths = pathsFromEsccFeatureCollection(collection);
        let boundary = liveBoundary;
        if (
          activeParish.toLowerCase() === DEFAULT_PARISH.toLowerCase() &&
          nextPaths.length === 0
        ) {
          const fallback = await loadSampleFallback();
          nextPaths = fallback.paths;
          boundary = boundary ?? fallback.boundary;
        } else if (
          !boundary &&
          activeParish.toLowerCase() === DEFAULT_PARISH.toLowerCase()
        ) {
          const boundaryResponse = await fetch(
            "/samples/hellingly-parish-boundary.geojson",
          );
          boundary = boundaryResponse.ok
            ? ((await boundaryResponse.json()) as GeoJSON.FeatureCollection)
            : null;
        }
        if (!cancelled) {
          setPaths(nextPaths);
          setParishBoundary(boundary);
        }
      } catch (error) {
        if (activeParish.toLowerCase() === DEFAULT_PARISH.toLowerCase()) {
          try {
            const fallback = await loadSampleFallback();
            if (!cancelled) {
              setPaths(fallback.paths);
              setParishBoundary(fallback.boundary);
              setLoadError(null);
              return;
            }
          } catch {
            // use outer error
          }
        }
        if (!cancelled) {
          setPaths([]);
          setParishBoundary(null);
          setLoadError(
            error instanceof Error ? error.message : "Failed to load paths",
          );
        }
      } finally {
        if (!cancelled) setPathsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [activeParish]);

  useEffect(() => {
    if (!pickerOpen || catalog.length > 0) return;
    let cancelled = false;
    setCatalogLoading(true);
    setCatalogError(null);
    void fetchParishCatalog()
      .then((parishes) => {
        if (cancelled) return;
        setCatalog(localParishStore.writeCatalog(parishes));
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setCatalogError(
          error instanceof Error
            ? error.message
            : "Could not load the parish list",
        );
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pickerOpen, catalog.length]);

  const selectedInspections = selectedPath
    ? inspections.filter((inspection) => inspection.pathId === selectedPath.id)
    : [];
  const selectedStatus = selectedPath
    ? pathStatusForYear(selectedInspections, year)
    : "not_inspected";
  const latestThisYear = latestInspection(selectedInspections, year);
  const lastInspection = latestInspection(selectedInspections);

  const formOpen = recording || editingInspection != null;

  async function saveInspection(input: {
    id?: string;
    inspectedAt: string;
    condition: InspectionCondition;
    notes?: string;
    reportedToEscc?: boolean;
  }) {
    if (!selectedPath) return;
    setSaving(true);
    try {
      const inspectionId = input.id ?? editingInspection?.id;
      const reportedToEscc =
        input.condition === "issue" && input.reportedToEscc === true;
      if (inspectionId) {
        const updated = await localInspectionStore.update(inspectionId, {
          pathId: selectedPath.id,
          inspectedAt: input.inspectedAt,
          condition: input.condition,
          notes: input.notes,
          reportedToEscc,
        });
        setInspections((current) =>
          current.map((inspection) =>
            inspection.id === updated.id ? updated : inspection,
          ),
        );
      } else {
        const created = await localInspectionStore.create({
          pathId: selectedPath.id,
          inspectedAt: input.inspectedAt,
          condition: input.condition,
          notes: input.notes,
          reportedToEscc,
        });
        setInspections((current) => [...current, created]);
      }
      setRecording(false);
      setEditingInspection(null);
      setSelectedPath(null);
    } finally {
      setSaving(false);
    }
  }

  async function markReported() {
    if (!selectedPath || !latestThisYear) return;
    setSaving(true);
    try {
      const updated = await localInspectionStore.update(latestThisYear.id, {
        pathId: selectedPath.id,
        inspectedAt: latestThisYear.inspectedAt,
        condition: latestThisYear.condition,
        notes: latestThisYear.notes,
        reportedToEscc: true,
      });
      setInspections((current) =>
        current.map((inspection) =>
          inspection.id === updated.id ? updated : inspection,
        ),
      );
      if (editingInspection?.id === updated.id) {
        setEditingInspection(updated);
      }
    } finally {
      setSaving(false);
    }
  }

  function closeForm() {
    setRecording(false);
    setEditingInspection(null);
  }

  function selectPath(path: Path | null, options?: { focus?: boolean }) {
    if (formOpen) return;
    setSelectedPath(path);
    setRecording(false);
    setEditingInspection(null);
    if (path && options?.focus) {
      setFocusPathId(path.id);
      setFocusNonce((value) => value + 1);
    }
  }

  function switchParish(parishName: string) {
    const next = localParishStore.setActive(parishName);
    setOwnedParishes(next.owned);
    setActiveParish(next.active);
    setPickerOpen(false);
  }

  function toggleOwnedParish(parishName: string, owned: boolean) {
    const next = localParishStore.setOwned(parishName, owned);
    setOwnedParishes(next.owned);
    setActiveParish(next.active);
  }

  return (
    <div className="relative flex h-full flex-col bg-slate-100 text-slate-900">
      <header className="z-10 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Footpath Warden</h1>
          <button
            type="button"
            className="text-sm text-slate-500 hover:text-slate-800"
            onClick={() => setPickerOpen(true)}
            aria-label="Choose parish"
          >
            {parish} · {year} inspections
          </button>
        </div>
        <div className="flex items-center gap-2">
          {ownedParishes.length > 1 ? (
            <label>
              <span className="sr-only">Switch parish</span>
              <select
                className="max-w-32 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 sm:max-w-none"
                value={activeParish}
                onChange={(event) => switchParish(event.target.value)}
              >
                {ownedParishes.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {paths.length > 0 ? (
            <p className="hidden text-sm text-slate-600 sm:block">
              {Math.round(metrics.pathCoveragePercentage)}% covered
            </p>
          ) : null}
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={() => setShowDashboard((open) => !open)}
          >
            {showDashboard ? "Hide progress" : "Progress"}
          </button>
        </div>
      </header>

      <main className="relative min-h-0 flex-1">
        {loadError ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-red-700">{loadError}</p>
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={() => setPickerOpen(true)}
            >
              Choose another parish
            </button>
          </div>
        ) : pathsLoading && paths.length === 0 ? (
          <div className="flex h-full items-center justify-center p-6 text-slate-500">
            Loading {parish} paths…
          </div>
        ) : paths.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-slate-500">
            <p>No paths found for {parish}.</p>
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={() => setPickerOpen(true)}
            >
              Choose another parish
            </button>
          </div>
        ) : (
          <>
            <PathMap
              paths={paths}
              statuses={statuses}
              parishBoundary={parishBoundary}
              selectedPathId={selectedPath?.id ?? null}
              focusPathId={focusPathId}
              focusNonce={focusNonce}
              onSelectPath={(path) => selectPath(path)}
            />
            <MapLegend />

            {showDashboard ? (
              <div
                className={`absolute left-3 top-3 z-10 flex w-[calc(100%-1.5rem)] items-start sm:left-3 sm:top-14 sm:w-auto ${
                  dashboardList
                    ? "h-[calc(100%-1.5rem)] max-h-[calc(100%-1.5rem)] sm:h-[calc(100%-4.5rem)] sm:max-h-[calc(100%-4.5rem)]"
                    : ""
                }`}
              >
                <Dashboard
                  parish={parish}
                  year={year}
                  metrics={metrics}
                  outstanding={outstanding}
                  issues={issues}
                  openList={dashboardList}
                  onToggleList={(list) =>
                    setDashboardList((current) => (current === list ? null : list))
                  }
                  onSelectPath={(path) => {
                    selectPath(path, { focus: true });
                  }}
                />
              </div>
            ) : null}
          </>
        )}

        {selectedPath ? (
          <aside
            className="absolute inset-x-3 bottom-3 z-20 max-h-[70%] overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-lg sm:inset-x-auto sm:right-3 sm:bottom-3 sm:w-80"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          >
            {formOpen ? (
              <InspectionForm
                key={editingInspection?.id ?? "new"}
                pathCode={selectedPath.pathCode}
                saving={saving}
                initial={
                  editingInspection
                    ? {
                        id: editingInspection.id,
                        inspectedAt: editingInspection.inspectedAt,
                        condition: editingInspection.condition,
                        notes: editingInspection.notes,
                        reportedToEscc: editingInspection.reportedToEscc,
                      }
                    : undefined
                }
                onCancel={closeForm}
                onSave={saveInspection}
              />
            ) : (
              <PathDetails
                path={selectedPath}
                year={year}
                status={selectedStatus}
                latestThisYear={latestThisYear}
                lastInspection={lastInspection}
                reporting={saving}
                onClose={() => setSelectedPath(null)}
                onRecord={() => {
                  setEditingInspection(null);
                  setRecording(true);
                }}
                onMarkReported={() => {
                  void markReported();
                }}
                onEdit={
                  latestThisYear
                    ? () => {
                        setRecording(false);
                        setEditingInspection(latestThisYear);
                      }
                    : undefined
                }
              />
            )}
          </aside>
        ) : paths.length > 0 && !showDashboard ? (
          <p className="pointer-events-none absolute inset-x-3 bottom-3 z-10 rounded-lg bg-white/90 px-3 py-2 text-center text-sm text-slate-600 shadow sm:inset-x-auto sm:left-3 sm:right-auto">
            Tap a path to record an inspection
          </p>
        ) : null}
      </main>

      <footer className="border-t border-slate-200 bg-white px-4 py-2 text-xs text-slate-500">
        <p className="truncate sm:hidden">
          Guidance only — not the legal Definitive Map.
        </p>
        <p className="hidden sm:block">
          Rights of Way data is provided for guidance and is not the legal Definitive
          Map. Parish boundary © Office for National Statistics / Ordnance Survey
          (Open Government Licence). © East Sussex County Council / Open Government
          Licence.
        </p>
      </footer>

      {pathsLoading && paths.length > 0 ? (
        <p className="pointer-events-none absolute inset-x-0 top-16 z-20 text-center text-sm text-slate-600">
          <span className="rounded-full bg-white/90 px-3 py-1 shadow">
            Loading {parish}…
          </span>
        </p>
      ) : null}

      {pickerOpen ? (
        <ParishPicker
          catalog={catalog}
          owned={ownedParishes}
          active={activeParish}
          catalogLoading={catalogLoading}
          catalogError={catalogError}
          onClose={() => setPickerOpen(false)}
          onSwitch={switchParish}
          onToggleOwned={toggleOwnedParish}
        />
      ) : null}
    </div>
  );
}
