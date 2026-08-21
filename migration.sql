-- EduFlow compatibility hardening migration.
-- Fresh projects should run:
--   1. supabase/migrations/0001_base_schema.sql
--   2. migration.sql
--   3. supabase/migrations/0002_stabilization.sql
--   4. supabase/migrations/0003_functionality_hardening.sql
--
-- Existing installations can run this idempotently before the numbered migrations.

create schema if not exists private;

create or replace function private.user_org_id()
returns uuid language sql stable security definer set search_path = public
as $$ select organization_id from public.profiles where id = auth.uid(); $$;
revoke all on function private.user_org_id() from public, anon;
grant execute on function private.user_org_id() to authenticated;

create or replace function private.user_role()
returns text language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid(); $$;
revoke all on function private.user_role() from public, anon;
grant execute on function private.user_role() to authenticated;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.batches enable row level security;
alter table public.students enable row level security;
alter table public.attendance enable row level security;
alter table public.payments enable row level security;
alter table public.exams enable row level security;
alter table public.results enable row level security;
alter table public.teachers enable row level security;
alter table public.notices enable row level security;

drop policy if exists "users view own profile" on public.profiles;
create policy "users view own profile" on public.profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists "authenticated users view own organization" on public.organizations;
create policy "authenticated users view own organization" on public.organizations
  for select to authenticated using (id = private.user_org_id());

drop policy if exists "owner admin update own organization" on public.organizations;
create policy "owner admin update own organization" on public.organizations
  for update to authenticated
  using (id = private.user_org_id() and private.user_role() in ('owner','admin'))
  with check (id = private.user_org_id());

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
 create policy "attendance members read" on public.attendance
   for select to authenticated
   using (organization_id = private.user_org_id() and private.user_role() in ('owner','admin','teacher','staff'));
 create policy "owner admin staff insert attendance" on public.attendance
   for insert to authenticated
   with check (organization_id = private.user_org_id() and private.user_role() in ('owner','admin','staff'));
 create policy "owner admin staff update attendance" on public.attendance
   for update to authenticated
   using (organization_id = private.user_org_id() and private.user_role() in ('owner','admin','staff'))
   with check (organization_id = private.user_org_id() and private.user_role() in ('owner','admin','staff'));
 create policy "owner admin delete attendance" on public.attendance
   for delete to authenticated
   using (organization_id = private.user_org_id() and private.user_role() in ('owner','admin'));

-- Payments
 drop policy if exists "owner admin staff manage payments" on public.payments;
 create policy "payment members read" on public.payments
   for select to authenticated
   using (organization_id = private.user_org_id() and private.user_role() in ('owner','admin','staff'));
 create policy "owner admin staff insert payments" on public.payments
   for insert to authenticated
   with check (organization_id = private.user_org_id() and private.user_role() in ('owner','admin','staff'));
 create policy "owner admin update payments" on public.payments
   for update to authenticated
   using (organization_id = private.user_org_id() and private.user_role() in ('owner','admin'))
   with check (organization_id = private.user_org_id() and private.user_role() in ('owner','admin'));
 create policy "owner admin delete payments" on public.payments
   for delete to authenticated
   using (organization_id = private.user_org_id() and private.user_role() in ('owner','admin'));

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
 create policy "result members read" on public.results
   for select to authenticated
   using (organization_id = private.user_org_id() and private.user_role() in ('owner','admin','teacher','staff'));
 create policy "owner admin teacher insert results" on public.results
   for insert to authenticated
   with check (organization_id = private.user_org_id() and private.user_role() in ('owner','admin','teacher'));
 create policy "owner admin teacher update results" on public.results
   for update to authenticated
   using (organization_id = private.user_org_id() and private.user_role() in ('owner','admin','teacher'))
   with check (organization_id = private.user_org_id() and private.user_role() in ('owner','admin','teacher'));
 create policy "owner admin delete results" on public.results
   for delete to authenticated
   using (organization_id = private.user_org_id() and private.user_role() in ('owner','admin'));

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

-- Profile management
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
   using (auth.uid() = id)
   with check (auth.uid() = id and organization_id = private.user_org_id());

