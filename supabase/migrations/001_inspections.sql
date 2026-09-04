-- Phase 3 inspection records.
-- Official Rights of Way geometry stays in the ESCC source / cached GeoJSON.
-- Inspections belong to a user so auth can be added later without a schema rewrite.

create table if not exists inspections (
  id uuid primary key default gen_random_uuid(),
  path_id text not null,
  user_id text not null,
  inspected_at date not null,
  condition text not null check (condition in ('clear', 'issue')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists inspections_path_id_idx on inspections (path_id);
create index if not exists inspections_user_id_idx on inspections (user_id);
create index if not exists inspections_inspected_at_idx on inspections (inspected_at);
