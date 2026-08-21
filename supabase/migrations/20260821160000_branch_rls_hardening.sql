-- Branch isolation: owners/admins can oversee all branches in their org;
-- teachers/staff are constrained to their assigned branch. Legacy rows with no
-- branch remain visible only while the signed-in user's profile has no branch.
create schema if not exists private;
create or replace function private.branch_visible(target_branch uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select private.user_role() in ('owner','admin')
      or target_branch = private.user_branch_id()
      or (target_branch is null and private.user_branch_id() is null);
$$;
revoke all on function private.branch_visible(uuid) from public, anon;
grant execute on function private.branch_visible(uuid) to authenticated;

-- Core branch-scoped tables.
drop policy if exists "owner admin manage students" on public.students;
drop policy if exists "teacher staff read students" on public.students;
create policy "owner admin manage students branch" on public.students for all to authenticated
  using (organization_id = private.user_org_id() and private.user_role() in ('owner','admin') and private.branch_visible(branch_id))
  with check (organization_id = private.user_org_id() and private.user_role() in ('owner','admin') and private.branch_visible(branch_id));
create policy "teacher staff read students branch" on public.students for select to authenticated
  using (organization_id = private.user_org_id() and private.user_role() in ('teacher','staff') and private.branch_visible(branch_id));

drop policy if exists "owner admin manage batches" on public.batches;
drop policy if exists "teacher staff read batches" on public.batches;
create policy "owner admin manage batches branch" on public.batches for all to authenticated
  using (organization_id = private.user_org_id() and private.user_role() in ('owner','admin') and private.branch_visible(branch_id))
  with check (organization_id = private.user_org_id() and private.user_role() in ('owner','admin') and private.branch_visible(branch_id));
create policy "teacher staff read batches branch" on public.batches for select to authenticated
  using (organization_id = private.user_org_id() and private.user_role() in ('teacher','staff') and private.branch_visible(branch_id));

drop policy if exists "attendance members read" on public.attendance;
drop policy if exists "owner admin staff insert attendance" on public.attendance;
drop policy if exists "owner admin staff update attendance" on public.attendance;
drop policy if exists "owner admin delete attendance" on public.attendance;
create policy "attendance members read branch" on public.attendance for select to authenticated
  using (organization_id = private.user_org_id() and private.user_role() in ('owner','admin','teacher','staff') and exists (select 1 from public.students s where s.id = student_id and private.branch_visible(s.branch_id)));
create policy "attendance write branch" on public.attendance for insert to authenticated
  with check (organization_id = private.user_org_id() and private.user_role() in ('owner','admin','staff') and exists (select 1 from public.students s where s.id = student_id and private.branch_visible(s.branch_id)));
create policy "attendance update branch" on public.attendance for update to authenticated
  using (organization_id = private.user_org_id() and private.user_role() in ('owner','admin','staff') and exists (select 1 from public.students s where s.id = student_id and private.branch_visible(s.branch_id)))
  with check (organization_id = private.user_org_id() and private.user_role() in ('owner','admin','staff') and exists (select 1 from public.students s where s.id = student_id and private.branch_visible(s.branch_id)));
create policy "attendance delete branch" on public.attendance for delete to authenticated
  using (organization_id = private.user_org_id() and private.user_role() in ('owner','admin') and exists (select 1 from public.students s where s.id = student_id and private.branch_visible(s.branch_id)));

drop policy if exists "payment members read" on public.payments;
drop policy if exists "owner admin staff insert payments" on public.payments;
drop policy if exists "owner admin update payments" on public.payments;
drop policy if exists "owner admin delete payments" on public.payments;
create policy "payment members read branch" on public.payments for select to authenticated using (organization_id = private.user_org_id() and private.user_role() in ('owner','admin','staff') and private.branch_visible(branch_id));
create policy "payment insert branch" on public.payments for insert to authenticated with check (organization_id = private.user_org_id() and private.user_role() in ('owner','admin','staff') and private.branch_visible(branch_id));
create policy "payment update branch" on public.payments for update to authenticated using (organization_id = private.user_org_id() and private.user_role() in ('owner','admin') and private.branch_visible(branch_id)) with check (organization_id = private.user_org_id() and private.user_role() in ('owner','admin') and private.branch_visible(branch_id));
create policy "payment delete branch" on public.payments for delete to authenticated using (organization_id = private.user_org_id() and private.user_role() in ('owner','admin') and private.branch_visible(branch_id));

drop policy if exists "owner admin manage exams" on public.exams;
drop policy if exists "teacher read exams" on public.exams;
create policy "owner admin manage exams branch" on public.exams for all to authenticated using (organization_id = private.user_org_id() and private.user_role() in ('owner','admin') and private.branch_visible(branch_id)) with check (organization_id = private.user_org_id() and private.user_role() in ('owner','admin') and private.branch_visible(branch_id));
create policy "teacher read exams branch" on public.exams for select to authenticated using (organization_id = private.user_org_id() and private.user_role() = 'teacher' and private.branch_visible(branch_id));

drop policy if exists "result members read" on public.results;
drop policy if exists "owner admin teacher insert results" on public.results;
drop policy if exists "owner admin teacher update results" on public.results;
drop policy if exists "owner admin delete results" on public.results;
create policy "result members read branch" on public.results for select to authenticated using (organization_id = private.user_org_id() and private.user_role() in ('owner','admin','teacher','staff') and exists (select 1 from public.students s where s.id = student_id and private.branch_visible(s.branch_id)));
create policy "result insert branch" on public.results for insert to authenticated with check (organization_id = private.user_org_id() and private.user_role() in ('owner','admin','teacher') and exists (select 1 from public.students s where s.id = student_id and private.branch_visible(s.branch_id)));
create policy "result update branch" on public.results for update to authenticated using (organization_id = private.user_org_id() and private.user_role() in ('owner','admin','teacher') and exists (select 1 from public.students s where s.id = student_id and private.branch_visible(s.branch_id))) with check (organization_id = private.user_org_id() and private.user_role() in ('owner','admin','teacher') and exists (select 1 from public.students s where s.id = student_id and private.branch_visible(s.branch_id)));
create policy "result delete branch" on public.results for delete to authenticated using (organization_id = private.user_org_id() and private.user_role() in ('owner','admin') and exists (select 1 from public.students s where s.id = student_id and private.branch_visible(s.branch_id)));

drop policy if exists "owner admin manage teachers" on public.teachers;
drop policy if exists "teacher staff read teachers" on public.teachers;
create policy "owner admin manage teachers branch" on public.teachers for all to authenticated using (organization_id = private.user_org_id() and private.user_role() in ('owner','admin') and private.branch_visible(branch_id)) with check (organization_id = private.user_org_id() and private.user_role() in ('owner','admin') and private.branch_visible(branch_id));
create policy "teacher staff read teachers branch" on public.teachers for select to authenticated using (organization_id = private.user_org_id() and private.user_role() in ('teacher','staff') and private.branch_visible(branch_id));

drop policy if exists "owner admin manage notices" on public.notices;
drop policy if exists "teacher staff read notices" on public.notices;
create policy "owner admin manage notices branch" on public.notices for all to authenticated using (organization_id = private.user_org_id() and private.user_role() in ('owner','admin') and private.branch_visible(branch_id)) with check (organization_id = private.user_org_id() and private.user_role() in ('owner','admin') and private.branch_visible(branch_id));
create policy "teacher staff read notices branch" on public.notices for select to authenticated using (organization_id = private.user_org_id() and private.user_role() in ('teacher','staff') and private.branch_visible(branch_id));

-- Growth branch-scoped tables.
drop policy if exists "org members view leads" on public.admission_leads;
drop policy if exists "staff manage leads" on public.admission_leads;
create policy "members view leads branch" on public.admission_leads for select to authenticated using (organization_id = private.user_org_id() and private.branch_visible(branch_id));
create policy "staff manage leads branch" on public.admission_leads for all to authenticated using (organization_id = private.user_org_id() and private.user_role() in ('owner','admin','staff') and private.branch_visible(branch_id)) with check (organization_id = private.user_org_id() and private.user_role() in ('owner','admin','staff') and private.branch_visible(branch_id));

drop policy if exists "org members view routine" on public.routine_slots;
drop policy if exists "admins manage routine" on public.routine_slots;
create policy "members view routine branch" on public.routine_slots for select to authenticated using (organization_id = private.user_org_id() and private.branch_visible(branch_id));
create policy "admins manage routine branch" on public.routine_slots for all to authenticated using (organization_id = private.user_org_id() and private.user_role() in ('owner','admin') and private.branch_visible(branch_id)) with check (organization_id = private.user_org_id() and private.user_role() in ('owner','admin') and private.branch_visible(branch_id));

drop policy if exists "admins view expenses" on public.expenses;
drop policy if exists "admins manage expenses" on public.expenses;
create policy "admins view expenses branch" on public.expenses for select to authenticated using (organization_id = private.user_org_id() and private.user_role() in ('owner','admin') and private.branch_visible(branch_id));
create policy "admins manage expenses branch" on public.expenses for all to authenticated using (organization_id = private.user_org_id() and private.user_role() in ('owner','admin') and private.branch_visible(branch_id)) with check (organization_id = private.user_org_id() and private.user_role() in ('owner','admin') and private.branch_visible(branch_id));
