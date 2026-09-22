-- Data API could not see these tables: the project was created with
-- "Automatically expose new tables" off, and the first migrations never
-- granted authenticated access. RLS still restricts rows to auth.uid().

grant usage on schema public to authenticated, service_role;

grant select, insert, update, delete on table public.profiles to authenticated, service_role;
grant select, insert, update, delete on table public.parish_assignments to authenticated, service_role;
grant select, insert, update, delete on table public.inspections to authenticated, service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated, service_role;

grant execute on function public.handle_new_user() to supabase_auth_admin, postgres;

insert into public.profiles (id, display_name, active_parish)
select
  id,
  coalesce(raw_user_meta_data->>'display_name', split_part(email, '@', 1), 'Warden'),
  'Hellingly'
from auth.users
on conflict (id) do nothing;

insert into public.parish_assignments (user_id, parish)
select id, 'Hellingly'
from auth.users
on conflict (user_id, parish) do nothing;
