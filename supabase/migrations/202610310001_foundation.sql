begin;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 100),
  timezone text not null default 'Asia/Dhaka' check (timezone = 'Asia/Dhaka'),
  currency text not null default 'BDT' check (currency ~ '^[A-Z]{3}$'),
  tracking_start_date date not null default ((now() at time zone 'Asia/Dhaka')::date),
  roadmap_start_date date not null default '2026-11-01',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
revoke all on public.profiles from anon;
grant select, insert, update, delete on public.profiles to authenticated;

create policy "Read own profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "Create own profile" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "Update own profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "Delete own profile" on public.profiles for delete to authenticated using ((select auth.uid()) = id);

commit;
