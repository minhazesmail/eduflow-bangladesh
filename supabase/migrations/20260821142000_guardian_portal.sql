-- Guardian portal auth and scoped access
create table if not exists public.guardian_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  guardian_id uuid not null references public.guardians(id) on delete cascade,
  email text not null,
  status text not null default 'pending' check (status in ('pending','sent','accepted','cancelled')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);
create index if not exists guardian_invitations_org_idx on public.guardian_invitations(organization_id, created_at desc);
alter table public.guardian_invitations enable row level security;
create policy "owners manage guardian invitations" on public.guardian_invitations for all to authenticated
  using (organization_id = private.user_org_id() and private.user_role() = 'owner')
  with check (organization_id = private.user_org_id() and private.user_role() = 'owner');

-- Extend onboarding for guardian auth invitations.
create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  org_id uuid;
  org_name text;
  full_name text;
  invitation_id uuid;
  invitation_role text;
  guardian_invitation_id uuid;
  guardian_id uuid;
begin
  guardian_invitation_id := nullif(new.raw_user_meta_data ->> 'guardian_invitation_id', '')::uuid;
  if guardian_invitation_id is not null then
    select organization_id, guardian_id into org_id, guardian_id
    from public.guardian_invitations
    where id = guardian_invitation_id and status in ('pending','sent') and lower(email)=lower(new.email)
    limit 1;
    if org_id is null then raise exception 'Invalid or expired guardian invitation'; end if;
    insert into public.guardian_accounts(organization_id,guardian_id,auth_user_id,last_login_at)
      values(org_id,guardian_id,new.id,now())
      on conflict (guardian_id) do update set auth_user_id=excluded.auth_user_id,last_login_at=now();
    update public.guardian_invitations set status='accepted',accepted_at=now() where id=guardian_invitation_id;
    return new;
  end if;

  invitation_id := nullif(new.raw_user_meta_data ->> 'invitation_id', '')::uuid;
  if invitation_id is not null then
    select organization_id, role, coalesce(full_name, split_part(coalesce(new.email,'User'),'@',1))
      into org_id, invitation_role, full_name
    from public.organization_invitations
    where id=invitation_id and status in ('pending','sent') and lower(email)=lower(new.email)
    limit 1;
    if org_id is null then raise exception 'Invalid or expired organization invitation'; end if;
    insert into public.profiles(id,organization_id,full_name,role) values(new.id,org_id,full_name,invitation_role);
    update public.organization_invitations set auth_user_id=new.id,status='accepted',accepted_at=now() where id=invitation_id;
    return new;
  end if;

  full_name := nullif(trim(new.raw_user_meta_data ->> 'full_name'),'');
  org_name := nullif(trim(new.raw_user_meta_data ->> 'organization_name'),'');
  if full_name is null then full_name := split_part(coalesce(new.email,'User'),'@',1); end if;
  if org_name is null then org_name := full_name || ' Coaching Center'; end if;
  insert into public.organizations(name) values(org_name) returning id into org_id;
  insert into public.profiles(id,organization_id,full_name,role) values(new.id,org_id,full_name,'owner');
  insert into public.organization_usage(organization_id,plan,student_count,storage_mb) values(org_id,'free',0,0) on conflict (organization_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user();

-- Guardian-scoped RLS
create policy "guardian view own guardian" on public.guardians for select to authenticated
  using (exists (select 1 from public.guardian_accounts ga where ga.guardian_id=id and ga.auth_user_id=auth.uid()));
create policy "guardian view linked students" on public.students for select to authenticated
  using (exists (select 1 from public.student_guardians sg join public.guardian_accounts ga on ga.guardian_id=sg.guardian_id where sg.student_id=students.id and ga.auth_user_id=auth.uid()));
create policy "guardian view linked student guardians" on public.student_guardians for select to authenticated
  using (exists (select 1 from public.guardian_accounts ga where ga.guardian_id=student_guardians.guardian_id and ga.auth_user_id=auth.uid()));
create policy "guardian view attendance" on public.attendance for select to authenticated
  using (exists (select 1 from public.student_guardians sg join public.guardian_accounts ga on ga.guardian_id=sg.guardian_id where sg.student_id=attendance.student_id and ga.auth_user_id=auth.uid()));
create policy "guardian view payments" on public.payments for select to authenticated
  using (exists (select 1 from public.student_guardians sg join public.guardian_accounts ga on ga.guardian_id=sg.guardian_id where sg.student_id=payments.student_id and ga.auth_user_id=auth.uid()));
create policy "guardian view results" on public.results for select to authenticated
  using (exists (select 1 from public.student_guardians sg join public.guardian_accounts ga on ga.guardian_id=sg.guardian_id where sg.student_id=results.student_id and ga.auth_user_id=auth.uid()));
create policy "guardian view notices" on public.notices for select to authenticated
  using (exists (select 1 from public.guardian_accounts ga where ga.organization_id=notices.organization_id and ga.auth_user_id=auth.uid()));
create policy "guardian view routine" on public.routine_slots for select to authenticated
  using (exists (select 1 from public.students s join public.student_guardians sg on sg.student_id=s.id join public.guardian_accounts ga on ga.guardian_id=sg.guardian_id where s.batch_id=routine_slots.batch_id and ga.auth_user_id=auth.uid()));
