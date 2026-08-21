-- Monthly fee ledger. Canonical Supabase migration source.
create table if not exists public.fee_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  billing_month date not null,
  amount_due numeric(12,2) not null default 0 check (amount_due >= 0),
  discount numeric(12,2) not null default 0 check (discount >= 0),
  note text,
  status text not null default 'open' check (status in ('open','partial','paid','void')),
  created_at timestamptz not null default now(),
  unique (student_id, billing_month)
);
create table if not exists public.fee_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invoice_id uuid not null references public.fee_invoices(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  payment_method text not null,
  receipt_no text not null,
  paid_at timestamptz not null default now(),
  reference text,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists fee_invoices_org_month_idx on public.fee_invoices(organization_id, billing_month desc);
create index if not exists fee_invoices_student_idx on public.fee_invoices(student_id, billing_month desc);
create index if not exists fee_payments_invoice_idx on public.fee_payments(invoice_id, paid_at desc);
create index if not exists fee_payments_org_idx on public.fee_payments(organization_id, paid_at desc);
alter table public.fee_invoices enable row level security;
alter table public.fee_payments enable row level security;
drop policy if exists "owner admin manage fee invoices" on public.fee_invoices;
drop policy if exists "teacher staff read fee invoices" on public.fee_invoices;
drop policy if exists "owner admin staff manage fee payments" on public.fee_payments;
drop policy if exists "teacher read fee payments" on public.fee_payments;
create policy "owner admin manage fee invoices" on public.fee_invoices for all to authenticated using (organization_id = private.user_org_id() and private.user_role() in ('owner','admin')) with check (organization_id = private.user_org_id() and private.user_role() in ('owner','admin'));
create policy "teacher staff read fee invoices" on public.fee_invoices for select to authenticated using (organization_id = private.user_org_id() and private.user_role() in ('teacher','staff'));
create policy "owner admin staff manage fee payments" on public.fee_payments for all to authenticated using (organization_id = private.user_org_id() and private.user_role() in ('owner','admin','staff')) with check (organization_id = private.user_org_id() and private.user_role() in ('owner','admin','staff'));
create policy "teacher read fee payments" on public.fee_payments for select to authenticated using (organization_id = private.user_org_id() and private.user_role() = 'teacher');
create or replace function private.refresh_fee_invoice_status(p_invoice_id uuid) returns void language plpgsql security definer set search_path = public as $$
declare due numeric(12,2); paid numeric(12,2); new_status text;
begin
  select greatest(amount_due - discount, 0) into due from public.fee_invoices where id = p_invoice_id;
  if due is null then return; end if;
  select coalesce(sum(amount), 0) into paid from public.fee_payments where invoice_id = p_invoice_id;
  if paid >= due then new_status := 'paid'; elsif paid > 0 then new_status := 'partial'; else new_status := 'open'; end if;
  update public.fee_invoices set status = new_status where id = p_invoice_id;
end; $$;
revoke all on function private.refresh_fee_invoice_status(uuid) from public, anon, authenticated;
create or replace function private.sync_fee_invoice_status() returns trigger language plpgsql security definer set search_path = public as $$
begin perform private.refresh_fee_invoice_status(coalesce(new.invoice_id, old.invoice_id)); return coalesce(new, old); end; $$;
revoke all on function private.sync_fee_invoice_status() from public, anon, authenticated;
drop trigger if exists fee_payment_status_sync on public.fee_payments;
create trigger fee_payment_status_sync after insert or update or delete on public.fee_payments for each row execute function private.sync_fee_invoice_status();
