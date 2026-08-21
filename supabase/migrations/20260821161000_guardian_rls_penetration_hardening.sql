-- Guardian isolation hardening and read-path coverage.
-- Guardians have no profiles row, so org-based staff policies alone would deny/incorrectly expose portal data.

-- Guardian can read only their own guardian record/account and linked relationships.
drop policy if exists "guardian can view own guardian" on public.guardians;
create policy "guardian can view own guardian" on public.guardians
  for select to authenticated
  using (exists (
    select 1 from public.guardian_accounts ga
    where ga.guardian_id = guardians.id and ga.auth_user_id = auth.uid()
  ));

drop policy if exists "guardian can view own account" on public.guardian_accounts;
create policy "guardian can view own account" on public.guardian_accounts
  for select to authenticated
  using (auth_user_id = auth.uid());

drop policy if exists "guardian can view own links" on public.student_guardians;
create policy "guardian can view own links" on public.student_guardians
  for select to authenticated
  using (exists (
    select 1 from public.guardian_accounts ga
    where ga.guardian_id = student_guardians.guardian_id and ga.auth_user_id = auth.uid()
  ));

-- Linked students only.
drop policy if exists "guardian can view linked students" on public.students;
create policy "guardian can view linked students" on public.students
  for select to authenticated
  using (exists (
    select 1
    from public.guardian_accounts ga
    join public.student_guardians sg on sg.guardian_id = ga.guardian_id
    where ga.auth_user_id = auth.uid()
      and sg.student_id = students.id
      and ga.organization_id = students.organization_id
  ));

-- Attendance/payments/results only for linked students.
drop policy if exists "guardian can view linked attendance" on public.attendance;
create policy "guardian can view linked attendance" on public.attendance
  for select to authenticated
  using (exists (
    select 1 from public.student_guardians sg
    join public.guardian_accounts ga on ga.guardian_id = sg.guardian_id
    where ga.auth_user_id = auth.uid()
      and sg.student_id = attendance.student_id
      and ga.organization_id = attendance.organization_id
  ));

drop policy if exists "guardian can view linked payments" on public.payments;
create policy "guardian can view linked payments" on public.payments
  for select to authenticated
  using (exists (
    select 1 from public.student_guardians sg
    join public.guardian_accounts ga on ga.guardian_id = sg.guardian_id
    where ga.auth_user_id = auth.uid()
      and sg.student_id = payments.student_id
      and ga.organization_id = payments.organization_id
  ));

drop policy if exists "guardian can view linked results" on public.results;
create policy "guardian can view linked results" on public.results
  for select to authenticated
  using (exists (
    select 1 from public.student_guardians sg
    join public.guardian_accounts ga on ga.guardian_id = sg.guardian_id
    where ga.auth_user_id = auth.uid()
      and sg.student_id = results.student_id
      and ga.organization_id = results.organization_id
  ));

-- Guardian needs only the batch/exam metadata referenced by linked rows.
drop policy if exists "guardian can view linked batches" on public.batches;
create policy "guardian can view linked batches" on public.batches
  for select to authenticated
  using (exists (
    select 1 from public.students s
    join public.student_guardians sg on sg.student_id = s.id
    join public.guardian_accounts ga on ga.guardian_id = sg.guardian_id
    where ga.auth_user_id = auth.uid()
      and s.batch_id = batches.id
      and ga.organization_id = batches.organization_id
  ));

drop policy if exists "guardian can view linked exams" on public.exams;
create policy "guardian can view linked exams" on public.exams
  for select to authenticated
  using (exists (
    select 1 from public.results r
    join public.student_guardians sg on sg.student_id = r.student_id
    join public.guardian_accounts ga on ga.guardian_id = sg.guardian_id
    where ga.auth_user_id = auth.uid()
      and r.exam_id = exams.id
      and ga.organization_id = exams.organization_id
  ));

-- Published notices for the guardian's organization only.
drop policy if exists "guardian can view organization notices" on public.notices;
create policy "guardian can view organization notices" on public.notices
  for select to authenticated
  using (status = 'published' and exists (
    select 1 from public.guardian_accounts ga
    where ga.auth_user_id = auth.uid() and ga.organization_id = notices.organization_id
  ));

create index if not exists guardian_accounts_auth_user_idx on public.guardian_accounts(auth_user_id);
create index if not exists student_guardians_student_guardian_idx on public.student_guardians(student_id, guardian_id);

comment on policy "guardian can view linked students" on public.students is 'Guardian may read only students linked to their authenticated guardian account.';
comment on policy "guardian can view linked attendance" on public.attendance is 'Guardian may read only attendance for linked students.';
comment on policy "guardian can view linked payments" on public.payments is 'Guardian may read only payments for linked students.';
comment on policy "guardian can view linked results" on public.results is 'Guardian may read only results for linked students.';
