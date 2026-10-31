import assert from 'node:assert/strict';
import {readFileSync}from'node:fs';
import ts from'typescript';
import {PGlite}from'@electric-sql/pglite';

const moduleUrl=source=>'data:text/javascript;base64,'+Buffer.from(ts.transpile(source,{module:ts.ModuleKind.ESNext})).toString('base64');
const taskUtils=moduleUrl(readFileSync('src/task-utils.ts','utf8'));
const dashboardUtils=moduleUrl(readFileSync('src/dashboard-utils.ts','utf8').replace("'./task-utils'",JSON.stringify(taskUtils)));
const {financeValues,financeCsv}=await import(moduleUrl(readFileSync('src/finance-utils.ts','utf8').replace("'./dashboard-utils'",JSON.stringify(dashboardUtils))));
const form=new FormData();
for(const[key,value]of Object.entries({title:' Lunch ',entry_date:'2026-10-31',category:'Food & drink',transaction_kind:'expense',amount:' 150.25 '}))form.set(key,value);
assert.deepEqual(financeValues(form,'2026-10-31'),{title:'Lunch',entry_date:'2026-10-31',category:'Food & drink',kind:'expense',amount_minor:15025});
form.set('amount','1.001');assert.throws(()=>financeValues(form,'2026-10-31'),/decimal/);form.set('amount','0');assert.throws(()=>financeValues(form,'2026-10-31'),/greater than zero/);
form.set('amount','1');form.set('entry_date','2026-11-01');assert.throws(()=>financeValues(form,'2026-10-31'),/past date/);
const csv=financeCsv([{id:'a',entry_date:'2026-10-31',title:'=HYPERLINK("example")',kind:'expense',category:'Food & drink',amount_minor:15025},{id:'b',entry_date:'2026-10-31',title:'Book, "notes"\nnext line',kind:'income',category:'Other',amount_minor:29}], 'BDT');
assert.ok(csv.startsWith('\uFEFF'));assert.ok(csv.includes('"\'=HYPERLINK(""example"")"'));assert.ok(csv.includes('"Book, ""notes""\nnext line"'));assert.ok(csv.includes(',150.25,"BDT"'));assert.ok(csv.includes(',0.29,"BDT"'));

