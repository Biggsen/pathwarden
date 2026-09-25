import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import type { Path } from "../domain/path";
import type { PathStatus } from "../domain/inspection";
import { pathsToFeatureCollection } from "../escc/adapter";

const SOURCE_ID = "paths";
const LINE_LAYER_ID = "paths-line";
const DASHED_LAYER_ID = "paths-line-dashed";
const CASE_LAYER_ID = "paths-case";
const HIT_LAYER_ID = "paths-hit";
const LABEL_LAYER_ID = "paths-label";
const BOUNDARY_SOURCE_ID = "parish-boundary";
const BOUNDARY_FILL_ID = "parish-boundary-fill";
const BOUNDARY_LINE_ID = "parish-boundary-line";

const BASEMAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

const EMPTY_COLLECTION: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

function setBoundaryData(
  map: maplibregl.Map,
  data: GeoJSON.FeatureCollection | null,
): boolean {
  const source = map.getSource(BOUNDARY_SOURCE_ID) as
    | maplibregl.GeoJSONSource
    | undefined;
  if (!source) return false;
  source.setData(data ?? EMPTY_COLLECTION);
  return true;
}

/** ESCC-style path class colours; inspection uses opacity + an issue casing. */
const TYPE_COLOR_PAINT: maplibregl.ExpressionSpecification = [
  "case",
  ["boolean", ["feature-state", "selected"], false],
  "#111827",
  [
    "match",
    ["get", "type"],
    "footpath",
    "#c500ff",
    "licensed_footpath",
    "#d9a8ff",
    "restricted_byway",
    "#fa3411",
    "bridleway",
    "#38a800",
    "licensed_bridleway",
    "#7d9a6e",
    "byway",
    "#a87000",
    "licensed_cycleway",
    "#00c5ff",
    "#64748b",
  ],
];

const PATH_WIDTH = 3.5;

const LINE_WIDTH_PAINT: maplibregl.ExpressionSpecification = [
  "case",
  [
    "all",
    ["!", ["boolean", ["feature-state", "selected"], false]],
    ["==", ["get", "status"], "issue"],
  ],
  2,
  PATH_WIDTH,
];

const LINE_OPACITY_PAINT: maplibregl.ExpressionSpecification = [
  "case",
  ["boolean", ["feature-state", "selected"], false],
  1,
  ["match", ["get", "status"], "not_inspected", 0.42, 1],
];

const CASE_COLOR_PAINT: maplibregl.ExpressionSpecification = [
  "case",
  ["boolean", ["feature-state", "selected"], false],
  "#111827",
  ["match", ["get", "status"], "issue", "#c026d3", "#000000"],
];

const CASE_WIDTH_PAINT: maplibregl.ExpressionSpecification = [
  "case",
  ["==", ["get", "status"], "issue"],
  PATH_WIDTH,
  0,
];

const LICENSED_FILTER: maplibregl.FilterSpecification = [
  "in",
  ["get", "type"],
  ["literal", ["licensed_footpath", "licensed_bridleway", "licensed_cycleway"]],
];

const SOLID_FILTER: maplibregl.FilterSpecification = ["!", LICENSED_FILTER];

function boundsFromGeometry(
  geometry: GeoJSON.Geometry,
  bounds = new maplibregl.LngLatBounds(),
): maplibregl.LngLatBounds {
  if (geometry.type === "Point") {
    bounds.extend(geometry.coordinates as [number, number]);
  } else if (geometry.type === "MultiPoint" || geometry.type === "LineString") {
    for (const position of geometry.coordinates) {
      bounds.extend(position as [number, number]);
    }
  } else if (geometry.type === "MultiLineString" || geometry.type === "Polygon") {
    for (const ring of geometry.coordinates) {
      for (const position of ring) {
        bounds.extend(position as [number, number]);
      }
    }
  } else if (geometry.type === "MultiPolygon") {
    for (const polygon of geometry.coordinates) {
      for (const ring of polygon) {
        for (const position of ring) {
          bounds.extend(position as [number, number]);
        }
      }
    }
  }
  return bounds;
}

