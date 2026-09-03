# Footpath Warden – Proof of Concept Specification

## 1. Project Overview

Build a mobile-friendly web application for volunteer Local Footpath Wardens responsible for inspecting public rights of way within an assigned parish.

The primary purpose of the application is to answer:

**Which paths in my parish have I inspected this year, and which still need to be inspected?**

The application should use official East Sussex County Council Public Rights of Way geographic data as the source for path geometry and path identifiers.

The POC should initially support a single parish, preferably **Hellingly**, but the architecture should allow other East Sussex parishes to be added later.

This is a tracking and inspection tool, not a replacement for the East Sussex County Council Rights of Way reporting system.

---

## 2. Core User

The initial user is a volunteer Local Footpath Warden.

A warden is assigned one or more parishes and is expected to walk and inspect each Public Right of Way within their area periodically, normally ensuring that the network is covered during the year.

The app should make it immediately clear:

- what paths exist within the parish;
- which have been inspected;
- when they were inspected;
- which remain outstanding;
- whether an issue was encountered;
- overall annual inspection coverage.

---

## 3. POC Goals

The POC should demonstrate that:

1. ESCC Rights of Way data can be loaded into a modern web map.
2. Rights of Way can be filtered to a specific parish.
3. Individual paths can be uniquely identified.
4. Inspection status can be stored independently from the ESCC dataset.
5. Inspection progress can be visualised on the map.
6. A warden can quickly record an inspection from a mobile device.
7. Annual coverage can be calculated.

The POC does not need to cover every possible warden workflow.

---

## 4. Out of Scope

Do not initially build:

- direct submission of reports to ESCC;
- integration with ESCC user accounts;
- editing of official Rights of Way data;
- route planning/navigation;
- turn-by-turn directions;
- offline maps;
- complex organisational administration;
- automatic detection that a path has been walked;
- sophisticated GPS tracking;
- public-facing community features.

These can be considered later.

---

## 5. Data Source

Use East Sussex County Council Rights of Way Open Data as the authoritative geographic source.

ESCC exposes its Rights of Way network through a Web Feature Service (WFS).

The integration layer should be kept separate from the application domain so that the application is not tightly coupled to a particular WFS schema.

Create an adapter/service responsible for converting ESCC features into the application's internal `Path` model.

```text
ESCC WFS
    ↓
ESCC data adapter
    ↓
Internal Path model
    ↓
Application
```

The application should never modify the source Rights of Way data.

If direct browser access to the WFS is impractical because of CORS, output format, performance or authentication constraints, fetch/cache the data through the application backend.

---

## 6. Path Model

Create an internal representation approximately equivalent to:

```ts
interface Path {
  id: string;
  pathCode: string;
  parish: string;
  type: PathType;
  name?: string;
  geometry: GeoJSON.LineString | GeoJSON.MultiLineString;
  lengthMetres?: number;
}

type PathType =
  | "footpath"
  | "bridleway"
  | "restricted_byway"
  | "byway"
  | "unknown";
```

Do not assume the ESCC fields have these exact names.

The ESCC adapter should map the actual WFS attributes into this structure.

---

## 7. Inspection Model

Inspection records belong to this application.

```ts
interface Inspection {
  id: string;
  pathId: string;
  inspectedAt: string;
  condition: "clear" | "issue";
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
```

For the POC, one path can have multiple inspections over time.

The latest inspection for the selected inspection year determines the current map status.

---

## 8. Inspection Year

The application should operate around an inspection year.

Default:

```ts
inspectionYear = current calendar year;
```

A path is considered **covered** if it has at least one inspection during the selected year.

Historical years should eventually be selectable, although supporting only the current year is sufficient for the first POC.

---

## 9. Map

The primary interface should be a map.

Suggested map library:

- MapLibre GL JS

Alternative:

- Leaflet

Use an OpenStreetMap-compatible basemap.

The map should initially open centred on the selected parish.

Rights of Way should be rendered as interactive line features.

---

## 10. Path Status

Each path should have one calculated annual status:

```ts
type PathStatus =
  | "not_inspected"
  | "inspected"
  | "issue";
```

