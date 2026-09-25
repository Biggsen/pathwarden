import type { Path, PathType } from "../domain/path";
import { parishCode } from "./parishCodes";
import { REPORTING_CODE_BY_PATH_NAME } from "./reportingCodes";

interface EsccProperties {
  OBJECTID?: number;
  GlobalID?: string;
  Path_Name?: string;
  StatusDescr?: string;
  Shape__Length?: number;
}

function mapPathType(status?: string): PathType {
  switch (status?.trim().toLowerCase()) {
    case "footpath":
      return "footpath";
    case "licensed footpath":
    case "licenced footpath":
      return "licensed_footpath";
    case "bridleway":
      return "bridleway";
    case "licensed bridleway":
    case "licenced bridleway":
      return "licensed_bridleway";
    case "restricted byway":
      return "restricted_byway";
    case "boat":
      return "byway";
    case "licensed cycleway":
    case "licenced cycleway":
      return "licensed_cycleway";
    default:
      return "unknown";
  }
}

/** "Hellingly 22a" → parish "Hellingly", number "22", letter "a" | undefined */
export function parsePathName(pathName: string): {
  parish: string;
  number?: string;
  letter?: string;
} {
  const numbered = pathName.match(/^(.+?)\s+(\d+)([a-z])?$/i);
  if (numbered) {
    return {
      parish: numbered[1],
      number: numbered[2],
      letter: numbered[3]?.toLowerCase(),
    };
  }

  const named = pathName.match(/\s[–-]\s+(.+?)$/);
  if (named) {
    return {
      parish: named[1].replace(/\s+LB$/i, "").trim(),
    };
  }

  return { parish: pathName };
}

export function pathNameBelongsToParish(pathName: string, parish: string): boolean {
  const target = parish.trim().toLowerCase();
  if (!target) return false;
  if (parsePathName(pathName).parish.toLowerCase() === target) return true;
  return new RegExp(`\\b${escapeRegExp(parish.trim())}\\b`, "i").test(pathName);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parishAbbreviation(parish: string): string {
  return (
    parishCode(parish) ?? parish.replace(/\s+/g, "").slice(0, 3).toUpperCase()
  );
}

/** Letter a or missing → 1, b → 2, ... */
function sectionFromLetter(letter?: string): number {
  if (!letter) return 1;
  return letter.charCodeAt(0) - "a".charCodeAt(0) + 1;
}

/** Derive reporting-map codes: Hellingly 49 → HEL/49/1, Westham 12a → WSH/12/1 */
export function pathCodeFromPathName(pathName: string): string {
  const mapped = REPORTING_CODE_BY_PATH_NAME[pathName];
  if (mapped) return mapped;

  const parsed = parsePathName(pathName);
  if (!parsed.number) return pathName;
  const abbrev = parishAbbreviation(parsed.parish);
  const section = sectionFromLetter(parsed.letter);
  return `${abbrev}/${parsed.number}/${section}`;
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
