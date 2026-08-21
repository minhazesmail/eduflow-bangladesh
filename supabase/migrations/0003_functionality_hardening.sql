-- EduFlow functionality/security hardening for existing installations.
-- Safe to run after 0001_base_schema.sql + 0002_stabilization.sql.

create schema if not exists private;

-- Core write permissions must match the UI role matrix.
drop policy if exists "owner admin staff manage attendance" on public.attendance;
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

drop policy if exists "teacher read attendance" on public.attendance;

-- Payments: staff can record, but only owner/admin can edit or delete.
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

-- Results: teachers can enter/edit, but only owner/admin can delete.
drop policy if exists "owner admin teacher manage results" on public.results;
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

drop policy if exists "staff read results" on public.results;

-- Audit logs are application-owned records: members can insert only their own events.
drop policy if exists "org members insert own audit logs" on public.audit_logs;
create policy "org members insert own audit logs" on public.audit_logs
  for insert to authenticated
  with check (organization_id = private.user_org_id() and user_id = auth.uid());

-- Make security-definer triggers deterministic regardless of caller search_path.
create or replace function private.update_org_student_count()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  update public.organization_usage
  set student_count = (
    select count(*)
    from public.students
    where organization_id = coalesce(new.organization_id, old.organization_id)
  ), updated_at = now()
  where organization_id = coalesce(new.organization_id, old.organization_id);
  return coalesce(new, old);
end;
$$;

create or replace function private.enforce_student_quota()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_count integer;
  plan_limit integer;
  org_plan text;
begin
  select plan into org_plan
  from public.organization_usage
  where organization_id = new.organization_id;

  plan_limit := case org_plan
    when 'pro' then 500
    when 'enterprise' then 5000
    else 50
  end;

  select count(*) into current_count
  from public.students
  where organization_id = new.organization_id;

  if current_count >= plan_limit then
    raise exception 'Student quota exceeded for plan %. Current: %, Limit: %',
      coalesce(org_plan, 'free'), current_count, plan_limit;
  end if;

  return new;
end;
$$;

revoke all on function private.update_org_student_count() from public, anon, authenticated;
revoke all on function private.enforce_student_quota() from public, anon, authenticated;

-- The old standalone migration had an invalid reference to attendance.date.
drop index if exists public.attendance_org_date_idx;
create index if not exists attendance_org_date_idx
  on public.attendance(organization_id, attendance_date desc);
