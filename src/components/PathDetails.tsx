import type { Path } from "../domain/path";
import type { Inspection, PathStatus } from "../domain/inspection";

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
  onClose: () => void;
  onRecord: () => void;
}

export default function PathDetails({
  path,
  year,
  status,
  latestThisYear,
  lastInspection,
  onClose,
  onRecord,
}: PathDetailsProps) {
  const inspection = latestThisYear ?? lastInspection;

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        Path
      </p>
      <h2 className="mt-1 text-xl font-semibold">{path.pathCode}</h2>
      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">Type</dt>
          <dd className="text-right font-medium">{formatType(path.type)}</dd>
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
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          onClick={onClose}
        >
          Close
        </button>
        <button
          type="button"
          className="flex-1 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
          onClick={onRecord}
        >
          {status === "not_inspected" ? "Record inspection" : "Record new inspection"}
        </button>
      </div>
    </div>
  );
}
