import{useEffect,useState}from'react';
import{ArrowRight,ArrowUpRight}from'lucide-react';
import{supabase}from'./supabase';
import{dhakaDate}from'./task-utils';
import type{KnowledgeItem}from'./knowledge-utils';

export function DailyKnowledgeCard({onOpen}:{onOpen:()=>void}){
 const[day,setDay]=useState(dhakaDate()),[items,setItems]=useState<Partial<Record<'hadith'|'ayah'|'dua',KnowledgeItem>>>({}),[plan,setPlan]=useState<{day:number;start_date:string;status:string}|null>(null),[status,setStatus]=useState<'loading'|'ready'|'error'>('loading');
 useEffect(()=>{const timer=setInterval(()=>setDay(dhakaDate()),15000);return()=>clearInterval(timer);},[]);
 useEffect(()=>{let active=true;setStatus('loading');supabase!.rpc('knowledge_daily_items').then(({data,error})=>{if(!active)return;setStatus(error?'error':'ready');setItems(data&&!Array.isArray(data)?data:{});setPlan(data?._plan??null);});return()=>{active=false;};},[day]);
 return <section className="dash-card daily-knowledge"><span className="eyebrow">A MOMENT FOR FAITH</span>
  {plan&&<p className="daily-plan-label">{plan.status==='upcoming'?`Plan starts ${plan.start_date}`:plan.status==='complete'?'180-day plan complete':`Day ${plan.day} of 180`}</p>}
  {status==='loading'?<p role="status">Opening today’s source-referenced entries…</p>:status==='error'?<p>Daily entries could not be loaded. Open Knowledge to check setup or retry.</p>:<>{(['hadith','ayah','dua']as const).map(kind=>{
   const item=items[kind],label=kind==='hadith'?'Hadith':kind==='ayah'?'Ayah':'Dua';
   return <div className="daily-knowledge-item" key={kind}><h2>{label} of the day</h2>{item?<><p className="daily-original" dir="auto">{item.original_text}</p>{item.translation&&<p>{item.translation}</p>}<a href={item.source_url} target="_blank" rel="noreferrer">{item.reference}<ArrowUpRight size={11}/></a><small>{item.translator&&`Translation: ${item.translator} · `}{item.source_method==='online-source'?'Matched to linked online source':'Source reviewed in your library'}</small></>:<p>No reviewed, active {label} is available for today. Add and review entries or load the online collection in Knowledge.</p>}</div>;
  })}</>}<button className="text-link" onClick={onOpen}>Open knowledge<ArrowRight size={14}/></button></section>;
}
