-- At-risk student attrition scoring
-- Combines missed attendance, unpaid fees, and dropping exam percentiles
-- into a 0–100 attrition score + owner alerts for high-value students.

create table if not exists public.attrition_alerts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  attrition_score numeric(5,1) not null check (attrition_score >= 0 and attrition_score <= 100),
  risk_level text not null check (risk_level in ('watch', 'high', 'critical')),
  is_high_value boolean not null default false,
  attendance_score numeric(5,1) not null default 0,
  fee_score numeric(5,1) not null default 0,
  academic_score numeric(5,1) not null default 0,
  signals jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open', 'acknowledged', 'resolved', 'dismissed')),
  acknowledged_by uuid references public.profiles(id) on delete set null,
  acknowledged_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists attrition_alerts_org_status_idx
  on public.attrition_alerts (organization_id, status, attrition_score desc);
create index if not exists attrition_alerts_student_idx
  on public.attrition_alerts (student_id, created_at desc);

alter table public.attrition_alerts enable row level security;

drop policy if exists "org staff read attrition alerts" on public.attrition_alerts;
create policy "org staff read attrition alerts"
  on public.attrition_alerts for select to authenticated
  using (organization_id = private.user_org_id());

drop policy if exists "owner admin manage attrition alerts" on public.attrition_alerts;
create policy "owner admin manage attrition alerts"
  on public.attrition_alerts for all to authenticated
  using (
    organization_id = private.user_org_id()
    and private.user_role() in ('owner', 'admin')
  )
  with check (
    organization_id = private.user_org_id()
    and private.user_role() in ('owner', 'admin')
  );

