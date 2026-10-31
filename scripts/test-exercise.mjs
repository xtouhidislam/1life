import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import ts from'typescript';
import{PGlite}from'@electric-sql/pglite';
const source=ts.transpile(readFileSync('src/exercise-utils.ts','utf8'),{module:ts.ModuleKind.ESNext});
const{programMonth}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
assert.equal(programMonth('2026-11-01','2026-10-31'),0);assert.equal(programMonth('2026-11-01','2026-11-01'),1);assert.equal(programMonth('2026-11-01','2027-01-01'),3);assert.equal(programMonth('2026-11-01','2027-05-01'),7);assert.equal(programMonth('2027-01-31','2027-02-28'),2);
const plan=JSON.parse(readFileSync('data/exercise-plan.json','utf8'));assert.equal(plan.movements.length,21);assert.deepEqual(plan.routines.find(r=>r.day===0).patterns,[]);assert.deepEqual(plan.routines.find(r=>r.day===3).patterns,[]);
const db=new PGlite(),a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);
 create function auth.uid()returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema public,auth to authenticated,anon;grant execute on function auth.uid()to authenticated,anon;insert into auth.users values('${a}'),('${b}');`);
 for(const[suffix,name]of[['001','foundation'],['006','exercise']])await db.exec(readFileSync(`supabase/migrations/202610310${suffix}_${name}.sql`,'utf8').replaceAll('now()',"('2026-11-03T10:00:00Z'::timestamptz)"));
 const login=async id=>db.exec(`reset role;set role authenticated;select set_config('request.jwt.claim.sub','${id}',false)`);
 const state=async(date='2026-11-03')=>(await db.query('select public.exercise_state($1::date)as result',[date])).rows[0].result;
 const sets=(move='push-1',quantity=15,unit='reps')=>Array.from({length:3},(_,i)=>({movement_id:move,set_number:i+1,quantity,unit}));
 const save=async(date,status='completed',minutes=40,values=sets())=>(await db.query('select public.save_workout($1::date,$2,$3,$4,$5::jsonb)as id',[date,status,minutes,'Actual session',JSON.stringify(values)])).rows[0].id;
 const level=async(pattern,target,confirm=true)=>db.query('select public.set_exercise_level($1,$2,$3,$4)',[pattern,target,'Two clean sessions documented.',confirm]);
 await login(a);let data=await state();assert.equal(data.movements.length,21);assert.deepEqual(data.levels,{push:1,pull:1,legs:1,core:1});assert.equal(data.session,null);
 for(const move of plan.movements){const imported=data.movements.find(m=>m.id===move.id);assert.equal(imported.title,move.title);assert.equal(imported.graduate,move.graduate);}
 await assert.rejects(()=>level('push',3),/one level/);await assert.rejects(()=>level('push',2,false),/Confirm/);await assert.rejects(()=>level('push',2),/two latest sessions/);
 for(const sql of[`insert into public.exercise_progress(user_id,pattern,level)values('${a}','push',6)`,`delete from public.exercise_movements`,`insert into public.workout_sessions(user_id,session_date,status,minutes)values('${a}','2026-11-02','completed',40)`])await assert.rejects(()=>db.exec(sql),/permission denied/);
 await assert.rejects(()=>save('2026-11-04'),/check constraint/);await assert.rejects(()=>save('2026-11-01'),/check constraint/);
 await save('2026-11-01','rest',0,[]);assert.equal((await state('2026-11-01')).session.status,'rest');
 await assert.rejects(()=>save('2026-11-02','rest',0,sets()),/Rest days/);
 await assert.rejects(()=>save('2026-11-02','completed',40,[]),/at least one set/);
 const first=await save('2026-11-02');await assert.rejects(()=>level('push',2),/two latest sessions/);
 const second=await save('2026-11-03','completed',40,sets('push-1',14));await assert.rejects(()=>level('push',2),/two latest sessions/);
 assert.equal(await save('2026-11-03'),second,'Saving the same date updates the session');
 data=await state();assert.equal(data.history.length,3);assert.equal(data.sets.length,3);
 await level('push',2);data=await state();assert.equal(data.levels.push,2);assert.equal(data.level_history.length,1);assert.equal(data.sets[0].movement_id,'push-1','Old sets must keep their movement');
 await level('push',1);assert.equal((await state()).levels.push,1);
 // Invalid replacement must roll back both session metadata and the old set deletion.
 await assert.rejects(()=>save('2026-11-03','completed',50,[{...sets()[0],movement_id:'unknown'}]),/foreign key/);
 data=await state();assert.equal(data.session.minutes,40);assert.equal(data.sets.length,3);
 await assert.rejects(()=>save('2026-11-03','completed',40,[...sets(),sets()[0]]),/unique constraint/);
 await assert.rejects(()=>save('2026-11-03','completed',40,[{movement_id:'push-1'}]),/Each set needs/);
 await assert.rejects(()=>save('2026-11-03','completed',40,{}),/array/);
 await db.query('select public.save_exercise_settings($1::date,$2)',['2026-12-01',true]);assert.equal((await state()).start_date,'2026-12-01');assert.equal((await state()).bar_available,true);
 // Pull ladder optional bar gating is checked against the target movement.
 await save('2026-11-02','completed',40,sets('pull-1',12));await save('2026-11-03','completed',40,sets('pull-1',12));await level('pull',2);
 await save('2026-11-02','completed',40,sets('pull-2',12));await save('2026-11-03','completed',40,sets('pull-2',12));await level('pull',3);
 await db.exec("select public.save_exercise_settings('2026-12-01',false)");await assert.rejects(()=>level('pull',4),/optional bar/);
 await save('2026-11-02','completed',40,sets('pull-3',15));await save('2026-11-03','completed',40,sets('pull-3',15));await db.exec("select public.save_exercise_settings('2026-12-01',true)");await level('pull',4);
 await assert.rejects(()=>db.exec("select public.save_exercise_settings('2026-12-01',false)"),/below 4/);
 await level('pull',2);await db.exec("select public.save_exercise_settings('2026-12-01',false)");
 await login(b);data=await state();assert.equal(data.history.length,0);assert.equal(data.level_history.length,0);assert.equal(data.levels.pull,1);assert.equal(data.bar_available,false);
 await assert.rejects(()=>db.query('select public.delete_workout($1::uuid)',[first]),/not found/);
 assert.equal((await db.query('select * from public.workout_sets')).rows.length,0);
 await login(a);await db.query('select public.delete_workout($1::uuid)',[second]);data=await state();assert.equal(data.session,null);assert.equal(data.sets.length,0);assert.ok(data.level_history.length>0,'Deleting a workout must retain level-change history');
 await db.exec("reset role;set role anon;select set_config('request.jwt.claim.sub','',false)");for(const sql of["select public.exercise_state('2026-11-03')","select public.set_exercise_level('push',2,'Bypass',true)",'select * from public.exercise_movements'])await assert.rejects(()=>db.exec(sql),/permission denied/);
 console.log('PASS: 21 source movements; weekly rest structure; calendar phase math; session/set persistence and same-date updates; Sunday/future/rest constraints; replacement rollback; direct-write denial; two-session graduation and step-down; optional bar gating; ownership isolation; cascade deletion with level-history preservation; anonymous denial.');
}finally{await db.close();}
