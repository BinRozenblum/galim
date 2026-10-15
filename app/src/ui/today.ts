import { addDays, longDate, todayKey } from '../dates';
import { t, lang, rtl, type Key } from '../i18n';
import { LEVELS, TAGS, type Mood, type Tag } from '../levels';
import { NOTE_MAX } from '../model';
import { S } from '../state';
import { h, I, sheet, svg } from './dom';
import { openCrisis } from './crisis';
import { openDatePicker } from './datepicker';
import { openSettings } from './settings';
import { haptic } from './haptic';

export function mountToday(root: HTMLElement) {
  const main = h('div', { class: 'main' });
  root.append(main);

  // --- top bar: date nav + help + settings
  const prevBtn = h('button', { class: 'icon-btn', type: 'button', 'aria-label': t('prevDay') });
  const nextBtn = h('button', { class: 'icon-btn', type: 'button', 'aria-label': t('nextDay') });
  const dateBtn = h('button', { class: 'datebtn', type: 'button', 'aria-label': t('pickDate') });
  const helpBtn = h('button', { class: 'help-link', type: 'button' }, t('needHelp'));
  const gearBtn = h('button', { class: 'icon-btn', type: 'button', 'aria-label': t('settings') }, svg(I.gear));
  // In RTL the "back in time" arrow points right and sits on the right.
  prevBtn.append(svg(rtl() ? I.chevR : I.chevL));
  nextBtn.append(svg(rtl() ? I.chevL : I.chevR));
  const top = h('div', { class: 'today-top' }, h('div', { class: 'datenav' }, prevBtn, dateBtn, nextBtn), h('div', { class: 'top-actions' }, helpBtn, gearBtn));

  const title = h('h1');
  const saved = h('span', { class: 'saved', 'aria-live': 'polite' }, svg(I.check), h('span', null, t('saved')));
  const head = h('div', { class: 'today-h' }, title, saved);

  // --- mood scale
  const scale = h('div', { class: 'scale', role: 'radiogroup', 'aria-label': t('mood') });
  const lvBtns = new Map<Mood, HTMLButtonElement>();
  for (const l of LEVELS) {
    const b = h(
      'button',
      { class: 'lv' + (l.v === 0 ? ' mid' : ''), type: 'button', role: 'radio', style: `--c:${l.color};--on:${l.on}` },
      h('span', { class: 'n', style: l.v === 1 ? 'color:#3A2A10' : '' }, l.v > 0 ? '+' + l.v : l.v < 0 ? '−' + -l.v : '0'),
      h('span', null, t(('lv' + l.v) as Key)),
    );
    b.addEventListener('click', () => {
      const cur = S.entry().mood;
      S.setEntry(S.day, { mood: cur === l.v ? null : l.v });
      haptic();
    });
    lvBtns.set(l.v, b);
    scale.append(b);
  }
  const moodCard = h('div', { class: 'card' }, scale);

  // --- sleep
  const sleepVal = h('div', { class: 'big' });
  const plus = h('button', { type: 'button', 'aria-label': t('more') }, svg(I.plus));
  const minus = h('button', { type: 'button', 'aria-label': t('less') }, svg(I.minus));
  plus.addEventListener('click', () => {
    const s = S.entry().sleep;
    S.setEntry(S.day, { sleep: s === null ? 7 : Math.min(24, s + 0.5) });
    haptic();
  });
  minus.addEventListener('click', () => {
    const s = S.entry().sleep;
    S.setEntry(S.day, { sleep: s === null ? 6.5 : s <= 0 ? null : s - 0.5 });
    haptic();
  });
  const sleepCard = h('div', { class: 'card' }, h('div', { class: 'lbl' }, t('sleep')), sleepVal, h('div', { class: 'two' }, plus, minus));

  // --- meds
  const yesB = h('button', { type: 'button' }, t('yes'));
  const noB = h('button', { type: 'button' }, t('no'));
  yesB.addEventListener('click', () => {
    S.setEntry(S.day, { meds: S.entry().meds === true ? null : true });
    haptic();
  });
  noB.addEventListener('click', () => {
    S.setEntry(S.day, { meds: S.entry().meds === false ? null : false });
    haptic();
  });
  const medsCard = h('div', { class: 'card' }, h('div', { class: 'lbl' }, t('meds')), h('div', { class: 'q' }, t('medsQ')), h('div', { class: 'two' }, yesB, noB));

  // --- energy
  const enLbl = h('span');
  const dots = h('div', { class: 'dots' });
  const enBtns: HTMLButtonElement[] = [];
  for (let i = 1; i <= 5; i++) {
    const b = h('button', { type: 'button', 'aria-label': `${t('energy')} ${i}` }, String(i));
    b.addEventListener('click', () => {
      S.setEntry(S.day, { energy: S.entry().energy === i ? null : i });
      haptic();
    });
    enBtns.push(b);
    dots.append(b);
  }
  const energyCard = h('div', { class: 'card', style: 'margin-top:10px' }, h('div', { class: 'lbl' }, t('energy'), enLbl), dots);

  // --- chips
  const chips = h('div', { class: 'chips' });
  const tagBtns = new Map<Tag, HTMLButtonElement>();
  for (const tag of TAGS) {
    const b = h('button', { class: 'chip', type: 'button' });
    b.addEventListener('click', () => {
      const tags = S.entry().tags;
      S.setEntry(S.day, { tags: tags.includes(tag) ? tags.filter((x) => x !== tag) : [...tags, tag] });
      haptic();
    });
    tagBtns.set(tag, b);
    chips.append(b);
  }
  const noteBtn = h('button', { class: 'chip note', type: 'button' });
  noteBtn.addEventListener('click', () => openNote());
  chips.append(noteBtn);

  main.append(top, head, moodCard, h('div', { class: 'row2' }, sleepCard, medsCard), energyCard, chips);

  prevBtn.addEventListener('click', () => {
    S.day = addDays(S.day, -1);
    S.emit();
  });
  nextBtn.addEventListener('click', () => {
    if (S.day >= todayKey()) return;
    S.day = addDays(S.day, 1);
    S.emit();
  });
  dateBtn.addEventListener('click', () =>
    openDatePicker(S.day, (d) => {
      S.day = d;
      S.emit();
    }),
  );
  helpBtn.addEventListener('click', () => openCrisis());
  gearBtn.addEventListener('click', () => openSettings());

  let savedTimer: ReturnType<typeof setTimeout> | null = null;
  let lastRenderedDay = '';
  S.onSaved((ok) => {
    if (S.tab !== 'today') return;
    saved.classList.add('show');
    saved.classList.toggle('err', !ok);
    if (savedTimer) clearTimeout(savedTimer);
    savedTimer = setTimeout(() => saved.classList.remove('show'), 2200);
  });

  function render() {
    const today = todayKey();
    if (S.day > today) S.day = today;
    const e = S.entry();
    if (lastRenderedDay !== S.day) {
      saved.classList.remove('show');
      lastRenderedDay = S.day;
    }
    dateBtn.textContent = S.day === today ? longDate(S.day, lang()) : longDate(S.day, lang());
    nextBtn.disabled = S.day >= today;
    title.textContent = S.day === today ? t('howToday') : t('howThatDay');
    scale.classList.toggle('dim', e.mood !== null);
    lvBtns.forEach((b, v) => {
      const on = e.mood === v;
      b.classList.toggle('sel', on);
      b.setAttribute('aria-checked', String(on));
    });
    sleepVal.textContent = '';
    if (e.sleep === null) sleepVal.append(h('span', { class: 'empty' }, t('notLogged')));
    else sleepVal.append(h('b', { class: 'num' }, String(e.sleep)), h('small', null, t('hours')));
    yesB.classList.toggle('on', e.meds === true);
    noB.classList.toggle('on', e.meds === false);
    enLbl.textContent = e.energy ? t(('en' + e.energy) as Key) : '';
    enBtns.forEach((b, i) => {
      b.classList.toggle('f', !!e.energy && i + 1 < e.energy);
      b.classList.toggle('s', e.energy === i + 1);
    });
    tagBtns.forEach((b, tag) => {
      const on = e.tags.includes(tag);
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
      b.textContent = '';
      if (!on) b.append(svg(I.plus));
      b.append(t(('tag_' + tag) as Key));
    });
    const hasNote = !!e.note.trim();
    noteBtn.classList.toggle('on', hasNote);
    noteBtn.textContent = '';
    noteBtn.append(svg(hasNote ? I.note : I.plus), t('note'));
  }

  function openNote() {
    const day = S.day;
    const s = sheet({ title: t('noteTitle'), closeLabel: t('close') });
    const ta = h('textarea', { class: 'textarea', dir: 'auto', maxlength: NOTE_MAX, placeholder: t('notePh'), 'aria-label': t('noteTitle') }) as HTMLTextAreaElement;
    ta.value = S.entry(day).note;
    const counter = h('div', { class: 'counter num' });
    const upd = () => (counter.textContent = `${ta.value.length}/${NOTE_MAX}`);
    upd();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const commit = () => {
      if (timer) clearTimeout(timer);
      if (ta.value !== S.entry(day).note) S.setEntry(day, { note: ta.value.slice(0, NOTE_MAX) });
    };
    ta.addEventListener('input', () => {
      upd();
      if (timer) clearTimeout(timer);
      timer = setTimeout(commit, 600);
    });
    const done = h('button', { class: 'btn pri wide', type: 'button' }, t('done'));
    done.addEventListener('click', () => s.close());
    s.body.append(ta, counter, h('div', { class: 'sheet-actions' }, done));
    s.closed.then(commit);
    setTimeout(() => ta.focus(), 260);
  }

  S.on(render);
  render();
}