### Not inspected

No inspection exists during the selected year.

### Inspected

An inspection exists during the selected year and its condition is `clear`.

### Issue

The most recent inspection during the selected year has condition `issue`.

---

## 11. Map Styling

Use visually distinct styles for statuses.

```text
Grey       = not inspected
Green      = inspected
Amber/red  = issue
```

Exact colours are not important for the POC.

A small legend should explain the map.

Hover/tap behaviour should identify the path.

---

## 12. Path Interaction

Tapping/clicking a path should open a path details panel or bottom sheet.

Example:

```text
HEL/12/1

Footpath

Status
Not inspected in 2026

Last inspection
14 September 2025

[ Record inspection ]
```

If inspected:

```text
HEL/12/1

Footpath

2026 status
Inspected

Last inspection
18 June 2026

Condition
Clear

Notes
Vegetation slightly high near northern entrance.

[ Record new inspection ]
```

---

## 13. Record Inspection

The user should be able to select a path and choose **Record inspection**.

Display a simple form:

```text
Path
HEL/12/1

Date
[ today ]

Condition
○ Clear / no problem
○ Issue found

Notes
[ optional textarea ]

[ Save inspection ]
```

Today's date should be the default.

After saving:

- update the path status immediately;
- update dashboard statistics;
- update map styling;
- close or update the inspection panel.

---

## 14. Dashboard

Provide a compact parish summary.

```text
Hellingly

2026 inspection progress

43 / 87 paths inspected
49%

Network coverage
36.4 / 72.8 km
50%

Outstanding
44 paths

Issues
3
```

Both path count and distance are useful because path lengths can differ substantially.

---

## 15. Progress Metrics

Calculate:

```ts
totalPaths
inspectedPaths
outstandingPaths
issuePaths

totalLength
inspectedLength

pathCoveragePercentage
lengthCoveragePercentage
```

Definitions:

```ts
pathCoveragePercentage =
  inspectedPaths / totalPaths * 100;
```

```ts
lengthCoveragePercentage =
  inspectedLength / totalLength * 100;
```

Paths with an issue still count as inspected.

---

## 16. Outstanding Paths

Add an **Outstanding** view.

This should list paths that have not been inspected during the selected year.

```text
Outstanding — 44

HEL/4/2
Footpath
1.2 km

HEL/7/1
Footpath
620 m

HEL/11
Bridleway
2.4 km
```

Selecting an item should highlight/zoom to it on the map.

Useful sorting options later might include:

- path code;
- distance;
- nearest;
- area.

Only path-code sorting is required initially.

---

## 17. Issues

Add a simple list of paths where the latest inspection indicates an issue.

```text
Issues

HEL/23/2
Inspected 28 Aug 2026
Overgrown near western entrance

HEL/31
Inspected 3 Sep 2026
Broken stile
```

This is an internal warden note.

It must not imply that the issue has been formally reported to ESCC.

---

## 18. ESCC Reporting

Where appropriate, provide:

```text
Report to East Sussex County Council
```

This can simply open the official ESCC Rights of Way reporting map in a new tab.

Do not attempt API submission in the POC.

---

## 19. Application Layout

Design mobile-first.

Suggested desktop layout:

```text
┌──────────────────────────────────────────────┐
│ Footpath Warden              Hellingly ▾     │
├───────────────┬──────────────────────────────┤
│               │                              │
│ Progress      │                              │
│ 49%           │                              │
│               │            MAP               │
│ Inspected 43  │                              │
│ Outstanding44 │                              │
│ Issues 3      │                              │
│               │                              │
│ [Outstanding] │                              │
│ [Issues]      │                              │
│               │                              │
└───────────────┴──────────────────────────────┘
```

On mobile, the map should occupy most of the screen with information displayed using bottom sheets/drawers.

---

## 20. Parish Selection

The POC may hard-code:

```text
Hellingly
```

However, keep parish selection as an application concept.

Future users may be responsible for:

```text
Hellingly
Polegate
Eastbourne
etc.
```

Do not bake Hellingly-specific behaviour into components or the database.

---

## 21. Authentication

