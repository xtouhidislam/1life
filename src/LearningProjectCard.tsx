import{useEffect,useState}from'react';
import{ArrowRight}from'lucide-react';
import{supabase}from'./supabase';

type NextProject={title:string;description:string;start_week:number;end_week:number;unlocked:boolean};
export function LearningProjectCard({onOpen}:{onOpen:()=>void}){
 const[project,setProject]=useState<NextProject|null>(null),[state,setState]=useState<'loading'|'ready'|'error'>('loading');
 useEffect(()=>{let active=true;
  supabase!.rpc('learning_next_project').then(({data,error})=>{if(!active)return;setState(error?'error':'ready');setProject(data&&!Array.isArray(data)?data as NextProject:null);});
  return()=>{active=false;};
 },[]);
 return <section className="dash-card"><span className="eyebrow">BUILD SOMETHING THAT MATTERS</span><h2>Upcoming coding project</h2>{state==='loading'?<p role="status">Finding your next project…</p>:state==='error'?<p>Learning data could not be loaded. Open AI learning to check setup or retry.</p>:project?<><h3>{project.title}</h3><p>{project.description}</p><p>Weeks {project.start_week}{project.end_week!==project.start_week?`–${project.end_week}`:''} · {project.unlocked?'Available to work on':'Complete prerequisite weeks to unlock'}</p></>:<p>All linked portfolio checklists are complete. Keep improving your projects and evidence.</p>}<button className="text-link" onClick={onOpen}>Open AI learning<ArrowRight size={14}/></button></section>;
}
