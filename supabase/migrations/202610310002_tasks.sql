begin;

create table public.task_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  initialized_at timestamptz not null default now()
);

create table public.task_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 200),
  tag text not null default '' check (length(tag) <= 40),
  color text not null default '#66845c' check (color ~ '^#[0-9a-fA-F]{6}$'),
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  days integer[] not null default '{0,1,2,3,4,5,6}' check (cardinality(days) > 0 and days <@ array[0,1,2,3,4,5,6]),
  start_date date not null default ((now() at time zone 'Asia/Dhaka')::date),
  archived_from date,
  created_at timestamptz not null default now(),
  unique (id, user_id),
  check (archived_from is null or archived_from >= start_date)
);

create table public.task_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  template_id uuid,
  task_date date not null,
  title text not null check (length(trim(title)) between 1 and 200),
  notes text not null default '' check (length(notes) <= 2000),
  tag text not null default '' check (length(tag) <= 40),
  color text not null default '#66845c' check (color ~ '^#[0-9a-fA-F]{6}$'),
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  start_time time,
  end_time time,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (template_id, user_id) references public.task_templates(id, user_id),
  unique (template_id, task_date),
  check ((start_time is null and end_time is null) or (start_time is not null and end_time is not null and start_time <> end_time)),
  check (completed_at is null or task_date <= ((now() at time zone 'Asia/Dhaka')::date))
);
create index task_items_owner_date on public.task_items(user_id, task_date);

create table public.schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  routine text not null check (routine in ('weekday','weekend')),
  title text not null check (length(trim(title)) between 1 and 200),
  start_time time not null,
  end_time time not null,
  check (start_time <> end_time)
);
create index schedule_owner_routine on public.schedule_blocks(user_id, routine);

do $$
declare table_name text;
begin
  foreach table_name in array array['task_settings','task_templates','task_items','schedule_blocks'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from anon', table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
    execute format('create policy "Own records only" on public.%I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', table_name);
  end loop;
end $$;
-- Recurring templates are archived so their dated history can always retain its source.
revoke delete on public.task_templates from authenticated;

create function public.prepare_task_day()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
  today date := (now() at time zone 'Asia/Dhaka')::date;
  first_setup boolean;
begin
  if owner_id is null then raise exception 'Sign in first'; end if;
  insert into public.task_settings(user_id) values (owner_id) on conflict do nothing;
  first_setup := found;
  -- Serialize initialization/materialization across tabs for this owner.
  perform 1 from public.task_settings where user_id = owner_id for update;
  if first_setup then
    insert into public.task_templates(user_id, title, tag, color, days)
    values
      (owner_id, 'Memorise 1 Hadith', 'Faith', '#66845c', array[0,1,2,3,4,5,6]),
      (owner_id, 'Memorise 1 Ayah', 'Faith', '#66845c', array[0,1,2,3,4,5,6]),
      (owner_id, 'Read 10 pages', 'Reading', '#b78b4b', array[0,1,2,3,4,5,6]),
      (owner_id, 'Drink 3 litres of water', 'Health', '#568aa2', array[0,1,2,3,4,5,6]),
      (owner_id, 'Exercise for 40 minutes', 'Health', '#a07b92', array[1,2,3,4,5,6]),
      (owner_id, 'Practice AI for 3 hours', 'Learning', '#7b79aa', array[0,1,2,3,4,5,6]);

    insert into public.schedule_blocks(user_id, routine, title, start_time, end_time)
    select owner_id, r.routine, b.title, b.starts::time, b.ends::time
    from (values ('weekday'), ('weekend')) as r(routine)
    cross join (values
      ('Sleep','00:00','05:30'), ('Fajr prayer','05:30','06:30'),
      ('Exercise','06:30','07:30'), ('Shower and rest','07:30','08:00'),
      ('Isha prayer','19:30','20:00'), ('AI automation','20:00','23:30'),
      ('Dinner and wind-down','23:30','00:00')
    ) as b(title, starts, ends);
    insert into public.schedule_blocks(user_id, routine, title, start_time, end_time)
    select owner_id, b.routine, b.title, b.starts::time, b.ends::time
    from (values
      ('weekday','AI automation','08:00','11:30'),
      ('weekday','Commute to office','11:30','12:00'),
      ('weekday','Office','12:00','16:00'),
      ('weekday','University study','16:00','18:00'),
      ('weekday','Commute home','18:00','18:30'),
      ('weekday','Trading study','18:30','19:30'),
      ('weekend','AI automation','08:00','10:30'),
      ('weekend','Commute to university','10:30','11:00'),
      ('weekend','University','11:00','17:00'),
      ('weekend','Commute home','17:00','17:30'),
      ('weekend','Maghrib prayer and rest','17:30','18:30'),
      ('weekend','University study','18:30','19:30')
    ) as b(routine, title, starts, ends);
  end if;

  -- Backfill every applicable elapsed day, including days the app was not opened.
  -- Snapshots never overwrite existing titles, metadata, or completion history.
  insert into public.task_items(user_id, template_id, task_date, title, tag, color, priority)
  select owner_id, t.id, day.value::date, t.title, t.tag, t.color, t.priority
  from public.task_templates t
  cross join lateral generate_series(t.start_date::timestamp,
    least(today, coalesce(t.archived_from - 1, today))::timestamp, interval '1 day') day(value)
  where t.user_id = owner_id and extract(dow from day.value)::integer = any(t.days)
  on conflict (template_id, task_date) do nothing;
end;
$$;
revoke all on function public.prepare_task_day() from public, anon;
grant execute on function public.prepare_task_day() to authenticated;

commit;
