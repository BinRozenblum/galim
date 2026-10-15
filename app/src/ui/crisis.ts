import { t } from '../i18n';
import { S } from '../state';
import { h, I, openExternal, sheet, svg } from './dom';

export const SAHAR_URL = 'https://sahar.org.il';

export function crisisLines(): HTMLElement[] {
  const line = (name: string, desc: string, pillText: string, icon: string, href: string, cls = '') => {
    const b = h('button', { class: 'cr ' + cls, type: 'button' }, h('div', { class: 'ct' }, h('b', null, name), h('small', null, desc)), h('span', { class: 'pill' }, svg(icon), h('span', { class: 'ltr' }, pillText)));
    b.addEventListener('click', () => openExternal(href));
    return b;
  };
  return [
    line(t('eranName'), t('eranDesc'), '1201', I.phone, 'tel:1201'),
    line(t('saharName'), t('saharDesc'), t('saharBtn'), I.chat, SAHAR_URL),
    line(t('mdaName'), t('mdaDesc'), '101', I.phone, 'tel:101', 'em'),
  ];
}

export function openCrisis() {
  const s = sheet({ title: t('crisisTitle'), closeLabel: t('close') });
  s.body.append(h('p', { class: 'cr-sub' }, t('crisisSub')), ...crisisLines());
  if (t('outsideIsrael')) s.body.append(h('p', { class: 'cr-out' }, t('outsideIsrael')));
  const people = S.data.plan.people.filter((p) => p.phone);
  if (people.length) {
    const wrap = h('div', { class: 'cr-people' }, h('h3', null, t('myPeople')));
    for (const p of people) {
      const b = h('button', { class: 'cr', type: 'button' }, h('div', { class: 'ct' }, h('b', null, p.name), h('small', null, p.relation)), h('span', { class: 'pill', style: 'background:#6D28D9' }, svg(I.phone), h('span', { class: 'ltr' }, t('call'))));
      b.addEventListener('click', () => openExternal('tel:' + p.phone.replace(/[^\d+*#]/g, '')));
      wrap.append(b);
    }
    s.body.append(wrap);
  }
}
