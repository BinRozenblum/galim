import { t } from '../i18n';
import { savePrefs } from '../platform';
import { S } from '../state';
import { crisisLines } from './crisis';
import { h, I, svg, waveMark } from './dom';
import { settingsRows } from './settings';

/** First run: 3 short screens + optional lock/reminder. Resolves when done or skipped. */
export function runOnboarding(): Promise<void> {
  return new Promise((resolve) => {
    const root = h('div', { class: 'ob' }, h('div', { class: 'bg' }));
    document.body.append(root);
    let step = 0;
    const STEPS = 4;

    const finish = async () => {
      S.prefs.onboarded = true;
      await savePrefs(S.prefs);
      root.style.transition = 'opacity .25s';
      root.style.opacity = '0';
      setTimeout(() => root.remove(), 260);
      resolve();
    };

    function render() {
      root.querySelectorAll(':scope > :not(.bg)').forEach((n) => n.remove());
      const skip = h('button', { type: 'button' }, t('skip'));
      skip.addEventListener('click', () => void finish());
      const top = h('div', { class: 'ob-top' }, step < STEPS - 1 ? skip : null);
      const body = h('div', { class: 'ob-body' });
      if (step === 0) body.append(h('div', { class: 'ob-art' }, waveMark(96)), h('h1', null, t('ob1t')), h('p', null, t('ob1b')));
      if (step === 1) {
        const lines = crisisLines();
        body.append(h('h1', null, t('ob2t')), h('p', null, t('ob2b')), h('div', { class: 'ob-cr' }, ...lines));
        if (t('outsideIsrael')) body.append(h('p', { class: 'cr-out' }, t('outsideIsrael')));
      }
      if (step === 2) body.append(h('div', { class: 'ob-art' }, h('span', { class: 'ob-ico' }, svg(I.shield))), h('h1', null, t('ob3t')), h('p', null, t('ob3b')));
      if (step === 3) {
        const box = h('div', { class: 'ob-setup' });
        const rows = () => {
          const all = settingsRows(rows);
          box.replaceChildren(all[1], all[2]);
        };
        rows();
        body.append(h('h1', null, t('ob4t')), h('p', null, t('ob4b')), box);
      }
      const dots = h('div', { class: 'ob-dots' });
      for (let i = 0; i < STEPS; i++) dots.append(h('i', { class: i === step ? 'on' : '' }));
      const next = h('button', { class: 'btn pri', type: 'button' }, step === STEPS - 1 ? t('start') : t('next'));
      next.addEventListener('click', () => {
        if (step === STEPS - 1) void finish();
        else {
          step++;
          render();
        }
      });
      root.append(top, body, h('div', { class: 'ob-foot' }, dots, next));
    }
    render();
  });
}
