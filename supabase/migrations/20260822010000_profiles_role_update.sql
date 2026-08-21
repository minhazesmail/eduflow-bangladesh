-- Team role changes + profile self-update for EduFlow.
-- Root cause: public.profiles only had "users view own profile" (SELECT).
-- With RLS on and no UPDATE policy, Postgres denies all updates (fail closed).

create schema if not exists private;

-- Helpers used by other policies (idempotent).
create or replace function private.user_org_id()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select organization_id from public.profiles where id = auth.uid()
$$;

create or replace function private.user_role()
returns text
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select role from public.profiles where id = auth.uid()
$$;

revoke all on function private.user_org_id() from public, anon;
revoke all on function private.user_role() from public, anon;
grant execute on function private.user_org_id() to authenticated;
grant execute on function private.user_role() to authenticated;

-- Team page needs to list coworkers in the same organization.
drop policy if exists "org members view org profiles" on public.profiles;
create policy "org members view org profiles" on public.profiles
  for select to authenticated
  using (organization_id = private.user_org_id());

-- Keep own-profile select for bootstrap even if org helper is null.
drop policy if exists "users view own profile" on public.profiles;
create policy "users view own profile" on public.profiles
  for select to authenticated
  using (id = auth.uid());

-- Settings: users may update their own profile row (role locked by trigger).
drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and organization_id = private.user_org_id());

-- Owners may update non-owner teammates (role changes).
drop policy if exists "owners update teammate profiles" on public.profiles;
create policy "owners update teammate profiles" on public.profiles
  for update to authenticated
  using (
    organization_id = private.user_org_id()
    and private.user_role() = 'owner'
    and id <> auth.uid()
    and role is distinct from 'owner'
  )
  with check (
    organization_id = private.user_org_id()
    and private.user_role() = 'owner'
    and id <> auth.uid()
    and role in ('admin', 'teacher', 'staff')
  );

-- Trigger: block self role change, owner demotion, org moves, invalid roles.
create or replace function private.protect_profile_mutations()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.organization_id is distinct from old.organization_id then
      raise exception 'Cannot move a profile to another organization';
    end if;

    if new.role is distinct from old.role then
      if auth.uid() is null then
        raise exception 'Authentication required to change roles';
      end if;
      if new.id = auth.uid() then
        raise exception 'You cannot change your own role';
      end if;
      if private.user_role() is distinct from 'owner' then
        raise exception 'Only the organization owner can change team roles';
      end if;
      if old.role = 'owner' then
        raise exception 'Cannot change another owner''s role';
      end if;
      if new.role not in ('admin', 'teacher', 'staff') then
        raise exception 'Role must be admin, teacher, or staff';
      end if;
      if new.organization_id is distinct from private.user_org_id() then
        raise exception 'Member is not in your organization';
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_mutations on public.profiles;
create trigger protect_profile_mutations
  before update on public.profiles
  for each row
  execute function private.protect_profile_mutations();

-- Explicit RPC for the Team "Change role" UI (clear errors, audit-friendly).
create or replace function public.update_member_role(p_member_id uuid, p_role text)
returns public.profiles
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  caller_org uuid;
  caller_role text;
  target public.profiles;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_role is null or p_role not in ('admin', 'teacher', 'staff') then
    raise exception 'Role must be admin, teacher, or staff';
  end if;

  if p_member_id = auth.uid() then
    raise exception 'You cannot change your own role';
  end if;

  select organization_id, role into caller_org, caller_role
  from public.profiles
  where id = auth.uid();

  if caller_org is null then
    raise exception 'Your profile is not ready';
  end if;

  if caller_role is distinct from 'owner' then
    raise exception 'Only the organization owner can change team roles';
  end if;

  select * into target
  from public.profiles
  where id = p_member_id;

  if target is null then
    raise exception 'Member not found';
  end if;

  if target.organization_id is distinct from caller_org then
    raise exception 'Member is not in your organization';
  end if;

  if target.role = 'owner' then
    raise exception 'Cannot change another owner''s role';
  end if;

  update public.profiles
  set role = p_role
  where id = p_member_id
  returning * into target;

  return target;
end;
$$;

revoke all on function public.update_member_role(uuid, text) from public, anon;
grant execute on function public.update_member_role(uuid, text) to authenticated;