function boundsFromPaths(paths: Path[]): maplibregl.LngLatBounds | null {
  if (paths.length === 0) return null;
  const bounds = new maplibregl.LngLatBounds();
  for (const path of paths) {
    boundsFromGeometry(path.geometry, bounds);
  }
  return bounds.isEmpty() ? null : bounds;
}

function boundsFromCollection(
  collection: GeoJSON.FeatureCollection | null,
): maplibregl.LngLatBounds | null {
  if (!collection || collection.features.length === 0) return null;
  const bounds = new maplibregl.LngLatBounds();
  for (const feature of collection.features) {
    if (feature.geometry) boundsFromGeometry(feature.geometry, bounds);
  }
  return bounds.isEmpty() ? null : bounds;
}

function collectionWithStatus(
  paths: Path[],
  statuses: Map<string, PathStatus>,
): GeoJSON.FeatureCollection {
  const collection = pathsToFeatureCollection(paths);
  for (const feature of collection.features) {
    const id = String(feature.properties?.id ?? "");
    feature.properties = {
      ...feature.properties,
      status: statuses.get(id) ?? "not_inspected",
    };
  }
  return collection;
}

interface PathMapProps {
  paths: Path[];
  statuses: Map<string, PathStatus>;
  parishBoundary: GeoJSON.FeatureCollection | null;
  selectedPathId: string | null;
  focusPathId: string | null;
  focusNonce: number;
  onSelectPath: (path: Path | null) => void;
}

