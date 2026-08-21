-- Real branch context for scoped records.
alter table public.profiles add column if not exists branch_id uuid references public.branches(id) on delete set null;
alter table public.payment_integrations add column if not exists api_base_url text;
alter table public.payment_integrations add column if not exists merchant_id text;
alter table public.payment_integrations add column if not exists webhook_url text;
create index if not exists profiles_branch_idx on public.profiles(branch_id);
create index if not exists students_branch_idx on public.students(branch_id);
create index if not exists batches_branch_idx on public.batches(branch_id);
create index if not exists teachers_branch_idx on public.teachers(branch_id);
create index if not exists payments_branch_idx on public.payments(branch_id);
create index if not exists exams_branch_idx on public.exams(branch_id);
create index if not exists notices_branch_idx on public.notices(branch_id);
create index if not exists expenses_branch_idx on public.expenses(branch_id);
create index if not exists admission_leads_branch_idx on public.admission_leads(branch_id);
create index if not exists routine_slots_branch_idx on public.routine_slots(branch_id);
create or replace function private.default_branch_id()
returns trigger language plpgsql security definer set search_path = pg_catalog, public
as $$
begin
  if new.branch_id is null then select branch_id into new.branch_id from public.profiles where id=auth.uid(); end if;
  return new;
end;
$$;
revoke all on function private.default_branch_id() from public,anon,authenticated;
drop trigger if exists default_student_branch on public.students;
create trigger default_student_branch before insert on public.students for each row execute function private.default_branch_id();
drop trigger if exists default_batch_branch on public.batches;
create trigger default_batch_branch before insert on public.batches for each row execute function private.default_branch_id();
drop trigger if exists default_teacher_branch on public.teachers;
create trigger default_teacher_branch before insert on public.teachers for each row execute function private.default_branch_id();
drop trigger if exists default_payment_branch on public.payments;
create trigger default_payment_branch before insert on public.payments for each row execute function private.default_branch_id();
drop trigger if exists default_exam_branch on public.exams;
create trigger default_exam_branch before insert on public.exams for each row execute function private.default_branch_id();
drop trigger if exists default_notice_branch on public.notices;
create trigger default_notice_branch before insert on public.notices for each row execute function private.default_branch_id();
drop trigger if exists default_expense_branch on public.expenses;
create trigger default_expense_branch before insert on public.expenses for each row execute function private.default_branch_id();
drop trigger if exists default_lead_branch on public.admission_leads;
create trigger default_lead_branch before insert on public.admission_leads for each row execute function private.default_branch_id();
drop trigger if exists default_routine_branch on public.routine_slots;
create trigger default_routine_branch before insert on public.routine_slots for each row execute function private.default_branch_id();
create or replace function private.user_branch_id()
returns uuid language sql stable security definer set search_path=public
as $$ select branch_id from public.profiles where id=auth.uid(); $$;
revoke all on function private.user_branch_id() from public,anon;
grant execute on function private.user_branch_id() to authenticated;
