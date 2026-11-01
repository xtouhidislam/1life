import{useEffect,useId,useState}from'react';
import{ArrowUpRight,BookOpen,ChevronLeft,ChevronRight,Layers,RefreshCw}from'lucide-react';
import{supabase}from'./supabase';
import{dhakaDate}from'./task-utils';
import{BanglaTranslation,hasBanglaTranslation}from'./BanglaTranslation';
import type{KnowledgeItem,KnowledgeKind}from'./knowledge-utils';

const dailyTabs=[{kind:'hadith',label:'আজকের হাদিস',english:'Today’s Hadith',icon:BookOpen},{kind:'ayah',label:'আজকের আয়াত',english:'Today’s Ayah',icon:Layers},{kind:'dua',label:'আজকের দুআ',english:'Today’s Dua',icon:BookOpen}]as const;
export function DailyKnowledgeCard({refreshKey=0}:{refreshKey?:number}){
 const[day,setDay]=useState(dhakaDate()),[items,setItems]=useState<Partial<Record<KnowledgeKind,KnowledgeItem>>>({}),[plan,setPlan]=useState<{day:number;start_date:string;status:string}|null>(null),[status,setStatus]=useState<'loading'|'ready'|'error'>('loading'),[tab,setTab]=useState(0),[retry,setRetry]=useState(0);
 const id=useId();
 useEffect(()=>{const timer=setInterval(()=>setDay(dhakaDate()),15000);return()=>clearInterval(timer);},[]);
 useEffect(()=>{let active=true;setStatus('loading');setItems({});
  void(async()=>{try{const{data,error}=await supabase!.rpc('knowledge_daily_items');if(error)throw error;if(active){setItems(data&&!Array.isArray(data)?data:{});setPlan(data?._plan??null);setStatus('ready');}}catch{if(active){setItems({});setPlan(null);setStatus('error');}}})();
  return()=>{active=false;};
 },[day,refreshKey,retry]);
 const selected=dailyTabs[tab],item=items[selected.kind];
 function move(direction:number){const next=(tab+direction+dailyTabs.length)%dailyTabs.length;setTab(next);document.getElementById(`${id}-tab-${next}`)?.focus();}
 return <section className="knowledge-daily" aria-label="Today’s knowledge">
  <div className="daily-reader-tabs" role="tablist" aria-label="Daily knowledge entries">{dailyTabs.map(({kind,label,english,icon:Icon},index)=><button type="button" key={kind} id={`${id}-tab-${index}`} role="tab" aria-selected={tab===index} aria-controls={`${id}-panel`} tabIndex={tab===index?0:-1} onClick={()=>setTab(index)} onKeyDown={event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();move(event.key==='ArrowRight'?1:-1);}else if(event.key==='Home'||event.key==='End'){event.preventDefault();const next=event.key==='Home'?0:2;setTab(next);document.getElementById(`${id}-tab-${next}`)?.focus();}}}><Icon size={18}/><span lang="bn">{label}</span><span className="sr-only">{english}</span></button>)}</div>
  <div className="daily-reader-content" id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-tab-${tab}`}>
   <div className="daily-reader-meta"><span className="eyebrow">A MOMENT FOR FAITH</span><span>{plan?(plan.status==='upcoming'?`Starts ${plan.start_date}`:plan.status==='complete'?'180-day plan complete':`Day ${plan.day} of 180`):day}</span></div>
   {status==='loading'?<p role="status">Loading today’s entries…</p>:status==='error'?<div role="alert"><p>Today’s entries could not be loaded.</p><button className="quiet-button" onClick={()=>setRetry(value=>value+1)}><RefreshCw size={14}/>Retry daily entries</button></div>:item?<article className="daily-reader-item"><h2 className="sr-only">{selected.english}</h2><p className="daily-reader-arabic" lang="ar" dir="rtl">{item.original_text}</p><BanglaTranslation item={item}/>{item.translation&&!hasBanglaTranslation(item)&&<p className="daily-reader-translation" dir="auto">{item.translation}</p>}<a className="knowledge-source-link" href={item.source_url} target="_blank" rel="noreferrer">{item.reference}<ArrowUpRight size={14}/></a>{item.grade&&<p className="daily-reader-credit">{item.grade}</p>}<p className="daily-reader-credit">{item.translator&&`Translation: ${item.translator} · `}{item.source_method==='online-source'?'Matched to linked online source':'Source reviewed in your library'}</p>{item.source_metadata?.license_notice&&<details className="daily-reader-license"><summary>Arabic text attribution and license</summary><pre className="source-license">{item.source_metadata.license_notice}</pre><a href="https://tanzil.net" target="_blank" rel="noreferrer">Tanzil Project</a></details>}</article>:<div className="daily-reader-empty"><selected.icon size={28}/><h2>No daily {selected.kind} available yet</h2><p>Load your 180-day collection below, or add and review an entry in your library.</p></div>}
  </div><div className="daily-reader-footer"><span className="daily-reader-position" aria-label={`Entry ${tab+1} of 3`}>{dailyTabs.map((entry,index)=><span key={entry.kind} className={tab===index?'current':''}/>)}</span><div><button className="icon-button" aria-label="Previous daily entry" onClick={()=>move(-1)}><ChevronLeft size={19}/></button><button className="icon-button" aria-label="Next daily entry" onClick={()=>move(1)}><ChevronRight size={19}/></button></div></div>
 </section>;
}
