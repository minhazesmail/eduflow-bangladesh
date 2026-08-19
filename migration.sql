-- EduFlow Complete Database Hardening & Feature Migration
-- Run this after base tables have been created.
-- This migration adds: audit logging, usage quotas, billing, hardened RLS, and indexes.

create schema if not exists private;

-- Tenant Isolation Helpers
create or replace function private.user_org_id()
returns uuid
language sql stable security definer set search_path = public
as $$ select organization_id from public.profiles where id = auth.uid(); $$;
revoke all on function private.user_org_id() from public;
grant execute on function private.user_org_id() to authenticated;

create or replace function private.user_role()
returns text
language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid(); $$;
revoke all on function private.user_role() from public;
grant execute on function private.user_role() to authenticated;

-- Secure Onboarding Trigger
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop function if exists private.handle_new_user();

create function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  org_id uuid;
  org_name text;
  full_name text;
  invitation_id uuid;
  invitation_role text;
begin
  invitation_id := nullif(new.raw_user_meta_data ->> 'invitation_id', '')::uuid;

  if invitation_id is not null then
    select organization_id, role, coalesce(full_name, split_part(coalesce(new.email, 'User'), '@', 1))
    into org_id, invitation_role, full_name
    from public.organization_invitations
    where id = invitation_id and status in ('pending','sent') and lower(email) = lower(new.email)
    limit 1;

    if org_id is null then
      raise exception 'Invalid or expired organization invitation';
    end if;

    insert into public.profiles (id, organization_id, full_name, role)
    values (new.id, org_id, full_name, invitation_role);

    update public.organization_invitations
    set auth_user_id = new.id, status = 'accepted', accepted_at = now()
    where id = invitation_id;

    return new;
  end if;

  full_name := nullif(trim(new.raw_user_meta_data ->> 'full_name'), '');
  org_name := nullif(trim(new.raw_user_meta_data ->> 'organization_name'), '');
  if full_name is null then full_name := split_part(coalesce(new.email, 'User'), '@', 1); end if;
  if org_name is null then org_name := full_name || ' Coaching Center'; end if;

  insert into public.organizations (name) values (org_name) returning id into org_id;
  insert into public.profiles (id, organization_id, full_name, role)
  values (new.id, org_id, full_name, 'owner');

  -- Initialize usage record
  insert into public.organization_usage (organization_id, plan, student_count, storage_mb)
  values (org_id, 'free', 0, 0)
  on conflict (organization_id) do nothing;

  return new;
end;
$$;
revoke all on function private.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure private.handle_new_user();

-- Role Constraint
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('owner','admin','teacher','staff'));

-- Organizations RLS (was missing!)
alter table public.organizations enable row level security;

drop policy if exists "org members view organization" on public.organizations;
create policy "org members view organization" on public.organizations
  for select to authenticated
  using (id = private.user_org_id());

drop policy if exists "owner admin update organization" on public.organizations;
create policy "owner admin update organization" on public.organizations
  for update to authenticated
  using (id = private.user_org_id() and private.user_role() in ('owner','admin'))
  with check (id = private.user_org_id());

-- Resource Policies (hardened)
-- Students
drop policy if exists "owner admin manage students" on public.students;
drop policy if exists "teacher staff read students" on public.students;
create policy "owner admin manage students" on public.students
  for all to authenticated
  using (organization_id = private.user_org_id() and private.user_role() in ('owner','admin'))
  with check (organization_id = private.user_org_id() and private.user_role() in ('owner','admin'));
create policy "teacher staff read students" on public.students
  for select to authenticated
  using (organization_id = private.user_org_id() and private.user_role() in ('teacher','staff'));

-- Batches
drop policy if exists "owner admin manage batches" on public.batches;
drop policy if exists "teacher staff read batches" on public.batches;
create policy "owner admin manage batches" on public.batches
  for all to authenticated
  using (organization_id = private.user_org_id() and private.user_role() in ('owner','admin'))
  with check (organization_id = private.user_org_id() and private.user_role() in ('owner','admin'));
create policy "teacher staff read batches" on public.batches
  for select to authenticated
  using (organization_id = private.user_org_id() and private.user_role() in ('teacher','staff'));

