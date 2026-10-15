import { describe, expect, it } from 'vitest';
import { addDays } from '../src/dates';
import type { Entry } from '../src/model';
import { moodNote, sleepNote, summarize, fmtNum } from '../src/stats';
import { lastDays } from '../src/dates';

const T = '2026-10-14';
const e = (p: Partial<Entry>): Entry => ({ mood: null, sleep: null, meds: null, energy: null, tags: [], note: '', t: 1, ...p });

function withSleep(baseline: number, recent: number, recentNights = 7, baseNights = 60) {
  const out: Record<string, Entry> = {};
  for (let i = 7; i < 7 + baseNights; i++) out[addDays(T, -i)] = e({ sleep: baseline });
  for (let i = 0; i < recentNights; i++) out[addDays(T, -i)] = e({ sleep: recent });
  return out;
}

describe('gentle sleep note', () => {
  it('shows when the week is 1.5h+ below the usual', () => {
    expect(sleepNote(withSleep(7.2, 5.5), T)).toEqual({ recent: 5.5, usual: 7.2 });
    expect(sleepNote(withSleep(7, 5.5), T)).toEqual({ recent: 5.5, usual: 7 }); // exactly 1.5
  });
  it('stays quiet below the threshold', () => {
    expect(sleepNote(withSleep(7, 6), T)).toBeNull();
  });
  it('needs at least 4 nights this week', () => {
    expect(sleepNote(withSleep(8, 5, 3), T)).toBeNull();
    expect(sleepNote(withSleep(8, 5, 4), T)).not.toBeNull();
  });
  it('needs a baseline', () => {
    expect(sleepNote(withSleep(8, 5, 7, 5), T)).toBeNull();
    expect(sleepNote({}, T)).toBeNull();
  });
  it('baseline is the 60 days before this week', () => {
    const d = withSleep(8, 5);
    d[addDays(T, -80)] = e({ sleep: 0 }); // outside the window, ignored
    expect(sleepNote(d, T)?.usual).toBe(8);
  });
});

describe('gentle mood note', () => {
  it('shows for 3 of the last 5 days at +2/−2 or beyond', () => {
    const d: Record<string, Entry> = {};
    d[T] = e({ mood: 2 });
    d[addDays(T, -1)] = e({ mood: -3 });
    d[addDays(T, -4)] = e({ mood: 2 });
    expect(moodNote(d, T)).toBe(true);
  });
  it('is quiet for 2 days or for ±1', () => {
    const d: Record<string, Entry> = {};
    d[T] = e({ mood: 2 });
    d[addDays(T, -1)] = e({ mood: 1 });
    d[addDays(T, -2)] = e({ mood: -1 });
    d[addDays(T, -3)] = e({ mood: 3 });
    d[addDays(T, -5)] = e({ mood: 3 }); // 6th day back, outside the window
    expect(moodNote(d, T)).toBe(false);
  });
});

describe('summary', () => {
  it('computes doctor tiles', () => {
    const d: Record<string, Entry> = {
      [T]: e({ mood: 0, sleep: 7, meds: true, energy: 3 }),
      [addDays(T, -1)]: e({ mood: 0, sleep: 6, meds: false }),
      [addDays(T, -2)]: e({ mood: -2, meds: true, energy: 1 }),
      [addDays(T, -40)]: e({ mood: 3 }), // out of range
    };
    const s = summarize(d, lastDays(T, 30));
    expect(s.days).toBe(30);
    expect(s.logged).toBe(3);
    expect(s.balanced).toBe(2);
    expect(s.sleepAvg).toBe(6.5);
    expect(s.medsPct).toBe(67);
    expect(s.energyAvg).toBe(2);
    expect(s.dist[0]).toBe(2);
    expect(s.dist[-2]).toBe(1);
    expect(s.dist[3]).toBe(0);
  });
  it('formats numbers', () => {
    expect(fmtNum(7)).toBe('7');
    expect(fmtNum(6.94)).toBe('6.9');
    expect(fmtNum(null)).toBe('-');
  });
});
