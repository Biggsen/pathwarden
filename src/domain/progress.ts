import type { Path } from "./path";
import type { Inspection, PathStatus } from "./inspection";
import { latestInspection, pathStatusForYear, statusByPathId } from "./inspection";

export interface ProgressMetrics {
  totalPaths: number;
  inspectedPaths: number;
  outstandingPaths: number;
  issuePaths: number;
  totalLength: number;
  inspectedLength: number;
  pathCoveragePercentage: number;
  lengthCoveragePercentage: number;
}

function lengthOf(path: Path): number {
  return path.lengthMetres ?? 0;
}

export function computeProgressMetrics(
  paths: Path[],
  inspections: Inspection[],
  year: number,
): ProgressMetrics {
  const statuses = statusByPathId(inspections, year);

  let inspectedPaths = 0;
  let outstandingPaths = 0;
  let issuePaths = 0;
  let totalLength = 0;
  let inspectedLength = 0;

  for (const path of paths) {
    const status: PathStatus = statuses.get(path.id) ?? "not_inspected";
    const metres = lengthOf(path);
    totalLength += metres;

    if (status === "not_inspected") {
      outstandingPaths += 1;
    } else {
      inspectedPaths += 1;
      inspectedLength += metres;
      if (status === "issue") issuePaths += 1;
    }
  }

  const totalPaths = paths.length;

  return {
    totalPaths,
    inspectedPaths,
    outstandingPaths,
    issuePaths,
    totalLength,
    inspectedLength,
    pathCoveragePercentage:
      totalPaths === 0 ? 0 : (inspectedPaths / totalPaths) * 100,
    lengthCoveragePercentage:
      totalLength === 0 ? 0 : (inspectedLength / totalLength) * 100,
  };
}

export function outstandingPaths(
  paths: Path[],
  inspections: Inspection[],
  year: number,
): Path[] {
  const byPath = new Map<string, Inspection[]>();
  for (const inspection of inspections) {
    const list = byPath.get(inspection.pathId) ?? [];
    list.push(inspection);
    byPath.set(inspection.pathId, list);
  }

  return paths
    .filter(
      (path) =>
        pathStatusForYear(byPath.get(path.id) ?? [], year) === "not_inspected",
    )
    .sort((a, b) => a.pathCode.localeCompare(b.pathCode, "en", { numeric: true }));
}

export interface PathIssue {
  path: Path;
  inspection: Inspection;
}

export function issuePaths(
  paths: Path[],
  inspections: Inspection[],
  year: number,
): PathIssue[] {
  const byPath = new Map<string, Inspection[]>();
  for (const inspection of inspections) {
    const list = byPath.get(inspection.pathId) ?? [];
    list.push(inspection);
    byPath.set(inspection.pathId, list);
  }

  const issues: PathIssue[] = [];
  for (const path of paths) {
    const latest = latestInspection(byPath.get(path.id) ?? [], year);
    if (latest?.condition === "issue") {
      issues.push({ path, inspection: latest });
    }
  }

  return issues.sort((a, b) =>
    a.path.pathCode.localeCompare(b.path.pathCode, "en", { numeric: true }),
  );
}

export function formatMetres(metres: number): string {
  if (metres >= 1000) return `${(metres / 1000).toFixed(1)} km`;
  return `${Math.round(metres)} m`;
}

export function formatKmPair(inspected: number, total: number): string {
  const toKm = (m: number) => (m / 1000).toFixed(1);
  return `${toKm(inspected)} / ${toKm(total)} km`;
}
