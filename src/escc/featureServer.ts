import {
  pathNameBelongsToParish,
} from "./adapter";

export const ESCC_ROW_QUERY_URL =
  "https://services7.arcgis.com/US7sVCsS6jE1eTXo/arcgis/rest/services/ESCC_Rights_of_Way/FeatureServer/0/query";

const PAGE_SIZE = 2000;

function escapeSqlLiteral(value: string): string {
  return value.replaceAll("'", "''");
}

function parishCatalogName(pathName: string): string | null {
  const numbered = pathName.match(/^(.+?)\s+(\d+)([a-z])?$/i);
  if (!numbered) return null;
  const parish = numbered[1].trim();
  return parish.length > 0 ? parish : null;
}

async function queryJsonPages(
  extra: Record<string, string>,
): Promise<Record<string, unknown>[]> {
  const records: Record<string, unknown>[] = [];
  let offset = 0;

  while (true) {
    const params = new URLSearchParams({
      f: "json",
      returnGeometry: "false",
      resultRecordCount: String(PAGE_SIZE),
      resultOffset: String(offset),
      ...extra,
    });
    const response = await fetch(`${ESCC_ROW_QUERY_URL}?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`ESCC query failed (${response.status})`);
    }
    const payload = (await response.json()) as {
      features?: { attributes?: Record<string, unknown> }[];
      error?: { message?: string };
    };
    if (payload.error?.message) {
      throw new Error(payload.error.message);
    }
    const page = payload.features ?? [];
    for (const feature of page) {
      if (feature.attributes) records.push(feature.attributes);
    }
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return records;
}

async function queryGeoJsonPages(where: string): Promise<GeoJSON.Feature[]> {
  const features: GeoJSON.Feature[] = [];
  let offset = 0;

  while (true) {
    const params = new URLSearchParams({
      f: "geojson",
      where,
      outFields: "*",
      outSR: "4326",
      resultRecordCount: String(PAGE_SIZE),
      resultOffset: String(offset),
    });
    const response = await fetch(`${ESCC_ROW_QUERY_URL}?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`ESCC query failed (${response.status})`);
    }
    const payload = (await response.json()) as GeoJSON.FeatureCollection & {
      error?: { message?: string };
    };
    if (payload.error?.message) {
      throw new Error(payload.error.message);
    }
    const page = payload.features ?? [];
    features.push(...page);
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return features;
}

export async function fetchParishCatalog(): Promise<string[]> {
  const records = await queryJsonPages({
    where: "1=1",
    outFields: "Path_Name",
  });
  const names = new Set<string>();
  for (const record of records) {
    const pathName = String(record.Path_Name ?? "").trim();
    const parish = parishCatalogName(pathName);
    if (parish) names.add(parish);
  }
  return [...names].sort((a, b) => a.localeCompare(b, "en"));
}

export async function fetchParishPaths(
  parish: string,
): Promise<GeoJSON.FeatureCollection> {
  const where = `Path_Name LIKE '%${escapeSqlLiteral(parish)}%'`;
  const features = (await queryGeoJsonPages(where)).filter((feature) => {
    const pathName = String(
      (feature.properties as { Path_Name?: string } | null)?.Path_Name ?? "",
    );
    return pathNameBelongsToParish(pathName, parish);
  });
  return { type: "FeatureCollection", features };
}
