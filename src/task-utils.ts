export function dhakaDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (type: string) => parts.find(p => p.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function shiftDate(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
export function weekday(date: string): number { return new Date(`${date}T12:00:00Z`).getUTCDay(); }
export function minutes(time: string): number { const [h, m] = time.split(':').map(Number); return h * 60 + m; }
export function duration(start: string, end: string): number { return (minutes(end) - minutes(start) + 1440) % 1440; }
export function timeLabel(time: string): string {
  const [h, m] = time.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}
export function overlaps(a: { start_time: string; end_time: string }, b: { start_time: string; end_time: string }): boolean {
  const ranges = (v: typeof a) => {
    const s = minutes(v.start_time), e = minutes(v.end_time);
    return e > s ? [[s, e]] : [[s, 1440], [0, e]];
  };
  return ranges(a).some(([s, e]) => ranges(b).some(([bs, be]) => s < be && bs < e));
}
