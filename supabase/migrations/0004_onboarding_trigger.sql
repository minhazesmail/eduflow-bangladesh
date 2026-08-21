-- EduFlow auth onboarding trigger.
-- Runs after the support tables from migration.sql / 0003 exist.

create schema if not exists private;

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
  invitation_id uuid;
  invitation_role text;
begin
  invitation_id := nullif(new.raw_user_meta_data ->> 'invitation_id', '')::uuid;

  if invitation_id is not null then
    select organization_id, role,
           coalesce(full_name, split_part(coalesce(new.email, 'User'), '@', 1))
      into org_id, invitation_role, full_name
      from public.organization_invitations
     where id = invitation_id
       and status in ('pending','sent')
       and lower(email) = lower(new.email)
     limit 1;

    if org_id is null then
      raise exception 'Invalid or expired organization invitation';
    end if;

    insert into public.profiles (id, organization_id, full_name, role)
    values (new.id, org_id, full_name, invitation_role);

    update public.organization_invitations
       set auth_user_id = new.id
     where id = invitation_id;

    return new;
  end if;

  full_name := nullif(trim(new.raw_user_meta_data ->> 'full_name'), '');
  org_name := nullif(trim(new.raw_user_meta_data ->> 'organization_name'), '');
  if full_name is null then full_name := split_part(coalesce(new.email, 'User'), '@', 1); end if;
  if org_name is null then org_name := full_name || ' Coaching Center'; end if;

  insert into public.organizations (name)
  values (org_name)
  returning id into org_id;

  insert into public.profiles (id, organization_id, full_name, role)
  values (new.id, org_id, full_name, 'owner');

  insert into public.organization_usage (organization_id, plan, student_count, storage_mb)
  values (org_id, 'free', 0, 0)
  on conflict (organization_id) do nothing;

  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();
