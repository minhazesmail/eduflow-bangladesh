insert into storage.buckets (id, name, public) values ('receipts','receipts',false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('avatars','avatars',false) on conflict (id) do nothing;

create policy receipts_select_member on storage.objects for select to authenticated
using (bucket_id='receipts' and exists (select 1 from public.expenses e where e.receipt_image_url = storage.objects.name and private.is_flat_member(e.flat_id)));
create policy receipts_insert_manager on storage.objects for insert to authenticated
with check (bucket_id='receipts' and (storage.foldername(name))[1] is not null and exists (select 1 from public.flats f where f.id = ((storage.foldername(name))[1])::uuid and private.is_flat_manager(f.id)));
create policy avatars_select_own on storage.objects for select to authenticated using (bucket_id='avatars' and owner_id = (select auth.uid())::text);
create policy avatars_insert_own on storage.objects for insert to authenticated with check (bucket_id='avatars' and owner_id = (select auth.uid())::text);
