import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import{PGlite}from'@electric-sql/pglite';
const rows=JSON.parse(readFileSync('data/online-knowledge/collection-180.json','utf8'));
assert.equal(rows.length,540);
for(const kind of['hadith','ayah','dua']){
 const selected=rows.filter(r=>r.kind===kind);assert.equal(selected.length,180);assert.equal(new Set(selected.map(r=>r.day)).size,180);assert.equal(new Set(selected.map(r=>r.reference)).size,180);
}
const db=new PGlite(),a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);
 create function auth.uid()returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema public,auth to authenticated,anon;grant execute on function auth.uid()to authenticated,anon;insert into auth.users values('${a}'),('${b}');`);
 const fixed="('2026-11-01T04:00:00Z'::timestamptz)";
 for(const[suffix,name]of[['001','foundation'],['002','tasks'],['003','dashboard'],['007','knowledge'],['008','online_knowledge']])await db.exec(readFileSync(`supabase/migrations/202610310${suffix}_${name}.sql`,'utf8').replaceAll('now()',fixed));
 const login=async id=>db.exec(`reset role;set role authenticated;select set_config('request.jwt.claim.sub','${id}',false)`);
 const state=async()=>(await db.query('select public.knowledge_state()as result')).rows[0].result;
 const daily=async()=>(await db.query('select public.knowledge_daily_items()as result')).rows[0].result;
 const install=async start=>db.query('select public.install_knowledge_plan($1::date)',[start]);
 await login(a);assert.equal((await db.query('select public.knowledge_plan_status()as result')).rows[0].result.installed,false);
 await install('2026-11-01');let result=await state();
 for(const c of result.counts){assert.equal(c.total,180);assert.equal(c.reviewed,180);assert.equal(c.memorized,0);}
 const listed=(await db.query("select public.knowledge_list('hadith')as result")).rows[0].result;
 assert.deepEqual(listed.items.map(i=>i.plan_day),Array.from({length:20},(_,i)=>i+1),'The library must list plan entries in day order');
 let selected=await daily();assert.equal(selected._plan.day,1);assert.equal(selected._plan.status,'active');
 for(const kind of['hadith','ayah','dua']){const source=rows.find(r=>r.kind===kind&&r.day===1);assert.equal(selected[kind].original_text,source.original_text);assert.equal(selected[kind].plan_day,1);assert.equal(selected[kind].source_method,'online-source');}
 const id=selected.hadith.id;await db.query("select public.set_knowledge_progress($1,'memorized')",[id]);await install('2026-11-01');assert.equal((await daily()).hadith.id,id);assert.equal((await state()).counts.find(c=>c.kind==='hadith').memorized,1);
 assert.equal(Number((await db.query('select count(*)as n from public.knowledge_items')).rows[0].n),540);
 await install('2026-10-31');selected=await daily();assert.equal(selected._plan.day,2);assert.equal(selected.dua.plan_day,2);
 await install('2026-05-06');selected=await daily();assert.equal(selected._plan.day,180);assert.equal(selected.ayah.plan_day,180);
 await install('2026-05-05');selected=await daily();assert.equal(selected._plan.status,'complete');assert.equal(selected.hadith,undefined);
 await install('2026-11-02');selected=await daily();assert.equal(selected._plan.status,'upcoming');assert.equal(selected.dua,undefined);
 await install('2026-11-01');selected=await daily();
 const item=selected.hadith;await db.query('select public.save_knowledge_item($1::jsonb,$2::uuid)',[JSON.stringify({...item,title:'My title',original_text:item.original_text+' Updated by user.'}),item.id]);
 assert.equal((await daily()).hadith,undefined);const edited=(await db.query('select * from public.knowledge_items where id=$1::uuid',[item.id])).rows[0];assert.equal(edited.source_method,'user');assert.equal(edited.reviewed_at,null);
 await assert.rejects(()=>install('2026-11-01'),/different text/);
 assert.ok((await db.query('select original_text from public.knowledge_items where id=$1::uuid',[item.id])).rows[0].original_text.endsWith('Updated by user.'));
 await db.query('select public.save_knowledge_item($1::jsonb,$2::uuid)',[JSON.stringify(rows.find(r=>r.kind==='hadith'&&r.day===1)),item.id]);await db.query('select public.review_knowledge($1,true)',[item.id]);assert.equal((await daily()).hadith.id,item.id);
 await assert.rejects(()=>db.exec("delete from public.knowledge_online_catalog"),/permission denied/);
 await assert.rejects(()=>db.exec(`update public.knowledge_plan_settings set start_date='2000-01-01'`),/permission denied/);
 await login(b);assert.ok((await state()).counts.every(c=>c.total===0));await install('2026-11-01');assert.equal((await state()).counts[0].total,180);assert.notEqual((await daily()).hadith.id,id);
 await login(a);assert.equal((await state()).counts.find(c=>c.kind==='hadith').memorized,1);
 await db.exec("reset role;set role anon;select set_config('request.jwt.claim.sub','',false)");for(const sql of["select public.install_knowledge_plan('2026-11-01')",'select public.knowledge_plan_status()','select * from public.knowledge_online_catalog'])await assert.rejects(()=>db.exec(sql),/permission denied/);
 console.log('PASS: 540 entries/180 per collection; authenticated installation; idempotency; progress preservation; day 1/2/180, before/after plan dates; ordered daily trio; personal edits invalidate source match; conflicts preserve user text; private per-user installs; catalog protection; anonymous denial.');
}finally{await db.close();}
