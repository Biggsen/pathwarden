import type { Path } from "../domain/path";
import { pathTypeLabel } from "../domain/path";
import type { Inspection, PathStatus } from "../domain/inspection";
import { isReportedToEscc } from "../domain/inspection";
import { ESCC_REPORTING_MAP_URL } from "../escc/reportingCodes";

function formatLength(metres?: number): string {
  if (metres == null) return "Unknown length";
  if (metres >= 1000) return `${(metres / 1000).toFixed(2)} km`;
  return `${Math.round(metres)} m`;
}

function formatDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function statusLabel(status: PathStatus, year: number): string {
  if (status === "not_inspected") return `Not inspected in ${year}`;
  if (status === "issue") return "Issue";
  return "Inspected";
}

interface PathDetailsProps {
  path: Path;
  year: number;
  status: PathStatus;
  latestThisYear?: Inspection;
  lastInspection?: Inspection;
  reporting?: boolean;
  onClose: () => void;
  onRecord: () => void;
  onEdit?: () => void;
  onMarkReported?: () => void;
}

export default function PathDetails({
  path,
  year,
  status,
  latestThisYear,
  lastInspection,
  reporting,
  onClose,
  onRecord,
  onEdit,
  onMarkReported,
}: PathDetailsProps) {
  const inspection = latestThisYear ?? lastInspection;
  const reported = latestThisYear ? isReportedToEscc(latestThisYear) : false;

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        Path
      </p>
      <div className="mt-1 flex items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">{path.pathCode}</h2>
        {reported ? (
          <span className="shrink-0 rounded-full bg-emerald-700 px-2 py-0.5 text-xs font-medium text-white">
            Reported
          </span>
        ) : null}
      </div>
      {path.name && path.name !== path.pathCode ? (
        <p className="mt-0.5 text-sm text-slate-600">{path.name}</p>
      ) : null}
      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">Type</dt>
          <dd className="text-right font-medium">{pathTypeLabel(path.type)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">{year} status</dt>
          <dd className="text-right font-medium">{statusLabel(status, year)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">Last inspection</dt>
          <dd className="text-right font-medium">
            {inspection ? formatDate(inspection.inspectedAt) : "None recorded"}
          </dd>
        </div>
        {latestThisYear ? (
          <>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Condition</dt>
              <dd className="text-right font-medium">
                {latestThisYear.condition === "issue" ? "Issue" : "Clear"}
              </dd>
            </div>
            {latestThisYear.notes ? (
              <div>
                <dt className="text-slate-500">Notes</dt>
                <dd className="mt-1 font-medium">{latestThisYear.notes}</dd>
              </div>
            ) : null}
          </>
        ) : null}
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">Length</dt>
          <dd className="text-right font-medium">{formatLength(path.lengthMetres)}</dd>
        </div>
      </dl>
      <div className="mt-4 flex flex-col gap-2">
        <div className="flex gap-2">
          <button
            type="button"
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={onClose}
          >
            Close
          </button>
          {onEdit ? (
            <button
              type="button"
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={onEdit}
            >
              Edit inspection
            </button>
          ) : (
            <button
              type="button"
              className="flex-1 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
              onClick={onRecord}
            >
              Record inspection
            </button>
          )}
        </div>
        {onEdit ? (
          <button
            type="button"
            className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
            onClick={onRecord}
          >
            Record new inspection
          </button>
        ) : null}
        {status === "issue" ? (
          <a
            href={ESCC_REPORTING_MAP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-center text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Report to East Sussex County Council
          </a>
        ) : null}
        {status === "issue" && !reported && onMarkReported ? (
          <button
            type="button"
            disabled={reporting}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60"
            onClick={onMarkReported}
          >
            Mark as reported
          </button>
        ) : null}
      </div>
      {status === "issue" ? (
        <p className="mt-2 text-xs text-slate-500">
          Opens the official map. Search for {path.pathCode}. This does not send a
          report from Pathwarden.
        </p>
      ) : null}
    </div>
  );
}
