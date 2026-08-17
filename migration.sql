-- EduFlow database hardening / onboarding migration.
-- Run after the base EduFlow tables have been created.
-- Current production tenant isolation uses private.user_org_id().

create schema if not exists private;

create or replace function private.user_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id
  from public.profiles
  where id = auth.uid();
$$;

revoke all on function private.user_org_id() from public;
grant execute on function private.user_org_id() to authenticated;

-- Remove the old public-role and duplicate tenant policies.
drop policy if exists attendance_org on public.attendance;
drop policy if exists "org members manage attendance" on public.attendance;
drop policy if exists batches_org on public.batches;
drop policy if exists "org members manage batches" on public.batches;
drop policy if exists exams_org on public.exams;
drop policy if exists "org members manage exams" on public.exams;
drop policy if exists notices_org on public.notices;
drop policy if exists "org members manage notices" on public.notices;
drop policy if exists "org members manage payments" on public.payments;
drop policy if exists payments_org on public.payments;
drop policy if exists "org members manage results" on public.results;
drop policy if exists results_org on public.results;
drop policy if exists "org members manage students" on public.students;
drop policy if exists students_org on public.students;
drop policy if exists "org members manage teachers" on public.teachers;
drop policy if exists teachers_org on public.teachers;

create policy "authenticated org members manage attendance"
on public.attendance for all to authenticated
using (organization_id = private.user_org_id())
with check (organization_id = private.user_org_id());

create policy "authenticated org members manage batches"
on public.batches for all to authenticated
using (organization_id = private.user_org_id())
with check (organization_id = private.user_org_id());

create policy "authenticated org members manage exams"
on public.exams for all to authenticated
using (organization_id = private.user_org_id())
with check (organization_id = private.user_org_id());

create policy "authenticated org members manage notices"
on public.notices for all to authenticated
using (organization_id = private.user_org_id())
with check (organization_id = private.user_org_id());

create policy "authenticated org members manage payments"
on public.payments for all to authenticated
using (organization_id = private.user_org_id())
with check (organization_id = private.user_org_id());

create policy "authenticated org members manage results"
on public.results for all to authenticated
using (organization_id = private.user_org_id())
with check (organization_id = private.user_org_id());

create policy "authenticated org members manage students"
on public.students for all to authenticated
using (organization_id = private.user_org_id())
with check (organization_id = private.user_org_id());

create policy "authenticated org members manage teachers"
on public.teachers for all to authenticated
using (organization_id = private.user_org_id())
with check (organization_id = private.user_org_id());

-- Secure signup: create a workspace and owner profile inside the database.
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop function if exists private.handle_new_user();

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  org_id uuid;
  org_name text;
  full_name text;
begin
  full_name := nullif(trim(new.raw_user_meta_data ->> 'full_name'), '');
  org_name := nullif(trim(new.raw_user_meta_data ->> 'organization_name'), '');

  if full_name is null then
    full_name := split_part(coalesce(new.email, 'User'), '@', 1);
  end if;

  if org_name is null then
    org_name := full_name || '''s Coaching Center';
  end if;

  insert into public.organizations (name)
  values (org_name)
  returning id into org_id;

  insert into public.profiles (id, organization_id, full_name, role)
  values (new.id, org_id, full_name, 'owner');

  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure private.handle_new_user();

-- Profiles and organizations are managed by the onboarding trigger and workspace flows.
drop policy if exists organizations_insert on public.organizations;
drop policy if exists organizations_self on public.organizations;
drop policy if exists "org members can update organization" on public.organizations;
drop policy if exists "org members can view organization" on public.organizations;
drop policy if exists "authenticated org members view organization" on public.organizations;
drop policy if exists "authenticated org members update organization" on public.organizations;

drop policy if exists profiles_insert_self on public.profiles;
drop policy if exists profiles_self on public.profiles;
drop policy if exists profiles_update_self on public.profiles;
drop policy if exists "users can view own profile" on public.profiles;
drop policy if exists "users can update own profile" on public.profiles;

create policy "authenticated users view own profile"
on public.profiles for select to authenticated
using ((select auth.uid()) = id);

create policy "authenticated users update own profile"
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id and organization_id = private.user_org_id());

create policy "authenticated users view own organization"
on public.organizations for select to authenticated
using (id = private.user_org_id());

create policy "authenticated users update own organization"
on public.organizations for update to authenticated
using (id = private.user_org_id())
with check (id = private.user_org_id());

-- Prevent users from changing their tenant or privilege level through the Data API.
revoke update (organization_id, role) on public.profiles from authenticated;
