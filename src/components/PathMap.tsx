import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import type { Path } from "../domain/path";
import type { PathStatus } from "../domain/inspection";
import { pathsToFeatureCollection } from "../escc/adapter";

const SOURCE_ID = "paths";
const LINE_LAYER_ID = "paths-line";
const HIT_LAYER_ID = "paths-hit";

const BASEMAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

function boundsFromPaths(paths: Path[]): maplibregl.LngLatBoundsLike | null {
  const bounds = new maplibregl.LngLatBounds();
  let hasPoint = false;

  for (const path of paths) {
    const rings =
      path.geometry.type === "LineString"
        ? [path.geometry.coordinates]
        : path.geometry.coordinates;

    for (const ring of rings) {
      for (const position of ring) {
        bounds.extend([position[0], position[1]]);
        hasPoint = true;
      }
    }
  }

  return hasPoint ? bounds : null;
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
  selectedPathId: string | null;
  onSelectPath: (path: Path | null) => void;
}

export default function PathMap({
  paths,
  statuses,
  selectedPathId,
  onSelectPath,
}: PathMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const pathsRef = useRef(paths);
  const statusesRef = useRef(statuses);
  const onSelectRef = useRef(onSelectPath);
  const fittedRef = useRef(false);

  pathsRef.current = paths;
  statusesRef.current = statuses;
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
        id: LINE_LAYER_ID,
        type: "line",
        source: SOURCE_ID,
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            "#1d4ed8",
            [
              "match",
              ["get", "status"],
              "inspected",
              "#16a34a",
              "issue",
              "#d97706",
              "#64748b",
            ],
          ],
          "line-width": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            5,
            3,
          ],
        },
      });

      const bounds = boundsFromPaths(pathsRef.current);
      if (bounds) {
        map.fitBounds(bounds, { padding: 48, duration: 0 });
        fittedRef.current = true;
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
      fittedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (!source) return;

    source.setData(collectionWithStatus(paths, statuses));

    if (!fittedRef.current) {
      const bounds = boundsFromPaths(paths);
      if (bounds) {
        map.fitBounds(bounds, { padding: 48, duration: 0 });
        fittedRef.current = true;
      }
    }
  }, [paths, statuses]);

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

  return <div ref={containerRef} className="h-full w-full" />;
}
