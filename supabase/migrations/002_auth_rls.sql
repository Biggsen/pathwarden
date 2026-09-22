-- Move off the POC seed user and lock tables to the signed-in warden.
-- Apply this on hosted (and local) before using a public anon key.

delete from parish_assignments
where user_id = '11111111-1111-4111-8111-111111111111';

delete from inspections
where user_id = '11111111-1111-4111-8111-111111111111';

delete from profiles
where id = '11111111-1111-4111-8111-111111111111';

alter table profiles
  drop constraint if exists profiles_id_fkey;

alter table profiles
  add constraint profiles_id_fkey
  foreign key (id) references auth.users (id) on delete cascade;

drop policy if exists "poc_profiles_all" on profiles;
drop policy if exists "poc_parish_assignments_all" on parish_assignments;
drop policy if exists "poc_inspections_all" on inspections;

create policy "wardens_own_profile"
  on profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "wardens_own_assignments"
  on parish_assignments for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "wardens_own_inspections"
  on inspections for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, active_parish)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    'Hellingly'
  )
  on conflict (id) do nothing;

  insert into public.parish_assignments (user_id, parish)
  values (new.id, 'Hellingly')
  on conflict (user_id, parish) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
