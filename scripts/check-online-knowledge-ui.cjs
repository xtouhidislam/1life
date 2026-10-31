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
  const catalog=JSON.parse(readFileSync('data/online-knowledge/collection-180.json','utf8'));
  let items=[],start=null,fail=false;
  await page.route('https://pvsvswcfolyyjhzggbrx.supabase.co/**',async route=>{
   const request=route.request(),url=new URL(request.url()),name=url.pathname.split('/').pop();
   const send=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
   if(url.pathname.includes('/auth/'))return send(user);if(name==='profiles')return send({id:user.id});
   if(name==='knowledge_plan_status')return send({available:true,installed:!!start,start_date:start,day:start?1:null});
   if(name==='install_knowledge_plan'){
    if(fail)return send({message:'Temporary connection failure.'},503);
    start=request.postDataJSON().p_start;
    if(!items.length)items=catalog.map((r,i)=>({...r,id:`item-${i}`,plan_day:r.day,source_metadata:r.provenance,source_method:'online-source',reviewed_at:new Date().toISOString(),status:'new',archived:false}));
    return send({days:180,hadith:180,ayah:180,dua:180,start_date:start});
   }
   if(name==='knowledge_state')return send({counts:['hadith','ayah','dua'].map(kind=>({kind,total:items.filter(r=>r.kind===kind).length,reviewed:items.filter(r=>r.kind===kind).length,memorized:items.filter(r=>r.kind===kind&&r.status==='memorized').length})),books:[]});
   if(name==='knowledge_list'){const p=request.postDataJSON(),all=items.filter(r=>r.kind===p.p_kind);return send({total:all.length,items:all.slice(p.p_page*20,p.p_page*20+20)});}
   if(name==='set_knowledge_progress'){const p=request.postDataJSON();items.find(r=>r.id===p.p_id).status=p.p_status;return send(null);}
   return send(null);
  });
  await page.goto('http://127.0.0.1:5173/');await page.getByRole('button',{name:'Knowledge',exact:true}).click();
  await page.getByRole('button',{name:'Load 180-day collection',exact:true}).click();
  await page.getByLabel('Start date',{exact:true}).fill('2026-11-01');fail=true;
  await page.getByRole('button',{name:'Load collection',exact:true}).click();await page.getByRole('alert').filter({hasText:'Temporary connection failure'}).waitFor();assert.equal(await page.getByLabel('Start date',{exact:true}).inputValue(),'2026-11-01');
  fail=false;await page.getByRole('button',{name:'Load collection',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});await page.getByText('180 entries · Page 1',{exact:true}).waitFor();
  assert.equal(items.length,540);assert.equal(start,'2026-11-01');assert.equal(await page.getByText('Online source checked',{exact:true}).count(),20);
  const first=items.find(r=>r.kind==='hadith');await page.getByLabel(`Progress: ${first.title}`,{exact:true}).selectOption('memorized');await page.getByText('180 entries · Page 1',{exact:true}).waitFor();assert.equal(first.status,'memorized');
  await page.getByRole('tab',{name:'Ayahs',exact:true}).click();await page.getByText('180 entries · Page 1',{exact:true}).waitFor();await page.getByText('Read text and source details',{exact:true}).first().click();await page.getByText('Arabic text attribution and license',{exact:true}).first().waitFor();
  await page.getByRole('tab',{name:'Duas',exact:true}).click();await page.getByText('180 entries · Page 1',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Plan start date',exact:true}).click();await page.getByLabel('Start date',{exact:true}).fill('2026-11-02');await page.getByRole('button',{name:'Save plan date',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});assert.equal(items.length,540);assert.equal(first.status,'memorized');
  await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Online collection must fit mobile');
  await page.getByRole('button',{name:'Plan start date',exact:true}).click();assert.ok(await page.evaluate(()=>document.querySelector('dialog').getBoundingClientRect().right<=innerWidth));await page.getByRole('button',{name:'Close dialog',exact:true}).click();assert.deepEqual(errors,[]);
  console.log('PASS (mock API): 540-entry online plan loader; failed-install retry; start date; 180-per-kind counts; online-source labels; memorization; Quran license attribution; date changes preserve records/progress; mobile/dialog; no browser errors.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