create or replace function public.get_attrition_scores(
  p_organization_id uuid,
  p_branch_id uuid default null,
  p_days integer default 60,
  p_min_score numeric default 0
)
returns table (
  student_id uuid,
  name text,
  guardian_phone text,
  monthly_fee numeric,
  batch_id uuid,
  status text,
  attrition_score numeric,
  risk_level text,
  is_high_value boolean,
  attendance_pct numeric,
  attendance_missed bigint,
  attendance_total bigint,
  attendance_score numeric,
  open_invoices bigint,
  unpaid_amount numeric,
  fee_score numeric,
  recent_percentile numeric,
  prior_percentile numeric,
  percentile_delta numeric,
  academic_score numeric,
  signals jsonb
)
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  with params as (
    select
      greatest(14, least(coalesce(p_days, 60), 180)) as days,
      greatest(0, least(coalesce(p_min_score, 0), 100)) as min_score
  ),
  fee_median as (
    select coalesce(
      percentile_cont(0.5) within group (order by s.monthly_fee),
      0
    )::numeric as med
    from public.students s
    where s.organization_id = p_organization_id
      and s.status = 'active'
      and (p_branch_id is null or s.branch_id = p_branch_id)
  ),
  att as (
    select
      a.student_id,
      count(*)::bigint as total,
      count(*) filter (where not a.present)::bigint as missed,
      count(*) filter (where a.present)::bigint as present
    from public.attendance a
    where a.organization_id = p_organization_id
      and a.attendance_date >= current_date - (select days from params)
    group by a.student_id
  ),
  fees as (
    select
      fi.student_id,
      count(*) filter (where fi.status in ('open', 'partial'))::bigint as open_invoices,
      coalesce(
        sum(
          case
            when fi.status in ('open', 'partial') then
              greatest(fi.amount_due - fi.discount, 0)
              - coalesce((
                  select sum(fp.amount)
                  from public.fee_payments fp
                  where fp.invoice_id = fi.id
                ), 0)
            else 0
          end
        ),
        0
      )::numeric as unpaid_amount
    from public.fee_invoices fi
    where fi.organization_id = p_organization_id
      and fi.billing_month >= date_trunc('month', current_date) - interval '5 months'
    group by fi.student_id
  ),
  legacy_fees as (
    select
      s.id as student_id,
      case
        when s.monthly_fee > 0
          and not exists (
            select 1 from public.payments p
            where p.student_id = s.id
              and p.paid_at >= date_trunc('month', current_date)
          )
        then s.monthly_fee
        else 0
      end as unpaid_amount,
      case
        when s.monthly_fee > 0
          and not exists (
            select 1 from public.payments p
            where p.student_id = s.id
              and p.paid_at >= date_trunc('month', current_date)
          )
        then 1::bigint
        else 0::bigint
      end as open_invoices
    from public.students s
    where s.organization_id = p_organization_id
      and s.status = 'active'
  ),
  exam_pct as (
    select
      r.student_id,
      r.exam_id,
      e.exam_date,
      r.created_at,
      case
        when e.total_marks > 0 then round((r.marks::numeric / e.total_marks::numeric) * 100, 1)
        else null
      end as pct,
      percent_rank() over (
        partition by r.exam_id
        order by r.marks
      ) * 100 as cohort_percentile
    from public.results r
    join public.exams e on e.id = r.exam_id
    where r.organization_id = p_organization_id
      and e.organization_id = p_organization_id
  ),
  ranked_exams as (
    select
      student_id,
      cohort_percentile,
      pct,
      row_number() over (partition by student_id order by coalesce(exam_date, created_at::date) desc, created_at desc) as rn
    from exam_pct
    where cohort_percentile is not null
  ),
  academic as (
    select
      student_id,
      max(cohort_percentile) filter (where rn = 1) as recent_percentile,
      avg(cohort_percentile) filter (where rn between 2 and 4) as prior_percentile
    from ranked_exams
    group by student_id
  ),
  scored as (
    select
      s.id as student_id,
      s.name,
      s.guardian_phone,
      s.monthly_fee,
      s.batch_id,
      s.status,
      case
        when coalesce(a.total, 0) = 0 then 15::numeric
        else least(40::numeric,
          round((coalesce(a.missed, 0)::numeric / nullif(a.total, 0)::numeric) * 40, 1)
        )
      end as attendance_score,
      case
        when coalesce(a.total, 0) = 0 then null
        else round((coalesce(a.present, 0)::numeric / a.total::numeric) * 100, 1)
      end as attendance_pct,
      coalesce(a.missed, 0) as attendance_missed,
      coalesce(a.total, 0) as attendance_total,
      case
        when coalesce(nullif(f.unpaid_amount, 0), lf.unpaid_amount, 0) <= 0 then 0::numeric
        when s.monthly_fee > 0 then
          least(35::numeric,
            round(
              least(
                coalesce(nullif(f.unpaid_amount, 0), lf.unpaid_amount, 0) / nullif(s.monthly_fee, 0),
                3
              ) / 3.0 * 35,
              1
            )
          )
        else least(35::numeric, 20::numeric)
      end as fee_score,
      coalesce(nullif(f.open_invoices, 0), lf.open_invoices, 0) as open_invoices,
      coalesce(nullif(f.unpaid_amount, 0), lf.unpaid_amount, 0) as unpaid_amount,
      case
        when ac.recent_percentile is null then 8::numeric
        when ac.prior_percentile is null then
          case when ac.recent_percentile < 30 then 18::numeric else 5::numeric end
        when (ac.prior_percentile - ac.recent_percentile) <= 0 then 0::numeric
        else least(25::numeric,
          round(greatest(ac.prior_percentile - ac.recent_percentile, 0) / 50.0 * 25, 1)
        )
      end as academic_score,
      ac.recent_percentile,
      ac.prior_percentile,
      case
        when ac.recent_percentile is null or ac.prior_percentile is null then null
        else round(ac.recent_percentile - ac.prior_percentile, 1)
      end as percentile_delta,
      (s.monthly_fee >= greatest((select med from fee_median), 1)) as is_high_value
    from public.students s
    left join att a on a.student_id = s.id
    left join fees f on f.student_id = s.id
    left join legacy_fees lf on lf.student_id = s.id
    left join academic ac on ac.student_id = s.id
    where s.organization_id = p_organization_id
      and s.status = 'active'
      and (p_branch_id is null or s.branch_id = p_branch_id)
      and private.user_org_id() = p_organization_id
  )
  select
    student_id,
    name,
    guardian_phone,
    monthly_fee,
    batch_id,
    status,
    least(100::numeric, round(attendance_score + fee_score + academic_score, 1)) as attrition_score,
    case
      when (attendance_score + fee_score + academic_score) >= 80 then 'critical'
      when (attendance_score + fee_score + academic_score) >= 55 then 'high'
      else 'watch'
    end as risk_level,
    is_high_value,
    attendance_pct,
    attendance_missed,
    attendance_total,
    attendance_score,
    open_invoices,
    unpaid_amount,
    fee_score,
    recent_percentile,
    prior_percentile,
    percentile_delta,
    academic_score,
    jsonb_build_object(
      'attendance_missed', attendance_missed,
      'attendance_total', attendance_total,
      'attendance_pct', attendance_pct,
      'open_invoices', open_invoices,
      'unpaid_amount', unpaid_amount,
      'recent_percentile', recent_percentile,
      'prior_percentile', prior_percentile,
      'percentile_delta', percentile_delta
    ) as signals
  from scored
  where (attendance_score + fee_score + academic_score) >= (select min_score from params)
  order by (attendance_score + fee_score + academic_score) desc, monthly_fee desc, name;
