const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage();page.setDefaultTimeout(12000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const user={id:'11111111-1111-4111-8111-111111111111',email:'test@example.com',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:new Date().toISOString()};
  const exp=Math.floor(Date.now()/1000)+3600;
  const access_token=['eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',Buffer.from(JSON.stringify({sub:user.id,exp,role:'authenticated'})).toString('base64url'),'signature'].join('.');
  await page.addInitScript(({user,exp,access_token})=>localStorage.setItem('sb-pvsvswcfolyyjhzggbrx-auth-token',JSON.stringify({access_token,refresh_token:'test',expires_at:exp,expires_in:3600,token_type:'bearer',user})),{user,exp,access_token});
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Dhaka',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()),part=type=>parts.find(p=>p.type===type).value;
  const today=`${part('year')}-${part('month')}-${part('day')}`,month=today.slice(0,7),monthStart=month+'-01';
  const mondayDate=new Date(today+'T12:00:00Z');mondayDate.setUTCDate(mondayDate.getUTCDate()-((mondayDate.getUTCDay()+6)%7));
  const monday=mondayDate.toISOString().slice(0,10);
  let rows=Array.from({length:25},(_,i)=>({id:`seed-${i}`,title:`Seed purchase ${i}`,kind:'expense',category:'Other',amount_minor:100,entry_date:today}));
  const openings={},budgets={};let serial=0,missing=false,rejectSave=false;
  const expenseSummary=selected=>{
   const entries=rows.filter(r=>r.entry_date.slice(0,7)===selected.slice(0,7)),categories={};
   const income=entries.filter(r=>r.kind==='income').reduce((n,r)=>n+r.amount_minor,0),expenses=entries.filter(r=>r.kind==='expense').reduce((n,r)=>n+r.amount_minor,0);
   for(const row of entries.filter(r=>r.kind==='expense')){categories[row.category]??={category:row.category,amount:0,entries:0};categories[row.category].amount+=row.amount_minor;categories[row.category].entries++;}
   const opening=openings[selected]??null;
   return {month_start:selected,currency:'BDT',opening_balance:opening,income,expenses,net:income-expenses,balance:opening===null?null:opening+income-expenses,categories:Object.values(categories),category_options:[...new Set(entries.map(r=>r.category))],daily:Array.from({length:selected===monthStart?Number(today.slice(8)):28},(_,i)=>({entry_date:`${selected.slice(0,7)}-${String(i+1).padStart(2,'0')}`,expenses:entries.filter(r=>r.kind==='expense'&&Number(r.entry_date.slice(8))===i+1).reduce((n,r)=>n+r.amount_minor,0),income:0})),weeks:[{week_start:monday,budget_minor:budgets[monday]??null,spent:expenses}]};
  };
  const dashboardSummary=()=>{
   const s=expenseSummary(monthStart);
   return {today,week_start:monday,month_start:monthStart,currency:'BDT',tracking_start:monthStart,monthly_score:0,targets_today:0,targets_done:0,weekly_tasks:0,weekly_pages:0,weekly_minutes:0,weekly_spent:s.expenses,weekly_budget:budgets[monday]??null,weekly_remaining:budgets[monday]===undefined?null:budgets[monday]-s.expenses,opening_balance:openings[monthStart]??null,monthly_income:s.income,monthly_expenses:s.expenses,monthly_balance:s.balance,daily_progress:[],timed_tasks:[],schedule:[]};
  };
  await page.route('https://pvsvswcfolyyjhzggbrx.supabase.co/**',async route=>{
   const request=route.request(),url=new URL(request.url()),method=request.method(),name=url.pathname.split('/').pop();
   const send=(body,status=200,headers={})=>route.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':'*','access-control-expose-headers':'content-range',...headers},body:JSON.stringify(body)});
   if(url.pathname.includes('/auth/'))return send(user);
   if(name==='profiles')return send(null,201);
   if(name==='dashboard_summary')return send(dashboardSummary());
   if(name==='expense_summary')return missing?send({message:'Missing function',code:'PGRST202'},404):send(expenseSummary(request.postDataJSON().p_month));
   if(name==='expense_transactions'){
    if(missing)return send({message:'Missing function',code:'PGRST202'},404);
    const p=request.postDataJSON(),filtered=rows.filter(r=>r.entry_date.slice(0,7)===p.p_month.slice(0,7)&&(p.p_kind==='all'||r.kind===p.p_kind)&&(!p.p_category||r.category===p.p_category)&&(!p.p_search||r.title.toLowerCase().includes(p.p_search.toLowerCase()))&&(!p.p_day||r.entry_date===p.p_day));
    return send({total:filtered.length,income:filtered.filter(r=>r.kind==='income').reduce((n,r)=>n+r.amount_minor,0),expenses:filtered.filter(r=>r.kind==='expense').reduce((n,r)=>n+r.amount_minor,0),entries:p.p_export?filtered:filtered.slice(p.p_page*20,p.p_page*20+20)});
   }
   if(name==='monthly_plans'||name==='weekly_budgets'){
    const source=name==='monthly_plans'?openings:budgets,key=name==='monthly_plans'?'month_start':'week_start',field=name==='monthly_plans'?'opening_balance_minor':'budget_minor';
    if(method==='POST'){const d=request.postDataJSON();source[d[key]]=d[field];}
    else if(method==='DELETE')delete source[url.searchParams.get(key)?.replace('eq.','')];
    return send(null,method==='POST'?201:200);
   }
   if(name==='finance_entries'){
    if(method==='GET'){
     const start=url.searchParams.get('entry_date')?.replace('gte.','').slice(0,7),filtered=rows.filter(r=>!start||r.entry_date.slice(0,7)===start);
     const offset=Number(url.searchParams.get('offset')||0),limit=Number(url.searchParams.get('limit')||20);
     return send(filtered.slice(offset,offset+limit),200,{'content-range':`${offset}-${Math.min(offset+limit,filtered.length)-1}/${filtered.length}`});
    }
    if(rejectSave)return send({message:'Connection interrupted.'},503);
    const id=url.searchParams.get('id')?.replace('eq.','');
    if(method==='POST'){const d={...request.postDataJSON(),id:`added-${++serial}`};rows.unshift(d);return send({id:d.id},201);}
    if(method==='PATCH'){Object.assign(rows.find(r=>r.id===id),request.postDataJSON());return send({id});}
    if(method==='DELETE'){rows=rows.filter(r=>r.id!==id);return send({id});}
   }
   return send([],200,{'content-range':'*/0'});
  });
  await page.goto('http://127.0.0.1:5173/');
  await page.getByRole('button',{name:'Expenses',exact:true}).click();
  await page.getByRole('heading',{name:'Your money, with intention.'}).waitFor();
  await page.getByText('25 matching transactions',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Add transaction',exact:true}).click();
  await page.getByLabel('Title',{exact:true}).fill('Lunch');await page.getByLabel('Category',{exact:true}).selectOption('Food & drink');await page.getByLabel('Amount',{exact:true}).fill('150.25');
  rejectSave=true;await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByRole('alert').filter({hasText:'Connection interrupted'}).waitFor();assert.equal(await page.getByLabel('Title',{exact:true}).inputValue(),'Lunch');
  rejectSave=false;await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByRole('heading',{name:'Lunch',exact:true}).waitFor();
  assert.equal(rows.find(r=>r.title==='Lunch').amount_minor,15025);
  await page.getByRole('button',{name:'Add transaction',exact:true}).click();await page.getByLabel('Title',{exact:true}).fill('Salary');await page.getByLabel('Transaction type',{exact:true}).selectOption('income');await page.getByLabel('Category',{exact:true}).selectOption('Salary');await page.getByLabel('Amount',{exact:true}).fill('500');await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByRole('heading',{name:'Salary',exact:true}).waitFor();
  await page.getByRole('button',{name:'Edit Lunch',exact:true}).click();await page.getByLabel('Amount',{exact:true}).fill('100');await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
  assert.equal(rows.find(r=>r.title==='Lunch').amount_minor,10000);
  await page.getByRole('button',{name:'Filter category: Food & drink',exact:true}).click();await page.getByText('1 matching transaction',{exact:true}).waitFor();
  assert.equal(await page.getByLabel('Filter category',{exact:true}).inputValue(),'Food & drink');
  await page.getByRole('button',{name:'Clear filters',exact:true}).click();
  await page.getByLabel('Search transactions',{exact:true}).fill('Lunch');await page.getByRole('button',{name:'Search',exact:true}).click();await page.getByText('1 matching transaction',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Clear filters',exact:true}).click();await page.getByText('27 matching transactions',{exact:true}).waitFor();
  const downloadEvent=page.waitForEvent('download');await page.getByRole('button',{name:'Export CSV',exact:true}).click();const download=await downloadEvent;
  const csv=await fs.readFile(await download.path(),'utf8');assert.ok(csv.includes('Food & drink'));assert.equal(csv.trim().split('\r\n').length,28,'Export must cover both pages');
  await page.getByRole('button',{name:'Next',exact:true}).click();await page.getByText('Page 2 of 2',{exact:true}).waitFor();await page.getByRole('heading',{name:'Seed purchase 24',exact:true}).waitFor();
  await page.getByRole('button',{name:'Previous',exact:true}).click();await page.getByRole('heading',{name:'Lunch',exact:true}).waitFor();
  await page.getByRole('button',{name:/^Opening:/}).click();await page.getByLabel('Plan amount',{exact:true}).fill('1000');await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});assert.equal(openings[monthStart],100000);
  await page.getByRole('button',{name:`Edit budget for ${monday}`,exact:true}).click();await page.getByLabel('Plan amount',{exact:true}).fill('100');await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});assert.equal(budgets[monday],10000);
  await page.getByRole('button',{name:`Spending on ${today}:`,exact:false}).click();await page.getByRole('button',{name:'Clear filters',exact:true}).waitFor();assert.equal(await page.getByLabel('Filter type',{exact:true}).inputValue(),'expense');await page.getByRole('button',{name:'Clear filters',exact:true}).click();
  await page.getByRole('button',{name:'View on dashboard',exact:true}).click();await page.getByRole('heading',{name:'Your money, in view',exact:true}).waitFor();await page.getByRole('tab',{name:'Money',exact:true}).click();await page.getByRole('heading',{name:'Lunch',exact:true}).waitFor();
  await page.getByRole('button',{name:'Edit Lunch',exact:true}).click();assert.equal(await page.getByLabel('Category',{exact:true}).inputValue(),'Food & drink');await page.getByLabel('Category',{exact:true}).selectOption('Learning');await page.getByRole('button',{name:'Save entry',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});assert.equal(rows.find(r=>r.title==='Lunch').category,'Learning');
  await page.getByRole('button',{name:'Expenses',exact:true}).click();await page.getByRole('heading',{name:'Lunch',exact:true}).waitFor();await page.getByRole('button',{name:'Delete Lunch',exact:true}).click();await page.getByRole('button',{name:'Delete transaction',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});assert.ok(!rows.some(r=>r.title==='Lunch'));
  await page.getByLabel('Expense month',{exact:true}).fill('2020-01');await page.getByText('0 matching transactions',{exact:true}).waitFor();await page.getByRole('button',{name:/^Opening:/}).click();await page.getByLabel('Plan amount',{exact:true}).fill('-25');await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});assert.equal(openings['2020-01-01'],-2500);
  await page.getByRole('button',{name:'This month',exact:true}).click();await page.getByRole('heading',{name:'Your money, with intention.'}).waitFor();
  await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Expense view must fit mobile');await page.getByRole('button',{name:'Add transaction',exact:true}).click();assert.ok(await page.evaluate(()=>document.querySelector('dialog').getBoundingClientRect().right<=innerWidth),'Transaction dialog must fit mobile');await page.getByRole('button',{name:'Close dialog',exact:true}).click();
  await page.setViewportSize({width:1280,height:900});missing=true;await page.getByRole('button',{name:'Refresh expenses',exact:true}).click();await page.getByRole('alert').filter({hasText:'Expense setup is needed'}).first().waitFor();missing=false;await page.getByRole('button',{name:'Retry expenses',exact:true}).click();await page.getByRole('heading',{name:'Your money, with intention.'}).waitFor();await page.getByRole('button',{name:'Retry transactions',exact:true}).click();await page.getByText('26 matching transactions',{exact:true}).waitFor();
  assert.deepEqual(errors,[]);
  console.log('PASS (mock API): expenses/income CRUD; failed-save recovery; categories/search/day filters; monthly history; opening balances and weekly budgets; all-page CSV download; pagination; dashboard/expense shared edits; mobile/dialog layout; missing migration retry; no browser errors.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