Authentication is optional for the earliest technical POC.

A simple development user is acceptable.

Architecture should nevertheless assume that inspection records eventually belong to a user.

```ts
interface User {
  id: string;
  name: string;
}

interface ParishAssignment {
  userId: string;
  parish: string;
}
```

---

## 22. Suggested Technology

Prefer a simple modern TypeScript stack.

```text
Frontend
React
TypeScript
Vite
Tailwind

Mapping
MapLibre GL JS

Backend/database
Supabase
PostgreSQL
PostGIS where useful

Geographic format
GeoJSON
```

Alternative backend technologies are acceptable if there is a strong reason.

Avoid unnecessary infrastructure.

---

## 23. Geographic Data Strategy

Do not query the entire ESCC dataset every time the application starts if this becomes expensive.

For the POC, investigate the WFS and determine whether filtering by parish is supported.

Ideal:

```text
ESCC WFS
     ↓
request Hellingly features
     ↓
convert to GeoJSON
     ↓
render
```

If the WFS is slow or awkward:

```text
ESCC WFS
     ↓
periodic import
     ↓
PostGIS / cached GeoJSON
     ↓
application
```

Because ESCC states that its downloadable Rights of Way data is updated approximately every six months, aggressive real-time synchronisation should not initially be necessary.

---

## 24. External Data Synchronisation

Keep official network data separate from inspection records.

```text
paths
-----
id
external_id
path_code
parish
type
geometry
length_metres
source_updated_at

inspections
-----------
id
path_id
user_id
inspected_at
condition
notes
created_at
updated_at
```

When official Rights of Way data is refreshed, inspection history must not be deleted.

---

## 25. Data Disclaimer

Display a small disclaimer:

> Rights of Way data is provided for guidance and is not the legal Definitive Map.

---

## 26. POC Phases

### Phase 1 — Data Investigation

Determine:

- ESCC WFS endpoint;
- WFS version;
- available layers;
- actual Rights of Way layer name;
- available fields;
- parish field;
- path identifier/path code;
- right-of-way type;
- geometry type;
- coordinate reference system;
- whether GeoJSON output is available;
- whether WFS filtering is supported;
- CORS behaviour.

Save a sample of Hellingly data locally.

**Do not build the full application until this is understood.**

### Phase 2 — Map Prototype

Display Hellingly Rights of Way on a map.

Requirements:

- all Hellingly paths visible;
- paths selectable;
- path code displayed;
- map fits parish bounds.

No database required yet.

### Phase 3 — Inspection Tracking

Add:

- database;
- inspection records;
- record-inspection form;
- path status;
- map colouring.

### Phase 4 — Dashboard

Add:

- inspected count;
- outstanding count;
- issues count;
- path coverage percentage;
- distance coverage percentage;
- outstanding list.

### Phase 5 — Field Usability

Test on mobile.

Improve:

- large tap targets;
- bottom-sheet interaction;
- location control;
- path selection;
- quick inspection recording.

---

## 27. Acceptance Criteria

The POC is successful when a user can:

1. Open the application.
2. See the Hellingly Rights of Way network.
3. Select an individual Right of Way.
4. See its path code and type.
5. Record that they inspected it.
6. Optionally record an issue and notes.
7. Immediately see its map status change.
8. See how many Hellingly paths have been inspected.
9. See how many remain outstanding.
10. Close and reopen the application without losing inspection records.

---

## 28. Important Design Principle

**The application is not primarily a map.**

The map is the interface for answering:

**"Have I covered my entire parish this year?"**

Every feature should support that objective.

Avoid adding generic mapping features unless they help a Footpath Warden plan, perform or record their inspections.

---

## 29. First Technical Task

Before building substantial UI, investigate the actual ESCC WFS schema and determine exactly what constitutes an individual path record.

Specifically:

- find and document the WFS endpoint;
- capture the `GetCapabilities` response;
- identify the Rights of Way feature type;
- inspect a small sample for Hellingly;
- document the real attribute names and geometry;
- determine whether one path code maps to one or multiple geographic features;
- only then implement the ESCC adapter and internal `Path` model.
