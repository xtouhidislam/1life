import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import ts from'typescript';
import{PGlite}from'@electric-sql/pglite';

const moduleUrl=source=>'data:text/javascript;base64,'+Buffer.from(ts.transpile(source,{module:ts.ModuleKind.ESNext})).toString('base64');
const taskModule=moduleUrl(readFileSync('src/task-utils.ts','utf8'));
const{weekRange,weekStatus,safeEvidenceUrl}=await import(moduleUrl(readFileSync('src/learning-utils.ts','utf8').replace("'./task-utils'",JSON.stringify(taskModule))));
assert.deepEqual(weekRange('2026-11-01',1),{start:'2026-11-01',end:'2026-11-07'});
assert.deepEqual(weekRange('2026-11-01',26),{start:'2027-04-25',end:'2027-05-01'});
assert.equal(weekStatus({unlocked:false,done:10,total:10}),'locked');
assert.equal(safeEvidenceUrl(' https://github.com/test/project '),'https://github.com/test/project');
for(const url of['javascript:alert(1)','data:text/html,hello','https://example.com/white space','not-a-link'])assert.throws(()=>safeEvidenceUrl(url));

const source=JSON.parse(readFileSync('data/learning-roadmap.json','utf8'));
assert.equal(source.length,26);
const db=new PGlite(),a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);
  create function auth.uid()returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  grant usage on schema public,auth to authenticated,anon;grant execute on function auth.uid()to authenticated,anon;insert into auth.users values('${a}'),('${b}');`);
 for(const[suffix,name]of[['001','foundation'],['002','tasks'],['003','dashboard'],['004','expenses'],['005','learning']])await db.exec(readFileSync(`supabase/migrations/202610310${suffix}_${name}.sql`,'utf8'));
 const login=async id=>db.exec(`reset role;set role authenticated;select set_config('request.jwt.claim.sub','${id}',false)`);
 const state=async()=>(await db.query('select public.learning_state()as result')).rows[0].result;
 const toggle=async(id,done=true)=>db.query('select public.set_learning_check($1,$2)',[id,done]);
 const evidence=async week=>db.query('select public.save_learning_evidence($1,$2,$3)',[week,`Built and tested week ${week}.`,'https://example.com/evidence']);
 await login(a);
 let data=await state();
 assert.equal(data.weeks.length,26);assert.equal(data.criteria.length,274);assert.equal(data.projects.length,4);
 assert.equal(data.weeks.filter(w=>w.unlocked).length,1);assert.equal(data.weeks[0].unlocked,true);
 for(const week of source){
  const imported=data.weeks.find(w=>w.number===week.number);assert.equal(imported.title,week.title);
  assert.deepEqual(data.criteria.filter(c=>c.week_number===week.number&&c.kind==='topic').map(c=>c.label),week.topics);
  assert.equal(data.criteria.find(c=>c.week_number===week.number&&c.kind==='practice').label,week.practice);
  assert.equal(data.criteria.find(c=>c.week_number===week.number&&c.kind==='acceptance').label,week.acceptance);
 }
 for(const sql of[
  `insert into public.learning_checks(user_id,criterion_id)values('${a}','w02-topic01')`,
  `update public.learning_weeks set title='Bypass' where number=1`,
  `delete from public.learning_criteria where week_number=1`,
  `insert into public.learning_evidence(user_id,week_number,notes)values('${a}',2,'Bypass')`,
  `insert into public.learning_project_evidence(user_id,project_id,notes)values('${a}','support-backend','Bypass')`,
 ])await assert.rejects(()=>db.exec(sql),/permission denied/);
 await assert.rejects(()=>toggle('w02-topic01'),/earlier weeks/);
 await assert.rejects(()=>evidence(2),/earlier weeks/);
 await assert.rejects(()=>db.exec("select public.save_learning_project('support-backend','Early','')"),/prerequisite weeks/);
 await assert.rejects(()=>toggle('w01-acceptance'),/Save deliverable/);
 await evidence(1);await toggle('w01-topic01');await toggle('w01-topic01');
 assert.equal((await state()).weeks[0].done,1,'Checking twice must be idempotent');
 for(const c of data.criteria.filter(c=>c.week_number===1))await toggle(c.id);
 data=await state();assert.equal(data.weeks.filter(w=>w.unlocked).length,2,'Finishing W1 unlocks exactly W2');
 await evidence(2);await toggle('w02-topic01');
 await toggle('w01-topic01',false);
 data=await state();assert.equal(data.weeks[1].unlocked,false);assert.equal(data.weeks[1].done,1);assert.equal(data.evidence.find(e=>e.week_number===2).notes,'Built and tested week 2.');
 await assert.rejects(()=>toggle('w02-topic01',false),/earlier weeks/);
 await assert.rejects(()=>evidence(2),/earlier weeks/);
 await toggle('w01-topic01');assert.equal((await state()).weeks[1].unlocked,true);
 await assert.rejects(()=>db.exec("select public.save_learning_evidence(1,'  ','  ')"),/Reopen acceptance/);
 await assert.rejects(()=>db.exec("select public.save_learning_evidence(1,'Proof','javascript:alert(1)')"),/check constraint/);
 await assert.rejects(()=>toggle('missing'),/Unknown checklist/);
 await assert.rejects(()=>db.exec("select public.set_learning_check('w01-topic01',null)"),/completion state/);
 // Finish the whole path using only public guarded calls.
 for(let week=2;week<=26;week++){
  await evidence(week);
  for(const c of data.criteria.filter(c=>c.week_number===week))await toggle(c.id);
  if(week===4)await db.exec("select public.save_learning_project('support-backend','Architecture, tests, and limitations','https://example.com/backend')");
 }
 data=await state();assert.ok(data.weeks.every(w=>w.unlocked&&w.done===w.total));assert.ok(data.projects.every(p=>p.done===p.total));
 assert.equal((await db.query('select public.learning_next_project()as result')).rows[0].result,null);
 const originalStart=data.start_date;
 await db.exec(`update public.profiles set roadmap_start_date='2026-12-01'where id='${a}'`);
 assert.equal((await state()).start_date,'2026-12-01');assert.equal((await state()).criteria.filter(c=>c.completed_at).length,274);
 await toggle('w01-topic01',false);
 data=await state();assert.ok(data.weeks.slice(1).every(w=>!w.unlocked));assert.equal(data.weeks[25].done,data.weeks[25].total);
 assert.equal(data.projects.find(p=>p.id==='support-backend').url,'https://example.com/backend');
 assert.equal((await db.query('select public.learning_next_project()as result')).rows[0].result.id,'support-backend');
 await assert.rejects(()=>db.exec("select public.save_learning_project('support-backend','Changed','')"),/prerequisite weeks/);
 await login(b);data=await state();assert.equal(data.criteria.filter(c=>c.completed_at).length,0);assert.equal(data.evidence.length,0);assert.equal(data.projects[0].notes,'');assert.equal(data.start_date,originalStart);
 assert.equal((await db.query('select * from public.learning_checks')).rows.length,0);
 await assert.rejects(()=>toggle('w26-topic01'),/earlier weeks/);
 await evidence(1);await toggle('w01-topic01');
 await login(a);assert.equal((await state()).criteria.find(c=>c.id==='w01-topic01').completed_at,null,'B must not change A progress');
 await db.exec("reset role;set role anon;select set_config('request.jwt.claim.sub','',false)");
 for(const call of['select public.learning_state()',"select public.set_learning_check('w01-topic01',true)",'select public.learning_next_project()',"select public.save_learning_evidence(1,'','')",'select * from public.learning_weeks'])await assert.rejects(()=>db.exec(call),/permission denied/);
 console.log('PASS: all 26 imported weeks/274 items; direct REST write denial; prerequisite enforcement; evidence requirement; idempotency; reopening/relocking with history preservation; all-week completion; projects/dashboard suggestion; date changes; URL constraints; two-account isolation; anonymous denial.');
}finally{await db.close();}
