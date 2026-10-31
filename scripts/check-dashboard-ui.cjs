const { chromium }=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const user={id:'11111111-1111-4111-8111-111111111111',email:'test@example.com',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:new Date().toISOString()};
  const exp=Math.floor(Date.now()/1000)+3600;
  const access_token=['eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',Buffer.from(JSON.stringify({sub:user.id,exp,role:'authenticated'})).toString('base64url'),'signature'].join('.');
  await page.addInitScript(({user,exp,access_token})=>localStorage.setItem('sb-pvsvswcfolyyjhzggbrx-auth-token',JSON.stringify({access_token,refresh_token:'test',expires_at:exp,expires_in:3600,token_type:'bearer',user})),{user,exp,access_token});
  const dateParts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Dhaka',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const part=type=>dateParts.find(p=>p.type===type).value;
  const today=`${part('year')}-${part('month')}-${part('day')}`,month=today.slice(0,7)+'-01';
  const mondayDate=new Date(`${today}T12:00:00Z`);mondayDate.setUTCDate(mondayDate.getUTCDate()-((mondayDate.getUTCDay()+6)%7));
  const monday=mondayDate.toISOString().slice(0,10);
  const rows={focus_logs:[],reading_logs:[],finance_entries:[]};
  let serial=0,opening=null,budget=null,missing=false,rejectSave=false;
  const summary=()=>{
   const expenses=rows.finance_entries.filter(r=>r.kind==='expense').reduce((n,r)=>n+r.amount_minor,0),income=rows.finance_entries.filter(r=>r.kind==='income').reduce((n,r)=>n+r.amount_minor,0);
   return {today,week_start:monday,month_start:month,currency:'BDT',tracking_start:month,monthly_score:0,targets_today:6,targets_done:0,weekly_tasks:0,weekly_pages:rows.reading_logs.reduce((n,r)=>n+r.pages,0),weekly_minutes:rows.focus_logs.reduce((n,r)=>n+r.minutes,0),weekly_spent:expenses,weekly_budget:budget,weekly_remaining:budget===null?null:budget-expenses,opening_balance:opening,monthly_income:income,monthly_expenses:expenses,monthly_balance:opening===null?null:opening+income-expenses,daily_progress:Array.from({length:7},(_,i)=>{const d=new Date(mondayDate);d.setUTCDate(d.getUTCDate()+i);return {task_date:d.toISOString().slice(0,10),done:0,total:6};}),timed_tasks:[],schedule:[]};
  };
  await page.route('https://pvsvswcfolyyjhzggbrx.supabase.co/**',async route=>{
   const request=route.request(),url=new URL(request.url()),method=request.method(),name=url.pathname.split('/').pop();
   const send=(body,status=200,headers={})=>route.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':'*','access-control-expose-headers':'content-range',...headers},body:JSON.stringify(body)});
   if(url.pathname.includes('/auth/'))return send(user);
   if(name==='dashboard_summary')return missing?send({code:'PGRST202',message:'Missing'},404):send(summary());
   if(name==='save_dashboard_plan'){const d=request.postDataJSON();opening=d.p_opening;budget=d.p_budget;return send(null);}
   if(name==='profiles')return send(null,201);
   if(!rows[name])return send([]);
   const id=url.searchParams.get('id')?.replace('eq.','');
   if(method==='GET'){
    const start=url.searchParams.get('entry_date');
    const all=rows[name].filter(r=>!start||r.entry_date.startsWith(start.replace('gte.','').slice(0,7)));
    const offset=Number(url.searchParams.get('offset')||0),limit=Number(url.searchParams.get('limit')||20),data=all.slice(offset,offset+limit);
    return send(data,200,{'content-range':`${offset}-${offset+data.length-1}/${all.length}`});
   }
   if(rejectSave)return send({message:'Connection interrupted. Try again.'},503);
   if(method==='POST'){const row={...request.postDataJSON(),id:`entry-${++serial}`};rows[name].push(row);return send({id:row.id},201);}
   if(method==='PATCH'){Object.assign(rows[name].find(row=>row.id===id),request.postDataJSON());return send({id});}
   if(method==='DELETE'){rows[name]=rows[name].filter(row=>row.id!==id);return send({id});}
  });
  await page.goto('http://127.0.0.1:5173/');
  await page.getByRole('heading',{name:'Your everyday progress'}).waitFor();
  assert.ok((await page.getByText('Not set',{exact:true}).count())>0);
  await page.getByRole('button',{name:'Log focus',exact:true}).click();
  await page.getByLabel('Title',{exact:true}).fill('Python focus');await page.getByLabel('Quantity',{exact:true}).fill('90');
  rejectSave=true;await page.getByRole('button',{name:'Save entry',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'Connection interrupted'}).waitFor();
  assert.equal(await page.getByLabel('Title',{exact:true}).inputValue(),'Python focus');
  rejectSave=false;await page.getByRole('button',{name:'Save entry',exact:true}).click();
  await page.getByRole('heading',{name:'Python focus'}).waitFor();
  await page.getByText('90 minutes this week',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Edit Python focus',exact:true}).click();
  await page.getByLabel('Quantity',{exact:true}).fill('120');await page.getByRole('button',{name:'Save entry',exact:true}).click();
  await page.getByText('120 minutes this week',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Log reading',exact:true}).click();await page.getByLabel('Title',{exact:true}).fill('Book chapter');await page.getByLabel('Quantity',{exact:true}).fill('12');await page.getByRole('button',{name:'Save entry',exact:true}).click();
  await page.getByRole('dialog').waitFor({state:'hidden'});
  await page.getByRole('tab',{name:'Reading',exact:true}).click();await page.getByRole('heading',{name:'Book chapter'}).waitFor();
  await page.getByRole('button',{name:'Log money',exact:true}).click();await page.getByLabel('Title',{exact:true}).fill('Lunch');await page.getByLabel('Amount',{exact:true}).fill('150.25');
  await page.getByRole('button',{name:'Save entry',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
  await page.getByRole('tab',{name:'Money',exact:true}).click();await page.getByRole('heading',{name:'Lunch'}).waitFor();
  assert.equal(rows.finance_entries[0].amount_minor,15025);
  await page.getByRole('button',{name:'Edit budget and opening balance',exact:true}).click();
  await page.getByLabel('Opening balance',{exact:true}).fill('1000.00');await page.getByLabel('Weekly budget',{exact:true}).fill('100.00');await page.getByRole('button',{name:'Save entry',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
  assert.equal(opening,100000);assert.equal(budget,10000);
  await page.waitForFunction(()=>document.querySelector('.weekly-budget strong')?.classList.contains('negative'));
  await page.getByRole('button',{name:'Delete Lunch',exact:true}).click();await page.getByRole('button',{name:'Delete entry',exact:true}).click();
  await page.getByRole('heading',{name:'No money entries this month.'}).waitFor();assert.equal(rows.finance_entries.length,0);
  // More than one journal page and a month with no records.
  for(let i=0;i<21;i++)rows.focus_logs.push({id:`extra-${i}`,title:`Extra focus ${i}`,entry_date:today,minutes:1});
  await page.getByRole('tab',{name:'Focus',exact:true}).click();
  await page.getByRole('heading',{name:'Extra focus 0',exact:true}).waitFor();
  await page.getByText('22 entries',{exact:false}).waitFor();
  await page.getByRole('button',{name:'Next',exact:true}).click();await page.getByText('Page 2',{exact:true}).waitFor();
  await page.getByRole('heading',{name:'Extra focus 20',exact:true}).waitFor();
  await page.getByLabel('Journal month',{exact:true}).fill('2020-01');await page.getByRole('heading',{name:'No focus entries this month.'}).waitFor();
  await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Dashboard must fit mobile');
  await page.getByRole('button',{name:'Log reading',exact:true}).click();assert.ok(await page.evaluate(()=>document.querySelector('dialog').getBoundingClientRect().right<=innerWidth),'Dialog must fit mobile');await page.getByRole('button',{name:'Close dialog',exact:true}).click();
  missing=true;await page.getByRole('button',{name:'Refresh',exact:true}).click();await page.getByRole('alert').filter({hasText:'Dashboard setup is needed'}).waitFor();
  missing=false;await page.getByRole('button',{name:'Retry dashboard',exact:true}).click();await page.getByRole('heading',{name:'Your everyday progress'}).waitFor();
  assert.deepEqual(errors,[]);
  console.log('PASS (mock API): log creation/edit/deletion; failed-save recovery without losing input; exact money amounts; budget/negative remaining; journal pagination and month filter; mobile dashboard/dialog; missing migration and retry; no browser exceptions.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
