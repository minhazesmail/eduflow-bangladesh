-- Production gap hardening: configurable student quotas and useful indexes.
alter table public.organization_usage add column if not exists max_students integer not null default 50;
alter table public.organization_usage add column if not exists max_storage_mb integer not null default 100;
update public.organization_usage set max_students=case plan when 'pro' then 500 when 'enterprise' then 5000 else 50 end where max_students is null or max_students=50;
create or replace function private.enforce_student_quota()
returns trigger language plpgsql security definer set search_path = pg_catalog, public
as $$
declare current_count integer; plan_limit integer;
begin
  select coalesce(max_students,case plan when 'pro' then 500 when 'enterprise' then 5000 else 50 end) into plan_limit from public.organization_usage where organization_id=new.organization_id;
  plan_limit:=coalesce(plan_limit,50);
  select count(*) into current_count from public.students where organization_id=new.organization_id;
  if current_count >= plan_limit then raise exception 'Student quota exceeded. Current: %, Limit: %',current_count,plan_limit; end if;
  return new;
end;
$$;
revoke all on function private.enforce_student_quota() from public,anon,authenticated;
create index if not exists notifications_queue_idx on public.notifications(status,scheduled_at,created_at) where status='queued';
create index if not exists payments_org_date_idx on public.payments(organization_id,paid_at desc);