drop trigger if exists protect_profile_identity on public.profiles;
create or replace function private.protect_profile_identity()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() = old.id and new.role is distinct from old.role then raise exception 'You cannot change your own role'; end if;
  if auth.uid() = old.id and new.organization_id is distinct from old.organization_id then raise exception 'You cannot change your own organization'; end if;
  return new;
end;
$$;
create trigger protect_profile_identity before update on public.profiles for each row execute function private.protect_profile_identity();
revoke all on function private.protect_profile_identity() from public, anon, authenticated;

after policy placeholders are applied, keep the numbered migrations as the canonical upgrade path.

-- Required support tables.
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
alter table public.organization_invitations enable row level security;
drop policy if exists "owners view organization invitations" on public.organization_invitations;
drop policy if exists "owners insert organization invitations" on public.organization_invitations;
drop policy if exists "owners manage organization invitations" on public.organization_invitations;
create policy "owners view organization invitations" on public.organization_invitations for select to authenticated using (organization_id = private.user_org_id() and private.user_role() = 'owner');
create policy "owners insert organization invitations" on public.organization_invitations for insert to authenticated with check (organization_id = private.user_org_id() and private.user_role() = 'owner');
create policy "owners manage organization invitations" on public.organization_invitations for delete to authenticated using (organization_id = private.user_org_id() and private.user_role() = 'owner');

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
alter table public.audit_logs enable row level security;
drop policy if exists "org members view audit logs" on public.audit_logs;
drop policy if exists "org members insert own audit logs" on public.audit_logs;
create policy "org members view audit logs" on public.audit_logs for select to authenticated using (organization_id = private.user_org_id() and private.user_role() in ('owner','admin'));
create policy "org members insert own audit logs" on public.audit_logs for insert to authenticated with check (organization_id = private.user_org_id() and user_id = auth.uid());

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
drop policy if exists "owner update usage" on public.organization_usage;
create policy "org members view usage" on public.organization_usage for select to authenticated using (organization_id = private.user_org_id());
create policy "owner update usage" on public.organization_usage for update to authenticated using (organization_id = private.user_org_id() and private.user_role() = 'owner') with check (organization_id = private.user_org_id());

create or replace function private.update_org_student_count()
returns trigger language plpgsql security definer set search_path = pg_catalog, public
as $$
begin update public.organization_usage set student_count=(select count(*) from public.students where organization_id=coalesce(new.organization_id,old.organization_id)),updated_at=now() where organization_id=coalesce(new.organization_id,old.organization_id); return coalesce(new,old); end;
$$;
drop trigger if exists update_student_count on public.students;
create trigger update_student_count after insert or update or delete on public.students for each row execute function private.update_org_student_count();

create or replace function private.enforce_student_quota()
returns trigger language plpgsql security definer set search_path = pg_catalog, public
as $$
declare current_count integer; plan_limit integer; org_plan text;
begin select plan into org_plan from public.organization_usage where organization_id=new.organization_id; plan_limit:=case org_plan when 'pro' then 500 when 'enterprise' then 5000 else 50 end; select count(*) into current_count from public.students where organization_id=new.organization_id; if current_count>=plan_limit then raise exception 'Student quota exceeded for plan %. Current: %, Limit: %',coalesce(org_plan,'free'),current_count,plan_limit; end if; return new; end;
$$;
drop trigger if exists enforce_student_quota on public.students;
create trigger enforce_student_quota before insert on public.students for each row execute function private.enforce_student_quota();
revoke all on function private.update_org_student_count() from public, anon, authenticated;
revoke all on function private.enforce_student_quota() from public, anon, authenticated;

create index if not exists profiles_org_idx on public.profiles(organization_id);
create index if not exists students_org_idx on public.students(organization_id);
create index if not exists students_name_idx on public.students(organization_id,name);
create index if not exists batches_org_idx on public.batches(organization_id);
drop index if exists public.attendance_org_date_idx;
create index if not exists attendance_org_date_idx on public.attendance(organization_id,attendance_date desc);
create index if not exists payments_org_idx on public.payments(organization_id,created_at desc);
create index if not exists exams_org_idx on public.exams(organization_id,exam_date desc);
create index if not exists results_org_idx on public.results(organization_id);
create index if not exists teachers_org_idx on public.teachers(organization_id);
create index if not exists notices_org_idx on public.notices(organization_id,created_at desc);
