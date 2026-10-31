begin;

create table public.focus_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  entry_date date not null check (entry_date <= (now() at time zone 'Asia/Dhaka')::date),
  title text not null check (length(trim(title)) between 1 and 200),
  minutes integer not null check (minutes between 1 and 1440),
  created_at timestamptz not null default now()
);
create table public.reading_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  entry_date date not null check (entry_date <= (now() at time zone 'Asia/Dhaka')::date),
  title text not null check (length(trim(title)) between 1 and 200),
  pages integer not null check (pages between 1 and 10000),
  created_at timestamptz not null default now()
);
create table public.finance_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  entry_date date not null check (entry_date <= (now() at time zone 'Asia/Dhaka')::date),
  title text not null check (length(trim(title)) between 1 and 200),
  kind text not null check (kind in ('expense','income')),
  amount_minor bigint not null check (amount_minor between 1 and 9000000000000),
  created_at timestamptz not null default now()
);
create table public.monthly_plans (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  month_start date not null check (extract(day from month_start) = 1),
  opening_balance_minor bigint not null check (opening_balance_minor between -9000000000000 and 9000000000000),
  primary key (user_id, month_start)
);
create table public.weekly_budgets (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  week_start date not null check (extract(isodow from week_start) = 1),
  budget_minor bigint not null check (budget_minor between 0 and 9000000000000),
  primary key (user_id, week_start)
);

do $$
declare table_name text;
begin
  foreach table_name in array array['focus_logs','reading_logs','finance_entries','monthly_plans','weekly_budgets'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from anon', table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
    execute format('create policy "Own records only" on public.%I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', table_name);
  end loop;
end $$;
create index focus_owner_date on public.focus_logs(user_id, entry_date);
create index reading_owner_date on public.reading_logs(user_id, entry_date);
create index finance_owner_date on public.finance_entries(user_id, entry_date);

-- Aggregates run in the database so API row limits never truncate totals.
create function public.dashboard_summary()
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
  today date := (now() at time zone 'Asia/Dhaka')::date;
  monday date := date_trunc('week', now() at time zone 'Asia/Dhaka')::date;
  period_month date := date_trunc('month', now() at time zone 'Asia/Dhaka')::date;
  tracking_start date;
  profile_currency text;
  monthly_score numeric;
  opening bigint;
  budget bigint;
  spent bigint;
  income bigint;
  monthly_expenses bigint;
begin
  if owner_id is null then raise exception 'Sign in first'; end if;
  insert into public.profiles(id) values (owner_id) on conflict do nothing;
  perform public.prepare_task_day();
  select tracking_start_date, currency into tracking_start, profile_currency from public.profiles where id=owner_id;
  select opening_balance_minor into opening from public.monthly_plans where user_id=owner_id and month_start=period_month;
  select budget_minor into budget from public.weekly_budgets where user_id=owner_id and week_start=monday;
  select coalesce(sum(amount_minor),0) into spent from public.finance_entries where user_id=owner_id and kind='expense' and entry_date between monday and today;
  select coalesce(sum(amount_minor) filter (where kind='income'),0), coalesce(sum(amount_minor) filter (where kind='expense'),0)
    into income, monthly_expenses from public.finance_entries where user_id=owner_id and entry_date between period_month and today;

  select round(avg(coalesce(scores.score,0)),1) into monthly_score
  from generate_series(greatest(period_month, tracking_start)::timestamp,today::timestamp,interval '1 day') day(value)
  left join (
    select task_date, 100.0 * count(*) filter (where completed_at is not null) / count(*) as score
    from public.task_items where user_id=owner_id and template_id is not null and task_date between period_month and today group by task_date
  ) scores on scores.task_date=day.value::date;

  return jsonb_build_object(
    'today',today,'week_start',monday,'month_start',period_month,'currency',profile_currency,
    'tracking_start',tracking_start,'monthly_score',coalesce(monthly_score,0),
    'targets_today',(select count(*) from public.task_items where user_id=owner_id and task_date=today and template_id is not null),
    'targets_done',(select count(*) from public.task_items where user_id=owner_id and task_date=today and template_id is not null and completed_at is not null),
    'weekly_tasks',(select count(*) from public.task_items where user_id=owner_id and task_date between monday and today and completed_at is not null),
    'weekly_pages',(select coalesce(sum(pages),0) from public.reading_logs where user_id=owner_id and entry_date between monday and today),
    'weekly_minutes',(select coalesce(sum(minutes),0) from public.focus_logs where user_id=owner_id and entry_date between monday and today),
    'weekly_spent',spent,'weekly_budget',budget,'weekly_remaining',budget-spent,
    'opening_balance',opening,'monthly_income',income,'monthly_expenses',monthly_expenses,'monthly_balance',opening+income-monthly_expenses,
    'daily_progress',(select coalesce(jsonb_agg(row_to_json(r) order by r.task_date),'[]'::jsonb) from (
      select day.value::date as task_date, count(t.id) filter (where t.completed_at is not null) as done, count(t.id) as total
      from generate_series(monday::timestamp,(monday+6)::timestamp,interval '1 day') day(value)
      left join public.task_items t on t.user_id=owner_id and t.task_date=day.value::date and t.template_id is not null
      group by day.value
    ) r),
    'timed_tasks',(select coalesce(jsonb_agg(row_to_json(r)),'[]'::jsonb) from (
      select id,title,task_date,start_time,end_time from public.task_items
      where user_id=owner_id and task_date between today-1 and today+7 and start_time is not null and completed_at is null
      order by task_date,start_time
    ) r),
    'schedule',(select coalesce(jsonb_agg(row_to_json(r)),'[]'::jsonb) from (
      select id,title,routine,start_time,end_time from public.schedule_blocks where user_id=owner_id order by start_time
    ) r)
  );
end;
$$;
revoke all on function public.dashboard_summary() from public, anon;
grant execute on function public.dashboard_summary() to authenticated;

create function public.save_dashboard_plan(p_opening bigint, p_budget bigint, p_month date default null, p_week date default null)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
  current_month date := date_trunc('month',now() at time zone 'Asia/Dhaka')::date;
  current_week date := date_trunc('week',now() at time zone 'Asia/Dhaka')::date;
begin
  if owner_id is null then raise exception 'Sign in first'; end if;
  if coalesce(p_month,current_month) <> current_month or coalesce(p_week,current_week) <> current_week then
    raise exception 'The week or month changed while this form was open. Close it, refresh, and reopen your money plan.';
  end if;
  if p_opening is null then
    delete from public.monthly_plans where user_id=owner_id and month_start=current_month;
  else
    insert into public.monthly_plans(user_id,month_start,opening_balance_minor) values(owner_id,current_month,p_opening)
    on conflict (user_id,month_start) do update set opening_balance_minor=excluded.opening_balance_minor;
  end if;
  if p_budget is null then
    delete from public.weekly_budgets where user_id=owner_id and week_start=current_week;
  else
    insert into public.weekly_budgets(user_id,week_start,budget_minor) values(owner_id,current_week,p_budget)
    on conflict (user_id,week_start) do update set budget_minor=excluded.budget_minor;
  end if;
end;
$$;
revoke all on function public.save_dashboard_plan(bigint,bigint,date,date) from public,anon;
grant execute on function public.save_dashboard_plan(bigint,bigint,date,date) to authenticated;
commit;