export default function PathMap({
  paths,
  statuses,
  parishBoundary,
  selectedPathId,
  focusPathId,
  focusNonce,
  onSelectPath,
}: PathMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const pathsRef = useRef(paths);
  const statusesRef = useRef(statuses);
  const boundaryRef = useRef(parishBoundary);
  const onSelectRef = useRef(onSelectPath);

  pathsRef.current = paths;
  statusesRef.current = statuses;
  boundaryRef.current = parishBoundary;
  onSelectRef.current = onSelectPath;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASEMAP_STYLE,
      center: [0.25, 50.89],
      zoom: 12,
      attributionControl: { compact: true },
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false,
      }),
      "top-right",
    );

    map.on("load", () => {
      map.addSource(BOUNDARY_SOURCE_ID, {
        type: "geojson",
        data: boundaryRef.current ?? EMPTY_COLLECTION,
      });

      map.addLayer({
        id: BOUNDARY_FILL_ID,
        type: "fill",
        source: BOUNDARY_SOURCE_ID,
        paint: {
          "fill-color": "#0f172a",
          "fill-opacity": 0.04,
        },
      });

      map.addLayer({
        id: BOUNDARY_LINE_ID,
        type: "line",
        source: BOUNDARY_SOURCE_ID,
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": "#334155",
          "line-width": 2,
          "line-opacity": 0.85,
          "line-dasharray": [1, 3],
        },
      });

      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: collectionWithStatus(pathsRef.current, statusesRef.current),
        promoteId: "id",
      });

      map.addLayer({
        id: HIT_LAYER_ID,
        type: "line",
        source: SOURCE_ID,
        paint: {
          "line-color": "#000000",
          "line-opacity": 0,
          "line-width": 14,
        },
      });

      map.addLayer({
        id: CASE_LAYER_ID,
        type: "line",
        source: SOURCE_ID,
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": CASE_COLOR_PAINT,
          "line-width": CASE_WIDTH_PAINT,
          "line-opacity": 0.9,
        },
      });

      map.addLayer({
        id: LINE_LAYER_ID,
        type: "line",
        source: SOURCE_ID,
        filter: SOLID_FILTER,
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": TYPE_COLOR_PAINT,
          "line-width": LINE_WIDTH_PAINT,
          "line-opacity": LINE_OPACITY_PAINT,
        },
      });

      map.addLayer({
        id: DASHED_LAYER_ID,
        type: "line",
        source: SOURCE_ID,
        filter: LICENSED_FILTER,
        layout: {
          "line-cap": "butt",
          "line-join": "round",
        },
        paint: {
          "line-color": TYPE_COLOR_PAINT,
          "line-width": LINE_WIDTH_PAINT,
          "line-opacity": LINE_OPACITY_PAINT,
          "line-dasharray": [2.2, 1.6],
        },
      });

      map.addLayer({
        id: LABEL_LAYER_ID,
        type: "symbol",
        source: SOURCE_ID,
        minzoom: 13,
        layout: {
          "symbol-placement": "line",
          "symbol-spacing": 360,
          "text-field": ["get", "pathCode"],
          "text-font": ["Noto Sans Regular"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 13, 10, 16, 12],
          "text-letter-spacing": 0.03,
          "text-max-angle": 28,
          "text-padding": 6,
          "text-offset": [0, 0.9],
          "text-keep-upright": true,
        },
        paint: {
          "text-color": "#111827",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.4,
          "text-halo-blur": 0.15,
        },
      });

      const bounds =
        boundsFromCollection(boundaryRef.current) ??
        boundsFromPaths(pathsRef.current);
      if (bounds) {
        map.fitBounds(bounds, { padding: 48, duration: 0 });
      }
    });

    map.on("click", HIT_LAYER_ID, (event) => {
      const feature = event.features?.[0];
      if (!feature) return;
      const id = String(feature.properties?.id ?? feature.id);
      const path = pathsRef.current.find((item) => item.id === id) ?? null;
      onSelectRef.current(path);
    });

    map.on("click", (event) => {
      const hits = map.queryRenderedFeatures(event.point, {
        layers: [HIT_LAYER_ID],
      });
      if (hits.length === 0) onSelectRef.current(null);
    });

    map.on("mouseenter", HIT_LAYER_ID, () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", HIT_LAYER_ID, () => {
      map.getCanvas().style.cursor = "";
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (!source) return;

    source.setData(collectionWithStatus(paths, statuses));
    setBoundaryData(map, parishBoundary);
    if (map.getLayer(CASE_LAYER_ID)) {
      map.setPaintProperty(CASE_LAYER_ID, "line-color", CASE_COLOR_PAINT);
      map.setPaintProperty(CASE_LAYER_ID, "line-width", CASE_WIDTH_PAINT);
    }
    if (map.getLayer(LINE_LAYER_ID)) {
      map.setPaintProperty(LINE_LAYER_ID, "line-color", TYPE_COLOR_PAINT);
      map.setPaintProperty(LINE_LAYER_ID, "line-width", LINE_WIDTH_PAINT);
      map.setPaintProperty(LINE_LAYER_ID, "line-opacity", LINE_OPACITY_PAINT);
    }
    if (map.getLayer(DASHED_LAYER_ID)) {
      map.setPaintProperty(DASHED_LAYER_ID, "line-color", TYPE_COLOR_PAINT);
      map.setPaintProperty(DASHED_LAYER_ID, "line-width", LINE_WIDTH_PAINT);
      map.setPaintProperty(DASHED_LAYER_ID, "line-opacity", LINE_OPACITY_PAINT);
    }
  }, [paths, statuses, parishBoundary]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (setBoundaryData(map, parishBoundary)) return;
    const onIdle = () => {
      if (setBoundaryData(map, parishBoundary)) {
        map.off("idle", onIdle);
      }
    };
    map.on("idle", onIdle);
    return () => {
      map.off("idle", onIdle);
    };
  }, [parishBoundary]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const bounds =
      boundsFromCollection(parishBoundary) ?? boundsFromPaths(paths);
    if (bounds) {
      map.fitBounds(bounds, { padding: 48, duration: 600 });
    }
  }, [paths, parishBoundary]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getSource(SOURCE_ID)) return;

    for (const path of paths) {
      map.setFeatureState(
        { source: SOURCE_ID, id: path.id },
        { selected: path.id === selectedPathId },
      );
    }
  }, [paths, selectedPathId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusPathId) return;

    const path = paths.find((item) => item.id === focusPathId);
    if (!path) return;

    const bounds = boundsFromPaths([path]);
    if (!bounds) return;

    map.fitBounds(bounds, { padding: 80, maxZoom: 16, duration: 600 });
  }, [focusPathId, focusNonce, paths]);

  return <div ref={containerRef} className="h-full w-full min-w-0 max-w-full overflow-hidden" />;
}
