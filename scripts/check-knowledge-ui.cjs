const{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage();page.setDefaultTimeout(12000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const user={id:'11111111-1111-4111-8111-111111111111',email:'test@example.com',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:new Date().toISOString()};
  const exp=Math.floor(Date.now()/1000)+3600,access_token=['eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',Buffer.from(JSON.stringify({sub:user.id,exp,role:'authenticated'})).toString('base64url'),'signature'].join('.');
  await page.addInitScript(({user,exp,access_token})=>localStorage.setItem('sb-pvsvswcfolyyjhzggbrx-auth-token',JSON.stringify({access_token,refresh_token:'test',expires_at:exp,expires_in:3600,token_type:'bearer',user})),{user,exp,access_token});
  const items=[],books=[],readings=[],daily={};let serial=0,missing=false,failSave=false;
  await page.route('https://pvsvswcfolyyjhzggbrx.supabase.co/**',async route=>{
   const request=route.request(),url=new URL(request.url()),name=url.pathname.split('/').pop();
   const send=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
   if(url.pathname.includes('/auth/'))return send(user);if(name==='profiles')return send({id:user.id});
   if(name==='knowledge_state')return missing?send({code:'PGRST202',message:'Missing'},404):send({counts:['hadith','ayah','dua'].map(kind=>{const active=items.filter(i=>i.kind===kind&&!i.archived);return{kind,total:active.length,reviewed:active.filter(i=>i.reviewed_at).length,memorized:active.filter(i=>i.reviewed_at&&i.status==='memorized').length};}),books:books.map(book=>({...book,pages_read:readings.filter(r=>r.book_id===book.id).reduce((sum,r)=>sum+r.pages,0)}))});
   if(name==='knowledge_list'){
    const p=request.postDataJSON(),all=items.filter(i=>i.kind===p.p_kind&&i.archived===p.p_archived&&(!p.p_search||`${i.title} ${i.reference} ${i.original_text}`.toLowerCase().includes(p.p_search.toLowerCase()))&&(p.p_status==='all'||i.status===p.p_status)&&(p.p_review==='all'||(p.p_review==='reviewed'?!!i.reviewed_at:!i.reviewed_at)));
    return send({total:all.length,items:all.slice(p.p_page*20,p.p_page*20+20)});
   }
   if(name==='knowledge_daily_items'){for(const kind of['hadith','ayah'])daily[kind]??=items.find(i=>i.kind===kind&&i.reviewed_at&&!i.archived)?.id;return send(Object.fromEntries(Object.entries(daily).flatMap(([kind,id])=>{const item=items.find(i=>i.id===id);return item&&item.reviewed_at&&!item.archived?[[kind,item]]:[];})));}
   if(name==='save_knowledge_item'){
    if(failSave)return send({message:'Connection interrupted.'},503);const p=request.postDataJSON();
    if(p.p_id){const item=items.find(i=>i.id===p.p_id);Object.assign(item,p.p_item,{reviewed_at:null});return send(item.id);}
    const item={...p.p_item,id:`item-${++serial}`,reviewed_at:null,archived:false,status:'new'};items.push(item);return send(item.id);
   }
   if(name==='review_knowledge'){const p=request.postDataJSON();items.find(i=>i.id===p.p_id).reviewed_at=new Date().toISOString();return send(null);}
   if(name==='set_knowledge_progress'){const p=request.postDataJSON();items.find(i=>i.id===p.p_id).status=p.p_status;return send(null);}
   if(name==='archive_knowledge'){const p=request.postDataJSON();(p.p_book?books:items).find(i=>i.id===p.p_id).archived=p.p_archived;return send(null);}
   if(name==='import_knowledge'){let added=0,skipped=0;for(const input of request.postDataJSON().p_items){if(items.some(i=>i.kind===input.kind&&i.reference===input.reference)){skipped++;continue;}items.push({...input,id:`item-${++serial}`,reviewed_at:null,archived:false,status:'new'});added++;}return send({added,skipped});}
   if(name==='save_knowledge_book'){const p=request.postDataJSON();if(p.p_id)Object.assign(books.find(b=>b.id===p.p_id),p.p_book);else books.push({...p.p_book,id:`book-${++serial}`,archived:false});return send(books.at(-1).id);}
   if(name==='log_book_reading'){const p=request.postDataJSON();if(!readings.some(r=>r.id===p.p_request))readings.push({id:p.p_request,book_id:p.p_book,pages:p.p_pages,entry_date:p.p_date});return send(p.p_request);}
   return send(null);
  });
  await page.goto('http://127.0.0.1:5173/');await page.getByRole('button',{name:'Knowledge',exact:true}).click();await page.getByRole('heading',{name:'No entries in this view.',exact:true}).waitFor();
  await page.getByRole('button',{name:'Add hadith',exact:true}).click();await page.getByLabel('Title',{exact:true}).fill('Synthetic fixture');await page.getByLabel('Original text',{exact:true}).fill('Synthetic test fixture, not religious text.');await page.getByLabel('Reference',{exact:true}).fill('fixture-1');await page.getByLabel('Source URL',{exact:true}).fill('https://example.com/test-fixture');
  failSave=true;await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByRole('alert').filter({hasText:'Connection interrupted'}).waitFor();assert.equal(await page.getByLabel('Title',{exact:true}).inputValue(),'Synthetic fixture');failSave=false;await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByRole('heading',{name:'Synthetic fixture',exact:true}).waitFor();assert.ok(await page.getByLabel('Progress: Synthetic fixture',{exact:true}).isDisabled());
  await page.getByRole('button',{name:'Review source',exact:true}).click();await page.getByRole('checkbox').filter({visible:true}).last().check();await page.getByRole('button',{name:'Confirm source review',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});assert.ok(items[0].reviewed_at);
  await page.getByLabel('Progress: Synthetic fixture',{exact:true}).selectOption('memorized');await page.waitForFunction(()=>document.querySelector('select[aria-label="Progress: Synthetic fixture"]')?.value==='memorized');assert.equal(items[0].status,'memorized');
  await page.getByRole('button',{name:'Edit Synthetic fixture',exact:true}).click();await page.getByLabel('Title',{exact:true}).fill('Edited fixture');await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByRole('heading',{name:'Edited fixture',exact:true}).waitFor();assert.equal(items[0].reviewed_at,null);assert.ok(await page.getByLabel('Progress: Edited fixture',{exact:true}).isDisabled());
  await page.getByLabel('Source review filter',{exact:true}).selectOption('reviewed');await page.getByRole('heading',{name:'No entries in this view.',exact:true}).waitFor();await page.getByLabel('Source review filter',{exact:true}).selectOption('all');await page.getByRole('heading',{name:'Edited fixture',exact:true}).waitFor();
  await page.getByRole('button',{name:'Archive Edited fixture',exact:true}).click();await page.getByRole('button',{name:'Archive record',exact:true}).click();await page.getByRole('heading',{name:'No entries in this view.',exact:true}).waitFor();await page.getByRole('checkbox',{name:'Archived',exact:true}).check();await page.getByRole('heading',{name:'Edited fixture',exact:true}).waitFor();await page.getByRole('button',{name:'Restore Edited fixture',exact:true}).click();await page.getByRole('button',{name:'Restore record',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});await page.getByRole('checkbox',{name:'Archived',exact:true}).uncheck();
  await page.getByRole('button',{name:'Import JSON',exact:true}).click();
  const fixtures=Array.from({length:24},(_,i)=>({kind:'hadith',title:`Imported fixture ${i}`,original_text:'Synthetic import fixture, not religious text.',reference:`import-${i}`,source_url:'https://example.com/import',translation:'',translator:'',grade:'',reviewed_at:new Date().toISOString()}));
  await page.getByLabel('JSON array',{exact:true}).fill(JSON.stringify(fixtures));await page.getByRole('button',{name:'Import entries',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});assert.equal(items.length,25);assert.ok(items.slice(1).every(i=>i.reviewed_at===null));
  await page.getByRole('button',{name:'Next',exact:true}).click();await page.getByRole('heading',{name:'Imported fixture 23',exact:true}).waitFor();await page.getByLabel('Search knowledge',{exact:true}).fill('Imported fixture 23');await page.getByRole('button',{name:'Search library',exact:true}).click();await page.getByText('1 entries · Page 1',{exact:true}).waitFor();
  await page.getByRole('tab',{name:'Ayahs',exact:true}).click();await page.getByRole('heading',{name:'No entries in this view.',exact:true}).waitFor();await page.getByRole('tab',{name:'Duas',exact:true}).click();await page.getByRole('heading',{name:'No entries in this view.',exact:true}).waitFor();
  await page.getByRole('tab',{name:'Books',exact:true}).click();await page.getByRole('button',{name:'Add book',exact:true}).click();await page.getByLabel('Title',{exact:true}).fill('Synthetic book');await page.getByLabel('Author',{exact:true}).fill('Test author');await page.getByLabel('Total pages',{exact:true}).fill('100');await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByRole('heading',{name:'Synthetic book',exact:true}).waitFor();
  await page.getByRole('button',{name:'Log reading',exact:true}).click();await page.getByLabel('Pages read',{exact:true}).fill('10');await page.getByRole('button',{name:'Save reading',exact:true}).click();await page.getByText('10 pages logged · 100 pages in book',{exact:true}).waitFor();assert.equal(readings.length,1);
  await page.getByRole('button',{name:'Edit Synthetic book',exact:true}).click();await page.getByLabel('Total pages',{exact:true}).fill('120');await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByText('10 pages logged · 120 pages in book',{exact:true}).waitFor();
  await page.getByText('Choose from six short Islamic books',{exact:true}).click();
  const suggestions=page.locator('.book-suggestions');assert.equal(await suggestions.locator('.book-card').count(),6);
  await suggestions.getByRole('button',{name:'Add to my books',exact:true}).first().click();
  assert.equal(await page.getByLabel('Title',{exact:true}).inputValue(),'The Forty Hadith of al-Imam an-Nawawi');assert.equal(await page.getByLabel('Total pages',{exact:true}).inputValue(),'107');
  await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
  assert.equal(books.length,2);assert.ok(await suggestions.getByRole('button',{name:'Already in library',exact:true}).isDisabled());
  await page.setViewportSize({width:390,height:844});for(const name of['Hadiths','Ayahs','Duas','Books']){await page.getByRole('tab',{name,exact:true}).click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${name} must fit mobile`);}
  await page.getByRole('button',{name:'Import JSON',exact:true}).click();assert.ok(await page.evaluate(()=>document.querySelector('dialog').getBoundingClientRect().right<=innerWidth));await page.getByRole('button',{name:'Close dialog',exact:true}).click();
  await page.setViewportSize({width:1280,height:900});missing=true;await page.getByRole('button',{name:'Refresh knowledge',exact:true}).click();await page.getByRole('alert').filter({hasText:'Knowledge setup is needed'}).waitFor();missing=false;await page.getByRole('button',{name:'Retry knowledge',exact:true}).click();await page.getByRole('heading',{name:'Synthetic book',exact:true}).waitFor();
  assert.deepEqual(errors,[]);console.log('PASS (mock API): manual entry and failed-save recovery; review/progress gating; edits require re-review; archive/restore; draft JSON imports; pagination/search; all collections; book reading/edit; mobile/dialog; missing migration retry; no browser errors.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
