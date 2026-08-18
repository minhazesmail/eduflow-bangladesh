create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text unique not null,
  full_name text not null default 'MealHisab User',
  avatar_url text,
  language text not null default 'en' check (language in ('en','bn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.flats (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 100),
  address text,
  month_start_day integer not null default 1 check (month_start_day between 1 and 28),
  meal_policy text not null default 'opt_out' check (meal_policy in ('opt_out','opt_in')),
  invite_code text unique not null,
  currency text not null default 'BDT' check (currency = 'BDT'),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.flat_members (
  id uuid primary key default gen_random_uuid(),
  flat_id uuid not null references public.flats(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('admin','manager','member')),
  status text not null default 'active' check (status in ('active','left')),
  joined_at date not null default current_date,
  left_at date,
  unique(flat_id, user_id),
  check ((status = 'active' and left_at is null) or (status = 'left' and left_at is not null))
);

create table if not exists public.cycles (
  id uuid primary key default gen_random_uuid(),
  flat_id uuid not null references public.flats(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz not null default now(),
  unique(flat_id, start_date),
  check (end_date >= start_date)
);

create table if not exists public.cycle_members (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.cycles(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  active_from date not null,
  active_to date,
  opening_balance numeric(14,6) not null default 0,
  created_at timestamptz not null default now(),
  unique(cycle_id, user_id),
  check (active_to is null or active_to >= active_from)
);

create table if not exists public.meal_logs (
  id uuid primary key default gen_random_uuid(),
  flat_id uuid not null references public.flats(id) on delete cascade,
  cycle_id uuid not null references public.cycles(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  meal_type text not null check (meal_type in ('lunch','dinner','extra')),
  count integer not null default 1 check (count >= 0 and count <= 100),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(flat_id, user_id, date, meal_type)
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  flat_id uuid not null references public.flats(id) on delete cascade,
  cycle_id uuid not null references public.cycles(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  category text not null default 'grocery' check (category in ('grocery','cook_salary','gas','other')),
  note text,
  receipt_image_url text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.contributions (
  id uuid primary key default gen_random_uuid(),
  flat_id uuid not null references public.flats(id) on delete cascade,
  cycle_id uuid not null references public.cycles(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  note text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.settlements (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.cycles(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  flat_id uuid not null references public.flats(id) on delete cascade,
  total_meals integer not null,
  meal_cost numeric(14,6) not null,
  total_contribution numeric(12,2) not null,
  opening_balance numeric(14,6) not null,
  balance numeric(14,6) not null,
  created_at timestamptz not null default now(),
  unique(cycle_id, user_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  flat_id uuid not null references public.flats(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('meal_reminder','system')),
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  flat_id uuid references public.flats(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_flat_members_user on public.flat_members(user_id, status);
create index if not exists idx_flat_members_flat on public.flat_members(flat_id, status);
create index if not exists idx_cycles_flat_status on public.cycles(flat_id, status);
create index if not exists idx_cycle_members_cycle on public.cycle_members(cycle_id, user_id);
create index if not exists idx_meal_logs_cycle_user_date on public.meal_logs(cycle_id, user_id, date);
create index if not exists idx_expenses_cycle_category on public.expenses(cycle_id, category);
create index if not exists idx_contributions_cycle_user on public.contributions(cycle_id, user_id);
create index if not exists idx_notifications_user on public.notifications(user_id, read_at, created_at desc);
create index if not exists idx_audit_flat_time on public.audit_logs(flat_id, created_at desc);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.touch_updated_at();
drop trigger if exists flats_updated_at on public.flats;
create trigger flats_updated_at before update on public.flats for each row execute function public.touch_updated_at();
drop trigger if exists meal_logs_updated_at on public.meal_logs;
create trigger meal_logs_updated_at before update on public.meal_logs for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles(id, phone, full_name)
  values (new.id, coalesce(new.phone, ''), coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), 'MealHisab User'))
  on conflict (id) do update set phone = excluded.phone;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
