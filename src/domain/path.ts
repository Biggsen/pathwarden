export type PathType =
  | "footpath"
  | "licensed_footpath"
  | "bridleway"
  | "licensed_bridleway"
  | "restricted_byway"
  | "byway"
  | "licensed_cycleway"
  | "unknown";

export const PATH_TYPE_STYLES: {
  type: PathType;
  label: string;
  colour: string;
  dashed?: boolean;
}[] = [
  { type: "footpath", label: "Footpath", colour: "#c500ff" },
  { type: "licensed_footpath", label: "Licensed Footpath", colour: "#d9a8ff", dashed: true },
  { type: "restricted_byway", label: "Restricted Byway", colour: "#fa3411" },
  { type: "bridleway", label: "Bridleway", colour: "#38a800" },
  { type: "licensed_bridleway", label: "Licensed Bridleway", colour: "#7d9a6e", dashed: true },
  { type: "byway", label: "Byway", colour: "#a87000" },
];

export function pathTypeLabel(type: PathType): string {
  return PATH_TYPE_STYLES.find((item) => item.type === type)?.label
    ?? (type === "licensed_cycleway" ? "Licensed Cycleway" : "Unknown");
}

export interface Path {
  id: string;
  pathCode: string;
  parish: string;
  type: PathType;
  name?: string;
  geometry: GeoJSON.LineString | GeoJSON.MultiLineString;
  lengthMetres?: number;
}
