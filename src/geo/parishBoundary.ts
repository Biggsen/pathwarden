const ONS_PARISH_QUERY_URL =
  "https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/PARNCP_DEC_2025_EW_BGC/FeatureServer/0/query";

const EAST_SUSSEX_LADS = [
  "Eastbourne",
  "Hastings",
  "Lewes",
  "Rother",
  "Wealden",
];

function escapeSqlLiteral(value: string): string {
  return value.replaceAll("'", "''");
}

function ladClause(): string {
  return `LAD25NM IN (${EAST_SUSSEX_LADS.map((name) => `'${escapeSqlLiteral(name)}'`).join(",")})`;
}

export async function fetchParishBoundary(
  parish: string,
): Promise<GeoJSON.FeatureCollection | null> {
  const name = parish.trim();
  if (!name) return null;

  const where = `PARNCP25NM = '${escapeSqlLiteral(name)}' AND ${ladClause()}`;
  const params = new URLSearchParams({
    where,
    outFields: "PARNCP25CD,PARNCP25NM,LAD25NM",
    outSR: "4326",
    f: "geojson",
  });
  const response = await fetch(`${ONS_PARISH_QUERY_URL}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Parish boundary query failed (${response.status})`);
  }
  const collection = (await response.json()) as GeoJSON.FeatureCollection;
  if (!collection.features?.length) return null;
  return {
    type: "FeatureCollection",
    features: collection.features,
  };
}
