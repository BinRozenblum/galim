import { describe, expect, it } from 'vitest';
import { addDays, diffDays, isKey, keyOf, lastDays, parseKey, rangeDays, shortDate, fullDate } from '../src/dates';

describe('dates', () => {
  it('adds days across month, year and leap boundaries', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2026-01-01', -365)).toBe('2025-01-01');
  });
  it('is stable across DST changes (Israel)', () => {
    // DST ends 25 Oct 2026, starts 27 Mar 2026
    expect(addDays('2026-10-24', 1)).toBe('2026-10-25');
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26');
    expect(addDays('2026-03-26', 2)).toBe('2026-03-28');
    expect(diffDays('2026-10-20', '2026-10-30')).toBe(10);
    expect(diffDays('2026-03-20', '2026-03-30')).toBe(10);
  });
  it('builds inclusive ranges', () => {
    expect(rangeDays('2026-10-01', '2026-10-03')).toEqual(['2026-10-01', '2026-10-02', '2026-10-03']);
    const l = lastDays('2026-10-14', 30);
    expect(l).toHaveLength(30);
    expect(l[0]).toBe('2026-09-15');
    expect(l[29]).toBe('2026-10-14');
    expect(lastDays('2026-10-14', 365)).toHaveLength(365);
  });
  it('validates keys', () => {
    expect(isKey('2026-10-14')).toBe(true);
    expect(isKey('2026-02-30')).toBe(false);
    expect(isKey('2026-1-4')).toBe(false);
    expect(isKey(5)).toBe(false);
    expect(keyOf(parseKey('2026-10-14'))).toBe('2026-10-14');
  });
  it('formats', () => {
    expect(shortDate('2026-08-05')).toBe('5/8');
    expect(fullDate('2026-08-05')).toBe('5/8/2026');
  });
});