$$;

grant execute on function public.get_attrition_scores(uuid, uuid, integer, numeric) to authenticated;

create or replace function public.evaluate_attrition_alerts(
  p_organization_id uuid,
  p_score_threshold numeric default 55,
  p_high_value_only boolean default true
)
returns table (
  alert_id uuid,
  student_id uuid,
  student_name text,
  attrition_score numeric,
  risk_level text,
  is_high_value boolean,
  created boolean
)
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  rec record;
  v_alert_id uuid;
  v_existing uuid;
begin
  if private.user_org_id() is distinct from p_organization_id then
    raise exception 'Forbidden';
  end if;
  if private.user_role() not in ('owner', 'admin', 'staff') then
    raise exception 'Forbidden';
  end if;

  for rec in
    select * from public.get_attrition_scores(p_organization_id, null, 60, p_score_threshold)
  loop
    if p_high_value_only and not rec.is_high_value then
      continue;
    end if;
    if rec.risk_level not in ('high', 'critical') and rec.attrition_score < p_score_threshold then
      continue;
    end if;

    select a.id into v_existing
    from public.attrition_alerts a
    where a.organization_id = p_organization_id
      and a.student_id = rec.student_id
      and a.status = 'open'
      and a.created_at >= now() - interval '7 days'
    limit 1;

    if v_existing is not null then
      alert_id := v_existing;
      student_id := rec.student_id;
      student_name := rec.name;
      attrition_score := rec.attrition_score;
      risk_level := rec.risk_level;
      is_high_value := rec.is_high_value;
      created := false;
      return next;
      continue;
    end if;

    insert into public.attrition_alerts (
      organization_id, student_id, attrition_score, risk_level, is_high_value,
      attendance_score, fee_score, academic_score, signals, status
    ) values (
      p_organization_id, rec.student_id, rec.attrition_score, rec.risk_level, rec.is_high_value,
      rec.attendance_score, rec.fee_score, rec.academic_score, rec.signals, 'open'
    )
    returning id into v_alert_id;

    alert_id := v_alert_id;
    student_id := rec.student_id;
    student_name := rec.name;
    attrition_score := rec.attrition_score;
    risk_level := rec.risk_level;
    is_high_value := rec.is_high_value;
    created := true;
    return next;
  end loop;
end;
$$;

grant execute on function public.evaluate_attrition_alerts(uuid, numeric, boolean) to authenticated;

comment on function public.get_attrition_scores is
  'Attrition score 0–100 from missed attendance (40), unpaid fees (35), exam percentile drop (25).';
comment on function public.evaluate_attrition_alerts is
  'Creates attrition_alerts rows for high-risk / high-value students (7-day dedupe).';
comment on table public.attrition_alerts is
  'Owner-facing alerts when high-value students show rising dropout risk.';
