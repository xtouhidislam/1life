import{useEffect,useState}from'react';
import type{FormEvent}from'react';
import{CalendarDays,DownloadCloud}from'lucide-react';
import{supabase}from'./supabase';
import{Modal}from'./Modal';
import{dhakaDate}from'./task-utils';

type PlanStatus={available:boolean;installed:boolean;start_date:string|null;day:number|null};
export function KnowledgeOnlinePlan({onInstalled}:{onInstalled:()=>void}){
 const[status,setStatus]=useState<PlanStatus|null>(null),[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function load(){const{data,error}=await supabase!.rpc('knowledge_plan_status');setStatus(!error&&data?.available?data:null);}
 useEffect(()=>{void load();},[]);
 async function install(event:FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);setError('');const form=new FormData(event.currentTarget);
  try{const{error}=await supabase!.rpc('install_knowledge_plan',{p_start:String(form.get('start_date'))});if(error)throw error;await load();setOpen(false);onInstalled();}
  catch(e){setError((e as{message?:string}).message??'Unable to load the online collection.');}finally{setBusy(false);}
 }
 return <section className="online-plan"><div><span className="eyebrow">ONE HADITH · ONE AYAH · ONE DUA</span><h3>Your 180-day online collection</h3><p>540 source-referenced entries. Arabic originals throughout; Pickthall English for Ayahs. Hadiths are from Sahih al-Bukhari; Duas and adhkar are from Hisn al-Muslim.</p>{status?.installed&&<span className="online-plan-status"><CalendarDays size={13}/>{status.day!<1?`Starts ${status.start_date}`:status.day!>180?'Your 180-day calendar is complete':`Day ${status.day} of 180 · Starts ${status.start_date}`}</span>}<small>Arabic Quran text: <a href="https://tanzil.net" target="_blank" rel="noreferrer">Tanzil Project</a> via Al Quran Cloud. <a href="https://github.com/fawazahmed0/hadith-api" target="_blank" rel="noreferrer">Hadith source</a> · <a href="https://github.com/asellam/HisnElMuslim" target="_blank" rel="noreferrer">Dua source</a></small></div>{status?<button className="compact-primary" onClick={()=>{setError('');setOpen(true);}}><DownloadCloud size={15}/>{status.installed?'Plan start date':'Load 180-day collection'}</button>:<p className="online-plan-setup">Run migration 202610310008_online_knowledge.sql to make this collection available.</p>}
 {open&&<Modal title={status?.installed?'Update your 180-day plan':'Load 540 sourced entries'} onClose={()=>{if(!busy)setOpen(false);}}><form onSubmit={install}><fieldset className="knowledge-fieldset" disabled={busy}><p className="knowledge-form-hint">This adds 180 Hadiths, 180 Ayahs, and 180 Duas/adhkar, with one of each scheduled per day. Source checks match the downloaded datasets; they are not a new scholarly grading. Hadith and Dua English translations are not included.</p><label>Start date<input name="start_date" type="date" required min="2000-01-01" max="2100-01-01" defaultValue={status?.start_date??dhakaDate()}/></label><p className="knowledge-form-hint">Existing memorization progress is preserved. Different text at the same reference will not be overwritten. Changing the start date resets today's daily selection to the new schedule.</p>{error&&<p className="message error" role="alert">{error}</p>}<div className="modal-actions"><button className="quiet-button" type="button" onClick={()=>setOpen(false)}>Cancel</button><button className="compact-primary">{busy?'Loading collection…':status?.installed?'Save plan date':'Load collection'}</button></div></fieldset></form></Modal>}
 </section>;
}
