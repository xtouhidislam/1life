import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Check, ChevronLeft, ChevronRight, Clock, Pencil, Plus, Repeat2, Trash2 } from 'lucide-react';
import { Modal } from './Modal';
import { supabase } from './supabase';
import { dhakaDate, duration, overlaps, shiftDate, timeLabel, weekday } from './task-utils';

type Priority = 'low' | 'medium' | 'high';
type Metadata = { title: string; tag: string; color: string; priority: Priority };
type Task = Metadata & { id: string; task_date: string; notes: string; template_id: string | null; start_time: string | null; end_time: string | null; completed_at: string | null };
type Template = Metadata & { id: string; days: number[]; archived_from: string | null };
type Block = { id: string; title: string; routine: 'weekday' | 'weekend'; start_time: string; end_time: string };
type Editor = { kind: 'task'; value?: Task } | { kind: 'target'; value?: Template } | { kind: 'block'; value?: Block };
const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const colors = ['#66845c', '#568aa2', '#b78b4b', '#a07b92', '#7b79aa', '#c07862'];

export function TaskManager({ userId }: { userId: string }) {
  const [today, setToday] = useState(dhakaDate());
  const [date, setDate] = useState(dhakaDate());
  const [tab, setTab] = useState<'day' | 'targets' | 'routine'>('day');
  const [filter, setFilter] = useState('all');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [routine, setRoutine] = useState<'weekday' | 'weekend'>([0, 6].includes(weekday(today)) ? 'weekend' : 'weekday');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editor, setEditor] = useState<Editor | null>(null);
  const [confirmation, setConfirmation] = useState<{ kind: 'task' | 'target' | 'block'; id: string; title: string } | null>(null);
  const request = useRef(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const next = dhakaDate();
      setToday(previous => {
        if (previous !== next) setDate(selected => selected === previous ? next : selected);
        return next;
      });
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  async function load() {
    if (!supabase) return;
    const sequence = ++request.current;
    setLoading(true); setError(''); setTasks([]);
    try {
      const prepared = await supabase.rpc('prepare_task_day');
      if (prepared.error) throw prepared.error;
      const results = await Promise.all([
        supabase.from('task_items').select('*').eq('user_id', userId).eq('task_date', date).order('created_at'),
        supabase.from('task_templates').select('*').eq('user_id', userId).is('archived_from', null).order('created_at'),
        supabase.from('schedule_blocks').select('*').eq('user_id', userId).order('start_time'),
      ]);
      results.forEach(result => { if (result.error) throw result.error; });
      if (sequence !== request.current) return;
      setTasks(results[0].data as Task[]); setTemplates(results[1].data as Template[]); setBlocks(results[2].data as Block[]);
    } catch (e) { if (sequence === request.current) setError(message(e)); }
    finally { if (sequence === request.current) setLoading(false); }
  }
  useEffect(() => { void load(); return () => { request.current++; }; }, [date, today, userId]);

  function message(e: unknown): string {
    const value = e as { message?: string; code?: string };
    if (['PGRST202', '42P01', 'PGRST205'].includes(value?.code ?? '')) return 'Task tables are not set up yet. Run migration 202610310002_tasks.sql in Supabase SQL Editor, then choose Retry.';
    return value?.message || 'Something went wrong. Please try again.';
  }

  async function mutate(action: () => Promise<void>, success: string) {
    if (saving) return;
    setSaving(true); setError(''); setNotice('');
    try { await action(); setNotice(success); await load(); }
    catch (e) { setError(message(e)); }
    finally { setSaving(false); }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!editor || !supabase) return;
    const data = new FormData(event.currentTarget);
    const title = String(data.get('title') ?? '').trim();
    if (!title) { setError('Please enter a title.'); return; }
    const start_time = String(data.get('start_time') ?? '') || null;
    const end_time = String(data.get('end_time') ?? '') || null;
    if (editor.kind !== 'target' && ((!!start_time !== !!end_time) || (start_time && start_time === end_time))) {
      setError('Choose both start and end times, with a nonzero duration.'); return;
    }
    const metadata = { title, tag: String(data.get('tag') ?? '').trim(), color: String(data.get('color') || colors[0]), priority: String(data.get('priority') || 'medium') as Priority };
    const days = data.getAll('days').map(Number);
    if (editor.kind === 'target' && !days.length) { setError('Choose at least one repeating day.'); return; }
    if (editor.kind === 'block' && (!start_time || !end_time)) { setError('Routine blocks need a start and end time.'); return; }
    await mutate(async () => {
      if (editor.kind === 'task') {
        const values = { ...metadata, notes: String(data.get('notes') ?? '').trim(), start_time, end_time };
        const result = editor.value
          ? await supabase!.from('task_items').update(values).eq('id', editor.value.id).eq('user_id', userId).select('id').single()
          : await supabase!.from('task_items').insert({ ...values, user_id: userId, task_date: date }).select('id').single();
        if (result.error) throw result.error;
      } else if (editor.kind === 'target') {
        // Freeze every elapsed day's snapshots before changing future repetitions.
        const prepared = await supabase!.rpc('prepare_task_day'); if (prepared.error) throw prepared.error;
        const result = editor.value
          ? await supabase!.from('task_templates').update({ ...metadata, days }).eq('id', editor.value.id).eq('user_id', userId).select('id').single()
          : await supabase!.from('task_templates').insert({ ...metadata, days, user_id: userId, start_date: today }).select('id').single();
        if (result.error) throw result.error;
      } else {
        const values = { title, start_time, end_time, routine };
        const result = editor.value
          ? await supabase!.from('schedule_blocks').update(values).eq('id', editor.value.id).eq('user_id', userId).select('id').single()
          : await supabase!.from('schedule_blocks').insert({ ...values, user_id: userId }).select('id').single();
        if (result.error) throw result.error;
      }
      setEditor(null);
    }, editor.kind === 'target' && editor.value ? 'Target updated for future days. Existing daily records are unchanged.' : 'Saved.');
  }

  async function remove() {
    if (!confirmation || !supabase) return;
    await mutate(async () => {
      if (confirmation.kind === 'target') {
        const prepared = await supabase!.rpc('prepare_task_day'); if (prepared.error) throw prepared.error;
        const { error } = await supabase!.from('task_templates').update({ archived_from: shiftDate(today, 1) }).eq('id', confirmation.id).eq('user_id', userId).select('id').single();
        if (error) throw error;
      } else {
        const { error } = await supabase!.from(confirmation.kind === 'task' ? 'task_items' : 'schedule_blocks').delete().eq('id', confirmation.id).eq('user_id', userId).select('id').single();
        if (error) throw error;
      }
      setConfirmation(null);
    }, confirmation.kind === 'target' ? 'Target archived. Today and past history are preserved.' : 'Deleted.');
  }

  const displayed = tasks.filter(task => filter === 'all' || (filter === 'completed' ? !!task.completed_at : !task.completed_at));
  const completed = tasks.filter(task => task.completed_at).length;
  const selectedBlocks = blocks.filter(block => block.routine === routine);
  const conflict = selectedBlocks.some((block, i) => selectedBlocks.slice(i + 1).some(other => overlaps(block, other)));

  return <div className="task-manager">
    <div className="task-tabs" role="tablist" aria-label="Task manager views">{([['day', 'Daily tasks & history'], ['targets', 'Repeating targets'], ['routine', 'Weekly routine']] as const).map(([value, label]) => <button key={value} role="tab" aria-selected={tab === value} onClick={() => { setTab(value); setNotice(''); }}>{label}</button>)}</div>
    {notice && <p className="message" role="status">{notice}</p>}
    {error && !editor && !confirmation && <div className="message error" role="alert">{error} <button className="text-link" onClick={load} disabled={saving}>Retry</button></div>}
    <section className="task-surface" aria-busy={loading || saving}>
      <div className="task-toolbar"><div><span className="eyebrow">{tab === 'day' ? 'ONE DAY AT A TIME' : tab === 'targets' ? 'CONSISTENCY OVER PERFECTION' : 'MAKE TIME FOR WHAT MATTERS'}</span><h2>{tab === 'day' ? date === today ? 'Your day, thoughtfully planned.' : 'Your daily history.' : tab === 'targets' ? 'The habits that ground you.' : 'A rhythm for your week.'}</h2></div><button className="compact-primary" disabled={loading || saving || !!error} onClick={() => { setError(''); setEditor({ kind: tab === 'day' ? 'task' : tab === 'targets' ? 'target' : 'block' }); }}><Plus size={16}/>{tab === 'day' ? 'Add task' : tab === 'targets' ? 'Add target' : 'Add block'}</button></div>
      {tab === 'day' && <><div className="date-controls"><button className="icon-button" aria-label="Previous day" disabled={saving} onClick={() => setDate(shiftDate(date, -1))}><ChevronLeft size={18}/></button><label className="date-field"><span className="sr-only">Task date</span><input aria-label="Task date" type="date" value={date} disabled={saving} onChange={e => e.target.value && setDate(e.target.value)}/></label><button className="icon-button" aria-label="Next day" disabled={saving} onClick={() => setDate(shiftDate(date, 1))}><ChevronRight size={18}/></button><button className="quiet-button" disabled={saving} onClick={() => setDate(today)}>Today</button><span className="task-total">{completed} of {tasks.length} completed</span></div><div className="progress-track"><div style={{ width: `${tasks.length ? completed / tasks.length * 100 : 0}%` }}/></div><div className="filter-row" aria-label="Filter tasks">{['all', 'incomplete', 'completed'].map(value => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value[0].toUpperCase() + value.slice(1)}</button>)}<span>{date > today ? 'Future tasks · completion opens on their date' : date < today ? 'Past day · you can correct your records' : 'Your progress is saved automatically'}</span></div></>}
      {tab === 'targets' && <p className="section-note">Targets repeat on your chosen days. Changes apply to future days; existing daily records keep their original details. Sunday is a rest day for the exercise target.</p>}
      {tab === 'routine' && <><div className="routine-switch"><button aria-pressed={routine === 'weekday'} onClick={() => setRoutine('weekday')}>Monday–Friday</button><button aria-pressed={routine === 'weekend'} onClick={() => setRoutine('weekend')}>Saturday–Sunday</button></div><p className="section-note">Based on your supplied timetable. These blocks plan your time; completing tasks is tracked separately. An end before the start means the block continues into the next day.</p>{conflict && <p className="message error">Some routine blocks overlap. Edit their times to resolve the conflict.</p>}</>}
      {loading ? <p className="empty-state" role="status">Loading your daily rhythm…</p> : error ? <p className="empty-state">Your records could not be loaded. Resolve the error above and retry.</p> : tab === 'day' ? <div className="task-list">{displayed.length ? displayed.map(task => <article key={task.id} className={`task-row ${task.completed_at ? 'is-complete' : ''}`} style={{ borderLeftColor: task.color }}><button className="task-check" aria-label={`${task.completed_at ? 'Mark incomplete' : 'Complete'}: ${task.title}`} aria-pressed={!!task.completed_at} disabled={saving || date > today} onClick={() => mutate(async () => { const { error } = await supabase!.from('task_items').update({ completed_at: task.completed_at ? null : new Date().toISOString() }).eq('id', task.id).eq('user_id', userId).select('id').single(); if (error) throw error; }, task.completed_at ? 'Marked incomplete.' : 'A small step forward. Task completed.')} >{task.completed_at && <Check size={16}/>}</button><div className="task-copy"><h3>{task.title}{task.template_id && <Repeat2 size={13} aria-label="Repeating target"/>}</h3>{task.notes && <p>{task.notes}</p>}<div className="task-meta">{task.tag && <span style={{ color: task.color }}>{task.tag}</span>}<span className={`priority ${task.priority}`}>{task.priority}</span>{task.start_time && task.end_time && <span><Clock size={12}/>{timeLabel(task.start_time)} – {timeLabel(task.end_time)}{task.end_time < task.start_time && ' (+1 day)'}</span>}</div></div><div className="row-actions"><button className="icon-button" aria-label={`Edit ${task.title}`} disabled={saving} onClick={() => { setError(''); setEditor({ kind: 'task', value: task }); }}><Pencil size={15}/></button>{!task.template_id && <button className="icon-button" aria-label={`Delete ${task.title}`} disabled={saving} onClick={() => setConfirmation({ kind: 'task', id: task.id, title: task.title })}><Trash2 size={15}/></button>}</div></article>) : <div className="empty-state"><Check size={26}/><h3>{filter === 'all' ? 'A little room to begin.' : 'No matching tasks.'}</h3><p>{date > today ? 'Add a task for this day. Repeating targets appear when the day arrives.' : 'Add a task or adjust the filter to see your day.'}</p></div>}</div> : tab === 'targets' ? <div className="target-grid">{templates.length ? templates.map(target => <article className="target-card" key={target.id}><span className="target-accent" style={{ background: target.color }}><Repeat2 size={20}/></span><h3>{target.title}</h3><div className="task-meta"><span style={{ color: target.color }}>{target.tag}</span><span className={`priority ${target.priority}`}>{target.priority}</span></div><p>{target.days.length === 7 ? 'Every day' : target.days.map(day => dayNames[day]).join(' · ')}</p><div className="target-actions"><button className="text-link" disabled={saving} onClick={() => { setError(''); setEditor({ kind: 'target', value: target }); }}><Pencil size={13}/>Edit target</button><button className="text-link archive-button" disabled={saving} onClick={() => setConfirmation({ kind: 'target', id: target.id, title: target.title })}>Archive</button></div></article>) : <p className="empty-state">No active targets. Add one to begin a daily habit.</p>}</div> : <div className="routine-list">{selectedBlocks.length ? selectedBlocks.map(block => <article className="routine-row" key={block.id}><span className="routine-time">{timeLabel(block.start_time)}<small>{timeLabel(block.end_time)}{block.end_time < block.start_time ? ' (+1 day)' : ''}</small></span><div className="task-copy"><h3>{block.title}</h3><p>{duration(block.start_time, block.end_time)} minutes</p></div><button className="icon-button" aria-label={`Edit ${block.title}`} disabled={saving} onClick={() => { setError(''); setEditor({ kind: 'block', value: block }); }}><Pencil size={15}/></button><button className="icon-button" aria-label={`Delete ${block.title}`} disabled={saving} onClick={() => setConfirmation({ kind: 'block', id: block.id, title: block.title })}><Trash2 size={15}/></button></article>) : <p className="empty-state">No routine blocks yet. Add a block to shape your day.</p>}</div>}
    </section>
    {editor && <TaskEditor key={`${editor.kind}-${editor.value?.id ?? 'new'}`} editor={editor} saving={saving} error={error} onSave={save} onClose={() => { if (!saving) { setEditor(null); setError(''); } }}/>} 
    {confirmation && <Modal title={confirmation.kind === 'target' ? 'Archive this target?' : 'Delete this item?'} onClose={() => { if (!saving) setConfirmation(null); }}><p className="confirm-copy">{confirmation.kind === 'target' ? `“${confirmation.title}” will stop repeating from tomorrow. Today and past records will stay in your history.` : `“${confirmation.title}” will be permanently deleted.`}</p>{error && <p className="message error" role="alert">{error}</p>}<div className="modal-actions"><button className="quiet-button" disabled={saving} onClick={() => setConfirmation(null)}>Cancel</button><button className="compact-primary danger-button" disabled={saving} onClick={remove}>{saving ? 'Saving…' : confirmation.kind === 'target' ? 'Archive target' : 'Delete item'}</button></div></Modal>}
  </div>;
}

