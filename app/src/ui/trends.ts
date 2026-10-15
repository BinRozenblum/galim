import { lastDays, shortDate, todayKey } from '../dates';
import { t, rtl } from '../i18n';
import { S } from '../state';
import { avg, fmtNum, moodNote, sleepNote, sleepValues } from '../stats';
import { geo, medsSvg, moodSvg, sleepSvg } from './charts';
import { h, I, svg } from './dom';
import { openDoctor } from './doctor';

export function mountTrends(root: HTMLElement, goTab: (tab: 'today' | 'plan') => void) {
  const main = h('div', { class: 'main' });
  root.append(main);

  const sub = h('small');
  const seg = h('div', { class: 'seg', role: 'tablist' });
  const opts: [number, string][] = [
    [30, '30'],
    [90, '90'],
    [365, t('year')],
  ];
  const segBtns = opts.map(([n, label]) => {
    const b = h('button', { type: 'button', role: 'tab' }, label);
    b.addEventListener('click', () => {
      S.trendsRange = n;
      render();
    });
    seg.append(b);
    return b;
  });
  main.append(h('div', { class: 'hd' }, h('div', null, sub, h('h1', null, t('trendsTitle'))), seg));

  const moodBox = h('div', { class: 'chart-box' });
  const sleepLbl = h('span');
  const sleepBox = h('div');
  const medsBox = h('div');
  const axis = h('div', { class: 'axis' });
  const empty = h('div', { class: 'empty-note' }, t('trendsEmpty'));
  const card = h(
    'div',
    { class: 'card chart-card' },
    h('div', { class: 'lbl' }, t('mood')),
    moodBox,
    h('div', { class: 'lbl', style: 'margin-top:12px' }, t('sleep'), sleepLbl),
    sleepBox,
    h('div', { class: 'lbl', style: 'margin-top:10px;margin-bottom:5px' }, t('meds'), h('span', { class: 'legend-row' }, h('span', null, h('i'), t('medsYesL')), h('span', null, h('i', { class: 'no' }), t('medsNoL')))),
    medsBox,
    axis,
    empty,
  );
  const notes = h('div');
  const docBtn = h('button', { class: 'btn wide doc-btn', type: 'button' }, svg(I.doctor), t('doctorTitle'));
  docBtn.addEventListener('click', () => openDoctor());
  main.append(card, notes, docBtn);

  function heights() {
    // fit the screen: mood chart takes what is left after the fixed parts
    const avail = main.clientHeight;
    const moodH = Math.max(120, Math.min(220, Math.round(avail * 0.3)));
    return { moodH, sleepH: Math.max(48, Math.round(moodH * 0.32)) };
  }

  function render() {
    if (S.tab !== 'trends') return;
    const n = S.trendsRange;
    const today = todayKey();
    const days = lastDays(today, n);
    const entries = S.data.entries;
    segBtns.forEach((b, i) => {
      b.classList.toggle('on', opts[i][0] === n);
      b.setAttribute('aria-selected', String(opts[i][0] === n));
    });
    sub.textContent = n === 365 ? t('lastYear') : t('lastNDays', { n });
    const w = Math.max(200, moodBox.clientWidth || card.clientWidth - 24);
    const { moodH, sleepH } = heights();
    const r = rtl();
    const sleeps = sleepValues(entries, days);
    const sAvg = avg(sleeps);
    sleepLbl.textContent = sAvg === null ? t('sleepSub') : `${t('sleepSub')} · ${t('avgShort', { x: fmtNum(sAvg) })}`;

    const mood = moodSvg(days, entries, w, moodH, r);
    const sleep = sleepSvg(days, entries, w, sleepH, r, sAvg);
    const meds = medsSvg(days, entries, w, 10, r);
    const g = geo(days.length, w, r);
    for (const svgEl of [mood, sleep, meds]) {
      svgEl.addEventListener('click', (ev) => {
        const rect = svgEl.getBoundingClientRect();
        const i = g.at(((ev as MouseEvent).clientX - rect.left) * (w / rect.width));
        S.day = days[i];
        goTab('today');
      });
    }
    moodBox.replaceChildren(mood);
    sleepBox.replaceChildren(sleep);
    medsBox.replaceChildren(meds);
    axis.replaceChildren(h('span', { class: 'ltr' }, shortDate(days[0])), h('span', null, t('today')));
    const any = days.some((d) => entries[d]);
    empty.style.display = any ? 'none' : '';

    notes.textContent = '';
    const sn = sleepNote(entries, today);
    if (sn) notes.append(gentle(t('noteSleep', { x: fmtNum(sn.recent), y: fmtNum(sn.usual) })));
    if (moodNote(entries, today)) notes.append(gentle(t('noteMood')));
  }

  function gentle(text: string) {
    const link = h('button', { class: 'link', type: 'button' }, t('toPlan') + (rtl() ? ' ←' : ' →'));
    link.addEventListener('click', () => goTab('plan'));
    return h('div', { class: 'gentle' }, h('p', null, text), link);
  }

  S.on(render);
  return render;
}
