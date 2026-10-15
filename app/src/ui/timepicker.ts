import { t } from '../i18n';
import { h, sheet } from './dom';

const ROW = 40;
const pad = (n: number) => String(n).padStart(2, '0');

function column(values: number[], selected: number): { el: HTMLElement; get: () => number; settle: () => void } {
  const el = h('div', { class: 'col', role: 'listbox' });
  el.append(h('div', { class: 'pad' }), h('div', { class: 'pad' }));
  values.forEach((v) => el.append(h('div', { role: 'option' }, pad(v))));
  el.append(h('div', { class: 'pad' }), h('div', { class: 'pad' }));
  const idx = Math.max(0, values.indexOf(selected));
  const settle = () => (el.scrollTop = idx * ROW);
  return {
    el,
    settle,
    get: () => values[Math.max(0, Math.min(values.length - 1, Math.round(el.scrollTop / ROW)))],
  };
}

/** Custom wheel-style time picker (24h). Resolves "HH:MM", or null when turned off / dismissed. */
export function openTimePicker(current: string, opts: { allowOff: boolean }): Promise<string | 'off' | null> {
  return new Promise((resolve) => {
    let result: string | 'off' | null = null;
    const s = sheet({ title: t('timeTitle'), closeLabel: t('close') });
    s.closed.then(() => resolve(result));
    const [ch, cm] = current.split(':').map(Number);
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const mins = Array.from({ length: 12 }, (_, i) => i * 5);
    const hc = column(hours, ch);
    const mc = column(mins, Math.round(cm / 5) * 5 >= 60 ? 55 : Math.round(cm / 5) * 5);
    const tp = h('div', { class: 'tp' }, h('div', { class: 'band' }), hc.el, h('span', { class: 'colon' }, ':'), mc.el);
    const save = h('button', { class: 'btn pri', type: 'button' }, t('set'));
    const actions = h('div', { class: 'sheet-actions' });
    if (opts.allowOff) {
      const off = h('button', { class: 'btn', type: 'button' }, t('turnOff'));
      off.addEventListener('click', () => {
        result = 'off';
        s.close();
      });
      actions.append(off);
    }
    actions.append(save);
    save.addEventListener('click', () => {
      result = `${pad(hc.get())}:${pad(mc.get())}`;
      s.close();
    });
    s.body.append(tp, actions);
    requestAnimationFrame(() => {
      hc.settle();
      mc.settle();
    });
  });
}
