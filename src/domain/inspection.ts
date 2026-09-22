export type InspectionCondition = "clear" | "issue";

export interface Inspection {
  id: string;
  pathId: string;
  userId: string;
  inspectedAt: string;
  condition: InspectionCondition;
  notes?: string;
  /** Warden-marked only; not confirmation that ESCC received a report. */
  reportedToEscc?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PathStatus = "not_inspected" | "inspected" | "issue";

export const DEV_USER_ID = "dev-user";

export function currentInspectionYear(now = new Date()): number {
  return now.getFullYear();
}

export function inspectionYearOf(isoDate: string): number {
  return new Date(`${isoDate}T00:00:00`).getFullYear();
}

export function inspectionsInYear(
  inspections: Inspection[],
  year: number,
): Inspection[] {
  return inspections.filter(
    (inspection) => inspectionYearOf(inspection.inspectedAt) === year,
  );
}

export function latestInspection(
  inspections: Inspection[],
  year?: number,
): Inspection | undefined {
  const scoped =
    year == null ? inspections : inspectionsInYear(inspections, year);

  return [...scoped].sort((a, b) => {
    if (a.inspectedAt !== b.inspectedAt) {
      return a.inspectedAt < b.inspectedAt ? 1 : -1;
    }
    return a.createdAt < b.createdAt ? 1 : -1;
  })[0];
}

export function isReportedToEscc(inspection: Inspection): boolean {
  return inspection.condition === "issue" && inspection.reportedToEscc === true;
}

export function pathStatusForYear(
  inspections: Inspection[],
  year: number,
): PathStatus {
  const latest = latestInspection(inspections, year);
  if (!latest) return "not_inspected";
  return latest.condition === "issue" ? "issue" : "inspected";
}

export function statusByPathId(
  inspections: Inspection[],
  year: number,
): Map<string, PathStatus> {
  const grouped = new Map<string, Inspection[]>();
  for (const inspection of inspections) {
    const list = grouped.get(inspection.pathId) ?? [];
    list.push(inspection);
    grouped.set(inspection.pathId, list);
  }

  const statuses = new Map<string, PathStatus>();
  for (const [pathId, list] of grouped) {
    statuses.set(pathId, pathStatusForYear(list, year));
  }
  return statuses;
}
