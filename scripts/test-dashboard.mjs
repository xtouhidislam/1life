import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { PGlite } from '@electric-sql/pglite';

const asModule=source=>'data:text/javascript;base64,'+Buffer.from(ts.transpile(source,{module:ts.ModuleKind.ESNext})).toString('base64');
const taskUtils=asModule(readFileSync('src/task-utils.ts','utf8'));
const dashboardSource=readFileSync('src/dashboard-utils.ts','utf8').replace("'./task-utils'",JSON.stringify(taskUtils));
const {amountToMinor,scheduleSlots,currentAndNext}=await import(asModule(dashboardSource));
assert.equal(amountToMinor('0.29'),29);assert.equal(amountToMinor('120.1'),12010);assert.equal(amountToMinor('-100.01',true),-10001);
for(const input of ['1.001','NaN','1e2','-2','1,000','Infinity','90000000001'])assert.throws(()=>amountToMinor(input));
const slots=scheduleSlots('2026-11-01',[
  {id:'a',title:'Overnight task',task_date:'2026-10-31',start_time:'23:30',end_time:'01:00'},
  {id:'b',title:'Morning task',task_date:'2026-11-01',start_time:'08:00',end_time:'09:00'},
],[{id:'sleep',title:'Sleep',routine:'weekend',start_time:'00:00',end_time:'05:30'},{id:'work',title:'Weekday work',routine:'weekday',start_time:'08:00',end_time:'11:00'}]);
assert.equal(currentAndNext(slots,Date.parse('2026-11-01T00:30:00+06:00')).current.title,'Overnight task');
assert.equal(currentAndNext(slots,Date.parse('2026-11-01T01:00:00+06:00')).current.title,'Sleep');
assert.equal(currentAndNext(slots,Date.parse('2026-11-01T05:30:00+06:00')).next.title,'Morning task');
assert.equal(currentAndNext(slots,Date.parse('2026-11-01T09:00:00+06:00')).next.title,'Weekday work');
assert.deepEqual(currentAndNext([],Date.now()),{current:undefined,next:undefined});

