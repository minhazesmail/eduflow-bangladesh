create schema if not exists private;

create or replace function private.is_flat_member(p_flat_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.flat_members fm
    where fm.flat_id = p_flat_id
      and fm.user_id = (select auth.uid())
      and fm.status = 'active'
  );
$$;

create or replace function private.is_flat_manager(p_flat_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.flat_members fm
    where fm.flat_id = p_flat_id
      and fm.user_id = (select auth.uid())
      and fm.status = 'active'
      and fm.role in ('admin','manager')
  );
$$;

create or replace function private.is_flat_admin(p_flat_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.flat_members fm
    where fm.flat_id = p_flat_id
      and fm.user_id = (select auth.uid())
      and fm.status = 'active'
      and fm.role = 'admin'
  );
$$;

grant usage on schema private to authenticated;
grant execute on all functions in schema private to authenticated;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles, public.flats, public.flat_members, public.cycles, public.cycle_members, public.meal_logs, public.expenses, public.contributions, public.settlements, public.notifications, public.audit_logs to authenticated;

alter table public.profiles enable row level security;
alter table public.flats enable row level security;
alter table public.flat_members enable row level security;
alter table public.cycles enable row level security;
alter table public.cycle_members enable row level security;
alter table public.meal_logs enable row level security;
alter table public.expenses enable row level security;
alter table public.contributions enable row level security;
alter table public.settlements enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

create policy profiles_select_self on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_update_self on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy flats_select_member on public.flats for select to authenticated using (private.is_flat_member(id));
create policy flats_insert_creator on public.flats for insert to authenticated with check (created_by = (select auth.uid()));
create policy flats_update_admin on public.flats for update to authenticated using (private.is_flat_admin(id)) with check (private.is_flat_admin(id));
create policy flats_delete_admin on public.flats for delete to authenticated using (private.is_flat_admin(id));

create policy members_select_same_flat on public.flat_members for select to authenticated using (private.is_flat_member(flat_id));
create policy members_insert_admin on public.flat_members for insert to authenticated with check (private.is_flat_admin(flat_id));
create policy members_update_admin on public.flat_members for update to authenticated using (private.is_flat_admin(flat_id)) with check (private.is_flat_admin(flat_id));
create policy members_delete_admin on public.flat_members for delete to authenticated using (private.is_flat_admin(flat_id));

create policy cycles_select_member on public.cycles for select to authenticated using (private.is_flat_member(flat_id));
create policy cycles_insert_manager on public.cycles for insert to authenticated with check (private.is_flat_manager(flat_id));
create policy cycles_update_manager on public.cycles for update to authenticated using (private.is_flat_manager(flat_id)) with check (private.is_flat_manager(flat_id));

create policy cycle_members_select_member on public.cycle_members for select to authenticated using (exists (select 1 from public.cycles c where c.id = cycle_id and private.is_flat_member(c.flat_id)));

create policy meal_select_member on public.meal_logs for select to authenticated using (private.is_flat_member(flat_id));
create policy meal_insert_own_or_manager on public.meal_logs for insert to authenticated
with check (
  private.is_flat_member(flat_id)
  and (user_id = (select auth.uid()) or private.is_flat_manager(flat_id))
  and exists (select 1 from public.cycles c where c.id = cycle_id and c.flat_id = flat_id and c.status = 'open')
);
create policy meal_update_own_or_manager on public.meal_logs for update to authenticated
using (private.is_flat_member(flat_id) and (user_id = (select auth.uid()) or private.is_flat_manager(flat_id)))
with check (private.is_flat_member(flat_id) and (user_id = (select auth.uid()) or private.is_flat_manager(flat_id)));
create policy meal_delete_manager on public.meal_logs for delete to authenticated using (private.is_flat_manager(flat_id) and exists (select 1 from public.cycles c where c.id = cycle_id and c.status = 'open'));

create policy expenses_select_member on public.expenses for select to authenticated using (private.is_flat_member(flat_id));
create policy expenses_insert_manager on public.expenses for insert to authenticated with check (private.is_flat_manager(flat_id) and exists (select 1 from public.cycles c where c.id = cycle_id and c.flat_id = flat_id and c.status = 'open'));
create policy expenses_update_manager on public.expenses for update to authenticated using (private.is_flat_manager(flat_id)) with check (private.is_flat_manager(flat_id));
create policy expenses_delete_manager on public.expenses for delete to authenticated using (private.is_flat_manager(flat_id) and exists (select 1 from public.cycles c where c.id = cycle_id and c.status = 'open'));

create policy contributions_select_member on public.contributions for select to authenticated using (private.is_flat_member(flat_id));
create policy contributions_insert_own_or_manager on public.contributions for insert to authenticated
with check (private.is_flat_member(flat_id) and (user_id = (select auth.uid()) or private.is_flat_manager(flat_id)) and exists (select 1 from public.cycles c where c.id = cycle_id and c.flat_id = flat_id and c.status = 'open'));
create policy contributions_update_own_or_manager on public.contributions for update to authenticated using (private.is_flat_member(flat_id) and (user_id = (select auth.uid()) or private.is_flat_manager(flat_id))) with check (private.is_flat_member(flat_id) and (user_id = (select auth.uid()) or private.is_flat_manager(flat_id)));
create policy contributions_delete_manager on public.contributions for delete to authenticated using (private.is_flat_manager(flat_id));

create policy settlements_select_member on public.settlements for select to authenticated using (private.is_flat_member(flat_id));

create policy notifications_select_own on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy notifications_update_own on public.notifications for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy audit_select_manager on public.audit_logs for select to authenticated using (private.is_flat_manager(flat_id));
