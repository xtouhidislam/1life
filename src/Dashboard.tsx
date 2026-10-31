import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight, ArrowUpRight, BookOpen, CheckCheck, Clock, Coffee, Pencil, Plus, RefreshCw, Sprout, Trash2, Wallet } from 'lucide-react';
import { supabase } from './supabase';
import { Modal } from './Modal';
import { FinanceCategoryField } from './finance';
import { financeValues } from './finance-utils';
import { LearningProjectCard } from './LearningProjectCard';
import { DailyKnowledgeCard } from './DailyKnowledgeCard';
import './knowledge.css';
import { dhakaDate, shiftDate, weekday } from './task-utils';
import { amountToMinor, currentAndNext, scheduleSlots } from './dashboard-utils';
import type { Slot, TimedTask, RoutineBlock } from './dashboard-utils';
import './dashboard.css';

type Summary = {
  today: string; week_start: string; month_start: string; currency: string; tracking_start: string;
  monthly_score: number; targets_today: number; targets_done: number; weekly_tasks: number; weekly_pages: number; weekly_minutes: number;
  weekly_spent: number; weekly_budget: number | null; weekly_remaining: number | null;
  opening_balance: number | null; monthly_income: number; monthly_expenses: number; monthly_balance: number | null;
  daily_progress: { task_date: string; done: number; total: number }[]; timed_tasks: TimedTask[]; schedule: RoutineBlock[];
};
type Kind = 'focus' | 'reading' | 'finance';
type Entry = { id: string; entry_date: string; title: string; minutes?: number; pages?: number; kind?: 'expense' | 'income'; amount_minor?: number; category?: string };
type Editor = { kind: Kind; entry?: Entry } | { kind: 'budget' };
const tables = { focus: 'focus_logs', reading: 'reading_logs', finance: 'finance_entries' };
const names = { focus: 'Focus', reading: 'Reading', finance: 'Money' };
const errorMessage = (error: unknown) => {
  const e=error as { message?: string; code?: string };
  return ['PGRST202','PGRST205','42P01'].includes(e?.code ?? '') ? 'Dashboard setup is needed. Run 202610310003_dashboard.sql in Supabase SQL Editor, then retry.' : e?.message || 'Unable to connect. Please try again.';
};
function displayDate(date: string): string { return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); }