const db=new PGlite(),a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);
  create function auth.uid()returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  grant usage on schema public,auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;insert into auth.users values('${a}'),('${b}');`);
 const fixed="('2026-11-01T04:00:00Z'::timestamptz)";
 for(const[suffix,name]of[['001','foundation'],['002','tasks'],['003','dashboard']])await db.exec(readFileSync(`supabase/migrations/202610310${suffix}_${name}.sql`,'utf8').replaceAll('now()',fixed));
 // The pre-existing dashboard ledger must survive the migration.
 await db.exec(`insert into public.finance_entries(user_id,entry_date,title,kind,amount_minor) values('${a}','2026-11-01','Legacy expense','expense',100);`);
 await db.exec(readFileSync('supabase/migrations/202610310004_expenses.sql','utf8').replaceAll('now()',fixed));
 const login=async id=>db.exec(`reset role;set role authenticated;select set_config('request.jwt.claim.sub','${id}',false)`);
 const summary=async month=>(await db.query('select public.expense_summary($1::date) as result',[month])).rows[0].result;
 const transactions=async(args={})=>(await db.query('select public.expense_transactions($1::date,$2,$3,$4,$5::date,$6,$7) as result',['2026-11-01',args.kind??'all',args.category??'',args.search??'',args.day??null,args.page??0,args.export??false])).rows[0].result;
 await login(a);
 assert.equal((await db.query("select category from public.finance_entries where title='Legacy expense'")).rows[0].category,'Other');
 await db.exec(`insert into public.profiles(id)values('${a}');
  insert into public.finance_entries(entry_date,title,kind,category,amount_minor)values
  ('2026-11-01','Salary','income','Salary',100000),('2026-11-01','Lunch 100%','expense','Food & drink',15025),
  ('2026-11-01','Bus','expense','Transport',2000),('2026-10-31','Old purchase','expense','Other',5000);
  insert into public.monthly_plans(month_start,opening_balance_minor)values('2026-11-01',20000);
  insert into public.weekly_budgets(week_start,budget_minor)values('2026-10-26',10000);`);
 let result=await summary('2026-11-01');
 assert.equal(result.income,100000);assert.equal(result.expenses,17125);assert.equal(result.net,82875);assert.equal(result.balance,102875);
 assert.equal(result.categories.length,3);assert.equal(result.categories[0].category,'Food & drink');assert.equal(result.categories[0].amount,15025);
 assert.equal(result.daily.length,1);assert.equal(result.daily[0].expenses,17125);
 assert.equal(result.weeks[0].week_start,'2026-10-26');assert.equal(result.weeks[0].spent,22125,'Cross-month week must include October');
 assert.equal(result.weeks[0].budget_minor,10000);
 let list=await transactions({kind:'expense',category:'Food & drink',search:'100%',day:'2026-11-01'});
 assert.equal(list.total,1);assert.equal(list.expenses,15025);assert.equal(list.income,0);assert.equal(list.entries[0].title,'Lunch 100%');
 assert.equal((await transactions({search:'%'})).total,1,'Search must match percent literally');
 assert.equal((await transactions({search:'LUNCH'})).total,1,'Search must ignore case');
 assert.equal((await transactions({kind:'income'})).income,100000);
 await db.exec(`insert into public.finance_entries(entry_date,title,kind,category,amount_minor)select '2026-11-01','Bulk expense','expense','Other',1 from generate_series(1,1005)`);
 result=await summary('2026-11-01');assert.equal(result.expenses,18130);
 list=await transactions();assert.equal(list.total,1009);assert.equal(list.entries.length,20);assert.equal(list.expenses,18130);
 const page2=await transactions({page:1});assert.equal(page2.entries.length,20);assert.ok(page2.entries.every(r=>!list.entries.some(first=>r.id===first.id)));
 const exported=await transactions({export:true,page:5});assert.equal(exported.entries.length,1009);assert.equal(exported.total,1009);
 assert.equal((await transactions({page:100})).entries.length,0);
 const dashboard=(await db.query('select public.dashboard_summary() as result')).rows[0].result;
 assert.equal(dashboard.monthly_expenses,result.expenses);assert.equal(dashboard.monthly_balance,result.balance);assert.equal(dashboard.weekly_spent,23130);
 await db.exec("update public.finance_entries set category='Learning',amount_minor=500 where title='Bus';delete from public.finance_entries where title='Legacy expense'");
 result=await summary('2026-11-01');assert.equal(result.expenses,16530);assert.ok(result.categories.some(row=>row.category==='Learning'));
 const old=await summary('2026-10-01');assert.equal(old.expenses,5000);assert.equal(old.balance,null);assert.equal(old.daily.length,31);
 assert.equal((await summary('2026-09-01')).expenses,0);
 await assert.rejects(()=>summary('2026-11-02'),/first day/);await assert.rejects(()=>summary('2026-12-01'),/first day/);
 await assert.rejects(()=>transactions({kind:'invalid'}),/Invalid transaction filter/);await assert.rejects(()=>transactions({day:'2026-10-31'}),/selected day/);
 await assert.rejects(()=>db.exec("insert into public.finance_entries(entry_date,title,kind,category,amount_minor)values('2026-11-01','Invalid','expense','',100)"),/check constraint/);
 await login(b);
 result=await summary('2026-11-01');assert.equal(result.income,0);assert.equal(result.expenses,0);assert.equal(result.balance,null);assert.equal(result.categories.length,0);
 assert.equal((await transactions({export:true})).total,0);
 assert.equal((await db.query(`update public.finance_entries set category='Hacked' where user_id='${a}' returning id`)).rows.length,0);
 assert.equal((await db.query(`delete from public.finance_entries where user_id='${a}' returning id`)).rows.length,0);
 await assert.rejects(()=>db.exec(`insert into public.finance_entries(user_id,entry_date,title,kind,amount_minor) values('${a}','2026-11-01','Forbidden','expense',1)`),/row-level security/);
 await db.exec("reset role;set role anon;select set_config('request.jwt.claim.sub','',false)");
 await assert.rejects(()=>summary('2026-11-01'),/permission denied/);await assert.rejects(()=>transactions(),/permission denied/);
 console.log('PASS: legacy ledger preserved; exact input/CSV escaping; category/month/day/type/literal-search filters; monthly totals; cross-month weeks; >1000-row export and aggregates; pagination; dashboard consistency; edits/deletes; input constraints; cross-account and anonymous isolation.');
}finally{await db.close();}
