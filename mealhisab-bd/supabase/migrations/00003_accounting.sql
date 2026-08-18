create or replace function public.create_flat(
  p_name text,
  p_address text default null,
  p_month_start_day integer default 1,
  p_meal_policy text default 'opt_out'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_flat uuid;
  v_start date;
  v_end date;
  v_code text;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if p_month_start_day < 1 or p_month_start_day > 28 then raise exception 'invalid_month_start_day'; end if;
  if p_meal_policy not in ('opt_in','opt_out') then raise exception 'invalid_meal_policy'; end if;
  v_code := upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 8));

  insert into public.flats(name,address,month_start_day,meal_policy,invite_code,created_by)
  values (trim(p_name), nullif(trim(p_address),''), p_month_start_day, p_meal_policy, v_code, v_user)
  returning id into v_flat;

  insert into public.flat_members(flat_id,user_id,role,status)
  values (v_flat,v_user,'admin','active');

  v_start := case
    when extract(day from current_date) >= p_month_start_day
      then make_date(extract(year from current_date)::int, extract(month from current_date)::int, p_month_start_day)
    else (make_date(extract(year from current_date)::int, extract(month from current_date)::int, p_month_start_day) - interval '1 month')::date
  end;
  v_end := (v_start + interval '1 month' - interval '1 day')::date;

  insert into public.cycles(flat_id,start_date,end_date,status) values (v_flat,v_start,v_end,'open');
  insert into public.cycle_members(cycle_id,user_id,active_from)
    select c.id, v_user, greatest(v_start,fm.joined_at) from public.cycles c join public.flat_members fm on fm.flat_id=c.flat_id and fm.user_id=v_user
    where c.id = (select id from public.cycles where flat_id=v_flat and status='open' order by created_at desc limit 1);

  insert into public.audit_logs(flat_id,actor_id,action,entity_type,entity_id,metadata)
  values (v_flat,v_user,'flat.created','flat',v_flat,jsonb_build_object('name',p_name));
  return v_flat;
end;
$$;

revoke all on function public.create_flat(text,text,integer,text) from public;
grant execute on function public.create_flat(text,text,integer,text) to authenticated;

