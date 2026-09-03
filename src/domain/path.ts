export type PathType =
  | "footpath"
  | "bridleway"
  | "restricted_byway"
  | "byway"
  | "unknown";

export interface Path {
  id: string;
  pathCode: string;
  parish: string;
  type: PathType;
  name?: string;
  geometry: GeoJSON.LineString | GeoJSON.MultiLineString;
  lengthMetres?: number;
}
