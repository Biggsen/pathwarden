import type { Path } from "../domain/path";
import { pathTypeLabel } from "../domain/path";
import type { PathIssue, ProgressMetrics } from "../domain/progress";
import { formatKmPair, formatMetres } from "../domain/progress";
import { isReportedToEscc } from "../domain/inspection";
import { ESCC_REPORTING_MAP_URL } from "../escc/reportingCodes";

function formatInspectedDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export type DashboardList = "outstanding" | "issues" | null;

interface DashboardProps {
  parish: string;
  year: number;
  metrics: ProgressMetrics;
  outstanding: Path[];
  issues: PathIssue[];
  openList: DashboardList;
  onToggleList: (list: Exclude<DashboardList, null>) => void;
  onSelectPath: (path: Path) => void;
}

export default function Dashboard({
  parish,
  year,
  metrics,
  outstanding,
  issues,
  openList,
  onToggleList,
  onSelectPath,
}: DashboardProps) {
  const listOpen = openList != null;

  return (
    <aside
      className={`flex w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg sm:w-80 ${
        listOpen ? "h-full min-h-0" : "h-auto max-h-full"
      }`}
    >
      <div className="shrink-0 border-b border-slate-100 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {parish}
            </p>
            <h2 className="mt-0.5 text-base font-semibold">
              {year} inspection progress
            </h2>
          </div>
          <span className="shrink-0 rounded-full bg-sky-50 px-3 py-1 text-xl font-semibold text-sky-700">
            {Math.round(metrics.pathCoveragePercentage)}%
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-sky-600"
            style={{ width: `${Math.min(100, metrics.pathCoveragePercentage)}%` }}
          />
        </div>
      </div>

      <div className="shrink-0 space-y-3 px-4 py-3 text-sm">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-slate-500">Paths</span>
          <span className="font-semibold">
            {metrics.inspectedPaths} / {metrics.totalPaths}
          </span>
        </div>

        <div className="flex items-baseline justify-between gap-2">
          <span className="text-slate-500">Network</span>
          <span className="font-semibold">
            {formatKmPair(metrics.inspectedLength, metrics.totalLength)}
          </span>
        </div>

        <dl className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
          <div>
            <dt className="text-slate-500">Outstanding</dt>
            <dd className="text-lg font-semibold">{metrics.outstandingPaths}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Issues</dt>
            <dd className="text-lg font-semibold">{metrics.issuePaths}</dd>
          </div>
        </dl>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            onClick={() => onToggleList("outstanding")}
          >
            {openList === "outstanding"
              ? "Hide outstanding"
              : `Outstanding — ${metrics.outstandingPaths}`}
          </button>
          <button
            type="button"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            onClick={() => onToggleList("issues")}
          >
            {openList === "issues"
              ? "Hide issues"
              : `Issues — ${metrics.issuePaths}`}
          </button>
        </div>
      </div>

      {openList === "outstanding" ? (
        <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-slate-100">
          {outstanding.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-slate-500">
              All paths inspected this year
            </li>
          ) : (
            outstanding.map((path) => (
              <li key={path.id}>
                <button
                  type="button"
                  className="flex w-full items-start justify-between gap-3 border-b border-slate-50 px-4 py-2 text-left hover:bg-slate-50"
                  onClick={() => onSelectPath(path)}
                >
                  <span>
                    <span className="block font-medium">{path.pathCode}</span>
                    <span className="text-xs text-slate-500">
                      {pathTypeLabel(path.type)}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-slate-600">
                    {formatMetres(path.lengthMetres ?? 0)}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}

      {openList === "issues" ? (
        <div className="flex min-h-0 flex-1 flex-col border-t border-slate-100">
          <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {issues.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-slate-500">
                No issues recorded this year
              </li>
            ) : (
              issues.map(({ path, inspection }) => (
                <li key={path.id}>
                  <button
                    type="button"
                    className="flex w-full flex-col gap-0.5 border-b border-slate-50 px-4 py-2 text-left hover:bg-slate-50"
                    onClick={() => onSelectPath(path)}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-medium">{path.pathCode}</span>
                      {isReportedToEscc(inspection) ? (
                        <span className="shrink-0 rounded-full bg-emerald-700 px-2 py-0.5 text-xs font-medium text-white">
                          Reported
                        </span>
                      ) : null}
                    </span>
                    <span className="text-xs text-slate-500">
                      Inspected {formatInspectedDate(inspection.inspectedAt)}
                    </span>
                    {inspection.notes ? (
                      <span className="text-sm text-slate-700">{inspection.notes}</span>
                    ) : null}
                  </button>
                </li>
              ))
            )}
          </ul>
          <div className="shrink-0 space-y-2 border-t border-slate-100 px-4 py-2">
            <a
              href={ESCC_REPORTING_MAP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-sm font-medium text-sky-800 underline underline-offset-2 hover:text-sky-950"
            >
              Report to East Sussex County Council
            </a>
            <p className="text-xs text-slate-500">
              Warden notes only — not a report to East Sussex County Council.
            </p>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
