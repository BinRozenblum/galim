// Doctor summary: drawn directly onto A4 canvases (Hebrew shaping and bidi
// come from the browser's own text engine), then packed into a PDF with one
// lossless image per page. No third-party code, no network.

import { fullDate, shortDate, todayKey, weekdayShort, type DayKey } from '../dates';
import { lang, rtl, t, type Key } from '../i18n';
import { LEVELS, level, signed } from '../levels';
import type { Data, Entry } from '../model';
import { fmtNum, round1, summarize } from '../stats';
import { buildPdf } from './pdf';

const PAGE_W_MM = 210;
const PAGE_H_MM = 297;
const PX_PER_MM = 1654 / PAGE_W_MM; // 200 dpi
const M = 13; // side margin, mm
const TOP = 14;
const BOTTOM = 284; // content must end above the footer
const FONT = 'Assistant, sans-serif';

const C = {
  ink: '#221A31',
  ink2: '#3F3550',
  muted: '#6F6582',
  faint: '#A79DB8',
  line: '#E6DFF0',
  line2: '#D9D0E6',
  accent: '#6D28D9',
  tile: '#FCFBFE',
  zebra: '#FBFAFD',
  sleep: '#8E7CE0',
  meds: '#7C5BD6',
};

type Align = 'start' | 'end' | 'center';

class Page {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = Math.round(PAGE_W_MM * PX_PER_MM);
    this.canvas.height = Math.round(PAGE_H_MM * PX_PER_MM);
    this.ctx = this.canvas.getContext('2d')!;
    this.ctx.fillStyle = '#fff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.scale(PX_PER_MM, PX_PER_MM); // draw in millimetres
    this.ctx.textBaseline = 'alphabetic';
  }
}

/** Converts a distance from the reading-start edge to a physical x. */
const X = (s: number, w = 0) => (rtl() ? PAGE_W_MM - s - w : s);

function font(ctx: CanvasRenderingContext2D, sizePt: number, weight = 600) {
  ctx.font = `${weight} ${(sizePt * 0.3528).toFixed(3)}px ${FONT}`;
}

function text(ctx: CanvasRenderingContext2D, str: string, s: number, y: number, o: { size: number; weight?: number; color?: string; align?: Align; ltr?: boolean }) {
  font(ctx, o.size, o.weight ?? 600);
  ctx.fillStyle = o.color ?? C.ink;
  const r = rtl();
  ctx.direction = o.ltr || !r ? 'ltr' : 'rtl';
  const w = ctx.measureText(str).width;
  const x = X(s);
  const align = o.align ?? 'start';
  // anchor by the physical left edge so forced-LTR strings line up in RTL layouts too
  let left: number;
  if (align === 'center') left = x - w / 2;
  else if ((align === 'start') === !r) left = x;
  else left = x - w;
  ctx.textAlign = 'left';
  ctx.fillText(str, left, y);
  return w;
}

function measure(ctx: CanvasRenderingContext2D, str: string, size: number, weight = 600) {
  font(ctx, size, weight);
  ctx.direction = rtl() ? 'rtl' : 'ltr';
  return ctx.measureText(str).width;
}

function wrap(ctx: CanvasRenderingContext2D, str: string, maxW: number, size: number, weight = 500): string[] {
  const out: string[] = [];
  for (const para of str.replace(/\r/g, '').split('\n')) {
    const words = para.split(/\s+/).filter(Boolean);
    let line = '';
    for (const w of words) {
      const cand = line ? line + ' ' + w : w;
      if (measure(ctx, cand, size, weight) <= maxW) line = cand;
      else {
        if (line) out.push(line);
        // a single very long word: hard-break it
        if (measure(ctx, w, size, weight) > maxW) {
          let part = '';
          for (const ch of w) {
            if (measure(ctx, part + ch, size, weight) > maxW) {
              out.push(part);
              part = ch;
            } else part += ch;
          }
          line = part;
        } else line = w;
      }
    }
    if (line) out.push(line);
    else if (!words.length && out.length) out.push('');
  }
  return out.length ? out : [''];
}

function rect(ctx: CanvasRenderingContext2D, s: number, y: number, w: number, h: number, fill: string, stroke?: string, lw = 0.25) {
  const x = X(s, w);
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.strokeRect(x + lw / 2, y + lw / 2, w - lw, h - lw);
  }
}

