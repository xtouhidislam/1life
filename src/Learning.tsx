import {useEffect,useRef,useState}from'react';
import type{FormEvent}from'react';
import {ArrowRight,ArrowUpRight,BookOpen,Check,CheckCircle2,ChevronRight,Code2,GitBranch,Link2,Lock,NotebookPen,RefreshCw,Settings2,Workflow}from'lucide-react';
import {supabase}from'./supabase';
import {Modal}from'./Modal';
import {learningMonths,safeEvidenceUrl,weekRange,weekStatus}from'./learning-utils';
import type{LearningState,LearningCriterion,LearningProject}from'./learning-utils';
import './learning.css';

type Editor={kind:'week';week:number;notes:string;url:string}|{kind:'project';project:LearningProject}|{kind:'settings';start:string};
const errorMessage=(error:unknown)=>{
 const e=error as{message?:string;code?:string};
 return ['PGRST202','PGRST205','42P01'].includes(e?.code??'')?'Learning setup is needed. Run 202610310005_learning.sql in Supabase SQL Editor, then retry.':e?.message||'Unable to connect. Please try again.';
};
const dateLabel=(date:string)=>new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB',{timeZone:'Asia/Dhaka',day:'numeric',month:'short',year:'numeric'});

export function Learning({userId}:{userId:string}){
 const [data,setData]=useState<LearningState|null>(null);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const [error,setError]=useState(''),[formError,setFormError]=useState(''),[notice,setNotice]=useState('');
 const [tab,setTab]=useState<'weeks'|'projects'|'tree'>('weeks');
 const [selected,setSelected]=useState<number|null>(null);
 const [editor,setEditor]=useState<Editor|null>(null);
 const request=useRef(0),lock=useRef(false);

 async function load(){
  const sequence=++request.current;setLoading(true);setError('');
  try{const result=await supabase!.rpc('learning_state');if(result.error)throw result.error;
   if(sequence!==request.current)return;
   const state=result.data as LearningState;setData(state);
   setSelected(previous=>previous??state.weeks.find(w=>w.unlocked&&w.done<w.total)?.number??26);
  }catch(e){if(sequence===request.current)setError(errorMessage(e));}
  finally{if(sequence===request.current)setLoading(false);}
 }
 useEffect(()=>{void load();return()=>{request.current++;};},[userId]);

 async function mutate(action:()=>Promise<void>,message:string){
  if(lock.current)return;lock.current=true;setBusy(true);setFormError('');setNotice('');setError('');
  try{await action();setEditor(null);setNotice(message);await load();}
  catch(e){editor?setFormError(errorMessage(e)):setError(errorMessage(e));}
  finally{lock.current=false;setBusy(false);}
 }
 async function toggle(criterion:LearningCriterion){
  await mutate(async()=>{const{error}=await supabase!.rpc('set_learning_check',{p_criterion:criterion.id,p_done:!criterion.completed_at});if(error)throw error;},criterion.completed_at?'Reopened. Later weeks stay saved and require all prerequisites to be complete.':'Progress saved.');
 }
 async function save(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(!editor)return;
  const form=new FormData(event.currentTarget),value=editor;
  try{
   if(value.kind==='settings'){
    const start=String(form.get('start_date')??'');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||start<'2000-01-01'||start>'2100-01-01')throw new Error('Choose a start date between 2000 and 2100.');
    await mutate(async()=>{const{error}=await supabase!.from('profiles').update({roadmap_start_date:start}).eq('id',userId).select('id').single();if(error)throw error;},'Roadmap dates updated. Your saved progress is unchanged.');
   }else{
    const notes=String(form.get('notes')??'').trim(),url=safeEvidenceUrl(String(form.get('url')??''));
    if(notes.length>8000)throw new Error('Keep notes within 8,000 characters.');
    await mutate(async()=>{
     const result=value.kind==='week'
      ?await supabase!.rpc('save_learning_evidence',{p_week:value.week,p_notes:notes,p_url:url})
      :await supabase!.rpc('save_learning_project',{p_project:value.project.id,p_notes:notes,p_url:url});
     if(result.error)throw result.error;
    },'Deliverable evidence saved.');
   }
  }catch(e){setFormError(errorMessage(e));}
 }
 const open=(value:Editor)=>{setFormError('');setEditor(value);};
 const week=data?.weeks.find(w=>w.number===selected);
 const evidence=data?.evidence.find(e=>e.week_number===selected);
 const completeWeeks=data?.weeks.filter(w=>weekStatus(w)==='complete').length??0;
 const activeWeek=data?.weeks.find(w=>w.unlocked&&w.done<w.total);
 const done=data?.criteria.filter(c=>c.completed_at).length??0;
 const total=data?.criteria.length??0;
 const range=week&&data?weekRange(data.start_date,week.number):null;
 const selectWeek=(number:number)=>{setSelected(number);setTab('weeks');setNotice('');};

 return <div className="learning">
  <div className="learning-toolbar"><div className="learning-tabs" role="tablist" aria-label="Learning views">{([['weeks','Weekly plan'],['projects','Projects'],['tree','Progress tree']]as const).map(([value,label])=><button key={value} role="tab" aria-selected={tab===value} onClick={()=>setTab(value)}>{label}</button>)}</div><div className="learning-toolbar-actions"><button className="icon-button" aria-label="Refresh learning" disabled={busy||loading} onClick={load}><RefreshCw size={16}/></button><button className="quiet-button" disabled={busy||loading||!data} onClick={()=>data&&open({kind:'settings',start:data.start_date})}><Settings2 size={14}/>Roadmap dates</button></div></div>
  {notice&&<p className="message" role="status">{notice}</p>}
  {error&&<div className="message error" role="alert">{error}<button className="text-link" disabled={busy} onClick={load}>Retry learning</button></div>}
  {loading?<p className="empty-state" role="status">Opening your learning journey…</p>:data&&<>
   <section className="learning-hero"><div><span className="eyebrow">BUILD. UNDERSTAND. REPEAT.</span><h2>A little closer to<br/>the engineer you’ll become.</h2><p>26 weeks · One focused path · Work you can show</p><span className="learning-date-range">{dateLabel(data.start_date)} – {dateLabel(weekRange(data.start_date,26).end)}</span></div><div className="learning-overall"><span className="learning-progress-number">{completeWeeks}<small>/26</small></span><span>weeks complete</span><div className="learning-progress-track"><span style={{width:`${completeWeeks/26*100}%`}}/></div><small>{done} of {total} saved checklist items{activeWeek?` · Week ${activeWeek.number} is your next step`:''}</small><Workflow size={39} strokeWidth={1}/></div></section>
   <p className="learning-rule"><Lock size={13}/>Unlocking follows completion, not calendar dates. Every earlier week must be complete before a later week can be edited.</p>
   {tab==='weeks'&&week&&range&&<div className="weekly-layout"><aside className="week-list" aria-label="Select a roadmap week">{learningMonths.map((name,index)=><div className="week-group" key={name}><h3>MONTH {index+1}<span>{name}</span></h3>{data.weeks.filter(w=>w.month===index+1).map(w=><button key={w.number} className={selected===w.number?'week-picker selected':'week-picker'} aria-label={`Week ${w.number}: ${w.title}`} aria-current={selected===w.number?'step':undefined} onClick={()=>setSelected(w.number)}><span className={`week-number ${weekStatus(w)}`}>{weekStatus(w)==='complete'?<Check size={13}/>:weekStatus(w)==='locked'?<Lock size={11}/>:String(w.number).padStart(2,'0')}</span><span>{w.title}<small>{w.done}/{w.total} saved</small></span><ChevronRight size={13}/></button>)}</div>)}</aside>
   <section className="week-detail"><div className="week-detail-heading"><span className="eyebrow">WEEK {String(week.number).padStart(2,'0')} · {learningMonths[week.month-1]}</span><span className={`learning-status ${weekStatus(week)}`}>{weekStatus(week)==='locked'?'Locked':weekStatus(week)==='complete'?'Complete':'Available'}{week.milestone&&' · Milestone'}</span></div><h2>{week.title}</h2><p className="week-date">{dateLabel(range.start)} – {dateLabel(range.end)}</p><div className="week-progress"><div className="learning-progress-track"><span style={{width:`${week.done/week.total*100}%`}}/></div><span>{week.done} / {week.total} saved</span></div>
    {!week.unlocked&&<p className="locked-notice"><Lock size={15}/>Finish all earlier weeks to edit this week. You can preview its plan; existing notes and checks are preserved.</p>}
    <div className="prerequisite"><BookOpen size={17}/><p><strong>Before you begin</strong>{week.prerequisite||`Complete all checklist items in weeks 1–${week.number-1}.`}</p></div>
    {(['topic','practice','acceptance']as const).map(kind=><section className={`criterion-section ${kind}`} key={kind}><h3>{kind==='topic'?'Learn & understand':kind==='practice'?'Put it into practice':'Acceptance criteria'}</h3>{kind==='acceptance'&&<p className="criterion-hint">Save deliverable notes or a link below, then confirm the result meets these criteria.</p>}{data.criteria.filter(c=>c.week_number===week.number&&c.kind===kind).map(criterion=><label className={criterion.completed_at?'learning-check checked':'learning-check'} key={criterion.id}><input type="checkbox" name={criterion.id} checked={!!criterion.completed_at} disabled={busy||!week.unlocked} onChange={()=>toggle(criterion)}/><span>{criterion.label}</span></label>)}</section>)}
    <section className="deliverable-section"><div className="learning-section-heading"><div><span className="eyebrow">EVIDENCE OF THE WORK</span><h3>Your weekly deliverable</h3></div><button className="quiet-button" disabled={busy||!week.unlocked} onClick={()=>open({kind:'week',week:week.number,notes:evidence?.notes??'',url:evidence?.url??''})}><NotebookPen size={14}/>{evidence?'Edit evidence':'Add evidence'}</button></div>{evidence?.notes&&<p className="evidence-notes">{evidence.notes}</p>}{evidence?.url&&<a className="evidence-link" href={evidence.url} target="_blank" rel="noreferrer"><Link2 size={14}/>Open deliverable<ArrowUpRight size={13}/></a>}{!evidence?.notes&&!evidence?.url&&<p className="learning-empty">Add a repository, demo, evaluation report, or notes describing what you built and tested.</p>}</section>
    {week.unlocked&&week.done===week.total&&<div className="week-finished"><CheckCircle2 size={23}/><div><strong>Another step forward.</strong><span>{week.number===26?'You completed the entire roadmap. Keep building.':`Week ${week.number+1} is now available.`}</span></div>{week.number<26&&<button className="text-link" onClick={()=>selectWeek(week.number+1)}>Continue<ArrowRight size={14}/></button>}</div>}
   </section></div>}
   {tab==='projects'&&<><div className="learning-section-heading project-intro"><div><span className="eyebrow">A PORTFOLIO BUILT ON EVIDENCE</span><h2>Four projects. Real work to show.</h2></div><Code2 size={28}/></div><p className="learning-rule">Project progress comes from its linked weekly checklists. Add project links and documentation when its prerequisite weeks are complete.</p><div className="learning-project-grid">{data.projects.map(project=><article className="learning-project" key={project.id}><div className="project-card-top"><span className="project-icon"><Code2 size={22}/></span><span className={`learning-status ${!project.unlocked?'locked':project.done===project.total?'complete':'active'}`}>{!project.unlocked?'Locked':project.done===project.total?'Complete':'Available'}</span></div><span className="eyebrow project-weeks">WEEKS {project.start_week}{project.end_week!==project.start_week?`–${project.end_week}`:''}</span><h3>{project.title}</h3><p>{project.description}</p><div className="learning-progress-track"><span style={{width:`${project.done/project.total*100}%`}}/></div><span className="project-count">{project.done}/{project.total} linked checklist items saved</span>{project.notes&&<p className="evidence-notes">{project.notes}</p>}{project.url&&<a className="evidence-link" href={project.url} target="_blank" rel="noreferrer">Open project<ArrowUpRight size={13}/></a>}<div className="project-card-actions"><button className="text-link" onClick={()=>selectWeek(project.start_week)}>View weeks<ArrowRight size={13}/></button><button className="quiet-button" disabled={busy||!project.unlocked} onClick={()=>open({kind:'project',project})}><NotebookPen size={13}/>{project.notes||project.url?'Edit notes':'Add notes'}</button></div></article>)}</div></>}
   {tab==='tree'&&<section className="learning-tree"><div className="learning-section-heading"><div><span className="eyebrow">ONE PATH, STEADY GROWTH</span><h2>Your progress tree</h2></div><GitBranch size={27}/></div><p className="learning-rule">Select any week to preview it. A locked week keeps its saved progress until all prerequisites are complete again.</p>{learningMonths.map((name,index)=><section className="tree-phase" key={name}><div className="tree-phase-label"><span>{String(index+1).padStart(2,'0')}</span><div><small>MONTH {index+1}</small><h3>{name}</h3></div></div><div className="tree-nodes">{data.weeks.filter(w=>w.month===index+1).map(w=><button key={w.number} className={`tree-node ${weekStatus(w)}`} aria-label={`Open week ${w.number}: ${weekStatus(w)}`} onClick={()=>selectWeek(w.number)}><span>{weekStatus(w)==='complete'?<Check size={18}/>:weekStatus(w)==='locked'?<Lock size={15}/>:String(w.number).padStart(2,'0')}</span><strong>Week {w.number}</strong><small>{w.done}/{w.total}</small>{w.milestone&&<em>Milestone</em>}</button>)}</div></section>)}</section>}
   <p className="learning-source">Curriculum: your supplied progress_tracker.docx. Dates are calculated from your roadmap start date. Checklist completion is self-reported; saved notes document your work.</p>
  </>}
  {editor&&<Modal title={editor.kind==='settings'?'Roadmap start date':editor.kind==='week'?`Week ${editor.week} deliverable`:`${editor.project.title} · evidence`} onClose={()=>{if(!busy)setEditor(null);}}><form onSubmit={save}><fieldset className="learning-fieldset" disabled={busy}>{editor.kind==='settings'?<><p className="learning-form-hint">Changes shift all 26 weekly date ranges. Saved checks and project evidence remain unchanged. Calendar dates do not unlock weeks.</p><label>Start date<input type="date" name="start_date" required min="2000-01-01" max="2100-01-01" defaultValue={editor.start}/></label></>:<><p className="learning-form-hint">Document the problem, what you built, how you tested it, results, and limitations.</p><label>Deliverable link<input name="url" type="url" maxLength={2000} defaultValue={editor.kind==='week'?editor.url:editor.project.url} placeholder="https://github.com/you/project"/></label><label>Evidence notes<textarea name="notes" rows={7} maxLength={8000} defaultValue={editor.kind==='week'?editor.notes:editor.project.notes} placeholder="What can you demonstrate independently?"/></label></>}{formError&&<p className="message error" role="alert">{formError}</p>}<div className="modal-actions"><button type="button" className="quiet-button" onClick={()=>setEditor(null)}>Cancel</button><button className="compact-primary">{busy?'Saving…':'Save changes'}</button></div></fieldset></form></Modal>}
 </div>;
}