-- Attendance
drop policy if exists "owner admin staff manage attendance" on public.attendance;
drop policy if exists "teacher read attendance" on public.attendance;
create policy "owner admin staff manage attendance" on public.attendance
  for all to authenticated
  using (organization_id = private.user_org_id() and private.user_role() in ('owner','admin','staff'))
  with check (organization_id = private.user_org_id() and private.user_role() in ('owner','admin','staff'));
create policy "teacher read attendance" on public.attendance
  for select to authenticated
  using (organization_id = private.user_org_id() and private.user_role() = 'teacher');

-- Payments
drop policy if exists "owner admin staff manage payments" on public.payments;
create policy "owner admin staff manage payments" on public.payments
  for all to authenticated
  using (organization_id = private.user_org_id() and private.user_role() in ('owner','admin','staff'))
  with check (organization_id = private.user_org_id() and private.user_role() in ('owner','admin','staff'));

-- Exams
drop policy if exists "owner admin manage exams" on public.exams;
drop policy if exists "teacher read exams" on public.exams;
create policy "owner admin manage exams" on public.exams
  for all to authenticated
  using (organization_id = private.user_org_id() and private.user_role() in ('owner','admin'))
  with check (organization_id = private.user_org_id() and private.user_role() in ('owner','admin'));
create policy "teacher read exams" on public.exams
  for select to authenticated
  using (organization_id = private.user_org_id() and private.user_role() = 'teacher');

-- Results
drop policy if exists "owner admin teacher manage results" on public.results;
drop policy if exists "staff read results" on public.results;
create policy "owner admin teacher manage results" on public.results
  for all to authenticated
  using (organization_id = private.user_org_id() and private.user_role() in ('owner','admin','teacher'))
  with check (organization_id = private.user_org_id() and private.user_role() in ('owner','admin','teacher'));
create policy "staff read results" on public.results
  for select to authenticated
  using (organization_id = private.user_org_id() and private.user_role() = 'staff');

-- Teachers
drop policy if exists "owner admin manage teachers" on public.teachers;
drop policy if exists "teacher staff read teachers" on public.teachers;
create policy "owner admin manage teachers" on public.teachers
  for all to authenticated
  using (organization_id = private.user_org_id() and private.user_role() in ('owner','admin'))
  with check (organization_id = private.user_org_id() and private.user_role() in ('owner','admin'));
create policy "teacher staff read teachers" on public.teachers
  for select to authenticated
  using (organization_id = private.user_org_id() and private.user_role() in ('teacher','staff'));

-- Notices
drop policy if exists "owner admin manage notices" on public.notices;
drop policy if exists "teacher staff read notices" on public.notices;
create policy "owner admin manage notices" on public.notices
  for all to authenticated
  using (organization_id = private.user_org_id() and private.user_role() in ('owner','admin'))
  with check (organization_id = private.user_org_id() and private.user_role() in ('owner','admin'));
create policy "teacher staff read notices" on public.notices
  for select to authenticated
  using (organization_id = private.user_org_id() and private.user_role() in ('teacher','staff'));

-- Team / Profiles
drop policy if exists "owner view member profiles" on public.profiles;
drop policy if exists "owner manage member profiles" on public.profiles;
drop policy if exists "users update own profile fields" on public.profiles;

create policy "owner view member profiles" on public.profiles
  for select to authenticated
  using (organization_id = private.user_org_id() and private.user_role() = 'owner');

create policy "owner manage member profiles" on public.profiles
  for update to authenticated
  using (organization_id = private.user_org_id() and private.user_role() = 'owner')
  with check (organization_id = private.user_org_id() and role in ('owner','admin','teacher','staff'));

create policy "users update own profile fields" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id and organization_id = private.user_org_id());

revoke update (organization_id, role) on public.profiles from authenticated;
grant update (role) on public.profiles to authenticated;

-- Prevent self-role and self-org changes
create or replace function private.protect_profile_identity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() = old.id and new.role is distinct from old.role then
    raise exception 'You cannot change your own role';
  end if;
  if auth.uid() = old.id and new.organization_id is distinct from old.organization_id then
    raise exception 'You cannot change your own organization';
  end if;
  return new;
