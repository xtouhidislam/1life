import { shiftDate, weekday } from './task-utils';

export type TimedTask = { id: string; title: string; task_date: string; start_time: string; end_time: string };
export type RoutineBlock = { id: string; title: string; routine: string; start_time: string; end_time: string };
export type Slot = { id: string; title: string; start: number; end: number; source: 'Task' | 'Routine' };

export function scheduleSlots(today: string, tasks: TimedTask[], routine: RoutineBlock[]): Slot[] {
  const make = (id: string, title: string, date: string, start: string, end: string, source: Slot['source']): Slot => {
    const normal = (time: string) => time.slice(0,5) + ':00';
    const startMs = Date.parse(`${date}T${normal(start)}+06:00`);
    const endDate = end.slice(0,5) < start.slice(0,5) ? shiftDate(date,1) : date;
    return { id, title, start: startMs, end: Date.parse(`${endDate}T${normal(end)}+06:00`), source };
  };
  const slots = tasks.map(t => make(t.id,t.title,t.task_date,t.start_time,t.end_time,'Task'));
  for (let offset=-1; offset<=7; offset++) {
    const date=shiftDate(today,offset), type=[0,6].includes(weekday(date)) ? 'weekend' : 'weekday';
    for (const block of routine.filter(b => b.routine===type)) slots.push(make(`${block.id}-${date}`,block.title,date,block.start_time,block.end_time,'Routine'));
  }
  return slots;
}
export function currentAndNext(slots: Slot[], now: number): { current?: Slot; next?: Slot } {
  const current=slots.filter(s => s.start<=now && s.end>now).sort((a,b) => Number(b.source==='Task')-Number(a.source==='Task') || b.start-a.start)[0];
  const next=slots.filter(s => s.start>now).sort((a,b) => a.start-b.start || Number(b.source==='Task')-Number(a.source==='Task'))[0];
  return { current, next };
}
export function amountToMinor(value: string, allowNegative=false): number {
  if (!(allowNegative ? /^-?\d+(\.\d{1,2})?$/ : /^\d+(\.\d{1,2})?$/).test(value)) throw new Error('Enter an amount with no more than two decimal places.');
  const negative=value.startsWith('-'), unsigned=negative ? value.slice(1) : value;
  const [whole, fraction=''] = unsigned.split('.');
  const amount=Number(whole)*100+Number(fraction.padEnd(2,'0'));
  if (!Number.isSafeInteger(amount) || amount>9000000000000) throw new Error('This amount is too large.');
  return negative ? -amount : amount;
}
