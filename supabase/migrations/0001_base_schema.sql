-- EduFlow Bangladesh base schema
-- Fresh-project bootstrap. Run this BEFORE migration.sql.

create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  district text,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  full_name text not null,
  role text not null default 'owner' check (role in ('owner','admin','teacher','staff')),
  created_at timestamptz not null default now()
);

create table if not exists public.batches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  subject text,
  teacher_name text,
  class_time text,
  room text,
  created_at timestamptz not null default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  student_code text not null,
  name text not null,
  phone text,
  guardian_name text,
  guardian_phone text,
  gender text,
  class_level text,
  school_name text,
  batch_id uuid references public.batches(id) on delete set null,
  monthly_fee numeric(12,2) not null default 0,
  status text not null default 'active' check (status in ('active','inactive','graduated','left')),
  admission_date date,
  created_at timestamptz not null default now(),
  unique (organization_id, student_code)
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  attendance_date date not null,
  present boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  unique (student_id, attendance_date)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  payment_method text not null default 'cash',
  receipt_no text,
  paid_at timestamptz not null default now(),
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  subject text,
  exam_date date,
  total_marks integer not null default 100 check (total_marks > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.results (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  exam_id uuid not null references public.exams(id) on delete cascade,
  marks numeric(10,2) not null check (marks >= 0),
  created_at timestamptz not null default now(),
  unique (student_id, exam_id)
);

create table if not exists public.teachers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  subject text,
  phone text,
  rate_per_class numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  body text not null,
  status text not null default 'published' check (status in ('draft','published','archived')),
  created_at timestamptz not null default now()
);

create index if not exists profiles_org_idx on public.profiles(organization_id);
create index if not exists batches_org_idx_base on public.batches(organization_id, created_at desc);
create index if not exists students_org_idx_base on public.students(organization_id, created_at desc);
create index if not exists attendance_org_date_idx_base on public.attendance(organization_id, attendance_date desc);
create index if not exists payments_org_paid_idx_base on public.payments(organization_id, paid_at desc);
create index if not exists exams_org_date_idx_base on public.exams(organization_id, exam_date desc);
create index if not exists results_org_idx_base on public.results(organization_id, created_at desc);
create index if not exists teachers_org_idx_base on public.teachers(organization_id, created_at desc);
create index if not exists notices_org_idx_base on public.notices(organization_id, created_at desc);

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.batches enable row level security;
alter table public.students enable row level security;
alter table public.attendance enable row level security;
alter table public.payments enable row level security;
alter table public.exams enable row level security;
alter table public.results enable row level security;
alter table public.teachers enable row level security;
alter table public.notices enable row level security;

drop policy if exists "users view own profile" on public.profiles;
create policy "users view own profile" on public.profiles
  for select to authenticated
  using (id = auth.uid());
