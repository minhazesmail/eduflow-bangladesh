create or replace function public.get_attention_metrics(p_organization_id uuid, p_branch_id uuid default null, p_days integer default 90, p_threshold numeric default 70)
returns table(
  id uuid,
  name text,
  guardian_phone text,
  monthly_fee numeric,
  batch_id uuid,
  attendance numeric,
  attendance_total bigint,
  attendance_present bigint
)
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  with recent as (
    select a.student_id, count(*)::bigint as total, count(*) filter (where a.present)::bigint as present
    from public.attendance a
    where a.organization_id = p_organization_id
      and a.attendance_date >= current_date - greatest(1, least(p_days, 365))
    group by a.student_id
  )
  select s.id, s.name, s.guardian_phone, s.monthly_fee, s.batch_id,
         case when r.total > 0 then round((r.present::numeric / r.total::numeric) * 100, 1) else null end as attendance,
         coalesce(r.total, 0) as attendance_total,
         coalesce(r.present, 0) as attendance_present
  from public.students s
  left join recent r on r.student_id = s.id
  where s.organization_id = p_organization_id
    and (p_branch_id is null or s.branch_id = p_branch_id)
    and private.user_org_id() = p_organization_id
    and (r.total is null or (r.present::numeric / nullif(r.total, 0) * 100) < p_threshold)
  order by s.name;
$$;

grant execute on function public.get_attention_metrics(uuid, uuid, integer, numeric) to authenticated;
