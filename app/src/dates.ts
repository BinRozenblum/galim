// Day keys are local-calendar dates in the form YYYY-MM-DD. All date math
// works on these keys at local noon so DST shifts never move a day.

export type DayKey = string;

const pad = (n: number) => String(n).padStart(2, '0');

export function keyOf(d: Date): DayKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayKey(now: Date = new Date()): DayKey {
  return keyOf(now);
}

export function parseKey(k: DayKey): Date {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function isKey(k: unknown): k is DayKey {
  if (typeof k !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(k)) return false;
  return keyOf(parseKey(k)) === k;
}

export function addDays(k: DayKey, n: number): DayKey {
  const d = parseKey(k);
  d.setDate(d.getDate() + n);
  return keyOf(d);
}

/** Whole days from a to b (b - a). */
export function diffDays(a: DayKey, b: DayKey): number {
  const da = parseKey(a);
  const db = parseKey(b);
  const ua = Date.UTC(da.getFullYear(), da.getMonth(), da.getDate());
  const ub = Date.UTC(db.getFullYear(), db.getMonth(), db.getDate());
  return Math.round((ub - ua) / 86400000);
}

/** Inclusive list of keys from `from` to `to` (ascending). */
export function rangeDays(from: DayKey, to: DayKey): DayKey[] {
  const out: DayKey[] = [];
  const n = diffDays(from, to);
  for (let i = 0; i <= n; i++) out.push(addDays(from, i));
  return out;
}

/** The last `count` days ending at `end` (inclusive), ascending. */
export function lastDays(end: DayKey, count: number): DayKey[] {
  return rangeDays(addDays(end, -(count - 1)), end);
}

export function locale(lang: string): string {
  return lang === 'he' ? 'he-IL' : 'en-GB';
}

/** "יום שלישי, 14 באוקטובר" / "Tuesday, 14 October" */
export function longDate(k: DayKey, lang: string): string {
  return new Intl.DateTimeFormat(locale(lang), { weekday: 'long', day: 'numeric', month: 'long' }).format(parseKey(k));
}

/** 14/10 */
export function shortDate(k: DayKey): string {
  const d = parseKey(k);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

/** 14/10/2026 */
export function fullDate(k: DayKey): string {
  const d = parseKey(k);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

export function weekdayShort(k: DayKey, lang: string): string {
  return new Intl.DateTimeFormat(locale(lang), { weekday: 'short' }).format(parseKey(k));
}

export function monthTitle(year: number, month: number, lang: string): string {
  return new Intl.DateTimeFormat(locale(lang), { month: 'long', year: 'numeric' }).format(new Date(year, month, 1, 12));
}
