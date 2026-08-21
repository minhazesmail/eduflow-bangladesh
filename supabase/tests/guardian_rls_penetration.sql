-- Guardian RLS penetration harness.
-- Run in a disposable Supabase branch with two guardian accounts and two students:
-- guardian A -> student A; guardian B -> student B.
-- Expected: A can read A only, never B, and can never read staff/org-wide data.

begin;

DO $$
DECLARE
  guardian_a uuid;
  guardian_b uuid;
  student_a uuid;
  student_b uuid;
  org_a uuid;
  visible_students integer;
  visible_attendance integer;
  visible_payments integer;
  visible_results integer;
  visible_notices integer;
BEGIN
  select ga.auth_user_id, ga.organization_id into guardian_a, org_a
  from public.guardian_accounts ga
  order by ga.created_at limit 1;

  select ga.auth_user_id into guardian_b
  from public.guardian_accounts ga
  where ga.auth_user_id is distinct from guardian_a
  order by ga.created_at limit 1;

  select sg.student_id into student_a
  from public.student_guardians sg
  join public.guardian_accounts ga on ga.guardian_id=sg.guardian_id
  where ga.auth_user_id=guardian_a limit 1;

  select sg.student_id into student_b
  from public.student_guardians sg
  join public.guardian_accounts ga on ga.guardian_id=sg.guardian_id
  where ga.auth_user_id=guardian_b
    and sg.student_id is distinct from student_a limit 1;

  IF guardian_a IS NULL OR guardian_b IS NULL OR student_a IS NULL OR student_b IS NULL THEN
    RAISE NOTICE 'Guardian penetration test skipped: requires two guardian fixtures with distinct linked students.';
    RETURN;
  END IF;

  PERFORM set_config('request.jwt.claim.sub', guardian_a::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  EXECUTE 'set local role authenticated';

  SELECT count(*) INTO visible_students FROM public.students;
  IF visible_students <> 1 THEN RAISE EXCEPTION 'FAIL guardian student isolation: expected 1 visible student, got %', visible_students; END IF;
  IF EXISTS (SELECT 1 FROM public.students WHERE id=student_b) THEN RAISE EXCEPTION 'FAIL cross-student student access'; END IF;

  SELECT count(*) INTO visible_attendance FROM public.attendance a WHERE a.student_id=student_b;
  IF visible_attendance <> 0 THEN RAISE EXCEPTION 'FAIL cross-student attendance access'; END IF;

  SELECT count(*) INTO visible_payments FROM public.payments p WHERE p.student_id=student_b;
  IF visible_payments <> 0 THEN RAISE EXCEPTION 'FAIL cross-student payment access'; END IF;

  SELECT count(*) INTO visible_results FROM public.results r WHERE r.student_id=student_b;
  IF visible_results <> 0 THEN RAISE EXCEPTION 'FAIL cross-student result access'; END IF;

  SELECT count(*) INTO visible_notices FROM public.notices n WHERE n.organization_id is distinct from org_a;
  IF visible_notices <> 0 THEN RAISE EXCEPTION 'FAIL cross-organization notice access'; END IF;

  RAISE NOTICE 'PASS guardian RLS penetration checks for guardian %', guardian_a;
END $$;

rollback;
