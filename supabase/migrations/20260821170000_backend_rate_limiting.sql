create schema if not exists private;

create table if not exists private.rate_limit_buckets (
  bucket_key text primary key,
  window_started_at timestamptz not null,
  request_count integer not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists rate_limit_buckets_updated_idx on private.rate_limit_buckets (updated_at);
revoke all on schema private from anon, authenticated;
revoke all on private.rate_limit_buckets from anon, authenticated;

create or replace function public.check_edge_rate_limit(p_key text,p_limit integer,p_window_seconds integer)
returns jsonb language plpgsql security definer set search_path = pg_catalog, private
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_window_start timestamptz;
  v_count integer;
begin
  if coalesce(length(p_key),0)=0 then raise exception 'rate limit key is required'; end if;
  if p_limit<=0 or p_window_seconds<=0 then raise exception 'invalid rate limit configuration'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_key,0));
  select window_started_at,request_count into v_window_start,v_count from private.rate_limit_buckets where bucket_key=p_key;
  if v_window_start is null or v_now>=v_window_start+make_interval(secs=>p_window_seconds) then
    v_window_start:=v_now;v_count:=1;
    insert into private.rate_limit_buckets(bucket_key,window_started_at,request_count,updated_at) values(p_key,v_window_start,v_count,v_now)
    on conflict(bucket_key) do update set window_started_at=excluded.window_started_at,request_count=excluded.request_count,updated_at=excluded.updated_at;
  elsif v_count<p_limit then
    v_count:=v_count+1;
    update private.rate_limit_buckets set request_count=v_count,updated_at=v_now where bucket_key=p_key;
  end if;
  return jsonb_build_object('allowed',v_count<=p_limit,'limit',p_limit,'remaining',greatest(p_limit-v_count,0),'reset_at',extract(epoch from(v_window_start+make_interval(secs=>p_window_seconds)))::bigint);
end;
$$;

revoke all on function public.check_edge_rate_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.check_edge_rate_limit(text,integer,integer) to service_role;

comment on function public.check_edge_rate_limit(text,integer,integer) is 'Server-side atomic fixed-window limiter for trusted Supabase Edge Functions. Call only with the service_role client.';
