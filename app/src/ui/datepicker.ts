import { keyOf, monthTitle, parseKey, todayKey, type DayKey } from '../dates';
import { lang, rtl, t } from '../i18n';
import { level } from '../levels';
import { S } from '../state';
import { h, I, sheet, svg } from './dom';

/** Custom month calendar. Future days are disabled; logged days show a dot in the mood colour. */
export function openDatePicker(current: DayKey, onPick: (d: DayKey) => void) {
  const s = sheet({ title: t('pickDate'), closeLabel: t('close') });
  const today = todayKey();
  const cur = parseKey(current);
  let y = cur.getFullYear();
  let m = cur.getMonth();

  const titleEl = h('b');
  const prev = h('button', { class: 'icon-btn', type: 'button', 'aria-label': '-' }, svg(rtl() ? I.chevR : I.chevL));
  const next = h('button', { class: 'icon-btn', type: 'button', 'aria-label': '+' }, svg(rtl() ? I.chevL : I.chevR));
  const grid = h('div', { class: 'cal-g' });
  const todayBtn = h('button', { class: 'btn wide', type: 'button', style: 'margin-top:12px' }, t('today'));
  s.body.append(h('div', { class: 'cal-h' }, prev, titleEl, next), grid, todayBtn);

  // week starts on Sunday in Israel, Monday in English (en-GB)
  const weekStart = lang() === 'he' ? 0 : 1;
  const wdFmt = new Intl.DateTimeFormat(lang() === 'he' ? 'he-IL' : 'en-GB', { weekday: 'narrow' });

  function render() {
    titleEl.textContent = monthTitle(y, m, lang());
    grid.textContent = '';
    for (let i = 0; i < 7; i++) {
      const d = new Date(2024, 0, 7 + ((weekStart + i) % 7), 12); // 7 Jan 2024 = Sunday
      grid.append(h('div', { class: 'wd' }, wdFmt.format(d)));
    }
    const first = new Date(y, m, 1, 12);
    const lead = (first.getDay() - weekStart + 7) % 7;
    for (let i = 0; i < lead; i++) grid.append(h('div'));
    const daysIn = new Date(y, m + 1, 0).getDate();
    for (let d = 1; d <= daysIn; d++) {
      const k = keyOf(new Date(y, m, d, 12));
      const b = h('button', { type: 'button', class: (k === current ? 'sel ' : '') + (k === today ? 'today' : '') }, String(d));
      if (k > today) b.disabled = true;
      const mood = S.data.entries[k]?.mood;
      if (S.data.entries[k]) {
        const dot = h('i');
        dot.style.background = mood === null || mood === undefined ? '#B9ACD3' : level(mood).color;
        b.append(dot);
      }
      b.addEventListener('click', () => {
        onPick(k);
        s.close();
      });
      grid.append(b);
    }
    const t0 = parseKey(today);
    next.disabled = y > t0.getFullYear() || (y === t0.getFullYear() && m >= t0.getMonth());
  }
  prev.addEventListener('click', () => {
    m--;
    if (m < 0) {
      m = 11;
      y--;
    }
    render();
  });
  next.addEventListener('click', () => {
    m++;
    if (m > 11) {
      m = 0;
      y++;
    }
    render();
  });
  todayBtn.addEventListener('click', () => {
    onPick(today);
    s.close();
  });
  render();
}
