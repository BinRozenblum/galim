import { t } from '../i18n';
import { h, I, openExternal, sheet, svg, waveMark } from './dom';

export const VERSION = '1.0.1';
export const PRIVACY_URL = 'https://binrozenblum.co.il/galim/privacy';
export const TERMS_URL = 'https://binrozenblum.co.il/galim/terms';
export const A11Y_URL = 'https://binrozenblum.co.il/galim/accessibility';
export const SITE_URL = 'https://binrozenblum.co.il';
export const CONTACT = 'galim@binrozenblum.co.il';

export function openAbout() {
  const s = sheet({ title: t('aboutTitle'), full: true, closeLabel: t('close') });
  const linkRow = (icon: string, title: string, sub: string, href: string) => {
    const b = h('button', { class: 'set', type: 'button' }, h('span', { class: 'ico', style: 'background:#EFE8FD;color:#6D28D9' }, svg(icon)), h('div', { class: 'st' }, h('b', null, title), h('small', null, h('span', { class: 'ltr' }, sub))));
    b.addEventListener('click', () => openExternal(href));
    return b;
  };
  const credit = h('button', { class: 'link', type: 'button' }, h('span', { class: 'ltr' }, 'binrozenblum.co.il'));
  credit.addEventListener('click', () => openExternal(SITE_URL));
  s.body.append(
    h(
      'div',
      { class: 'about' },
      h('div', { class: 'about-hero' }, waveMark(64), h('div', null, h('b', null, t('appName')), h('small', null, `${t('version')} `, h('span', { class: 'ltr' }, VERSION)))),
      h('p', null, t('aboutLead')),
      h('p', { class: 'disc' }, t('disclaimer')),
      h('p', null, t('aboutPrivacy')),
      h('div', { class: 'card set-card', style: 'margin-top:4px' }, linkRow(I.shield, t('privacyPolicy'), 'binrozenblum.co.il/galim/privacy', PRIVACY_URL), linkRow(I.doctor, t('terms'), 'binrozenblum.co.il/galim/terms', TERMS_URL), linkRow(I.check, t('accessibility'), 'binrozenblum.co.il/galim/accessibility', A11Y_URL), linkRow(I.mail, t('contact'), CONTACT, 'mailto:' + CONTACT)),
      h('div', { class: 'credit' }, h('b', null, t('credit')), credit),
    ),
  );
}
