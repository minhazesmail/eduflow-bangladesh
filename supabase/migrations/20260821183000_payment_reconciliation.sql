create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete restrict,
  provider text not null check (provider in ('bkash','nagad')),
  merchant_invoice_number text not null,
  provider_payment_id text,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'BDT',
  status text not null default 'pending' check (status in ('pending','verified','failed','cancelled')),
  provider_status text,
  provider_transaction_id text,
  raw_provider_response jsonb,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, merchant_invoice_number),
  unique (provider, provider_payment_id),
  unique (provider, provider_transaction_id)
);

create index if not exists payment_transactions_org_status_idx on public.payment_transactions(organization_id,status,created_at desc);
create index if not exists payment_transactions_student_idx on public.payment_transactions(student_id,created_at desc);

create table if not exists public.monthly_fee_ledger (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete restrict,
  billing_month date not null,
  amount_due numeric(12,2) not null default 0 check (amount_due >= 0),
  amount_paid numeric(12,2) not null default 0 check (amount_paid >= 0),
  status text not null default 'unpaid' check (status in ('unpaid','partial','paid')),
  payment_transaction_id uuid references public.payment_transactions(id) on delete set null,
  payment_id uuid references public.payments(id) on delete set null,
  provider text,
  external_transaction_id text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, student_id, billing_month)
);

create index if not exists monthly_fee_ledger_org_idx on public.monthly_fee_ledger(organization_id,billing_month desc);
create index if not exists monthly_fee_ledger_student_idx on public.monthly_fee_ledger(student_id,billing_month desc);

alter table public.payment_transactions enable row level security;
alter table public.monthly_fee_ledger enable row level security;

drop policy if exists payment_transactions_org_select on public.payment_transactions;
create policy payment_transactions_org_select on public.payment_transactions for select to authenticated using (organization_id = private.user_org_id());

drop policy if exists monthly_fee_ledger_org_select on public.monthly_fee_ledger;
create policy monthly_fee_ledger_org_select on public.monthly_fee_ledger for select to authenticated using (organization_id = private.user_org_id());

revoke all on public.payment_transactions from anon,authenticated;
grant select on public.payment_transactions to authenticated;
revoke all on public.monthly_fee_ledger from anon,authenticated;
grant select on public.monthly_fee_ledger to authenticated;

create or replace function public.reconcile_verified_payment(p_transaction_id uuid, p_provider text, p_provider_status text, p_provider_transaction_id text, p_amount numeric, p_raw_response jsonb)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public
as $$
declare t public.payment_transactions%rowtype; existing_payment public.payments%rowtype; ledger public.monthly_fee_ledger%rowtype; new_payment_id uuid; paid numeric;
begin
  select * into t from public.payment_transactions where id = p_transaction_id for update;
  if not found then raise exception 'payment transaction not found'; end if;
  if t.provider <> p_provider then raise exception 'provider mismatch'; end if;
  if round(t.amount,2) <> round(p_amount,2) then raise exception 'amount mismatch'; end if;
  if p_provider_transaction_id is null or length(trim(p_provider_transaction_id)) = 0 then raise exception 'provider transaction id is required'; end if;
  if t.status = 'verified' then return jsonb_build_object('ok',true,'already_verified',true,'transaction_id',t.id); end if;

  select * into existing_payment from public.payments where organization_id=t.organization_id and receipt_no=p_provider_transaction_id order by paid_at desc limit 1;
  if existing_payment.id is null then
    new_payment_id := gen_random_uuid();
    insert into public.payments(id,organization_id,student_id,amount,payment_method,receipt_no,paid_at,branch_id)
    select new_payment_id,t.organization_id,t.student_id,t.amount,p_provider,p_provider_transaction_id,now(),s.branch_id from public.students s where s.id=t.student_id and s.organization_id=t.organization_id;
  else new_payment_id := existing_payment.id; end if;

  select * into ledger from public.monthly_fee_ledger where organization_id=t.organization_id and student_id=t.student_id and billing_month=date_trunc('month',t.created_at)::date for update;
  if ledger.id is null then
    insert into public.monthly_fee_ledger(organization_id,student_id,billing_month,amount_due,amount_paid,status,payment_transaction_id,payment_id,provider,external_transaction_id,paid_at)
    select t.organization_id,t.student_id,date_trunc('month',t.created_at)::date,coalesce(s.monthly_fee,0),t.amount,case when t.amount>=coalesce(s.monthly_fee,0) then 'paid' else 'partial' end,t.id,new_payment_id,p_provider,p_provider_transaction_id,now() from public.students s where s.id=t.student_id and s.organization_id=t.organization_id;
  else
    paid := ledger.amount_paid + t.amount;
    update public.monthly_fee_ledger set amount_paid=paid,status=case when paid>=ledger.amount_due then 'paid' else 'partial' end,payment_transaction_id=t.id,payment_id=new_payment_id,provider=p_provider,external_transaction_id=p_provider_transaction_id,paid_at=now(),updated_at=now() where id=ledger.id;
  end if;

  update public.payment_transactions set status='verified',provider_status=p_provider_status,provider_transaction_id=p_provider_transaction_id,raw_provider_response=p_raw_response,verified_at=now(),updated_at=now() where id=t.id;
  return jsonb_build_object('ok',true,'already_verified',false,'transaction_id',t.id,'payment_id',new_payment_id);
end;
$$;

revoke all on function public.reconcile_verified_payment(uuid,text,text,text,numeric,jsonb) from public,anon,authenticated;
grant execute on function public.reconcile_verified_payment(uuid,text,text,text,numeric,jsonb) to service_role;
