-- EduFlow database hardening / onboarding migration.
-- Run after the base EduFlow tables have been created.
-- Current production tenant isolation uses private.user_org_id().

create schema if not exists private;

create or replace function private.user_org_id()
returns uuid
language sql stable security definer set search_path = public
as $$ select organization_id from public.profiles where id = auth.uid(); $$;
revoke all on function private.user_org_id() from public;
grant execute on function private.user_org_id() to authenticated;

-- Secure onboarding trigger.
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop function if exists private.handle_new_user();

create function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare org_id uuid; org_name text; full_name text; invitation_id uuid; invitation_role text;
begin
  invitation_id := nullif(new.raw_user_meta_data ->> 'invitation_id', '')::uuid;
  if invitation_id is not null then
    select organization_id, role, coalesce(full_name, split_part(coalesce(new.email, 'User'), '@', 1))
      into org_id, invitation_role, full_name
    from public.organization_invitations
    where id = invitation_id and status in ('pending','sent') and lower(email) = lower(new.email)
    limit 1;
    if org_id is null then raise exception 'Invalid or expired organization invitation'; end if;
    insert into public.profiles (id, organization_id, full_name, role)
    values (new.id, org_id, full_name, invitation_role);
    update public.organization_invitations set auth_user_id = new.id, status = 'accepted', accepted_at = now() where id = invitation_id;
    return new;
  end if;

  full_name := nullif(trim(new.raw_user_meta_data ->> 'full_name'), '');
  org_name := nullif(trim(new.raw_user_meta_data ->> 'organization_name'), '');
  if full_name is null then full_name := split_part(coalesce(new.email, 'User'), '@', 1); end if;
  if org_name is null then org_name := full_name || '''s Coaching Center'; end if;
  insert into public.organizations (name) values (org_name) returning id into org_id;
  insert into public.profiles (id, organization_id, full_name, role) values (new.id, org_id, full_name, 'owner');
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure private.handle_new_user();

-- Tenant policy baseline.
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

-- Role helpers.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('owner','admin','teacher','staff'));
create or replace function private.user_role() returns text language sql stable security definer set search_path = public as $$ select role from public.profiles where id = auth.uid(); $$;
revoke all on function private.user_role() from public;
grant execute on function private.user_role() to authenticated;

-- Role-based policies.
drop policy if exists "authenticated org members manage attendance" on public.attendance;
drop policy if exists "authenticated org members manage batches" on public.batches;
drop policy if exists "authenticated org members manage exams" on public.exams;
drop policy if exists "authenticated org members manage notices" on public.notices;
drop policy if exists "authenticated org members manage payments" on public.payments;
drop policy if exists "authenticated org members manage results" on public.results;
drop policy if exists "authenticated org members manage students" on public.students;
drop policy if exists "authenticated org members manage teachers" on public.teachers;
create policy "owner admin manage students" on public.students for all to authenticated using (organization_id = private.user_org_id() and private.user_role() in ('owner','admin')) with check (organization_id = private.user_org_id() and private.user_role() in ('owner','admin'));
create policy "teacher staff read students" on public.students for select to authenticated using (organization_id = private.user_org_id() and private.user_role() in ('teacher','staff'));
create policy "owner admin manage batches" on public.batches for all to authenticated using (organization_id = private.user_org_id() and private.user_role() in ('owner','admin')) with check (organization_id = private.user_org_id() and private.user_role() in ('owner','admin'));
create policy "teacher staff read batches" on public.batches for select to authenticated using (organization_id = private.user_org_id() and private.user_role() in ('teacher','staff'));
create policy "owner admin staff manage attendance" on public.attendance for all to authenticated using (organization_id = private.user_org_id() and private.user_role() in ('owner','admin','staff')) with check (organization_id = private.user_org_id() and private.user_role() in ('owner','admin','staff'));
create policy "teacher read attendance" on public.attendance for select to authenticated using (organization_id = private.user_org_id() and private.user_role() = 'teacher');
create policy "owner admin staff manage payments" on public.payments for all to authenticated using (organization_id = private.user_org_id() and private.user_role() in ('owner','admin','staff')) with check (organization_id = private.user_org_id() and private.user_role() in ('owner','admin','staff'));
create policy "owner admin manage exams" on public.exams for all to authenticated using (organization_id = private.user_org_id() and private.user_role() in ('owner','admin')) with check (organization_id = private.user_org_id() and private.user_role() in ('owner','admin'));
create policy "teacher read exams" on public.exams for select to authenticated using (organization_id = private.user_org_id() and private.user_role() = 'teacher');
create policy "owner admin teacher manage results" on public.results for all to authenticated using (organization_id = private.user_org_id() and private.user_role() in ('owner','admin','teacher')) with check (organization_id = private.user_org_id() and private.user_role() in ('owner','admin','teacher'));
create policy "staff read results" on public.results for select to authenticated using (organization_id = private.user_org_id() and private.user_role() = 'staff');
create policy "owner admin manage teachers" on public.teachers for all to authenticated using (organization_id = private.user_org_id() and private.user_role() in ('owner','admin')) with check (organization_id = private.user_org_id() and private.user_role() in ('owner','admin'));
create policy "teacher staff read teachers" on public.teachers for select to authenticated using (organization_id = private.user_org_id() and private.user_role() in ('teacher','staff'));
create policy "owner admin manage notices" on public.notices for all to authenticated using (organization_id = private.user_org_id() and private.user_role() in ('owner','admin')) with check (organization_id = private.user_org_id() and private.user_role() in ('owner','admin'));
create policy "teacher staff read notices" on public.notices for select to authenticated using (organization_id = private.user_org_id() and private.user_role() in ('teacher','staff'));

-- Team member access.
drop policy if exists "owner view member profiles" on public.profiles;
drop policy if exists "owner update member profiles" on public.profiles;
drop policy if exists "authenticated users update own profile" on public.profiles;
create policy "owner view member profiles" on public.profiles for select to authenticated using (organization_id = private.user_org_id() and private.user_role() = 'owner');
create policy "owner manage member profiles" on public.profiles for update to authenticated using (organization_id = private.user_org_id() and private.user_role() = 'owner') with check (organization_id = private.user_org_id() and role in ('owner','admin','teacher','staff'));
create policy "users update own profile fields" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id and organization_id = private.user_org_id());
revoke update (organization_id, role) on public.profiles from authenticated;
grant update (role) on public.profiles to authenticated;

create or replace function private.protect_profile_identity() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() = old.id and new.role is distinct from old.role then raise exception 'You cannot change your own role'; end if;
  if auth.uid() = old.id and new.organization_id is distinct from old.organization_id then raise exception 'You cannot change your own organization'; end if;
  return new;
end;
$$;
drop trigger if exists protect_profile_identity on public.profiles;
create trigger protect_profile_identity before update on public.profiles for each row execute function private.protect_profile_identity();
revoke all on function private.protect_profile_identity() from public, anon, authenticated;

-- Invitation records used by the owner-only Edge Function.
create table if not exists public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null check (role in ('admin','teacher','staff')),
  invited_by uuid not null references public.profiles(id),
  auth_user_id uuid,
  status text not null default 'pending' check (status in ('pending','sent','accepted','cancelled')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);
create index if not exists organization_invitations_org_idx on public.organization_invitations(organization_id);
create index if not exists organization_invitations_email_idx on public.organization_invitations(lower(email));
alter table public.organization_invitations enable row level security;
drop policy if exists "owners view organization invitations" on public.organization_invitations;
drop policy if exists "owners manage organization invitations" on public.organization_invitations;
create policy "owners view organization invitations" on public.organization_invitations for select to authenticated using (organization_id = private.user_org_id() and private.user_role() = 'owner');
create policy "owners manage organization invitations" on public.organization_invitations for delete to authenticated using (organization_id = private.user_org_id() and private.user_role() = 'owner');