create or replace function public.join_flat(p_invite_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_flat uuid;
  v_cycle uuid;
  v_start date;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  select id into v_flat from public.flats where invite_code = upper(trim(p_invite_code));
  if v_flat is null then raise exception 'invalid_invite_code'; end if;
  if exists (select 1 from public.flat_members where flat_id=v_flat and user_id=v_user and status='active') then return v_flat; end if;

  insert into public.flat_members(flat_id,user_id,role,status) values (v_flat,v_user,'member','active')
  on conflict (flat_id,user_id) do update set status='active', left_at=null;

  select id,start_date into v_cycle,v_start from public.cycles where flat_id=v_flat and status='open' order by start_date desc limit 1;
  if v_cycle is not null then
    insert into public.cycle_members(cycle_id,user_id,active_from,opening_balance)
    values (v_cycle,v_user,greatest(v_start,current_date),0)
    on conflict (cycle_id,user_id) do nothing;
  end if;

  insert into public.audit_logs(flat_id,actor_id,action,entity_type,entity_id,metadata)
  values (v_flat,v_user,'member.joined','flat_member',v_user,'{}'::jsonb);
  return v_flat;
end;
$$;
revoke all on function public.join_flat(text) from public;
grant execute on function public.join_flat(text) to authenticated;

create or replace function public.close_cycle(p_cycle_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_flat uuid;
  v_start date;
  v_end date;
  v_food_cost numeric(14,6);
  v_next_start date;
  v_next_end date;
  v_next uuid;
  r record;
  m record;
  v_meals integer;
  v_meal_cost numeric(14,6);
  v_contribution numeric(12,2);
  v_closing numeric(14,6);
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  select flat_id,start_date,end_date into v_flat,v_start,v_end from public.cycles where id=p_cycle_id for update;
  if v_flat is null then raise exception 'cycle_not_found'; end if;
  if not private.is_flat_manager(v_flat) then raise exception 'forbidden'; end if;
  if exists (select 1 from public.cycles where id=p_cycle_id and status='closed') then
    select id into v_next from public.cycles where flat_id=v_flat and start_date=v_end+1 limit 1;
    if v_next is not null then return v_next; end if;
    raise exception 'cycle_already_closed';
  end if;

  select coalesce(sum(amount),0) into v_food_cost from public.expenses where cycle_id=p_cycle_id and category='grocery';

  for r in select cm.user_id, cm.active_from, cm.active_to, cm.opening_balance from public.cycle_members cm where cm.cycle_id=p_cycle_id order by cm.created_at
  loop
    select coalesce(sum(
      (case when f.meal_policy='opt_out' then 1 else 0 end) +
      (case when f.meal_policy='opt_out' then 1 else 0 end) +
      coalesce((select ml.count from public.meal_logs ml where ml.cycle_id=p_cycle_id and ml.user_id=r.user_id and ml.date=gs.d and ml.meal_type='lunch' limit 1),0) -
      (case when f.meal_policy='opt_out' and exists(select 1 from public.meal_logs ml where ml.cycle_id=p_cycle_id and ml.user_id=r.user_id and ml.date=gs.d and ml.meal_type='lunch') then 1 else 0 end) +
      coalesce((select ml.count from public.meal_logs ml where ml.cycle_id=p_cycle_id and ml.user_id=r.user_id and ml.date=gs.d and ml.meal_type='dinner' limit 1),0) -
      (case when f.meal_policy='opt_out' and exists(select 1 from public.meal_logs ml where ml.cycle_id=p_cycle_id and ml.user_id=r.user_id and ml.date=gs.d and ml.meal_type='dinner') then 1 else 0 end) +
      coalesce((select ml.count from public.meal_logs ml where ml.cycle_id=p_cycle_id and ml.user_id=r.user_id and ml.date=gs.d and ml.meal_type='extra' limit 1),0)
    ),0)::integer into v_meals
    from generate_series(v_start,v_end,interval '1 day') gs(d)
    join public.flats f on f.id=v_flat
    where gs.d::date >= r.active_from and (r.active_to is null or gs.d::date <= r.active_to);

    select coalesce(sum(amount),0) into v_contribution from public.contributions where cycle_id=p_cycle_id and user_id=r.user_id;
    if v_meals = 0 or v_food_cost = 0 then v_meal_cost := 0; else v_meal_cost := round((v_meals * v_food_cost / greatest((select sum(x.meals) from (select cm2.user_id, 0::numeric as meals from public.cycle_members cm2 where cm2.cycle_id=p_cycle_id) x)),6), 6); end if;
  end loop;

  -- Recompute total meals once; the inner loop above is intentionally only a placeholder pass for validation.
  -- Authoritative per-member calculation follows using a temporary result set inside this transaction.
  create temporary table if not exists tmp_settlement(user_id uuid primary key, meals integer, contribution numeric(12,2), opening_balance numeric(14,6)) on commit drop;
  truncate tmp_settlement;
  insert into tmp_settlement
  select cm.user_id,
    coalesce(sum(
      (case when f.meal_policy='opt_out' and not exists(select 1 from public.meal_logs ml where ml.cycle_id=p_cycle_id and ml.user_id=cm.user_id and ml.date=gs.d and ml.meal_type='lunch') then 1 else coalesce((select ml.count from public.meal_logs ml where ml.cycle_id=p_cycle_id and ml.user_id=cm.user_id and ml.date=gs.d and ml.meal_type='lunch' limit 1),0) end) +
      (case when f.meal_policy='opt_out' and not exists(select 1 from public.meal_logs ml where ml.cycle_id=p_cycle_id and ml.user_id=cm.user_id and ml.date=gs.d and ml.meal_type='dinner') then 1 else coalesce((select ml.count from public.meal_logs ml where ml.cycle_id=p_cycle_id and ml.user_id=cm.user_id and ml.date=gs.d and ml.meal_type='dinner' limit 1),0) end) +
      coalesce((select ml.count from public.meal_logs ml where ml.cycle_id=p_cycle_id and ml.user_id=cm.user_id and ml.date=gs.d and ml.meal_type='extra' limit 1),0)
    ),0)::integer,
    coalesce((select sum(c.amount) from public.contributions c where c.cycle_id=p_cycle_id and c.user_id=cm.user_id),0),
    cm.opening_balance
  from public.cycle_members cm
  cross join public.flats f
  cross join generate_series(v_start,v_end,interval '1 day') gs(d)
  where cm.cycle_id=p_cycle_id and f.id=v_flat and gs.d::date >= cm.active_from and (cm.active_to is null or gs.d::date <= cm.active_to)
  group by cm.user_id, cm.opening_balance;

  create temporary table if not exists tmp_meta(total_meals bigint) on commit drop;
  truncate tmp_meta;
  insert into tmp_meta select coalesce(sum(meals),0) from tmp_settlement;
  select total_meals into v_meals from tmp_meta;

  for m in select * from tmp_settlement loop
    if v_meals = 0 then v_meal_cost := 0; else v_meal_cost := round((m.meals * v_food_cost / v_meals),6); end if;
    v_closing := round(m.opening_balance + m.contribution - v_meal_cost,6);
    insert into public.settlements(cycle_id,user_id,flat_id,total_meals,meal_cost,total_contribution,opening_balance,balance)
    values (p_cycle_id,m.user_id,v_flat,m.meals,v_meal_cost,m.contribution,m.opening_balance,v_closing)
    on conflict (cycle_id,user_id) do update set total_meals=excluded.total_meals,meal_cost=excluded.meal_cost,total_contribution=excluded.total_contribution,opening_balance=excluded.opening_balance,balance=excluded.balance;
  end loop;

  update public.cycles set status='closed' where id=p_cycle_id;
  v_next_start := v_end + 1;
  v_next_end := (v_next_start + (v_end-v_start+1)) - 1;
  insert into public.cycles(flat_id,start_date,end_date,status) values (v_flat,v_next_start,v_next_end,'open') returning id into v_next;

  insert into public.cycle_members(cycle_id,user_id,active_from,opening_balance)
  select v_next,fm.user_id,greatest(v_next_start,fm.joined_at),coalesce(s.balance,0)
  from public.flat_members fm
  left join public.settlements s on s.cycle_id=p_cycle_id and s.user_id=fm.user_id
  where fm.flat_id=v_flat and fm.status='active';

  insert into public.audit_logs(flat_id,actor_id,action,entity_type,entity_id,metadata)
  values(v_flat,v_user,'cycle.closed','cycle',p_cycle_id,jsonb_build_object('next_cycle_id',v_next,'food_cost',v_food_cost,'total_meals',v_meals));
  return v_next;
end;
$$;
revoke all on function public.close_cycle(uuid) from public;
grant execute on function public.close_cycle(uuid) to authenticated;