const db=new PGlite(),a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
try{
  await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema public,auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;
    insert into auth.users values('${a}'),('${b}');`);
  for(const name of ['foundation','tasks','dashboard']){
    const number={foundation:'001',tasks:'002',dashboard:'003'}[name];
    await db.exec(readFileSync(`supabase/migrations/202610310${number}_${name}.sql`,'utf8'));
  }
  const login=async id=>db.exec(`reset role;set role authenticated;select set_config('request.jwt.claim.sub','${id}',false)`);
  const summary=async()=> (await db.query('select public.dashboard_summary() as result')).rows[0].result;
  await login(a);
  let result=await summary();
  assert.equal(result.weekly_pages,0);assert.equal(result.weekly_tasks,0);assert.equal(result.weekly_minutes,0);
  assert.equal(result.weekly_budget,null);assert.equal(result.monthly_balance,null);assert.equal(result.monthly_score,0);
  const {today,month_start:monthStart}=result;
  const dayCount=Number(today.slice(8));
  await db.exec(`update public.profiles set tracking_start_date='${monthStart}' where id='${a}';
    update public.task_templates set start_date='${monthStart}';select public.prepare_task_day();
    update public.task_items set completed_at=now() where task_date='${today}' and id in (select id from public.task_items where task_date='${today}' order by id limit 2);
    insert into public.task_items(task_date,title,completed_at) values('${today}','Manual done',now());
    insert into public.focus_logs(entry_date,title,minutes) values('${today}','Python',90),('${today}','Docs',30),('${today}'::date-40,'Old focus',400);
    insert into public.reading_logs(entry_date,title,pages) values('${today}','Reading',12),('${today}'::date-40,'Old reading',200);
    insert into public.finance_entries(entry_date,title,kind,amount_minor) values('${today}','Income','income',25000),('${today}','Expense','expense',15050),('${today}'::date-40,'Old expense','expense',100000);
    select public.save_dashboard_plan(100000,10000);`);
  result=await summary();
  assert.equal(result.targets_done,2);assert.equal(result.weekly_tasks,3);assert.equal(result.weekly_minutes,120);assert.equal(result.weekly_pages,12);
  assert.equal(result.weekly_spent,15050);assert.equal(result.weekly_remaining,-5050);assert.equal(result.monthly_balance,109950);
  assert.equal(result.monthly_income,25000);assert.equal(result.monthly_expenses,15050);
  assert.equal(result.monthly_score,Math.round((2/result.targets_today*100/dayCount)*10)/10);
  assert.equal(result.daily_progress.length,7);assert.equal(result.daily_progress.reduce((n,d)=>n+d.done,0),2);
  await db.exec(`insert into public.reading_logs(entry_date,title,pages) select '${today}','Extra reading',1 from generate_series(1,1005)`);
  assert.equal((await summary()).weekly_pages,1017,'Database aggregate must include more than 1000 entries');
  await assert.rejects(()=>db.exec('select public.save_dashboard_plan(500,-1)'),/check constraint/);
  assert.equal((await summary()).opening_balance,100000,'Plan changes must be atomic');
  await assert.rejects(()=>db.exec(`select public.save_dashboard_plan(1,1,'2000-01-01','2000-01-03')`),/week or month changed/);
  assert.equal((await summary()).opening_balance,100000,'Stale plan forms must not change balances');
  await db.exec('select public.save_dashboard_plan(-500,0)');
  result=await summary();assert.equal(result.opening_balance,-500);assert.equal(result.weekly_budget,0);assert.equal(result.weekly_remaining,-15050);
  await db.exec('select public.save_dashboard_plan(null,null)');
  result=await summary();assert.equal(result.monthly_balance,null);assert.equal(result.weekly_remaining,null);
  for(const table of ['focus_logs','reading_logs','finance_entries']){
    const fields=table==='focus_logs'?'minutes':table==='reading_logs'?'pages':'kind,amount_minor';
    const values=table==='finance_entries'?"'expense',100":'10';
    await assert.rejects(()=>db.exec(`insert into public.${table}(entry_date,title,${fields}) values('${today}'::date+1,'Future',${values})`),/check constraint/);
  }
  await db.exec("update public.focus_logs set minutes=60 where title='Python'; delete from public.reading_logs where title='Reading';");
  result=await summary();assert.equal(result.weekly_minutes,90);assert.equal(result.weekly_pages,1005);
  await login(b);
  for(const table of ['focus_logs','reading_logs','finance_entries','monthly_plans','weekly_budgets']){
    assert.equal((await db.query(`select * from public.${table}`)).rows.length,0);
    assert.equal((await db.query(`delete from public.${table} where user_id='${a}' returning *`)).rows.length,0);
  }
  assert.equal((await db.query(`update public.finance_entries set amount_minor=1 where user_id='${a}' returning id`)).rows.length,0);
  await assert.rejects(()=>db.exec(`insert into public.focus_logs(user_id,entry_date,title,minutes) values('${a}','${today}','Forbidden',10)`),/row-level security/);
  result=await summary();assert.equal(result.weekly_pages,0);assert.equal(result.monthly_income,0);
  await login(a);assert.equal((await summary()).weekly_pages,1005);
  await db.exec("reset role;set role anon;select set_config('request.jwt.claim.sub','',false)");
  for(const call of ['select public.dashboard_summary()','select public.save_dashboard_plan(0,0)','select * from public.finance_entries'])await assert.rejects(()=>db.exec(call),/permission denied/);
  console.log('PASS: dashboard migration; exact money parsing; overnight/current/upcoming schedule boundaries; known totals; monthly missed-day denominator; >1000-row aggregation; negative/unset budgets; atomic plan updates; future-date rejection; log edit/delete; cross-user isolation; anonymous denial.');
}finally{await db.close();}

// Run real SQL at fixed dates to exercise week/month/year rollover independently of host time.
for(const [instant,today,monday,monthStart]of[
 ['2026-10-31T18:00:00Z','2026-11-01','2026-10-26','2026-11-01'],
 ['2026-12-31T18:00:00Z','2027-01-01','2026-12-28','2027-01-01'],
 ['2027-01-03T18:00:00Z','2027-01-04','2027-01-04','2027-01-01'],
]){
 const boundary=new PGlite();
 try{
  await boundary.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   grant usage on schema public,auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;insert into auth.users values('${a}');`);
  for(const [suffix,name]of[['001','foundation'],['002','tasks'],['003','dashboard']])await boundary.exec(readFileSync(`supabase/migrations/202610310${suffix}_${name}.sql`,'utf8').replaceAll('now()',`('${instant}'::timestamptz)`));
  await boundary.exec(`set role authenticated;select set_config('request.jwt.claim.sub','${a}',false);select public.dashboard_summary();
   insert into public.finance_entries(entry_date,title,kind,amount_minor) values('${today}','Today','expense',100),('${today}'::date-1,'Yesterday','expense',200);
   select public.save_dashboard_plan(1000,1000);`);
  const value=(await boundary.query('select public.dashboard_summary() as result')).rows[0].result;
  assert.equal(value.today,today);assert.equal(value.week_start,monday);assert.equal(value.month_start,monthStart);
  assert.equal(value.weekly_spent,today===monday?100:300);
  assert.equal(value.monthly_expenses,today===monthStart?100:300);
  assert.equal(value.monthly_balance,today===monthStart?900:700);
  assert.equal(value.monthly_score,0);
 }finally{await boundary.close();}
}
console.log('PASS: fixed-date SQL checks at Dhaka midnight, month/year rollover, Sunday week retention, and Monday week reset.');
