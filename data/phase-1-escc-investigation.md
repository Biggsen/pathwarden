# Phase 1 — ESCC Rights of Way data investigation

Investigated 3 September 2026.

Official ESCC page: [About the online rights of way map](https://www.eastsussex.gov.uk/leisure-tourism/discover-east-sussex/rights-of-way/east-sussex/about-online-rights-of-way-map)

The page still talks about a Web Feature Service, but the linked dataset is now an ArcGIS Hub item, served as a **FeatureServer**, not a working OGC WFS.

## Endpoint

| Item | Value |
| --- | --- |
| Hub dataset | https://opendata-escc.hub.arcgis.com/datasets/ef5757546ab9487fb41d8d6848c7ba19_0/about |
| FeatureServer layer | https://services7.arcgis.com/US7sVCsS6jE1eTXo/arcgis/rest/services/ESCC_Rights_of_Way/FeatureServer/0 |
| Service name | `ESCC_Rights_of_Way` |
| Layer name | `ESCC_ROW_PROW` |
| Layer id | `0` |
| Licence | Open Government Licence |

Query example:

```text
.../FeatureServer/0/query?where=Path_Name LIKE 'Hellingly%'&outFields=*&outSR=4326&f=geojson
```

## WFS

| Check | Result |
| --- | --- |
| WFS version | Not available on the current service |
| `.../WFSServer?request=GetCapabilities` | HTTP 200 HTML page: `Invalid URL` |
| Historic GeoServer WFS (`inspire.misoportal.com/.../east_sussex_rights_of_way`) | Previously linked from ESCC pages; no longer advertised. Treat as dead. |

**GetCapabilities:** there is no OGC GetCapabilities document. The equivalent metadata is the FeatureServer layer JSON, saved as `samples/featureserver-layer.json`.

The integration adapter should target the FeatureServer REST API (or a cached extract from it), not a WFS client.

## Layers

Only one public layer:

- `ESCC_ROW_PROW` — county Rights of Way polylines

Types present in the layer (`StatusDescr`):

- Footpath
- Bridleway
- Restricted Byway
- BOAT (Byway Open to All Traffic)
- Licensed Footpath
- Licensed Bridleway
- Licensed Cycleway
- National Trail
- National Trail - Highway

Hellingly sample contains only **Footpath** and **Bridleway**.

## Fields

There is no dedicated parish field and no `HEL/12/1`-style path code.

| Source field | Maps to | Notes |
| --- | --- | --- |
| `GlobalID` | `Path.id` (recommended) | Stable GUID. Prefer this over `OBJECTID`. |
| `OBJECTID` | external integer id | System-maintained; can change if the service is republished. |
| `Path_Name` | `pathCode` + parish | e.g. `Hellingly 1`, `Hellingly 22a`. Display field. |
| `StatusDescr` | `type` | Alias is `Type`. |
| `Shape__Length` | `lengthMetres` | Metres in British National Grid. |
| `Shape` | `geometry` | Polyline. |

Parish must be derived from `Path_Name` (text before the path number).

The reporting map still uses codes such as `BEX/5/1`. Those codes are **not** in this open dataset.

## Geometry and CRS

| Item | Value |
| --- | --- |
| Native geometry | `esriGeometryPolyline` |
| Native CRS | EPSG:27700 (OSGB36 / British National Grid) |
| GeoJSON output | Supported (`f=geojson`) |
| Requested WGS84 | `outSR=4326` works |
| Hellingly geometries | 149 `LineString`, 3 `MultiLineString` |

`MultiLineString` examples: `Hellingly 5b` (4 parts), `Hellingly 18b`, `Hellingly 70`.

The internal `Path` model should accept both `LineString` and `MultiLineString`.

## Filtering

Attribute and spatial queries are supported (`supportsAdvancedQueries`, SQL `where`).

Parish filter that works:

```text
Path_Name LIKE 'Hellingly%'
```

Confirmed: 152 Hellingly features, 29 Polegate features.

County-wide: **8087** features. `maxRecordCount` is **2000**, so a full-county fetch needs pagination (`resultOffset` / `resultRecordCount`). A single-parish fetch does not.

`Path_Name LIKE 'HEL/%'` and `Path_Name LIKE 'HEL %'` return 0 rows.

## CORS

FeatureServer responses include `Access-Control-Allow-Origin: *`.

The browser can query this service directly for the POC. A backend cache is still useful for performance and for not depending on ArcGIS at runtime.

## Path identity

Question: does one path code map to one geographic feature?

**At `Path_Name` granularity: yes.** In Hellingly, 152 features and 152 unique `Path_Name` values. No duplicate names.

**At “path number” granularity: no.** Many legal routes are split into lettered sections, each a separate feature:

- 35 unlettered names (`Hellingly 1`, `Hellingly 12`)
- 117 lettered names (`Hellingly 22a` … `Hellingly 22h`)
- 39 stems have more than one section (e.g. path 22 has 8, path 43 has 8)

Recommendation for the POC: treat each `Path_Name` as one inspectable `Path`. Do not merge `22a`–`22h` into one inspection record unless a later product decision says otherwise. That matches how wardens already talk about sections.

Reporting-map path codes can be derived from `Path_Name`:

| Path_Name | pathCode |
| --- | --- |
| `Hellingly 49` | `HEL/49/1` |
| `Hellingly 22a` | `HEL/22/1` |
| `Hellingly 13d` | `HEL/13/4` |

Rule: parish abbreviation = first three letters of the parish name; section = `1` when unlettered or `a`, then `b`→`2`, `c`→`3`, etc.

Suggested mapping:

```text
id            = GlobalID
external_id   = GlobalID (or OBJECTID as a secondary key)
pathCode      = Path_Name          // "Hellingly 22a"
parish        = parsed prefix      // "Hellingly"
type          = map StatusDescr
geometry      = GeoJSON line(s)
lengthMetres  = Shape__Length
```

`StatusDescr` mapping:

| ESCC | Internal `PathType` |
| --- | --- |
| Footpath | `footpath` |
| Bridleway | `bridleway` |
| Restricted Byway | `restricted_byway` |
| BOAT | `byway` |
| Licensed * | keep as `unknown` or extend the union later |
| National Trail * | not a PRoW class; ignore or treat as `unknown` |

## Hellingly sample

Saved locally:

- `samples/hellingly.geojson` — 152 features, EPSG:4326
- `samples/hellingly-attributes.json` — attributes only
- `samples/featureserver-layer.json` — layer metadata

Sample totals:

- 152 paths (129 footpath, 23 bridleway)
- 47.31 km (`Shape__Length` sum)
- shortest 10.7 m, longest 1.35 km

Example feature:

```text
OBJECTID     4340
GlobalID     fe30de41-0ce2-44fb-ae01-a2882af5d532
Path_Name    Hellingly 1
StatusDescr  Footpath
length       355.9 m
geometry     LineString, 10 vertices
start        0.23572, 50.88550
```

Layer `dataLastEditDate`: 3 September 2026 12:46 UTC.

## Implications for later phases

1. Build an **ESCC FeatureServer adapter**, not a WFS adapter. Keep the adapter boundary so the app still talks to an internal `Path` model.
2. Parish filtering is possible without downloading the county.
3. Display `Hellingly 22a`, not `HEL/22/1`, unless we later invent a derived code.
4. Browser-direct GeoJSON is viable for Phase 2. Cache if the service is slow or the 2,000-feature cap becomes a problem.
5. Rights of Way data is guidance only, not the legal Definitive Map.

## Phase 1 checklist

- [x] Endpoint found
- [x] Service version / protocol documented (ArcGIS FeatureServer 12, not WFS)
- [x] Layers identified
- [x] Rights of Way feature type identified (`ESCC_ROW_PROW`)
- [x] Fields documented
- [x] Parish field: none; use `Path_Name` prefix
- [x] Path identifier documented (`Path_Name`, unique per feature)
- [x] Right-of-way type field documented (`StatusDescr`)
- [x] Geometry type documented
- [x] CRS documented (27700 native, 4326 on request)
- [x] GeoJSON output available
- [x] Filtering supported
- [x] CORS documented (`*`)
- [x] Hellingly sample saved
- [x] One path name = one feature; lettered sections are separate paths
