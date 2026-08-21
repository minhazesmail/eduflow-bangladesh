-- EduFlow Growth Feature Foundation
-- Adds: guardians/portal, notifications, admissions CRM, branches,
-- routine scheduling, expenses, reports, payment integrations, AI usage,
-- and attention/analytics signals.

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  code text,
  phone text,
  address text,
  district text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, code)
);
create index if not exists branches_org_idx on public.branches(organization_id, created_at desc);

alter table public.students add column if not exists branch_id uuid references public.branches(id) on delete set null;
alter table public.batches add column if not exists branch_id uuid references public.branches(id) on delete set null;
alter table public.teachers add column if not exists branch_id uuid references public.branches(id) on delete set null;
alter table public.payments add column if not exists branch_id uuid references public.branches(id) on delete set null;
alter table public.exams add column if not exists branch_id uuid references public.branches(id) on delete set null;
alter table public.notices add column if not exists branch_id uuid references public.branches(id) on delete set null;

create table if not exists public.guardians (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  full_name text not null,
  phone text,
  email text,
  relationship text,
  preferred_language text not null default 'bn' check (preferred_language in ('bn','en','bn-en')),
  portal_enabled boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists guardians_org_idx on public.guardians(organization_id, created_at desc);
create index if not exists guardians_phone_idx on public.guardians(organization_id, phone);

create table if not exists public.student_guardians (
  student_id uuid not null references public.students(id) on delete cascade,
  guardian_id uuid not null references public.guardians(id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (student_id, guardian_id)
);
create index if not exists student_guardians_guardian_idx on public.student_guardians(guardian_id);

create table if not exists public.guardian_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  guardian_id uuid not null unique references public.guardians(id) on delete cascade,
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);
create index if not exists guardian_accounts_org_idx on public.guardian_accounts(organization_id);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  guardian_id uuid references public.guardians(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  channel text not null check (channel in ('in_app','sms','whatsapp','email')),
  type text not null,
  title text not null,
  body text not null,
  status text not null default 'queued' check (status in ('queued','sent','delivered','failed','read')),
  provider_message_id text,
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_org_idx on public.notifications(organization_id, created_at desc);
create index if not exists notifications_guardian_idx on public.notifications(guardian_id, created_at desc);

create table if not exists public.admission_leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  name text not null,
  phone text,
  guardian_name text,
  guardian_phone text,
  email text,
  source text not null default 'walk_in',
  interested_course text,
  preferred_batch text,
  counsellor text,
  stage text not null default 'new' check (stage in ('new','contacted','counselling','applied','admitted','lost')),
  next_follow_up_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists admission_leads_org_idx on public.admission_leads(organization_id, stage, created_at desc);

create table if not exists public.routine_slots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  batch_id uuid not null references public.batches(id) on delete cascade,
  teacher_id uuid references public.teachers(id) on delete set null,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  room text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);
create index if not exists routine_slots_org_idx on public.routine_slots(organization_id, day_of_week, start_time);
create index if not exists routine_slots_teacher_idx on public.routine_slots(teacher_id, day_of_week, start_time);
create index if not exists routine_slots_batch_idx on public.routine_slots(batch_id, day_of_week, start_time);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  category text not null,
  description text,
  amount numeric(12,2) not null check (amount > 0),
  expense_date date not null default current_date,
  payment_method text,
  reference text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists expenses_org_date_idx on public.expenses(organization_id, expense_date desc);

create table if not exists public.generated_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_type text not null check (document_type in ('report_card','marksheet','fee_receipt','admission_receipt','student_id','batch_roster','attendance_report','fee_statement','salary_statement')),
  student_id uuid references public.students(id) on delete cascade,
  payload jsonb not null default '{}',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists generated_documents_org_idx on public.generated_documents(organization_id, created_at desc);

create table if not exists public.payment_integrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  provider text not null check (provider in ('bkash','nagad','stripe','manual')),
  is_enabled boolean not null default false,
  merchant_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  estimated_cost numeric(12,6) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_org_idx on public.ai_usage(organization_id, created_at desc);

create table if not exists public.notification_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  key text not null,
  language text not null default 'bn' check (language in ('bn','en','bn-en')),
  title text not null,
  body text not null,
  is_active boolean not null default true,
  unique (organization_id, key, language)
);

create table if not exists public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  key text not null,
  enabled boolean not null default false,
  config jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  unique (organization_id, key)
);

-- RLS helpers: all growth tables are strictly tenant scoped.
alter table public.branches enable row level security;
alter table public.guardians enable row level security;
alter table public.student_guardians enable row level security;
alter table public.guardian_accounts enable row level security;
alter table public.notifications enable row level security;
alter table public.admission_leads enable row level security;
alter table public.routine_slots enable row level security;
alter table public.expenses enable row level security;
alter table public.generated_documents enable row level security;
alter table public.payment_integrations enable row level security;
alter table public.ai_usage enable row level security;
alter table public.notification_templates enable row level security;
alter table public.feature_flags enable row level security;

create policy "org members view branches" on public.branches for select to authenticated
  using (organization_id = private.user_org_id());
create policy "admins manage branches" on public.branches for all to authenticated
  using (organization_id = private.user_org_id() and private.user_role() in ('owner','admin'))
  with check (organization_id = private.user_org_id() and private.user_role() in ('owner','admin'));

create policy "org members view guardians" on public.guardians for select to authenticated
  using (organization_id = private.user_org_id());
create policy "staff manage guardians" on public.guardians for all to authenticated
  using (organization_id = private.user_org_id() and private.user_role() in ('owner','admin','staff'))
  with check (organization_id = private.user_org_id() and private.user_role() in ('owner','admin','staff'));

