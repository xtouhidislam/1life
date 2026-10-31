const{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const{readFileSync}=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage();page.setDefaultTimeout(12000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const user={id:'11111111-1111-4111-8111-111111111111',email:'test@example.com',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:new Date().toISOString()};
  const exp=Math.floor(Date.now()/1000)+3600,access_token=['eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',Buffer.from(JSON.stringify({sub:user.id,exp,role:'authenticated'})).toString('base64url'),'signature'].join('.');
  await page.addInitScript(({user,exp,access_token})=>localStorage.setItem('sb-pvsvswcfolyyjhzggbrx-auth-token',JSON.stringify({access_token,refresh_token:'test',expires_at:exp,expires_in:3600,token_type:'bearer',user})),{user,exp,access_token});
  const plan=JSON.parse(readFileSync('data/exercise-plan.json','utf8'));
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Dhaka',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()),part=type=>parts.find(p=>p.type===type).value;
  const today=`${part('year')}-${part('month')}-${part('day')}`,base=new Date(today+'T12:00:00Z');base.setUTCDate(base.getUTCDate()-((base.getUTCDay()+6)%7)-7);
  const date=offset=>{const d=new Date(base);d.setUTCDate(d.getUTCDate()+offset);return d.toISOString().slice(0,10);};
  const sessions={},levels={push:1,pull:1,legs:1,core:1},history=[];let start='2026-11-01',bar=false,serial=0,missing=false,failSave=false;
  const state=selected=>({start_date:start,bar_available:bar,movements:plan.movements,levels,session:sessions[selected]?{...sessions[selected],sets:undefined}:null,sets:sessions[selected]?.sets??[],history:Object.values(sessions).filter(s=>s.session_date<=selected).map(s=>({...s,sets:undefined,set_count:s.sets.length})),level_history:history});
  await page.route('https://pvsvswcfolyyjhzggbrx.supabase.co/**',async route=>{
   const request=route.request(),url=new URL(request.url()),name=url.pathname.split('/').pop();
   const send=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
   if(url.pathname.includes('/auth/'))return send(user);
   if(name==='profiles')return send({id:user.id});
   if(name==='exercise_state')return missing?send({code:'PGRST202',message:'Missing'},404):send(state(request.postDataJSON().p_date));
   if(name==='save_workout'){
    if(failSave)return send({message:'Connection interrupted.'},503);
    const p=request.postDataJSON();sessions[p.p_date]={id:sessions[p.p_date]?.id??`session-${++serial}`,session_date:p.p_date,status:p.p_status,minutes:p.p_minutes,notes:p.p_notes,sets:p.p_sets};return send(sessions[p.p_date].id);
   }
   if(name==='delete_workout'){const p=request.postDataJSON();const key=Object.keys(sessions).find(date=>sessions[date].id===p.p_id);delete sessions[key];return send(null);}
   if(name==='save_exercise_settings'){const p=request.postDataJSON();start=p.p_start;bar=p.p_bar;return send(null);}
   if(name==='set_exercise_level'){
    const p=request.postDataJSON(),move=plan.movements.find(m=>m.pattern===p.p_pattern&&m.level===levels[p.p_pattern]);
    if(p.p_level>levels[p.p_pattern]){
     const latest=Object.values(sessions).filter(s=>s.status==='completed'&&s.sets.some(set=>set.movement_id===move.id)).sort((a,b)=>b.session_date.localeCompare(a.session_date)).slice(0,2);
     if(latest.length<2||latest.some(s=>s.sets.filter(set=>set.movement_id===move.id&&set.quantity>=move.minimum&&set.unit===move.unit).length<move.sets))return send({message:'Log two latest sessions at this level meeting the recorded set and quantity threshold before advancing'},400);
    }
    history.unshift({id:`level-${++serial}`,pattern:p.p_pattern,from_level:levels[p.p_pattern],to_level:p.p_level,notes:p.p_notes,created_at:new Date().toISOString()});levels[p.p_pattern]=p.p_level;return send(null);
   }
   return send(null);
  });
  await page.goto('http://127.0.0.1:5173/');await page.getByRole('button',{name:'Exercise',exact:true}).click();
  await page.getByLabel('Workout date',{exact:true}).fill(date(0));await page.getByRole('heading',{name:'Push',exact:true}).waitFor();assert.equal(await page.locator('.movement-diagram').count(),2);
  const log=async()=>{
   await page.getByRole('button',{name:'Log session',exact:true}).click();await page.getByLabel('Minutes',{exact:true}).fill('40');await page.getByLabel('Movement',{exact:true}).selectOption('push-1');
   for(let i=1;i<=3;i++){await page.getByRole('button',{name:'Add set',exact:true}).click();await page.getByLabel(`Set ${i} quantity`,{exact:true}).fill('15');}
   await page.getByLabel('Session notes',{exact:true}).fill('Three clean sets of wall push-ups.');
  };
  await log();failSave=true;await page.getByRole('button',{name:'Save session',exact:true}).click();await page.getByRole('alert').filter({hasText:'Connection interrupted'}).waitFor();assert.equal(await page.getByLabel('Set 1 quantity',{exact:true}).inputValue(),'15');failSave=false;await page.getByRole('button',{name:'Save session',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});assert.equal(sessions[date(0)].sets.length,3);
  await page.getByRole('tab',{name:'Plan & progress',exact:true}).click();
  const pushLadder=page.locator('.movement-ladder').filter({has:page.getByRole('heading',{name:'push',exact:false})});
  await pushLadder.getByRole('button',{name:'Advance',exact:true}).click();await page.getByRole('checkbox').check();await page.getByLabel('Evidence or reason for this change',{exact:true}).fill('First session logged.');await page.getByRole('button',{name:'Save level change',exact:true}).click();await page.getByRole('alert').filter({hasText:'two latest sessions'}).waitFor();await page.getByRole('button',{name:'Close dialog',exact:true}).click();
  await page.getByRole('tab',{name:'Daily workout',exact:true}).click();await page.getByLabel('Workout date',{exact:true}).fill(date(1));await page.getByRole('heading',{name:'Pull + core',exact:true}).waitFor();await log();await page.getByRole('button',{name:'Save session',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
  await page.getByRole('tab',{name:'Plan & progress',exact:true}).click();await pushLadder.getByRole('button',{name:'Advance',exact:true}).click();await page.getByRole('checkbox').check();await page.getByLabel('Evidence or reason for this change',{exact:true}).fill('Both sessions have 3 by 15 with clean form.');await page.getByRole('button',{name:'Save level change',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});assert.equal(levels.push,2);
  await page.getByRole('button',{name:'Plan settings',exact:true}).click();await page.getByLabel('Plan start date',{exact:true}).fill(date(0));await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Save settings',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});assert.equal(bar,true);assert.equal(start,date(0));
  await page.getByRole('tab',{name:'Weekly routine',exact:true}).click();await page.getByRole('heading',{name:'Your weekly training rhythm',exact:true}).waitFor();assert.equal(await page.locator('.weekly-exercise').count(),7);
  await page.getByRole('tab',{name:'Daily workout',exact:true}).click();await page.getByLabel('Workout date',{exact:true}).fill(date(6));await page.getByRole('heading',{name:'Full rest',exact:true}).waitFor();assert.equal(await page.locator('.movement-diagram').count(),0);await page.getByRole('button',{name:'Log rest day',exact:true}).click();assert.equal(await page.getByLabel('Session type',{exact:true}).locator('option').count(),1);await page.getByRole('button',{name:'Save session',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});assert.equal(sessions[date(6)].status,'rest');
  await page.getByLabel('Workout date',{exact:true}).fill(date(2));await page.getByRole('heading',{name:'Rest or light mobility',exact:true}).waitFor();await page.getByRole('button',{name:'Log session',exact:true}).click();await page.getByLabel('Minutes',{exact:true}).fill('15');await page.getByRole('button',{name:'Save session',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});assert.equal(sessions[date(2)].sets.length,0);
  await page.getByLabel('Workout date',{exact:true}).fill(date(0));await page.getByRole('heading',{name:'Push',exact:true}).waitFor();await page.getByRole('button',{name:'Edit session',exact:true}).click();await page.getByLabel('Minutes',{exact:true}).fill('35');await page.getByRole('button',{name:'Save session',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});assert.equal(sessions[date(0)].minutes,35);assert.equal(sessions[date(1)].minutes,40);
  await page.getByRole('button',{name:'Delete workout session',exact:true}).click();await page.getByRole('button',{name:'Delete session',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});assert.equal(sessions[date(0)],undefined);assert.equal(levels.push,2);
  await page.setViewportSize({width:390,height:844});for(const name of['Daily workout','Weekly routine','Plan & progress']){await page.getByRole('tab',{name,exact:true}).click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${name} must fit mobile`);}
  await page.getByRole('button',{name:'Plan settings',exact:true}).click();assert.ok(await page.evaluate(()=>document.querySelector('dialog').getBoundingClientRect().right<=innerWidth));await page.getByRole('button',{name:'Close dialog',exact:true}).click();await page.setViewportSize({width:1280,height:900});
  missing=true;await page.getByRole('button',{name:'Refresh exercise',exact:true}).click();await page.getByRole('alert').filter({hasText:'Exercise setup is needed'}).waitFor();missing=false;await page.getByRole('button',{name:'Retry exercise',exact:true}).click();await page.getByRole('heading',{name:'The six-month plan',exact:true}).waitFor();
  assert.deepEqual(errors,[]);console.log('PASS (mock API): day selection/diagrams; workout sets and failed-save recovery; two-session promotion; settings; weekly plan; Sunday rest and Wednesday mobility; date-preserving edit/delete; mobile tabs/dialog; missing migration retry; no browser errors.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