function chip(ctx: CanvasRenderingContext2D, v: number, s: number, y: number, w = 8, h = 4.6) {
  const l = level(v);
  rect(ctx, s, y, w, h, l.color);
  font(ctx, 8.5, 800);
  ctx.fillStyle = l.on;
  ctx.direction = 'ltr';
  ctx.textAlign = 'center';
  ctx.fillText(signed(v), X(s, w) + w / 2, y + h * 0.74);
  ctx.textAlign = 'left';
}

export async function ensureFonts() {
  const sample = 'אבגabc0123';
  await Promise.all([500, 600, 700, 800].map((w) => document.fonts.load(`${w} 20px Assistant`, sample).catch(() => [])));
  await document.fonts.ready;
}

/** Renders the full report into A4 canvases. */
export async function renderReportPages(data: Data, days: DayKey[]): Promise<HTMLCanvasElement[]> {
  await ensureFonts();
  const entries = data.entries;
  const sum = summarize(entries, days);
  const today = todayKey();
  const pages: Page[] = [];
  let page = new Page();
  pages.push(page);
  let ctx = page.ctx;
  let y = TOP;
  const contentW = PAGE_W_MM - 2 * M;

  const newPage = () => {
    page = new Page();
    pages.push(page);
    ctx = page.ctx;
    y = TOP;
  };
  const ensure = (h: number) => {
    if (y + h > BOTTOM) newPage();
  };

  // ---------- header ----------
  const title = `${t('appName')} · ${t('pdfTitle')}`;
  text(ctx, title, M, y + 7, { size: 21, weight: 800 });
  const accentW = measure(ctx, t('appName'), 21, 800);
  // colour the app name in the accent colour (it is the first word in reading order)
  ctx.save();
  ctx.beginPath();
  ctx.rect(X(M, accentW + 0.2), y, accentW + 0.2, 9);
  ctx.clip();
  text(ctx, title, M, y + 7, { size: 21, weight: 800, color: C.accent });
  ctx.restore();
  const rangeStr = t('pdfRange', { a: fullDate(days[0]), b: fullDate(days[days.length - 1]) });
  text(ctx, rangeStr, PAGE_W_MM - M, y + 4.5, { size: 11, weight: 800, align: 'end' });
  text(ctx, t('pdfDays', { n: days.length, m: sum.logged, d: fullDate(today) }), PAGE_W_MM - M, y + 9.5, { size: 8.5, weight: 600, color: C.muted, align: 'end' });
  y += 11;
  if (data.name.trim()) {
    text(ctx, data.name.trim(), M, y + 3.5, { size: 11, weight: 700, color: C.ink2 });
    y += 5.5;
  }
  y += 1.5;
  ctx.fillStyle = C.accent;
  ctx.fillRect(M, y, contentW, 0.55);
  y += 5;

  // ---------- stat tiles ----------
  const tiles: [string, string, string][] = [
    [t('pdfLogged'), String(sum.logged), t('pdfOf', { n: sum.days })],
    [t('pdfMoodAvg'), sum.moodAvg === null ? '-' : signed(round1(sum.moodAvg)), sum.moodDays ? t('pdfRangeSub', { a: '\u200E' + signed(Math.min(...moodVals(entries, days))), b: '\u200E' + signed(Math.max(...moodVals(entries, days))) }) : ''],
    [t('pdfBalanced'), String(sum.balanced), sum.moodDays ? t('pdfOf', { n: sum.moodDays }) : ''],
    [t('pdfSleepAvg'), sum.sleepAvg === null ? '-' : `${fmtNum(sum.sleepAvg)}`, sum.sleepMin !== null ? t('pdfRangeSub', { a: fmtNum(sum.sleepMin), b: fmtNum(sum.sleepMax) }) : ''],
    [t('pdfMeds'), sum.medsPct === null ? '-' : `${sum.medsPct}%`, sum.medsKnown ? `${sum.medsYes} ${t('pdfOf', { n: sum.medsKnown })}` : ''],
    [t('pdfEnergy'), sum.energyAvg === null ? '-' : fmtNum(sum.energyAvg), sum.energyAvg === null ? '' : '1-5'],
  ];
  const tw = (contentW - 2 * 3) / 3;
  const th = 17;
  tiles.forEach((tl, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const s = M + col * (tw + 3);
    const ty = y + row * (th + 3);
    rect(ctx, s, ty, tw, th, C.tile, C.line, 0.3);
    text(ctx, tl[0], s + 3, ty + 4.6, { size: 8, weight: 700, color: C.muted });
    text(ctx, tl[1], s + 3, ty + 11.4, { size: 15, weight: 800, ltr: true, align: 'start' });
    if (tl[2]) text(ctx, tl[2], s + 3, ty + 15, { size: 7.5, weight: 600, color: C.muted });
  });
  y += 2 * th + 3 + 7;

  // ---------- charts ----------
  const axisW = 9; // y labels on the reading-start side
  const plotS = M + axisW;
  const plotW = contentW - axisW;
  const n = days.length;
  const slot = plotW / n;
  const gap = slot > 1.6 ? slot * 0.18 : 0;
  const bx = (i: number) => (rtl() ? PAGE_W_MM - plotS - (i + 1) * slot + gap / 2 : plotS + i * slot + gap / 2);
  const bw = slot - gap;

  // mood
  text(ctx, t('pdfMood'), M, y + 3, { size: 10.5, weight: 800, color: C.ink2 });
  y += 6;
  const mh = 46;
  const mid = y + mh / 2;
  const half = mh / 2 - 1;
  for (const l of LEVELS) {
    const ly = mid - (l.v / 3) * half;
    if (l.v !== 0) hline2(ctx, plotS, plotW, ly, '#F1EDF7', 0.2);
    text(ctx, signed(l.v), M + axisW - 2, ly + 1.1, { size: 7, weight: 700, color: C.faint, align: 'end', ltr: true });
  }
  hline2(ctx, plotS, plotW, mid, '#CFC4E0', 0.35);
  days.forEach((d, i) => {
    const m = entries[d]?.mood;
    if (m === null || m === undefined) return;
    ctx.fillStyle = level(m).color;
    if (m === 0) ctx.fillRect(bx(i), mid - 0.9, bw, 1.8);
    else {
      const bh = (Math.abs(m) / 3) * half;
      ctx.fillRect(bx(i), m > 0 ? mid - bh : mid, bw, bh);
    }
  });
  y += mh + 2;
  dateAxis(ctx, days, plotS, plotW, y);
  y += 6;

  // sleep
  const sleepAvg = sum.sleepAvg;
  text(ctx, t('pdfSleep'), M, y + 3, { size: 10.5, weight: 800, color: C.ink2 });
  if (sleepAvg !== null) text(ctx, t('avgShort', { x: fmtNum(sleepAvg) }), PAGE_W_MM - M, y + 3, { size: 8, weight: 700, color: C.muted, align: 'end' });
  y += 5;
  const sh = 22;
  const sv = days.map((d) => entries[d]?.sleep ?? null);
  const nums = sv.filter((v): v is number => v !== null);
  const lo = Math.floor(Math.min(4, ...nums));
  const hi = Math.ceil(Math.max(10, ...nums));
  const sy = (v: number) => y + sh - ((v - lo) / (hi - lo)) * sh;
  for (const v of [lo, Math.round((lo + hi) / 2), hi]) {
    hline2(ctx, plotS, plotW, sy(v), '#F1EDF7', 0.2);
    text(ctx, String(v), M + axisW - 2, sy(v) + 1.1, { size: 7, weight: 700, color: C.faint, align: 'end', ltr: true });
  }
  if (sleepAvg !== null) {
    ctx.setLineDash([1.2, 1.2]);
    hline2(ctx, plotS, plotW, sy(sleepAvg), '#B9ACD3', 0.3);
    ctx.setLineDash([]);
  }
  ctx.strokeStyle = C.sleep;
  ctx.lineWidth = n > 120 ? 0.35 : 0.5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  let run = false;
  sv.forEach((v, i) => {
    if (v === null) {
      run = false;
      return;
    }
    const cx = bx(i) + bw / 2;
    if (run) ctx.lineTo(cx, sy(v));
    else ctx.moveTo(cx, sy(v));
    run = true;
  });
  ctx.stroke();
  sv.forEach((v, i) => {
    if (v === null) return;
    if ((sv[i - 1] ?? null) === null && (sv[i + 1] ?? null) === null) {
      ctx.fillStyle = C.sleep;
      ctx.beginPath();
      ctx.arc(bx(i) + bw / 2, sy(v), 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  y += sh + 4;

  // meds strip
  text(ctx, t('pdfMedsStrip'), M, y + 2.6, { size: 9, weight: 800, color: C.ink2 });
  y += 4;
  const stripH = 3.2;
  days.forEach((d, i) => {
    const m = entries[d]?.meds;
    if (m === null || m === undefined) return;
    if (m) {
      ctx.fillStyle = C.meds;
      ctx.fillRect(bx(i), y, bw, stripH);
    } else if (bw < 1) {
      ctx.fillStyle = '#DCD4E8';
      ctx.fillRect(bx(i), y, bw, stripH);
    } else {
      ctx.strokeStyle = '#B4A9C6';
      ctx.lineWidth = 0.25;
      ctx.strokeRect(bx(i) + 0.125, y + 0.125, bw - 0.25, stripH - 0.25);
    }
  });
  y += stripH + 7;

  // ---------- distribution ----------
  ensure(8 + 7 * 6);
  text(ctx, t('pdfDist'), M, y + 3, { size: 10.5, weight: 800, color: C.ink2 });
  y += 6;
  const maxC = Math.max(1, ...Object.values(sum.dist));
  const nameW = 38;
  const cntW = 18;
  for (const l of LEVELS) {
    chip(ctx, l.v, M, y, 8, 4.4);
    text(ctx, t(('lv' + l.v) as Key), M + 10, y + 3.4, { size: 9, weight: 600, color: C.ink2 });
    const trackS = M + nameW;
    const trackW = contentW - nameW - cntW;
    rect(ctx, trackS, y + 0.9, trackW, 2.6, '#F3F0F8');
    const c = sum.dist[l.v];
    if (c) rect(ctx, trackS, y + 0.9, (c / maxC) * trackW, 2.6, l.color);
    text(ctx, c ? (c === 1 ? t('pdfDay1') : t('pdfDayN', { n: c })) : '-', PAGE_W_MM - M, y + 3.4, { size: 8.5, weight: 700, color: C.ink2, align: 'end' });
    y += 6;
  }
  y += 5;

  // ---------- daily table ----------
  const cols = [
    { k: 'pdfDate', w: 22 },
    { k: 'pdfMoodCol', w: 15 },
    { k: 'pdfSleepCol', w: 12 },
    { k: 'pdfMedsCol', w: 13 },
    { k: 'pdfEnergyCol', w: 13 },
    { k: 'pdfTagsCol', w: 33 },
    { k: 'pdfNoteCol', w: 0 },
  ] as const;
  const widths: number[] = cols.map((c) => c.w);
  widths[widths.length - 1] = contentW - widths.slice(0, -1).reduce((a, b) => a + b, 0);
  const colS = widths.map((_, i) => M + widths.slice(0, i).reduce((a, b) => a + b, 0));
  const pad = 1.4;
  const lineH = 3.9;
  const bodySize = 8.6;

  const tableHead = () => {
    text(ctx, t('pdfDaily'), M, y + 3, { size: 10.5, weight: 800, color: C.ink2 });
    y += 6;
    cols.forEach((c, i) => text(ctx, t(c.k), colS[i] + pad, y + 3, { size: 7.8, weight: 800, color: C.muted }));
    y += 4.6;
    ctx.fillStyle = C.line2;
    ctx.fillRect(M, y, contentW, 0.4);
    y += 0.8;
  };

  const logged = days.filter((d) => entries[d]);
  ensure(18);
  tableHead();
  if (!logged.length) {
    text(ctx, t('pdfNone'), M + pad, y + 5, { size: 9, weight: 600, color: C.muted });
    y += 9;
  }
  logged.forEach((d, idx) => {
    const e = entries[d] as Entry;
    const tagTxt = e.tags.map((tg) => t(('tag_' + tg) as Key)).join(', ');
    const tagLines = tagTxt ? wrap(ctx, tagTxt, widths[5] - 2 * pad, 8, 600) : [];
    const noteLines = e.note.trim() ? wrap(ctx, e.note.trim(), widths[6] - 2 * pad, bodySize, 500) : [];
    const rows = Math.max(1, tagLines.length, noteLines.length);
    const rh = rows * lineH + 2.4;
    if (y + rh > BOTTOM) {
      newPage();
      tableHead();
    }
    if (idx % 2 === 1) rect(ctx, M, y, contentW, rh, C.zebra);
    const by = y + 1.2 + lineH * 0.78;
    text(ctx, shortDate(d), colS[0] + pad, by, { size: bodySize, weight: 800, ltr: true });
    text(ctx, weekdayShort(d, lang()), colS[0] + pad + 10, by, { size: 7.5, weight: 600, color: C.muted });
    if (e.mood !== null) chip(ctx, e.mood, colS[1] + pad, y + 1.2, 8, 3.9);
    if (e.sleep !== null) text(ctx, fmtNum(e.sleep), colS[2] + pad, by, { size: bodySize, weight: 600, ltr: true });
    if (e.meds !== null) text(ctx, e.meds ? t('yes') : t('no'), colS[3] + pad, by, { size: bodySize, weight: 600, color: e.meds ? C.ink : '#9C2F55' });
    if (e.energy !== null) text(ctx, `${e.energy}/5`, colS[4] + pad, by, { size: bodySize, weight: 600, ltr: true });
    tagLines.forEach((ln, i) => text(ctx, ln, colS[5] + pad, by + i * lineH, { size: 8, weight: 600, color: '#9C2F55' }));
    noteLines.forEach((ln, i) => text(ctx, ln, colS[6] + pad, by + i * lineH, { size: bodySize, weight: 500, color: C.ink2 }));
    y += rh;
    ctx.fillStyle = C.line;
    ctx.fillRect(M, y - 0.2, contentW, 0.2);
  });

  // ---------- legend ----------
  y += 6;
  const legend = [t('pdfLegend1'), t('pdfLegend2'), t('pdfLegend3')].map((s) => wrap(ctx, s, contentW, 8, 600));
  const legendH = 6 + legend.reduce((a, l) => a + l.length * 3.8 + 1, 0);
  ensure(legendH);
  text(ctx, t('pdfLegendT'), M, y + 3, { size: 9.5, weight: 800, color: C.ink2 });
  y += 6;
  legend.forEach((lines) => {
    lines.forEach((ln) => {
      text(ctx, ln, M, y + 2.8, { size: 8, weight: 600, color: C.muted });
      y += 3.8;
    });
    y += 1;
  });

  // ---------- footers (need the page count) ----------
  pages.forEach((p, i) => {
    const c = p.ctx;
    c.fillStyle = C.line;
    c.fillRect(M, 287, contentW, 0.25);
    text(c, t('pdfFooter'), M, 291.5, { size: 7.5, weight: 600, color: C.muted });
    text(c, t('pdfPage', { a: i + 1, b: pages.length }), PAGE_W_MM - M, 291.5, { size: 7.5, weight: 600, color: C.muted, align: 'end' });
  });

  return pages.map((p) => p.canvas);
}

function moodVals(entries: Data['entries'], days: DayKey[]): number[] {
  return days.map((d) => entries[d]?.mood).filter((v): v is NonNullable<typeof v> => v !== null && v !== undefined);
}

function hline2(ctx: CanvasRenderingContext2D, s: number, w: number, y: number, color: string, lw: number) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(X(s, w), y);
  ctx.lineTo(X(s, w) + w, y);
  ctx.stroke();
}

function dateAxis(ctx: CanvasRenderingContext2D, days: DayKey[], plotS: number, plotW: number, y: number) {
  const n = days.length;
  const marks = [0, Math.floor((n - 1) / 2), n - 1];
  marks.forEach((i, k) => {
    const s = plotS + ((i + 0.5) / n) * plotW;
    const align: Align = k === 0 ? 'start' : k === 2 ? 'end' : 'center';
    const pos = align === 'start' ? plotS : align === 'end' ? plotS + plotW : s;
    text(ctx, shortDate(days[i]), pos, y + 2.8, { size: 7.5, weight: 700, color: C.faint, align, ltr: true });
  });
}

/** Packs the canvases into a PDF (Uint8Array). */
export async function buildReportPdf(pages: HTMLCanvasElement[]): Promise<Uint8Array<ArrayBuffer>> {
  return buildPdf(pages, PAGE_W_MM, PAGE_H_MM);
}