create policy "org members view student guardians" on public.student_guardians for select to authenticated
  using (exists (select 1 from public.guardians g where g.id = guardian_id and g.organization_id = private.user_org_id()));
create policy "staff manage student guardians" on public.student_guardians for all to authenticated
  using (exists (select 1 from public.guardians g where g.id = guardian_id and g.organization_id = private.user_org_id() and private.user_role() in ('owner','admin','staff')))
  with check (exists (select 1 from public.guardians g where g.id = guardian_id and g.organization_id = private.user_org_id() and private.user_role() in ('owner','admin','staff')));

create policy "guardians manage own account" on public.guardian_accounts for select to authenticated
  using (organization_id = private.user_org_id() or auth_user_id = auth.uid());
create policy "owners manage guardian accounts" on public.guardian_accounts for all to authenticated
  using (organization_id = private.user_org_id() and private.user_role() = 'owner')
  with check (organization_id = private.user_org_id() and private.user_role() = 'owner');

create policy "org members view notifications" on public.notifications for select to authenticated
  using (organization_id = private.user_org_id());
create policy "staff create notifications" on public.notifications for insert to authenticated
  with check (organization_id = private.user_org_id() and private.user_role() in ('owner','admin','staff'));
create policy "staff update notifications" on public.notifications for update to authenticated
  using (organization_id = private.user_org_id() and private.user_role() in ('owner','admin','staff'))
  with check (organization_id = private.user_org_id() and private.user_role() in ('owner','admin','staff'));

create policy "org members view leads" on public.admission_leads for select to authenticated
  using (organization_id = private.user_org_id());
create policy "staff manage leads" on public.admission_leads for all to authenticated
  using (organization_id = private.user_org_id() and private.user_role() in ('owner','admin','staff'))
  with check (organization_id = private.user_org_id() and private.user_role() in ('owner','admin','staff'));

create policy "org members view routine" on public.routine_slots for select to authenticated
  using (organization_id = private.user_org_id());
create policy "admins manage routine" on public.routine_slots for all to authenticated
  using (organization_id = private.user_org_id() and private.user_role() in ('owner','admin'))
  with check (organization_id = private.user_org_id() and private.user_role() in ('owner','admin'));

create policy "admins view expenses" on public.expenses for select to authenticated
  using (organization_id = private.user_org_id() and private.user_role() in ('owner','admin'));
create policy "admins manage expenses" on public.expenses for all to authenticated
  using (organization_id = private.user_org_id() and private.user_role() in ('owner','admin'))
  with check (organization_id = private.user_org_id() and private.user_role() in ('owner','admin'));

create policy "org members view documents" on public.generated_documents for select to authenticated
  using (organization_id = private.user_org_id());
create policy "members create documents" on public.generated_documents for insert to authenticated
  with check (organization_id = private.user_org_id() and private.user_role() in ('owner','admin','teacher','staff'));

create policy "owners manage payment integrations" on public.payment_integrations for all to authenticated
  using (organization_id = private.user_org_id() and private.user_role() = 'owner')
  with check (organization_id = private.user_org_id() and private.user_role() = 'owner');

create policy "admins view ai usage" on public.ai_usage for select to authenticated
  using (organization_id = private.user_org_id() and private.user_role() in ('owner','admin'));
create policy "members insert ai usage" on public.ai_usage for insert to authenticated
  with check (organization_id = private.user_org_id() and user_id = auth.uid());

create policy "members view notification templates" on public.notification_templates for select to authenticated
  using (organization_id = private.user_org_id());
create policy "admins manage notification templates" on public.notification_templates for all to authenticated
  using (organization_id = private.user_org_id() and private.user_role() in ('owner','admin'))
  with check (organization_id = private.user_org_id() and private.user_role() in ('owner','admin'));

create policy "members view feature flags" on public.feature_flags for select to authenticated
  using (organization_id = private.user_org_id());
create policy "owners manage feature flags" on public.feature_flags for all to authenticated
  using (organization_id = private.user_org_id() and private.user_role() = 'owner')
  with check (organization_id = private.user_org_id() and private.user_role() = 'owner');

-- Useful default template set for automation.
create or replace function private.seed_notification_templates(target_org uuid)
returns void language sql security definer set search_path = public
as $$
  insert into public.notification_templates (organization_id,key,language,title,body)
  values
    (target_org,'attendance_absent','bn','আজকের অনুপস্থিতি','{{student_name}} আজ ক্লাসে অনুপস্থিত ছিল।'),
    (target_org,'fee_due','bn','ফি বকেয়া','{{student_name}}-এর {{month}} মাসের ফি ৳{{amount}} বকেয়া আছে।'),
    (target_org,'payment_received','bn','পেমেন্ট গ্রহণ করা হয়েছে','{{student_name}}-এর ৳{{amount}} পেমেন্ট গ্রহণ করা হয়েছে। রসিদ: {{receipt_no}}'),
    (target_org,'result_published','bn','ফলাফল প্রকাশিত','{{student_name}}-এর {{exam_name}} ফলাফল প্রকাশিত হয়েছে।')
  on conflict (organization_id,key,language) do nothing;
$$;
revoke all on function private.seed_notification_templates(uuid) from public, anon, authenticated;

create or replace function private.handle_new_org_defaults()
returns trigger language plpgsql security definer set search_path = public
as $$ begin perform private.seed_notification_templates(new.id); return new; end; $$;
drop trigger if exists seed_growth_defaults on public.organizations;
create trigger seed_growth_defaults after insert on public.organizations for each row execute function private.handle_new_org_defaults();
revoke all on function private.handle_new_org_defaults() from public, anon, authenticated;
