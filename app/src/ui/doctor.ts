import { Share } from '@capacitor/share';
import { lastDays, shortDate, todayKey } from '../dates';
import { t, rtl } from '../i18n';
import { S } from '../state';
import { fmtNum, summarize } from '../stats';
import { buildReportPdf, renderReportPages } from '../report/report';
import { isNative, removeTemp, writeTemp } from '../platform';
import { toB64 } from '../crypto';
import { moodSvg } from './charts';
import { h, I, sheet, svg, toast } from './dom';

// The doctor summary: a sheet opened from the trends screen.
export function openDoctor() {
  const s0 = sheet({ title: t('doctorTitle'), closeLabel: t('close') });
  const main = s0.body;
  const seg = h('div', { class: 'seg', role: 'tablist' });
  const ranges = [30, 60, 90];
  const segBtns = ranges.map((n) => {
    const b = h('button', { type: 'button', role: 'tab' }, String(n));
    b.addEventListener('click', () => {
      S.doctorRange = n;
      render();
    });
    seg.append(b);
    return b;
  });
  main.append(h('div', { class: 'hd' }, h('small', null, t('doctorSub')), seg));

  const range = h('small', { class: 'ltr' });
  const chart = h('div', { style: 'height:70px' });
  const tBal = h('b', { class: 'num' });
  const tSleep = h('b', { class: 'num' });
  const tMeds = h('b', { class: 'num' });
  const rep = h(
    'div',
    { class: 'rep' },
    h('div', { class: 't' }, h('b', null, t('repTitle')), range),
    chart,
    h('div', { class: 'tiles' }, h('div', { class: 'tile' }, h('small', null, t('balancedDays')), tBal), h('div', { class: 'tile' }, h('small', null, t('sleepAvg')), tSleep), h('div', { class: 'tile' }, h('small', null, t('medsPct')), tMeds)),
  );
  const sendBtn = h('button', { class: 'btn pri', type: 'button' }, svg(I.share), t('sendPdf'));
  const prevBtn = h('button', { class: 'btn', type: 'button' }, t('preview'));
  sendBtn.addEventListener('click', () => void sendPdf());
  prevBtn.addEventListener('click', () => void preview());
  main.append(rep, h('div', { class: 'btn-row' }, sendBtn, prevBtn));

  function days() {
    return lastDays(todayKey(), S.doctorRange);
  }

  function render() {
    segBtns.forEach((b, i) => b.classList.toggle('on', ranges[i] === S.doctorRange));
    const d = days();
    range.textContent = rtl() ? `${shortDate(d[d.length - 1])} - ${shortDate(d[0])}` : `${shortDate(d[0])} - ${shortDate(d[d.length - 1])}`;
    const sum = summarize(S.data.entries, d);
    tBal.textContent = String(sum.balanced);
    tSleep.textContent = fmtNum(sum.sleepAvg);
    tMeds.textContent = sum.medsPct === null ? '-' : sum.medsPct + '%';
    const w = Math.max(200, chart.clientWidth || rep.clientWidth - 26);
    chart.replaceChildren(moodSvg(d, S.data.entries, w, 70, rtl()));
  }

  async function withBusy<T>(fn: () => Promise<T>): Promise<T | null> {
    const ov = h('div', { class: 'loading' }, h('div', null, h('span', { class: 'spin' }), t('making')));
    document.body.append(ov);
    try {
      await S.flush();
      return await fn();
    } catch (e) {
      console.error('report', e);
      toast(t('pdfFail'));
      return null;
    } finally {
      ov.remove();
    }
  }

  async function sendPdf() {
    const name = `${t('pdfFile')}-${todayKey()}.pdf`;
    const bytes = await withBusy(async () => buildReportPdf(await renderReportPages(S.data, days())));
    if (!bytes) return;
    if (!isNative()) {
      const a = h('a', { href: URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' })), download: name });
      a.click();
      return;
    }
    const uri = await writeTemp(name, toB64(bytes), true);
    try {
      await Share.share({ title: t('repTitle'), files: [uri] });
    } catch {
      /* closed */
    } finally {
      setTimeout(() => void removeTemp(name), 120_000);
    }
  }

  async function preview() {
    const pages = await withBusy(() => renderReportPages(S.data, days()));
    if (!pages) return;
    const s = sheet({ title: t('previewTitle'), full: true, closeLabel: t('close') });
    const urls: string[] = [];
    const wrap = h('div', { class: 'pv-pages' });
    for (const c of pages) {
      const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/png'));
      if (!blob) continue;
      const u = URL.createObjectURL(blob);
      urls.push(u);
      wrap.append(h('img', { src: u, alt: '' }));
    }
    const send = h('button', { class: 'btn pri wide', type: 'button', style: 'margin-top:6px' }, svg(I.share), t('send'));
    send.addEventListener('click', () => void sendPdf());
    s.body.append(wrap, send);
    s.closed.then(() => urls.forEach((u) => URL.revokeObjectURL(u)));
  }

  // draw once the sheet has its width
  requestAnimationFrame(render);
  const off = S.on(render);
  void s0.closed.then(() => off());
}
