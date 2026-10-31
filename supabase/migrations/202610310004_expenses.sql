begin;

-- Extend the existing ledger: dashboard entries stay in the same table.
alter table public.finance_entries add column category text not null default 'Other'
  check (length(trim(category)) between 1 and 40);
create index finance_owner_category_date on public.finance_entries(user_id,category,entry_date);

create function public.expense_summary(p_month date)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
  today date := (now() at time zone 'Asia/Dhaka')::date;
  next_month date := (p_month + interval '1 month')::date;
  last_day date;
  opening bigint;
  income bigint;
  expenses bigint;
  currency_code text;
begin
  if owner_id is null then raise exception 'Sign in first'; end if;
  if p_month is null or extract(day from p_month) <> 1 or p_month > date_trunc('month',today)::date then
    raise exception 'Choose the first day of a current or past month.';
  end if;
  last_day := least(today,next_month-1);
  select currency into currency_code from public.profiles where id=owner_id;
  select opening_balance_minor into opening from public.monthly_plans where user_id=owner_id and month_start=p_month;
  select coalesce(sum(amount_minor) filter(where kind='income'),0), coalesce(sum(amount_minor) filter(where kind='expense'),0)
    into income,expenses from public.finance_entries where user_id=owner_id and entry_date >= p_month and entry_date < next_month;

  return jsonb_build_object(
    'month_start',p_month,'currency',coalesce(currency_code,'BDT'),
    'opening_balance',opening,'income',income,'expenses',expenses,'net',income-expenses,'balance',opening+income-expenses,
    'categories',(select coalesce(jsonb_agg(row_to_json(r) order by r.amount desc,r.category),'[]'::jsonb) from (
      select category,sum(amount_minor) as amount,count(*) as entries from public.finance_entries
      where user_id=owner_id and kind='expense' and entry_date >= p_month and entry_date < next_month group by category
    )r),
    'category_options',(select coalesce(jsonb_agg(category order by category),'[]'::jsonb) from (
      select distinct category from public.finance_entries where user_id=owner_id and entry_date >= p_month and entry_date < next_month
    )r),
    'daily',(select coalesce(jsonb_agg(row_to_json(r) order by r.entry_date),'[]'::jsonb) from (
      select day.value::date as entry_date,
        coalesce(sum(e.amount_minor) filter(where e.kind='expense'),0) as expenses,
        coalesce(sum(e.amount_minor) filter(where e.kind='income'),0) as income
      from generate_series(p_month::timestamp,last_day::timestamp,interval '1 day')day(value)
      left join public.finance_entries e on e.user_id=owner_id and e.entry_date=day.value::date group by day.value
    )r),
    -- Whole Monday-Sunday weeks, including any days outside the displayed month.
    'weeks',(select coalesce(jsonb_agg(row_to_json(r) order by r.week_start),'[]'::jsonb) from (
      select week.value::date as week_start,b.budget_minor,
        coalesce((select sum(e.amount_minor) from public.finance_entries e where e.user_id=owner_id and e.kind='expense'
          and e.entry_date between week.value::date and week.value::date+6),0) as spent
      from generate_series(date_trunc('week',p_month)::timestamp,last_day::timestamp,interval '7 days')week(value)
      left join public.weekly_budgets b on b.user_id=owner_id and b.week_start=week.value::date
    )r)
  );
end;
$$;

-- Return totals and a page from the same SQL snapshot. Export is deliberately
-- scalar JSON so the REST row cap cannot silently truncate an export.
create function public.expense_transactions(
  p_month date,p_kind text default 'all',p_category text default '',p_search text default '',
  p_day date default null,p_page integer default 0,p_export boolean default false
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
  today date := (now() at time zone 'Asia/Dhaka')::date;
  result jsonb;
begin
  if owner_id is null then raise exception 'Sign in first'; end if;
  if p_month is null or extract(day from p_month) <> 1 or p_month > date_trunc('month',today)::date then
    raise exception 'Choose the first day of a current or past month.';
  end if;
  if p_kind is null or p_kind not in ('all','expense','income') or p_page is null or p_page < 0 or p_page > 100000
    or p_category is null or length(p_category)>40 or p_search is null or length(p_search)>200 or p_export is null then
    raise exception 'Invalid transaction filter.';
  end if;
  if p_day is not null and (p_day < p_month or p_day >= (p_month+interval '1 month')::date) then
    raise exception 'The selected day must belong to the selected month.';
  end if;

  with filtered as materialized (
    select id,entry_date,title,kind,category,amount_minor,created_at from public.finance_entries
    where user_id=owner_id and entry_date >= p_month and entry_date < (p_month+interval '1 month')::date
      and (p_kind='all' or kind=p_kind) and (p_category='' or category=p_category)
      and (p_search='' or position(lower(p_search) in lower(title))>0)
      and (p_day is null or entry_date=p_day)
  ), page as (
    select * from filtered order by entry_date desc,created_at desc,id
    limit case when p_export then null else 20 end
    offset case when p_export then 0 else p_page*20 end
  )
  select jsonb_build_object(
    'total',(select count(*) from filtered),
    'income',(select coalesce(sum(amount_minor),0) from filtered where kind='income'),
    'expenses',(select coalesce(sum(amount_minor),0) from filtered where kind='expense'),
    'entries',(select coalesce(jsonb_agg(row_to_json(page) order by entry_date desc,created_at desc,id),'[]'::jsonb) from page)
  )into result;
  return result;
end;
$$;

revoke all on function public.expense_summary(date) from public,anon;
grant execute on function public.expense_summary(date) to authenticated;
revoke all on function public.expense_transactions(date,text,text,text,date,integer,boolean) from public,anon;
grant execute on function public.expense_transactions(date,text,text,text,date,integer,boolean) to authenticated;
commit;