end;
$$;
drop trigger if exists protect_profile_identity on public.profiles;
create trigger protect_profile_identity before update on public.profiles for each row execute function private.protect_profile_identity();
revoke all on function private.protect_profile_identity() from public, anon, authenticated;

-- Invitations (hardened)
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
drop policy if exists "owners insert organization invitations" on public.organization_invitations;
drop policy if exists "owners manage organization invitations" on public.organization_invitations;

create policy "owners view organization invitations" on public.organization_invitations
  for select to authenticated
  using (organization_id = private.user_org_id() and private.user_role() = 'owner');

create policy "owners insert organization invitations" on public.organization_invitations
  for insert to authenticated
  with check (organization_id = private.user_org_id() and private.user_role() = 'owner');

create policy "owners manage organization invitations" on public.organization_invitations
  for delete to authenticated
  using (organization_id = private.user_org_id() and private.user_role() = 'owner');

-- Audit Logs
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  metadata jsonb default '{}',
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_org_idx on public.audit_logs(organization_id, created_at desc);
create index if not exists audit_logs_action_idx on public.audit_logs(action, created_at desc);

alter table public.audit_logs enable row level security;

drop policy if exists "org members view audit logs" on public.audit_logs;
create policy "org members view audit logs" on public.audit_logs
  for select to authenticated
  using (organization_id = private.user_org_id() and private.user_role() in ('owner','admin'));

-- Organization Usage / Quotas
create table if not exists public.organization_usage (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free','pro','enterprise')),
  student_count integer not null default 0,
  storage_mb numeric(10,2) not null default 0,
  monthly_api_calls integer not null default 0,
  billing_email text,
  subscription_status text default 'active' check (subscription_status in ('active','past_due','cancelled','trialing')),
  subscription_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.organization_usage enable row level security;

drop policy if exists "org members view usage" on public.organization_usage;
create policy "org members view usage" on public.organization_usage
  for select to authenticated
  using (organization_id = private.user_org_id());

drop policy if exists "owner update usage" on public.organization_usage;
create policy "owner update usage" on public.organization_usage
  for update to authenticated
  using (organization_id = private.user_org_id() and private.user_role() = 'owner')
  with check (organization_id = private.user_org_id());

-- Usage trigger: auto-update student count
create or replace function private.update_org_student_count()
returns trigger language plpgsql security definer as $$
begin
  update public.organization_usage
  set student_count = (
    select count(*) from public.students where organization_id = coalesce(new.organization_id, old.organization_id)
  ),
  updated_at = now()
  where organization_id = coalesce(new.organization_id, old.organization_id);
  return coalesce(new, old);
end;
$$;

drop trigger if exists update_student_count on public.students;
create trigger update_student_count
  after insert or update or delete on public.students
  for each row execute function private.update_org_student_count();

-- Quota enforcement trigger
create or replace function private.enforce_student_quota()
returns trigger language plpgsql security definer as $$
declare
  current_count integer;
  plan_limit integer;
  org_plan text;
begin
  select plan into org_plan from public.organization_usage where organization_id = new.organization_id;

  plan_limit := case org_plan
    when 'pro' then 500
    when 'enterprise' then 5000
    else 50
  end;

  select count(*) into current_count from public.students where organization_id = new.organization_id;

  if current_count >= plan_limit then
    raise exception 'Student quota exceeded for plan %. Current: %, Limit: %', org_plan, current_count, plan_limit;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_student_quota on public.students;
create trigger enforce_student_quota
  before insert on public.students
  for each row execute function private.enforce_student_quota();

-- Indexes for Performance
create index if not exists students_org_idx on public.students(organization_id);
create index if not exists students_name_idx on public.students(organization_id, name);
create index if not exists batches_org_idx on public.batches(organization_id);
create index if not exists attendance_org_date_idx on public.attendance(organization_id, date desc);
create index if not exists payments_org_idx on public.payments(organization_id, created_at desc);
create index if not exists exams_org_idx on public.exams(organization_id, exam_date desc);
create index if not exists results_org_idx on public.results(organization_id);
create index if not exists teachers_org_idx on public.teachers(organization_id);
create index if not exists notices_org_idx on public.notices(organization_id, created_at desc);
create index if not exists profiles_org_idx on public.profiles(organization_id);
