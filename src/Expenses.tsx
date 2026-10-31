import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, Download, Pencil, Plus, RefreshCw, Search, Trash2, Wallet } from 'lucide-react';
import { supabase } from './supabase';
import { Modal } from './Modal';
import { FinanceFields } from './finance';
import { financeCategories, financeCsv, financeValues } from './finance-utils';
import type { FinanceEntry } from './finance-utils';
import { amountToMinor } from './dashboard-utils';
import { dhakaDate, shiftDate } from './task-utils';
import './expenses.css';

type Summary={month_start:string;currency:string;opening_balance:number|null;income:number;expenses:number;net:number;balance:number|null;
  categories:{category:string;amount:number;entries:number}[];category_options:string[];
  daily:{entry_date:string;expenses:number;income:number}[];weeks:{week_start:string;budget_minor:number|null;spent:number}[]};
type Transactions={total:number;income:number;expenses:number;entries:FinanceEntry[]};
type Filters={kind:'all'|'expense'|'income';category:string;search:string;day:string};
type Editor={kind:'transaction';entry?:FinanceEntry}|{kind:'opening';month:string;amount:number|null}|{kind:'budget';week:string;amount:number|null};
const emptyFilters:Filters={kind:'all',category:'',search:'',day:''};
const readableDate=(date:string)=>new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
const monthTitle=(month:string)=>new Date(`${month}-01T12:00:00Z`).toLocaleDateString('en-GB',{month:'long',year:'numeric'});
const errorMessage=(error:unknown)=>{
  const e=error as {message?:string;code?:string};
  return ['PGRST202','PGRST205','PGRST204','42P01','42703'].includes(e?.code??'')?'Expense setup is needed. Run 202610310004_expenses.sql in Supabase SQL Editor, then retry.':e?.message||'Unable to connect. Please try again.';
};

