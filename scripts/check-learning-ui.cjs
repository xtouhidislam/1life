const{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const{readFileSync}=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage();page.setDefaultTimeout(12000);
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const user={id:'11111111-1111-4111-8111-111111111111',email:'test@example.com',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:new Date().toISOString()};
  const exp=Math.floor(Date.now()/1000)+3600,access_token=['eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',Buffer.from(JSON.stringify({sub:user.id,exp,role:'authenticated'})).toString('base64url'),'signature'].join('.');
  await page.addInitScript(({user,exp,access_token})=>localStorage.setItem('sb-pvsvswcfolyyjhzggbrx-auth-token',JSON.stringify({access_token,refresh_token:'test',expires_at:exp,expires_in:3600,token_type:'bearer',user})),{user,exp,access_token});
  const source=JSON.parse(readFileSync('data/learning-roadmap.json','utf8'));
  const criteria=source.flatMap(w=>[...w.topics.map((label,i)=>({id:`w${String(w.number).padStart(2,'0')}-topic${String(i+1).padStart(2,'0')}`,week_number:w.number,kind:'topic',position:i+1,label})),{id:`w${String(w.number).padStart(2,'0')}-practice`,week_number:w.number,kind:'practice',position:100,label:w.practice},{id:`w${String(w.number).padStart(2,'0')}-acceptance`,week_number:w.number,kind:'acceptance',position:101,label:w.acceptance}]);
  const checks=new Set(),evidence={},projectNotes={};let start='2026-11-01',missing=false,failSave=false;
  const unlocked=week=>criteria.filter(c=>c.week_number<week).every(c=>checks.has(c.id));
  const projects=[{id:'support-backend',title:'Support Ticket Backend',description:'Backend project',start_week:5,end_week:6},{id:'knowledge-assistant',title:'Company Knowledge Assistant',description:'RAG project',start_week:9,end_week:12},{id:'evaluation-harness',title:'AI Evaluation Harness',description:'Evaluation project',start_week:18,end_week:18},{id:'customer-operations',title:'AI Customer Operations Platform',description:'Capstone',start_week:21,end_week:23}];
  const state=()=>({start_date:start,weeks:source.map(w=>({number:w.number,month:w.number<=20?Math.ceil(w.number/4):6,title:w.title,milestone:w.milestone,prerequisite:w.prerequisite,unlocked:unlocked(w.number),total:criteria.filter(c=>c.week_number===w.number).length,done:criteria.filter(c=>c.week_number===w.number&&checks.has(c.id)).length})),criteria:criteria.map(c=>({...c,completed_at:checks.has(c.id)?new Date().toISOString():null})),evidence:Object.entries(evidence).map(([week_number,e])=>({week_number:Number(week_number),...e})),projects:projects.map(p=>({...p,unlocked:unlocked(p.start_week),total:criteria.filter(c=>c.week_number>=p.start_week&&c.week_number<=p.end_week).length,done:criteria.filter(c=>c.week_number>=p.start_week&&c.week_number<=p.end_week&&checks.has(c.id)).length,notes:projectNotes[p.id]?.notes??'',url:projectNotes[p.id]?.url??''}))});
  await page.route('https://pvsvswcfolyyjhzggbrx.supabase.co/**',async route=>{
   const request=route.request(),url=new URL(request.url()),name=url.pathname.split('/').pop();
   const send=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
   if(url.pathname.includes('/auth/'))return send(user);
   if(name==='profiles'){if(request.method()==='PATCH')start=request.postDataJSON().roadmap_start_date;return send({id:user.id});}
   if(name==='learning_state')return missing?send({code:'PGRST202',message:'Missing'},404):send(state());
   if(name==='learning_next_project')return send(projects.find(p=>!unlocked(p.start_week)||criteria.some(c=>c.week_number>=p.start_week&&c.week_number<=p.end_week&&!checks.has(c.id)))??null);
   if(name==='set_learning_check'){
    const p=request.postDataJSON(),c=criteria.find(c=>c.id===p.p_criterion);
    if(!unlocked(c.week_number))return send({message:'Complete all earlier weeks before editing this week'},400);
    if(p.p_done&&c.kind==='acceptance'&&!evidence[c.week_number]?.notes&&!evidence[c.week_number]?.url)return send({message:'Save deliverable notes or a link before confirming the acceptance criteria'},400);
    p.p_done?checks.add(c.id):checks.delete(c.id);return send(null);
   }
   if(name==='save_learning_evidence'||name==='save_learning_project'){
    if(failSave)return send({message:'Connection interrupted.'},503);
    const p=request.postDataJSON();
    if(name==='save_learning_evidence')evidence[p.p_week]={notes:p.p_notes,url:p.p_url};else projectNotes[p.p_project]={notes:p.p_notes,url:p.p_url};
    return send(null);
   }
   return send(null);
  });
  await page.goto('http://127.0.0.1:5173/');
  await page.getByRole('button',{name:'AI learning',exact:true}).click();
  await page.getByRole('heading',{name:source[0].title,exact:true}).waitFor();
  assert.equal(await page.getByRole('checkbox').count(),13);
  await page.getByRole('button',{name:`Week 2: ${source[1].title}`,exact:true}).click();
  await page.getByRole('heading',{name:source[1].title,exact:true}).waitFor();assert.ok(await page.getByRole('checkbox').first().isDisabled());assert.ok(await page.getByRole('button',{name:'Add evidence',exact:true}).isDisabled());
  await page.getByRole('button',{name:`Week 1: ${source[0].title}`,exact:true}).click();
  await page.getByRole('checkbox',{name:source[0].acceptance,exact:true}).click();
  await page.getByRole('alert').filter({hasText:'Save deliverable notes'}).waitFor();
  await page.getByRole('button',{name:'Add evidence',exact:true}).click();
  await page.getByLabel('Evidence notes',{exact:true}).fill('Built and tested my CLI expense tracker.');await page.getByLabel('Deliverable link',{exact:true}).fill('https://github.com/test/expense-tracker');
  failSave=true;await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByRole('alert').filter({hasText:'Connection interrupted'}).waitFor();assert.equal(await page.getByLabel('Evidence notes',{exact:true}).inputValue(),'Built and tested my CLI expense tracker.');
  failSave=false;await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});await page.getByText('Built and tested my CLI expense tracker.',{exact:true}).waitFor();
  for(const c of criteria.filter(c=>c.week_number===1)){
   await page.getByRole('checkbox',{name:c.label,exact:true}).click();
   await page.waitForFunction(id=>document.querySelector(`input[name="${id}"]`)?.checked===true,c.id);
   await page.getByRole('heading',{name:source[0].title,exact:true}).waitFor();
  }
  await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('heading',{name:source[1].title,exact:true}).waitFor();assert.ok(await page.getByRole('checkbox').first().isEnabled());
  await page.getByRole('checkbox',{name:source[1].topics[0],exact:true}).click();await page.waitForFunction(()=>document.querySelector('input[name="w02-topic01"]')?.checked===true);await page.getByRole('heading',{name:source[1].title,exact:true}).waitFor();
  await page.getByRole('button',{name:`Week 1: ${source[0].title}`,exact:true}).click();await page.getByRole('checkbox',{name:source[0].topics[0],exact:true}).click();await page.waitForFunction(()=>document.querySelector('input[name="w01-topic01"]')?.checked===false);await page.getByRole('heading',{name:source[0].title,exact:true}).waitFor();
  await page.getByRole('button',{name:`Week 2: ${source[1].title}`,exact:true}).click();assert.ok(await page.getByRole('checkbox').first().isChecked());assert.ok(await page.getByRole('checkbox').first().isDisabled());
  await page.getByRole('tab',{name:'Progress tree',exact:true}).click();await page.getByRole('heading',{name:'Your progress tree',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:/^Open week \d+:/}).count(),26);
  await page.getByRole('button',{name:'Open week 26: locked',exact:true}).click();await page.getByRole('heading',{name:source[25].title,exact:true}).waitFor();assert.ok(await page.getByRole('checkbox').first().isDisabled());
  await page.getByRole('tab',{name:'Projects',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Add notes',exact:true}).count(),4);assert.ok(await page.getByRole('button',{name:'Add notes',exact:true}).first().isDisabled());
  // Prepare W1-4 through the mocked backend to exercise the unlocked project form.
  for(const c of criteria.filter(c=>c.week_number<=4))checks.add(c.id);
  await page.getByRole('button',{name:'Refresh learning',exact:true}).click();await page.getByRole('heading',{name:'Four projects. Real work to show.',exact:true}).waitFor();
  await page.getByRole('button',{name:'Add notes',exact:true}).first().click();await page.getByLabel('Evidence notes',{exact:true}).fill('Backend architecture and reproducible tests.');await page.getByLabel('Deliverable link',{exact:true}).fill('https://example.com/backend');await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});assert.equal(projectNotes['support-backend'].url,'https://example.com/backend');
  await page.getByRole('button',{name:'Roadmap dates',exact:true}).click();await page.getByLabel('Start date',{exact:true}).fill('2026-12-01');await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});assert.equal(start,'2026-12-01');assert.ok(checks.has('w02-topic01'));
  await page.setViewportSize({width:390,height:844});
  for(const name of['Weekly plan','Projects','Progress tree']){await page.getByRole('tab',{name,exact:true}).click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${name} must fit mobile`);}
  await page.getByRole('button',{name:'Roadmap dates',exact:true}).click();assert.ok(await page.evaluate(()=>document.querySelector('dialog').getBoundingClientRect().right<=innerWidth));await page.getByRole('button',{name:'Close dialog',exact:true}).click();
  await page.setViewportSize({width:1280,height:900});missing=true;await page.getByRole('button',{name:'Refresh learning',exact:true}).click();await page.getByRole('alert').filter({hasText:'Learning setup is needed'}).waitFor();missing=false;await page.getByRole('button',{name:'Retry learning',exact:true}).click();await page.getByRole('heading',{name:'Your progress tree',exact:true}).waitFor();
  await page.reload();await page.getByRole('button',{name:'AI learning',exact:true}).click();await page.getByRole('heading',{name:source[4].title,exact:true}).waitFor();
  assert.deepEqual(errors,[]);
  console.log('PASS (mock API): locked preview and disabled edits; evidence requirement/save/retry; W1 completion unlocks W2; reopening preserves and relocks W2; 26-node tree; project evidence; date changes; mobile views/dialog; missing migration retry; persistence across reload; no browser errors.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
