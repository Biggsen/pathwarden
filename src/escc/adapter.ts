import type { Path, PathType } from "../domain/path";

interface EsccProperties {
  OBJECTID?: number;
  GlobalID?: string;
  Path_Name?: string;
  StatusDescr?: string;
  Shape__Length?: number;
}

function mapPathType(status?: string): PathType {
  switch (status) {
    case "Footpath":
      return "footpath";
    case "Bridleway":
      return "bridleway";
    case "Restricted Byway":
      return "restricted_byway";
    case "BOAT":
      return "byway";
    default:
      return "unknown";
  }
}

/** "Hellingly 22a" → parish "Hellingly", number "22", letter "a" | undefined */
function parsePathName(pathName: string): {
  parish: string;
  number: string;
  letter?: string;
} {
  const match = pathName.match(/^(.+?)\s+(\d+)([a-z])?$/i);
  if (!match) {
    throw new Error(`Unrecognised Path_Name: ${pathName}`);
  }

  return {
    parish: match[1],
    number: match[2],
    letter: match[3]?.toLowerCase(),
  };
}

function parishAbbreviation(parish: string): string {
  return parish.replace(/\s+/g, "").slice(0, 3).toUpperCase();
}

/** Letter a or missing → 1, b → 2, ... */
function sectionFromLetter(letter?: string): number {
  if (!letter) return 1;
  return letter.charCodeAt(0) - "a".charCodeAt(0) + 1;
}

/** Derive reporting-map style codes: Hellingly 49 → HEL/49/1, Hellingly 13d → HEL/13/4 */
export function pathCodeFromPathName(pathName: string): string {
  const { parish, number, letter } = parsePathName(pathName);
  const abbrev = parishAbbreviation(parish);
  const section = sectionFromLetter(letter);
  return `${abbrev}/${number}/${section}`;
}

function isLineGeometry(
  geometry: GeoJSON.Geometry | null,
): geometry is GeoJSON.LineString | GeoJSON.MultiLineString {
  return geometry?.type === "LineString" || geometry?.type === "MultiLineString";
}

export function pathFromEsccFeature(
  feature: GeoJSON.Feature,
): Path | null {
  if (!isLineGeometry(feature.geometry)) return null;

  const props = (feature.properties ?? {}) as EsccProperties;
  const pathName = props.Path_Name?.trim();
  if (!pathName) return null;

  const { parish } = parsePathName(pathName);
  const id = props.GlobalID ?? String(props.OBJECTID ?? feature.id ?? pathName);

  return {
    id,
    pathCode: pathCodeFromPathName(pathName),
    parish,
    type: mapPathType(props.StatusDescr),
    name: pathName,
    geometry: feature.geometry,
    lengthMetres: props.Shape__Length,
  };
}

export function pathsFromEsccFeatureCollection(
  collection: GeoJSON.FeatureCollection,
): Path[] {
  const paths: Path[] = [];
  for (const feature of collection.features) {
    const path = pathFromEsccFeature(feature);
    if (path) paths.push(path);
  }
  return paths;
}

export function pathsToFeatureCollection(paths: Path[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: paths.map((path) => ({
      type: "Feature",
      id: path.id,
      properties: {
        id: path.id,
        pathCode: path.pathCode,
        parish: path.parish,
        type: path.type,
        name: path.name ?? null,
        lengthMetres: path.lengthMetres ?? null,
      },
      geometry: path.geometry,
    })),
  };
}
