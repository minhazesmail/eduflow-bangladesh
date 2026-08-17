-- Keep workspace settings restricted to owner/admin, matching production RLS.
drop policy if exists "authenticated users update own organization" on public.organizations;
create policy "owner admin update own organization"
on public.organizations
for update to authenticated
using (id = private.user_org_id() and private.user_role() in ('owner','admin'))
with check (id = private.user_org_id() and private.user_role() in ('owner','admin'));
