begin;

create or replace function public.update_member_role(
  p_member_id uuid,
  p_role text
)
returns public.profiles
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_org uuid;
  v_actor_role text;
  v_target public.profiles;
  v_updated public.profiles;
begin
  if v_actor_id is null then
    raise exception 'Authentication required';
  end if;

  if p_role not in ('admin','teacher','staff') then
    raise exception 'Invalid team role';
  end if;

  select p.organization_id, p.role
    into v_actor_org, v_actor_role
  from public.profiles p
  where p.id = v_actor_id;

  if v_actor_org is null then
    raise exception 'Actor profile not found';
  end if;

  if v_actor_role <> 'owner' then
    raise exception 'Only the organization owner can change team roles';
  end if;

  if p_member_id = v_actor_id then
    raise exception 'You cannot change your own role';
  end if;

  select p.*
    into v_target
  from public.profiles p
  where p.id = p_member_id
    and p.organization_id = v_actor_org
  for update;

  if not found then
    raise exception 'Team member not found in your organization';
  end if;

  update public.profiles
  set role = p_role
  where id = p_member_id
    and organization_id = v_actor_org
  returning * into v_updated;

  insert into public.audit_logs (
    organization_id,
    user_id,
    action,
    metadata
  ) values (
    v_actor_org,
    v_actor_id,
    'member_role_changed',
    jsonb_build_object(
      'member_id', p_member_id,
      'previous_role', v_target.role,
      'new_role', p_role
    )
  );

  return v_updated;
end;
$$;

revoke all on function public.update_member_role(uuid, text) from public;
grant execute on function public.update_member_role(uuid, text) to authenticated;

drop policy if exists "authenticated users update own name" on public.profiles;
create policy "authenticated users update own profile details"
on public.profiles
for update
to authenticated
using (
  auth.uid() = id
)
with check (
  auth.uid() = id
  and organization_id = private.user_org_id()
  and role = private.user_role()
);

drop policy if exists "owner manage member profiles" on public.profiles;
create policy "owner manage member profiles"
on public.profiles
for update
to authenticated
using (
  organization_id = private.user_org_id()
  and private.user_role() = 'owner'
  and id <> auth.uid()
)
with check (
  organization_id = private.user_org_id()
  and role = any (array['owner','admin','teacher','staff'])
  and id <> auth.uid()
);

commit;
