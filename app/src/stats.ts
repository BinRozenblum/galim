import { addDays, lastDays, type DayKey } from './dates';
import type { Entry } from './model';
import { LEVELS } from './levels';

export type Entries = Record<DayKey, Entry>;

export const avg = (a: number[]): number | null => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);
export const round1 = (n: number) => Math.round(n * 10) / 10;

export function sleepValues(entries: Entries, days: DayKey[]): number[] {
  const out: number[] = [];
  for (const d of days) {
    const s = entries[d]?.sleep;
    if (s !== null && s !== undefined) out.push(s);
  }
  return out;
}

export interface SleepNote {
  recent: number; // 7-day average, 1 decimal
  usual: number; // personal 60-day average, 1 decimal
}

/**
 * Gentle sleep note: the average sleep of the last 7 days (needs at least 4
 * nights) is at least 1.5h below the personal average of the 60 days before
 * that week (needs at least 7 nights so a handful of entries can't trigger it).
 */
export function sleepNote(entries: Entries, today: DayKey): SleepNote | null {
  const week = sleepValues(entries, lastDays(today, 7));
  if (week.length < 4) return null;
  const base = sleepValues(entries, lastDays(addDays(today, -7), 60));
  if (base.length < 7) return null;
  const recent = avg(week)!;
  const usual = avg(base)!;
  if (usual - recent < 1.5) return null;
  return { recent: round1(recent), usual: round1(usual) };
}

/** Gentle mood note: at least 3 of the last 5 days were at +2 or above, or −2 or below. */
export function moodNote(entries: Entries, today: DayKey): boolean {
  let n = 0;
  for (const d of lastDays(today, 5)) {
    const m = entries[d]?.mood;
    if (m !== null && m !== undefined && Math.abs(m) >= 2) n++;
  }
  return n >= 3;
}

export interface Summary {
  days: number; // days in range
  logged: number; // days with any entry
  moodDays: number;
  balanced: number; // mood === 0
  moodAvg: number | null;
  sleepAvg: number | null;
  sleepMin: number | null;
  sleepMax: number | null;
  medsKnown: number;
  medsYes: number;
  medsPct: number | null; // 0..100
  energyAvg: number | null;
  dist: Record<number, number>; // mood -> count
}

export function summarize(entries: Entries, days: DayKey[]): Summary {
  const list = days.map((d) => entries[d]).filter((e): e is Entry => !!e);
  const moods = list.map((e) => e.mood).filter((v): v is NonNullable<typeof v> => v !== null);
  const sleeps = list.map((e) => e.sleep).filter((v): v is number => v !== null);
  const energy = list.map((e) => e.energy).filter((v): v is number => v !== null);
  const meds = list.filter((e) => e.meds !== null);
  const medsYes = meds.filter((e) => e.meds === true).length;
  const dist: Record<number, number> = {};
  LEVELS.forEach((l) => (dist[l.v] = 0));
  moods.forEach((m) => dist[m]++);
  return {
    days: days.length,
    logged: list.length,
    moodDays: moods.length,
    balanced: moods.filter((m) => m === 0).length,
    moodAvg: avg(moods),
    sleepAvg: avg(sleeps),
    sleepMin: sleeps.length ? Math.min(...sleeps) : null,
    sleepMax: sleeps.length ? Math.max(...sleeps) : null,
    medsKnown: meds.length,
    medsYes,
    medsPct: meds.length ? Math.round((medsYes / meds.length) * 100) : null,
    energyAvg: avg(energy),
    dist,
  };
}

/** Formats 7 / 7.5 / 6.9 without trailing zeros, using the locale's decimal point (always "."). */
export function fmtNum(n: number | null, digits = 1): string {
  if (n === null || !Number.isFinite(n)) return '-';
  const p = Math.pow(10, digits);
  return String(Math.round(n * p) / p);
}
