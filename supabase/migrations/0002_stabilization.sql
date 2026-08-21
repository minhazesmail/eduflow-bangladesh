-- EduFlow stabilization migration for existing installations.

create schema if not exists private;

-- 1) Profiles must be readable by the signed-in user so bootstrap/login can load the profile.
drop policy if exists "users view own profile" on public.profiles;
create policy "users view own profile" on public.profiles
  for select to authenticated
  using (id = auth.uid());

-- 2) Fix the attendance index created with the old `date` column name.
drop index if exists public.attendance_org_date_idx;
drop index if exists public.attendance_org_date_idx_base;
create index if not exists attendance_org_date_idx
  on public.attendance(organization_id, attendance_date desc);

-- 3) Make the organization/profile relation explicit for safer joins and updates.
create index if not exists profiles_org_created_idx
  on public.profiles(organization_id, created_at desc);

-- 4) Ensure the invite table exists before the invitation-aware auth trigger is used.
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