function TaskEditor({ editor, saving, error, onSave, onClose }: { editor: Editor; saving: boolean; error: string; onSave: (event: FormEvent<HTMLFormElement>) => void; onClose: () => void }) {
  const value = editor.value;
  const metadata = editor.kind !== 'block' ? editor.value : undefined;
  return <Modal title={`${value ? 'Edit' : 'Add'} ${editor.kind === 'block' ? 'routine block' : editor.kind}`} onClose={onClose}><form onSubmit={onSave}><fieldset disabled={saving}><label>Title<input name="title" required maxLength={200} defaultValue={value?.title} autoFocus placeholder={editor.kind === 'task' ? 'What would you like to do?' : 'Give it a clear name'}/></label>
    {editor.kind !== 'block' && <><div className="form-columns"><label>Tag<input name="tag" maxLength={40} defaultValue={metadata?.tag} placeholder="e.g. Learning"/></label><label>Priority<select aria-label="Priority" name="priority" defaultValue={metadata?.priority ?? 'medium'}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label></div><fieldset className="color-picker"><legend>Colour</legend>{colors.map(color => <label key={color} style={{ '--swatch': color } as React.CSSProperties}><input type="radio" name="color" value={color} defaultChecked={(metadata?.color ?? colors[0]) === color}/><span className="sr-only">{color}</span></label>)}</fieldset></>}
    {editor.kind !== 'target' && <><div className="form-columns"><label>Start time{editor.kind === 'task' && ' (optional)'}<input type="time" name="start_time" required={editor.kind === 'block'} defaultValue={(editor.value?.start_time ?? '').slice(0, 5)}/></label><label>End time{editor.kind === 'task' && ' (optional)'}<input type="time" name="end_time" required={editor.kind === 'block'} defaultValue={(editor.value?.end_time ?? '').slice(0, 5)}/></label></div><p className="field-hint">An earlier end time continues into the next day.</p></>}
    {editor.kind === 'task' && <label>Notes<textarea name="notes" maxLength={2000} rows={3} defaultValue={editor.value?.notes} placeholder="A little context, if useful"/></label>}
    {editor.kind === 'target' && <fieldset className="day-picker"><legend>Repeat on</legend>{dayNames.map((name, day) => <label key={name}><input type="checkbox" name="days" value={day} defaultChecked={editor.value ? editor.value.days.includes(day) : true}/><span>{name}</span></label>)}</fieldset>}
    {error && <p className="message error" role="alert">{error}</p>}<div className="modal-actions"><button type="button" className="quiet-button" onClick={onClose}>Cancel</button><button type="submit" className="compact-primary">{saving ? 'Saving…' : 'Save changes'}</button></div></fieldset></form></Modal>;
}
