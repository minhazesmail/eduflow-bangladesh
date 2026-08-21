-- Align live notices table with the application contract used by CRUD/UI.
alter table public.notices add column if not exists status text not null default 'published';
update public.notices set status='published' where status is null;
