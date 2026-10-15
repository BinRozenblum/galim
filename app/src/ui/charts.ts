import type { DayKey } from '../dates';
import { level } from '../levels';
import type { Entries } from '../stats';

const NS = 'http://www.w3.org/2000/svg';

function el(tag: string, attrs: Record<string, string | number>): SVGElement {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
}

export interface Geo {
  n: number;
  w: number;
  bw: number;
  gap: number;
  /** x of the left edge of day i (i = 0 is the oldest) */
  x: (i: number) => number;
  /** day index under an x offset */
  at: (px: number) => number;
}

export function geo(n: number, w: number, rtl: boolean): Geo {
  const slot = w / n;
  const gap = slot >= 7 ? 2 : slot >= 3.5 ? 1 : 0;
  const bw = slot - gap;
  const x = (i: number) => (rtl ? w - (i + 1) * slot + gap / 2 : i * slot + gap / 2);
  const at = (px: number) => {
    const k = Math.floor(px / slot);
    const i = rtl ? n - 1 - k : k;
    return Math.max(0, Math.min(n - 1, i));
  };
  return { n, w, bw, gap, x, at };
}

export function moodSvg(days: DayKey[], entries: Entries, w: number, h: number, rtl: boolean): SVGSVGElement {
  const g = geo(days.length, w, rtl);
  const s = el('svg', { viewBox: `0 0 ${w} ${h}`, width: w, height: h, class: 'chartsvg' }) as SVGSVGElement;
  const mid = h / 2;
  s.append(el('line', { x1: 0, x2: w, y1: mid, y2: mid, stroke: '#CFC4E0', 'stroke-width': 1.5 }));
  const half = mid - 2;
  days.forEach((d, i) => {
    const m = entries[d]?.mood;
    if (m === null || m === undefined) return;
    const c = level(m).color;
    const r = Math.min(1.5, g.bw / 3);
    if (m === 0) {
      const hh = Math.max(3, h * 0.05);
      s.append(el('rect', { x: g.x(i), y: mid - hh / 2, width: g.bw, height: hh, rx: r, fill: c }));
      return;
    }
    const bh = (Math.abs(m) / 3) * half;
    s.append(el('rect', { x: g.x(i), y: m > 0 ? mid - bh : mid, width: g.bw, height: bh, rx: r, fill: c }));
  });
  return s;
}

export function sleepSvg(days: DayKey[], entries: Entries, w: number, h: number, rtl: boolean, avgLine: number | null): SVGSVGElement {
  const g = geo(days.length, w, rtl);
  const s = el('svg', { viewBox: `0 0 ${w} ${h}`, width: w, height: h, class: 'chartsvg' }) as SVGSVGElement;
  const vals = days.map((d) => entries[d]?.sleep ?? null);
  const nums = vals.filter((v): v is number => v !== null);
  const lo = Math.min(3, ...nums);
  const hi = Math.max(10, ...nums);
  const y = (v: number) => h - 3 - ((v - lo) / (hi - lo)) * (h - 6);
  s.append(el('line', { x1: 0, x2: w, y1: 0.5, y2: 0.5, stroke: '#D9D0E6', 'stroke-width': 1, 'stroke-dasharray': '3 3' }));
  if (avgLine !== null) {
    s.append(el('line', { x1: 0, x2: w, y1: y(avgLine), y2: y(avgLine), stroke: '#B9ACD3', 'stroke-width': 1.2, 'stroke-dasharray': '4 4' }));
  }
  let path = '';
  let run = 0;
  const cx = (i: number) => g.x(i) + g.bw / 2;
  vals.forEach((v, i) => {
    if (v === null) {
      run = 0;
      return;
    }
    path += (run ? 'L' : 'M') + cx(i).toFixed(1) + ' ' + y(v).toFixed(1);
    run++;
    const next = vals[i + 1];
    const prev = vals[i - 1];
    if ((prev === null || prev === undefined) && (next === null || next === undefined)) {
      s.append(el('circle', { cx: cx(i), cy: y(v), r: 2.2, fill: '#8E7CE0' }));
    }
  });
  if (path) s.append(el('path', { d: path, stroke: '#8E7CE0', 'stroke-width': days.length > 120 ? 1.5 : 2.2, fill: 'none', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
  return s;
}

export function medsSvg(days: DayKey[], entries: Entries, w: number, h: number, rtl: boolean): SVGSVGElement {
  const g = geo(days.length, w, rtl);
  const s = el('svg', { viewBox: `0 0 ${w} ${h}`, width: w, height: h, class: 'chartsvg' }) as SVGSVGElement;
  const thin = g.bw < 4;
  days.forEach((d, i) => {
    const m = entries[d]?.meds;
    if (m === null || m === undefined) return;
    if (m) s.append(el('rect', { x: g.x(i), y: 0, width: g.bw, height: h, rx: thin ? 0 : 1.5, fill: '#7C5BD6' }));
    else if (thin) s.append(el('rect', { x: g.x(i), y: 0, width: g.bw, height: h, fill: '#DCD4E8' }));
    else s.append(el('rect', { x: g.x(i) + 0.6, y: 0.6, width: g.bw - 1.2, height: h - 1.2, rx: 1.5, fill: '#fff', stroke: '#B4A9C6', 'stroke-width': 1.2 }));
  });
  return s;
}