export function Expenses({userId,navigate}:{userId:string;navigate:(section:number)=>void}) {
  const [today,setToday]=useState(dhakaDate());
  const [month,setMonth]=useState(today.slice(0,7));
  const [summary,setSummary]=useState<Summary|null>(null);
  const [transactions,setTransactions]=useState<Transactions|null>(null);
  const [filters,setFilters]=useState<Filters>(emptyFilters);
  const [search,setSearch]=useState('');
  const [page,setPage]=useState(0);
  const [loading,setLoading]=useState(true),[listLoading,setListLoading]=useState(true);
  const [error,setError]=useState(''),[listError,setListError]=useState(''),[formError,setFormError]=useState(''),[notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false),[exporting,setExporting]=useState(false);
  const [editor,setEditor]=useState<Editor|null>(null),[deleting,setDeleting]=useState<FinanceEntry|null>(null);
  const summaryRequest=useRef(0),listRequest=useRef(0),locked=useRef(false);
  const disabled=busy||exporting;

  function filterParams(){return {p_month:`${month}-01`,p_kind:filters.kind,p_category:filters.category,p_search:filters.search,p_day:filters.day||null,p_page:page};}
  async function loadSummary(){
    const sequence=++summaryRequest.current;setLoading(true);setError('');
    try{const result=await supabase!.rpc('expense_summary',{p_month:`${month}-01`});if(result.error)throw result.error;
      if(sequence===summaryRequest.current)setSummary(result.data as Summary);
    }catch(e){if(sequence===summaryRequest.current)setError(errorMessage(e));}
    finally{if(sequence===summaryRequest.current)setLoading(false);}
  }
  async function loadTransactions(){
    const sequence=++listRequest.current;setListLoading(true);setListError('');
    try{const result=await supabase!.rpc('expense_transactions',filterParams());if(result.error)throw result.error;
      if(sequence===listRequest.current){const data=result.data as Transactions;
        if(!data.entries.length&&page>0){setPage(Math.max(0,Math.ceil(data.total/20)-1));return;}
        setTransactions(data);
      }
    }catch(e){if(sequence===listRequest.current)setListError(errorMessage(e));}
    finally{if(sequence===listRequest.current)setListLoading(false);}
  }
  useEffect(()=>{const timer=setInterval(()=>setToday(dhakaDate()),15000);return()=>clearInterval(timer);},[]);
  useEffect(()=>{void loadSummary();return()=>{summaryRequest.current++;};},[month,today,userId]);
  useEffect(()=>{void loadTransactions();return()=>{listRequest.current++;};},[month,filters,page,today,userId]);
  const selectMonth=(value:string)=>{if(!/^\d{4}-\d{2}$/.test(value)||value>today.slice(0,7))return;setMonth(value);setPage(0);setFilters(emptyFilters);setSearch('');setNotice('');};
  const filter=(values:Partial<Filters>)=>{setFilters(previous=>({...previous,...values}));setPage(0);};
  const open=(value:Editor)=>{setFormError('');setEditor(value);};
  const money=(amount:number|null)=>amount===null?'Not set':new Intl.NumberFormat('en-BD',{style:'currency',currency:summary?.currency??'BDT',maximumFractionDigits:2}).format(amount/100);

  async function mutate(action:()=>Promise<void>,message:string){
    if(locked.current)return;locked.current=true;setBusy(true);setFormError('');setNotice('');
    try{await action();setEditor(null);setDeleting(null);setNotice(message);await Promise.all([loadSummary(),loadTransactions()]);}
    catch(e){setFormError(errorMessage(e));}
    finally{locked.current=false;setBusy(false);}
  }
  async function save(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(!editor)return;
    const form=new FormData(event.currentTarget),value=editor;
    try{
      if(value.kind==='transaction'){
        const values=financeValues(form,today);
        await mutate(async()=>{
          const result=value.entry?await supabase!.from('finance_entries').update(values).eq('id',value.entry.id).eq('user_id',userId).select('id').single()
            :await supabase!.from('finance_entries').insert({...values,user_id:userId}).select('id').single();
          if(result.error)throw result.error;
        },`Transaction saved${values.entry_date.slice(0,7)!==month?` to ${monthTitle(values.entry_date.slice(0,7))}`:''}. Dashboard totals use this same record.`);
      }else{
        const raw=String(form.get('amount')??'').trim(),amount=raw===''?null:amountToMinor(raw,value.kind==='opening');
        await mutate(async()=>{
          const table=value.kind==='opening'?'monthly_plans':'weekly_budgets',key=value.kind==='opening'?'month_start':'week_start',date=value.kind==='opening'?value.month:value.week;
          const result=amount===null?await supabase!.from(table).delete().eq('user_id',userId).eq(key,date):await supabase!.from(table).upsert({user_id:userId,[key]:date,[value.kind==='opening'?'opening_balance_minor':'budget_minor']:amount});
          if(result.error)throw result.error;
        },value.kind==='opening'?'Monthly opening balance saved.':'Weekly budget saved.');
      }
    }catch(e){setFormError(errorMessage(e));}
  }
  async function exportCsv(){
    if(disabled)return;setExporting(true);setNotice('');
    try{
      const {data,error}=await supabase!.rpc('expense_transactions',{...filterParams(),p_page:0,p_export:true});if(error)throw error;
      const result=data as Transactions;
      if(!result.entries.length){setNotice('There are no matching transactions to export.');return;}
      const blob=new Blob([financeCsv(result.entries,summary?.currency??'BDT')],{type:'text/csv;charset=utf-8'});
      const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`1life-expenses-${month}.csv`;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
      setNotice(`Exported ${result.total} matching transactions across all pages.`);
    }catch(e){setListError(errorMessage(e));}
    finally{setExporting(false);}
  }
  const categoryOptions=Array.from(new Set([...financeCategories,...(summary?.category_options??[])])).sort();
  const maxDaily=Math.max(1,...(summary?.daily.map(day=>day.expenses)??[]));

  return <div className="expenses">
    <div className="expense-toolbar"><div className="expense-month-control"><button className="icon-button" aria-label="Previous month" disabled={disabled} onClick={()=>selectMonth(shiftDate(`${month}-01`,-1).slice(0,7))}><ChevronLeft size={17}/></button><label><span className="sr-only">Expense month</span><input aria-label="Expense month" type="month" value={month} max={today.slice(0,7)} disabled={disabled} onChange={e=>selectMonth(e.target.value)}/></label><button className="icon-button" aria-label="Next month" disabled={disabled||month>=today.slice(0,7)} onClick={()=>selectMonth(shiftDate(`${month}-01`,32).slice(0,7))}><ChevronRight size={17}/></button><button className="quiet-button" disabled={disabled} onClick={()=>selectMonth(today.slice(0,7))}>This month</button></div><div className="expense-toolbar-actions"><button className="quiet-button" aria-label="Refresh expenses" disabled={disabled||loading||listLoading} onClick={()=>{void loadSummary();void loadTransactions();}}><RefreshCw size={14}/></button><button className="compact-primary" disabled={disabled||loading||!!error} onClick={()=>open({kind:'transaction'})}><Plus size={15}/>Add transaction</button></div></div>
    {notice&&<p className="message" role="status">{notice}</p>}
    {error?<div className="message error" role="alert">{error}<button className="text-link" onClick={loadSummary}>Retry expenses</button></div>:loading?<p className="empty-state" role="status">Gathering your finances…</p>:summary&&<>
      <section className="expense-hero"><div><span className="eyebrow">A CLEARER PICTURE</span><h2>Your money, with intention.</h2><p>{monthTitle(month)} · Every entry helps you see where you stand.</p><button className="text-link" onClick={()=>navigate(0)}>View on dashboard<ArrowUpRight size={14}/></button></div><div className="expense-balance"><span>Remaining monthly balance</span><strong className={(summary.balance??0)<0?'negative':''}>{money(summary.balance)}</strong><small>{summary.opening_balance===null?'Set an opening balance to calculate this.':'Opening balance + income − expenses'}</small><button disabled={disabled} onClick={()=>open({kind:'opening',month:summary.month_start,amount:summary.opening_balance})}><Pencil size={12}/>Opening: {money(summary.opening_balance)}</button></div></section>
      <div className="expense-metrics"><article><span><ArrowDownLeft size={17}/>Money in</span><strong className="income">{money(summary.income)}</strong><small>Income this month</small></article><article><span><ArrowUpRight size={17}/>Money out</span><strong>{money(summary.expenses)}</strong><small>Expenses this month</small></article><article><span><Wallet size={17}/>Net cash flow</span><strong className={summary.net<0?'negative':''}>{money(summary.net)}</strong><small>Income − expenses, before opening balance</small></article></div>
      <div className="expense-insights"><section className="expense-card"><div className="expense-heading"><div><span className="eyebrow">WHERE IT GOES</span><h2>Spending by category</h2></div><span className="expense-caption">Expenses only</span></div>{summary.categories.length?<div className="category-list">{summary.categories.map(row=><button key={row.category} disabled={disabled} aria-label={`Filter category: ${row.category}`} aria-pressed={filters.category===row.category&&filters.kind==='expense'} onClick={()=>filter({category:row.category,kind:'expense',day:''})}><div><span>{row.category}</span><strong>{money(row.amount)}</strong></div><div className="category-track"><span style={{width:`${summary.expenses?row.amount/summary.expenses*100:0}%`}}/></div><small>{summary.expenses?Math.round(row.amount/summary.expenses*100):0}% · {row.entries} {row.entries===1?'entry':'entries'}</small></button>)}</div>:<p className="empty-state">No expenses recorded for this month.</p>}</section>
      <section className="expense-card"><div className="expense-heading"><div><span className="eyebrow">ONE DAY AT A TIME</span><h2>Your spending rhythm</h2></div><span className="expense-caption">Select a day to filter</span></div><div className="spend-chart" aria-label="Daily spending chart">{summary.daily.map(day=><button key={day.entry_date} disabled={disabled} aria-label={`Spending on ${day.entry_date}: ${money(day.expenses)}`} aria-pressed={filters.day===day.entry_date} title={`${readableDate(day.entry_date)}: ${money(day.expenses)}`} onClick={()=>filter({day:filters.day===day.entry_date?'':day.entry_date,kind:'expense'})}><span style={{height:`${Math.max(2,day.expenses/maxDaily*100)}%`}}/></button>)}</div><div className="chart-labels"><span>{readableDate(summary.daily[0]?.entry_date??summary.month_start)}</span><span>{readableDate(summary.daily.at(-1)?.entry_date??summary.month_start)}</span></div><p className="expense-help">Overview totals always cover the whole month. Filters below affect the transaction list and CSV export.</p></section></div>
      <section className="expense-card budget-section"><div className="expense-heading"><div><span className="eyebrow">A PLAN YOU CAN COME BACK TO</span><h2>Weekly spending budgets</h2></div></div><p className="expense-help">Monday–Sunday weeks. A week crossing months uses expenses from both months. Budgets and opening balances do not carry forward automatically.</p><div className="expense-week-grid">{summary.weeks.map(week=>{const left=week.budget_minor===null?null:week.budget_minor-week.spent;return <article key={week.week_start}><div className="week-card-heading"><span>{readableDate(week.week_start).replace(/ \d{4}$/,'')} – {readableDate(shiftDate(week.week_start,6)).replace(/ \d{4}$/,'')}</span><button className="icon-button" aria-label={`Edit budget for ${week.week_start}`} disabled={disabled} onClick={()=>open({kind:'budget',week:week.week_start,amount:week.budget_minor})}><Pencil size={13}/></button></div><strong className={(left??0)<0?'negative':''}>{money(left)}</strong><span className="week-remaining">remaining</span><div className="category-track"><span style={{width:`${week.budget_minor===null?0:week.budget_minor===0?(week.spent>0?100:0):Math.min(100,week.spent/week.budget_minor*100)}%`,background:(left??0)<0?'#bf8a6b':undefined}}/></div><small>Spent {money(week.spent)}<br/>Budget {money(week.budget_minor)}</small></article>;})}</div></section>
    </>}
    <section className="expense-card transaction-section"><div className="expense-heading"><div><span className="eyebrow">YOUR SHARED FINANCIAL RECORD</span><h2>Transactions</h2></div><button className="quiet-button export-button" disabled={disabled||loading||listLoading||!!listError||!!error} onClick={exportCsv}><Download size={14}/>{exporting?'Exporting…':'Export CSV'}</button></div>
      <div className="transaction-filters"><label><span>Type</span><select aria-label="Filter type" disabled={disabled} value={filters.kind} onChange={e=>filter({kind:e.target.value as Filters['kind']})}><option value="all">All transactions</option><option value="expense">Expenses</option><option value="income">Income</option></select></label><label><span>Category</span><select aria-label="Filter category" disabled={disabled} value={filters.category} onChange={e=>filter({category:e.target.value})}><option value="">All categories</option>{categoryOptions.map(category=><option key={category} value={category}>{category}</option>)}</select></label><form onSubmit={e=>{e.preventDefault();filter({search:search.trim()});}}><label><span>Search titles</span><input aria-label="Search transactions" maxLength={200} value={search} disabled={disabled} onChange={e=>setSearch(e.target.value)} placeholder="Find a transaction…"/></label><button className="quiet-button" aria-label="Search" disabled={disabled}><Search size={15}/></button></form></div>
      {(filters.kind!=='all'||filters.category||filters.search||filters.day)&&<div className="filter-summary"><span>{filters.day?`Day: ${readableDate(filters.day)}`:'Filtered transactions'}{filters.search&&` · “${filters.search}”`}</span><button disabled={disabled} onClick={()=>{setFilters(emptyFilters);setSearch('');setPage(0);}}>Clear filters</button></div>}
      {listError?<div className="message error" role="alert">{listError}<button className="text-link" onClick={loadTransactions}>Retry transactions</button></div>:listLoading?<p className="empty-state" role="status">Loading transactions…</p>:transactions&&<><div className="filtered-totals"><span>{transactions.total} matching {transactions.total===1?'transaction':'transactions'}</span><span>Income <strong>{money(transactions.income)}</strong></span><span>Expenses <strong>{money(transactions.expenses)}</strong></span></div>{transactions.entries.length?<div className="transaction-list">{transactions.entries.map(entry=><article className="expense-row" key={entry.id}><span className={`transaction-icon ${entry.kind}`}>{entry.kind==='income'?<ArrowDownLeft size={18}/>:<ArrowUpRight size={18}/>}</span><div className="transaction-copy"><h3>{entry.title}</h3><span>{readableDate(entry.entry_date)} · {entry.category} · {entry.kind}</span></div><strong className={entry.kind==='income'?'income':''}>{entry.kind==='income'?'+':'−'}{money(entry.amount_minor)}</strong><div className="expense-row-actions"><button className="icon-button" aria-label={`Edit ${entry.title}`} disabled={disabled||!!error} onClick={()=>open({kind:'transaction',entry})}><Pencil size={14}/></button><button className="icon-button" aria-label={`Delete ${entry.title}`} disabled={disabled} onClick={()=>{setFormError('');setDeleting(entry);}}><Trash2 size={14}/></button></div></article>)}</div>:<div className="empty-state"><Wallet size={25}/><h3>No matching transactions.</h3><p>Add a transaction or adjust the month and filters.</p></div>}<div className="expense-pagination"><span>Page {page+1} of {Math.max(1,Math.ceil(transactions.total/20))}</span><button className="quiet-button" disabled={page===0||disabled} onClick={()=>setPage(value=>value-1)}>Previous</button><button className="quiet-button" disabled={(page+1)*20>=transactions.total||disabled} onClick={()=>setPage(value=>value+1)}>Next</button></div></>}
    </section><p className="expense-footnote">Dashboard and Expenses use the same transactions, opening balances, and weekly budgets. Log each transaction once.</p>
    {editor&&<Modal title={editor.kind==='transaction'?editor.entry?'Edit transaction':'Add transaction':editor.kind==='opening'?'Monthly opening balance':'Weekly budget'} onClose={()=>{if(!busy)setEditor(null);}}><form onSubmit={save}><fieldset className="expense-fieldset" disabled={busy}>{editor.kind==='transaction'?<FinanceFields entry={editor.entry} today={today} currency={summary?.currency??'BDT'} defaultDate={month===today.slice(0,7)?today:`${month}-01`}/>:<><p className="expense-help">{editor.kind==='opening'?monthTitle(editor.month.slice(0,7)):`${readableDate(editor.week)} – ${readableDate(shiftDate(editor.week,6))}`} · {summary?.currency??'BDT'}. Leave blank to unset.{editor.kind==='opening'&&' Negative opening balances are allowed.'}</p><label>{editor.kind==='opening'?'Opening balance':'Weekly budget'}<input aria-label="Plan amount" name="amount" type="text" inputMode="decimal" autoFocus defaultValue={editor.amount===null?'':(editor.amount/100).toFixed(2)} placeholder="Not set"/></label></>}{formError&&<p className="message error" role="alert">{formError}</p>}<div className="modal-actions"><button className="quiet-button" type="button" onClick={()=>setEditor(null)}>Cancel</button><button className="compact-primary">{busy?'Saving…':'Save changes'}</button></div></fieldset></form></Modal>}
    {deleting&&<Modal title="Delete this transaction?" onClose={()=>{if(!busy)setDeleting(null);}}><p className="confirm-copy">“{deleting.title}” will be permanently deleted. Dashboard and expense totals will recalculate.</p>{formError&&<p className="message error" role="alert">{formError}</p>}<div className="modal-actions"><button className="quiet-button" disabled={busy} onClick={()=>setDeleting(null)}>Cancel</button><button className="compact-primary danger-button" disabled={busy} onClick={()=>mutate(async()=>{const {error}=await supabase!.from('finance_entries').delete().eq('id',deleting.id).eq('user_id',userId).select('id').single();if(error)throw error;},'Transaction deleted from your shared ledger.')}>{busy?'Deleting…':'Delete transaction'}</button></div></Modal>}
  </div>;
}
