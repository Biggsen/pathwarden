-- POC schema. Official Rights of Way geometry stays in ESCC / cached GeoJSON.
-- Auth is not required yet; a single seeded development profile is used.

create table if not exists profiles (
  id uuid primary key,
  display_name text,
  active_parish text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists parish_assignments (
  user_id uuid not null references profiles (id) on delete cascade,
  parish text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, parish)
);

create table if not exists inspections (
  id uuid primary key default gen_random_uuid(),
  path_id text not null,
  user_id uuid not null references profiles (id) on delete cascade,
  inspected_at date not null,
  condition text not null check (condition in ('clear', 'issue')),
  notes text,
  reported_to_escc boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists inspections_path_id_idx on inspections (path_id);
create index if not exists inspections_user_id_idx on inspections (user_id);
create index if not exists inspections_inspected_at_idx on inspections (inspected_at);
create index if not exists parish_assignments_user_id_idx on parish_assignments (user_id);

alter table profiles enable row level security;
alter table parish_assignments enable row level security;
alter table inspections enable row level security;

create policy "poc_profiles_all" on profiles
  for all using (true) with check (true);

create policy "poc_parish_assignments_all" on parish_assignments
  for all using (true) with check (true);

create policy "poc_inspections_all" on inspections
  for all using (true) with check (true);

insert into profiles (id, display_name, active_parish)
values (
  '11111111-1111-4111-8111-111111111111',
  'Dev warden',
  'Hellingly'
)
on conflict (id) do nothing;

insert into parish_assignments (user_id, parish)
values (
  '11111111-1111-4111-8111-111111111111',
  'Hellingly'
)
on conflict (user_id, parish) do nothing;
