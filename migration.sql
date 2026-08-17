-- EduFlow fix: allow a signed-in workspace owner/member to update the organization profile.
create policy "org members can update organization"
on public.organizations
for update
 to authenticated
 using (id = user_org_id())
 with check (id = user_org_id());