export function Dashboard({ userId, navigate }: { userId: string; navigate: (section: number) => void }) {
  const [now,setNow]=useState(new Date());
  const today=dhakaDate(now);
  const [summary,setSummary]=useState<Summary | null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [saving,setSaving]=useState(false);
  const [editor,setEditor]=useState<Editor | null>(null);
  const [formError,setFormError]=useState('');
  const [kind,setKind]=useState<Kind>('focus');
  const [month,setMonth]=useState(today.slice(0,7));
  const [page,setPage]=useState(0);
  const [entries,setEntries]=useState<Entry[]>([]);
  const [total,setTotal]=useState(0);
  const [journalLoading,setJournalLoading]=useState(true);
  const [journalError,setJournalError]=useState('');
  const [deleting,setDeleting]=useState<Entry | null>(null);
  const summaryRequest=useRef(0), journalRequest=useRef(0);
  const mutationLock=useRef(false);
  const planPeriod=useRef({month:'',week:''});

  async function loadSummary() {
    const sequence=++summaryRequest.current;
    setLoading(true); setError('');
    try {
      const result=await supabase!.rpc('dashboard_summary'); if (result.error) throw result.error;
      if (sequence===summaryRequest.current) setSummary(result.data as Summary);
    } catch(e) { if(sequence===summaryRequest.current) setError(errorMessage(e)); }
    finally { if(sequence===summaryRequest.current) setLoading(false); }
  }
  async function loadEntries() {
    const sequence=++journalRequest.current;
    setJournalLoading(true); setJournalError(''); setEntries([]);
    try {
      const nextMonth=shiftDate(`${month}-01`,32).slice(0,7)+'-01';
      const {data,error,count}=await supabase!.from(tables[kind]).select('*',{count:'exact'}).eq('user_id',userId).gte('entry_date',`${month}-01`).lt('entry_date',nextMonth).order('entry_date',{ascending:false}).order('created_at',{ascending:false}).order('id').range(page*20,page*20+19);
      if(error) throw error;
      if(sequence===journalRequest.current) {
        if(!data.length&&page>0) {setPage(value=>Math.max(0,value-1));return;}
        setEntries(data as Entry[]);setTotal(count ?? 0);
      }
    }catch(e){if(sequence===journalRequest.current) setJournalError(errorMessage(e));}
    finally{if(sequence===journalRequest.current)setJournalLoading(false);}
  }
  useEffect(()=>{const timer=setInterval(()=>setNow(new Date()),15000);return()=>clearInterval(timer);},[]);
  useEffect(()=>{void loadSummary();return()=>{summaryRequest.current++;};},[today,userId]);
  useEffect(()=>{void loadEntries();return()=>{journalRequest.current++;};},[kind,month,page,userId]);

  async function mutate(action:()=>Promise<void>,message:string) {
    if(mutationLock.current)return;
    mutationLock.current=true;setSaving(true);setFormError('');setNotice('');
    try {await action();setEditor(null);setDeleting(null);setNotice(message);await Promise.all([loadSummary(),loadEntries()]);}
    catch(e){setFormError(errorMessage(e));}
    finally{mutationLock.current=false;setSaving(false);}
  }
  async function save(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();if(!editor)return;
    const form=new FormData(event.currentTarget);
    const currentEditor=editor;
    try {
      if(currentEditor.kind==='budget') {
        const opening=String(form.get('opening') ?? '').trim(),budget=String(form.get('budget') ?? '').trim();
        const openingMinor=opening===''?null:amountToMinor(opening,true),budgetMinor=budget===''?null:amountToMinor(budget);
        const monthStart=summary!.month_start,weekStart=summary!.week_start;
        await mutate(async()=>{
          // One database transaction keeps the two plan values consistent.
          const {error}=await supabase!.rpc('save_dashboard_plan',{p_opening:openingMinor,p_budget:budgetMinor,p_month:planPeriod.current.month,p_week:planPeriod.current.week});
          if(error)throw error;
        },`Plan saved for the month of ${displayDate(monthStart)} and week of ${displayDate(weekStart)}.`);
      }else{
        const title=String(form.get('title') ?? '').trim(),entry_date=String(form.get('entry_date') ?? '');
        if(!title)throw new Error('Enter a title.');
        if(!entry_date || entry_date>today)throw new Error('Choose today or a past date.');
        const values:Record<string,unknown>={title,entry_date};
        if(currentEditor.kind==='finance') {
          Object.assign(values,financeValues(form,today));
        }else{
          const quantity=Number(form.get('quantity'));
          if(!Number.isInteger(quantity)||quantity<1||quantity>(currentEditor.kind==='focus'?1440:10000))throw new Error('Enter a valid whole-number quantity.');
          values[currentEditor.kind==='focus'?'minutes':'pages']=quantity;
        }
        await mutate(async()=>{
          const result=currentEditor.entry
            ?await supabase!.from(tables[currentEditor.kind]).update(values).eq('id',currentEditor.entry.id).eq('user_id',userId).select('id').single()
            :await supabase!.from(tables[currentEditor.kind]).insert({...values,user_id:userId}).select('id').single();
          if(result.error)throw result.error;
        },'Entry saved. Your totals are updated.');
      }
    }catch(e){setFormError(errorMessage(e));}
  }
  const open=(value:Editor)=>{
    if(value.kind==='budget'&&summary)planPeriod.current={month:summary.month_start,week:summary.week_start};
    setFormError('');setEditor(value);
  };
  const money=(minor:number|null)=>minor===null?'Not set':new Intl.NumberFormat('en-BD',{style:'currency',currency:summary?.currency??'BDT',maximumFractionDigits:2}).format(minor/100);
  const schedule=summary?currentAndNext(scheduleSlots(today,summary.timed_tasks,summary.schedule),now.getTime()):{};
  const dailyScore=summary?.targets_today?Math.round(summary.targets_done/summary.targets_today*100):0;

  return <div className="dashboard">
    <div className="dashboard-actions"><span><span className="status-dot"/>Your day, at a glance</span><button className="quiet-button" disabled={loading||saving} onClick={()=>{void loadSummary();void loadEntries();}}><RefreshCw size={13}/>Refresh</button></div>
    {notice&&<p className="message" role="status">{notice}</p>}
    {error?<div className="message error" role="alert">{error}<button className="text-link" onClick={loadSummary}>Retry dashboard</button></div>:loading?<div className="dashboard-loading" role="status">Gathering your day…</div>:summary&&<>
      <div className="schedule-strip"><ScheduleCard title="RIGHT NOW" slot={schedule.current} fallback="A little breathing room." onClick={()=>navigate(1)}/><ScheduleCard title="UP NEXT" slot={schedule.next} fallback="Your next step is yours to choose." onClick={()=>navigate(1)}/></div>
      <section className="metric-grid" aria-label="Weekly statistics"><Metric icon={<CheckCheck size={18}/>} label="Tasks completed" value={String(summary.weekly_tasks)} caption="Dated this week"/><Metric icon={<BookOpen size={18}/>} label="Pages read" value={String(summary.weekly_pages)} caption="Logged this week"/><Metric icon={<Clock size={18}/>} label="Focused hours" value={(summary.weekly_minutes/60).toFixed(1)} caption={`${summary.weekly_minutes} minutes this week`}/><Metric icon={<Wallet size={18}/>} label="Spent this week" value={money(summary.weekly_spent)} caption={`Since Monday, ${displayDate(summary.week_start)}`}/></section>
      <div className="dashboard-middle"><section className="dash-card growth-card"><div className="dash-heading"><div><span className="eyebrow">SHOWING UP MATTERS</span><h2>Your everyday progress</h2></div><Sprout size={25}/></div><div className="score-pair"><div><strong>{dailyScore}<small>%</small></strong><span>Today · {summary.targets_done}/{summary.targets_today} targets</span></div><div><strong>{summary.monthly_score}<small>%</small></strong><span>Monthly average</span></div></div><div className="week-bars" aria-label="Daily target completion this week">{summary.daily_progress.map(day=>{const value=day.total?Math.round(day.done/day.total*100):0;return <div key={day.task_date} className={day.task_date===today?'bar-day today':'bar-day'}><div className="bar-track" role="meter" aria-label={`${day.task_date}: daily target completion`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}><div style={{height:`${value}%`}}/></div><span>{['S','M','T','W','T','F','S'][weekday(day.task_date)]}</span><small>{day.task_date>today?'—':`${day.done}/${day.total}`}</small></div>;})}</div><details className="score-explanation"><summary>How your score works</summary><p>Daily score = completed repeating targets ÷ applicable repeating targets. Monthly score averages each elapsed day from {displayDate(summary.tracking_start>summary.month_start?summary.tracking_start:summary.month_start)} through today; missed days count as zero. Future days are excluded. Manual tasks, reading logs, and focus logs don’t change target completion automatically.</p></details></section>
      <section className="dash-card money-card"><div className="dash-heading"><div><span className="eyebrow">A LITTLE FINANCIAL CLARITY</span><h2>Your money, in view</h2></div><button className="icon-button" aria-label="Edit budget and opening balance" onClick={()=>open({kind:'budget'})}><Pencil size={16}/></button></div><div className="balance-value"><span>Remaining monthly balance</span><strong className={(summary.monthly_balance??0)<0?'negative':''}>{money(summary.monthly_balance)}</strong><small>{summary.opening_balance===null?'Add an opening balance to see your remaining money.':'Opening balance + income − expenses'}</small></div><dl className="money-details"><div><dt>Opening balance</dt><dd>{money(summary.opening_balance)}</dd></div><div><dt>Income this month</dt><dd>{money(summary.monthly_income)}</dd></div><div><dt>Expenses this month</dt><dd>{money(summary.monthly_expenses)}</dd></div></dl><div className="weekly-budget"><span>Weekly budget remaining<small>Budget: {money(summary.weekly_budget)}</small></span><strong className={(summary.weekly_remaining??0)<0?'negative':''}>{money(summary.weekly_remaining)}</strong></div><button className="text-link" onClick={()=>open({kind:'budget'})}>{summary.opening_balance===null||summary.weekly_budget===null?'Set up your plan':'Adjust this week’s plan'}<ArrowUpRight size={14}/></button><button className="text-link" onClick={()=>navigate(5)}>Open expense tracker<ArrowRight size={14}/></button><p className="budget-note">Plans are set per week and month. Balances do not carry forward automatically.</p></section></div>
      <div className="quick-actions"><span className="eyebrow">MAKE A NOTE OF IT</span><button onClick={()=>open({kind:'focus'})}><Clock size={16}/>Log focus<Plus size={14}/></button><button onClick={()=>open({kind:'reading'})}><BookOpen size={16}/>Log reading<Plus size={14}/></button><button onClick={()=>open({kind:'finance'})}><Wallet size={16}/>Log money<Plus size={14}/></button></div>
      <section className="dash-card journal-card"><div className="dash-heading"><div><span className="eyebrow">THE SMALL STEPS ADD UP</span><h2>Your activity journal</h2></div><label className="journal-month"><span className="sr-only">Journal month</span><input aria-label="Journal month" type="month" value={month} max={today.slice(0,7)} disabled={saving} onChange={e=>{if(e.target.value){setMonth(e.target.value);setPage(0);}}}/></label></div><div className="journal-tabs" role="tablist" aria-label="Journal type">{(['focus','reading','finance']as const).map(value=><button key={value} role="tab" aria-selected={kind===value} disabled={saving} onClick={()=>{setKind(value);setPage(0);}}>{names[value]}</button>)}</div>
      {journalError?<div className="message error" role="alert">{journalError}<button className="text-link" onClick={loadEntries}>Retry journal</button></div>:journalLoading?<p className="empty-state" role="status">Loading your journal…</p>:entries.length?<><div className="journal-list">{entries.map(entry=><article className="journal-row" key={entry.id}><span className="journal-date">{displayDate(entry.entry_date)}</span><div className="journal-copy"><h3>{entry.title}</h3><small>{kind==='finance'?`${entry.kind} / ${entry.category??'Other'}`:kind==='focus'?'Focused work':'Pages read'}</small></div><strong className={entry.kind==='income'?'income':''}>{kind==='finance'?`${entry.kind==='income'?'+':'−'}${money(entry.amount_minor!)}`:kind==='focus'?`${entry.minutes} min`:`${entry.pages} pages`}</strong><button className="icon-button" disabled={saving} aria-label={`Edit ${entry.title}`} onClick={()=>open({kind,entry})}><Pencil size={14}/></button><button className="icon-button" disabled={saving} aria-label={`Delete ${entry.title}`} onClick={()=>{setFormError('');setDeleting(entry);}}><Trash2 size={14}/></button></article>)}</div></>:<div className="empty-state"><Coffee size={24}/><h3>No {names[kind].toLowerCase()} entries this month.</h3><p>Add an entry to start seeing your progress.</p><button className="text-link" onClick={()=>open({kind})}>Add your first entry<Plus size={14}/></button></div>}
      <div className="journal-pagination"><span>{total} {total===1?'entry':'entries'} · {month}</span><button className="quiet-button" disabled={page===0||journalLoading||saving} onClick={()=>setPage(value=>value-1)}>Previous</button><span>Page {page+1}</span><button className="quiet-button" disabled={(page+1)*20>=total||journalLoading||saving} onClick={()=>setPage(value=>value+1)}>Next</button></div></section>
      <div className="dashboard-bottom"><LearningProjectCard onOpen={()=>navigate(2)}/><DailyKnowledgeCard onOpen={()=>navigate(4)}/></div>
    </>}
    {editor&&<Modal title={editor.kind==='budget'?'Your current money plan':`${editor.entry?'Edit':'Log'} ${names[editor.kind].toLowerCase()}`} onClose={()=>{if(!saving)setEditor(null);}}><form onSubmit={save}><fieldset disabled={saving} className="dashboard-fieldset">{editor.kind==='budget'?<><p className="field-hint plan-hint">Amounts in {summary?.currency}. Leave a field blank to unset it. Negative opening balances are allowed.</p><label>Opening balance · {summary?.month_start.slice(0,7)}<input name="opening" aria-label="Opening balance" type="text" inputMode="decimal" defaultValue={summary?.opening_balance===null?'':((summary?.opening_balance??0)/100).toFixed(2)} placeholder="Not set"/></label><label>Weekly budget · from {summary&&displayDate(summary.week_start)}<input name="budget" aria-label="Weekly budget" type="text" inputMode="decimal" defaultValue={summary?.weekly_budget===null?'':((summary?.weekly_budget??0)/100).toFixed(2)} placeholder="Not set"/></label></>:<><label>Title<input name="title" required maxLength={200} defaultValue={editor.entry?.title} autoFocus placeholder={editor.kind==='focus'?'e.g. Python practice':editor.kind==='reading'?'Book or reading title':'e.g. Groceries or salary'}/></label><label>Date<input aria-label="Entry date" name="entry_date" type="date" required max={today} defaultValue={editor.entry?.entry_date??today}/></label>{editor.kind==='finance'?<><label>Type<select aria-label="Transaction type" name="transaction_kind" defaultValue={editor.entry?.kind??'expense'}><option value="expense">Expense</option><option value="income">Income</option></select></label><FinanceCategoryField category={editor.entry?.category}/><label>Amount ({summary?.currency})<input aria-label="Amount" name="amount" type="text" inputMode="decimal" required defaultValue={editor.entry?.amount_minor? (editor.entry.amount_minor/100).toFixed(2):''} placeholder="0.00"/></label></>:<label>{editor.kind==='focus'?'Minutes focused':'Pages read'}<input aria-label="Quantity" name="quantity" type="number" min={1} max={editor.kind==='focus'?1440:10000} step={1} required defaultValue={editor.kind==='focus'?editor.entry?.minutes:editor.entry?.pages}/></label>}<p className="field-hint">This log updates your dashboard totals. Mark the corresponding daily target separately.</p></>}{formError&&<p className="message error" role="alert">{formError}</p>}<div className="modal-actions"><button type="button" className="quiet-button" onClick={()=>setEditor(null)}>Cancel</button><button className="compact-primary">{saving?'Saving…':'Save entry'}</button></div></fieldset></form></Modal>}
    {deleting&&<Modal title="Delete this entry?" onClose={()=>{if(!saving)setDeleting(null);}}><p className="confirm-copy">“{deleting.title}” will be deleted and your totals recalculated.</p>{formError&&<p className="message error" role="alert">{formError}</p>}<div className="modal-actions"><button className="quiet-button" disabled={saving} onClick={()=>setDeleting(null)}>Cancel</button><button className="compact-primary danger-button" disabled={saving} onClick={()=>mutate(async()=>{const {error}=await supabase!.from(tables[kind]).delete().eq('id',deleting.id).eq('user_id',userId).select('id').single();if(error)throw error;},'Entry deleted. Totals updated.')}>{saving?'Deleting…':'Delete entry'}</button></div></Modal>}
  </div>;
}

function Metric({icon,label,value,caption}:{icon:React.ReactNode;label:string;value:string;caption:string}) {return <article className="metric-card"><div className="metric-label"><span>{label}</span>{icon}</div><strong>{value}</strong><small>{caption}</small></article>;}
function ScheduleCard({title,slot,fallback,onClick}:{title:string;slot?:Slot;fallback:string;onClick:()=>void}) {
  const time=(value:number)=>new Date(value).toLocaleString('en-GB',{timeZone:'Asia/Dhaka',weekday:'short',hour:'2-digit',minute:'2-digit',hour12:true});
  return <button className="schedule-card" onClick={onClick}><span className="eyebrow">{title}<span>{slot?.source??'Your schedule'}</span></span><strong>{slot?.title??fallback}</strong><small>{slot?`${time(slot.start)} – ${time(slot.end)}`:'Open task manager to plan your day.'}</small><ArrowUpRight size={17}/></button>;
}
