import './styles/fonts.css';
import './styles/app.css';
import { App } from '@capacitor/app';
import { Keyboard } from '@capacitor/keyboard';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { todayKey } from './dates';
import { detectLang, setLang, t } from './i18n';
import { installPrivacy, lockNow } from './lock';
import { emptyData } from './model';
import { scheduleReminder } from './notify';
import { isNative, loadPrefs, nativeBackend, platform } from './platform';
import { S, type Tab } from './state';
import { Vault } from './vault';
import { closeAllSheets, closeTopSheet, h, I, setKeyboardHeight, svg, waveMark } from './ui/dom';
import { runOnboarding } from './ui/onboarding';
import { mountPlan } from './ui/plan';
import { openRestore, setWipeHandler } from './ui/settings';
import { mountToday } from './ui/today';
import { mountTrends } from './ui/trends';

const TABS: { id: Tab; icon: string; label: () => string }[] = [
  { id: 'today', icon: I.today, label: () => t('tabToday') },
  { id: 'trends', icon: I.trends, label: () => t('tabTrends') },
  { id: 'plan', icon: I.plan, label: () => t('tabPlan') },
];

const screens = new Map<Tab, HTMLElement>();
const tabBtns = new Map<Tab, HTMLButtonElement>();
const renderers: Partial<Record<Tab, () => void>> = {};

export function goTab(tab: Tab) {
  S.tab = tab;
  screens.forEach((el, id) => el.classList.toggle('on', id === tab));
  tabBtns.forEach((b, id) => {
    b.classList.toggle('on', id === tab);
    b.setAttribute('aria-selected', String(id === tab));
  });
  const main = screens.get(tab)?.querySelector('.main');
  if (main) main.scrollTop = 0;
  S.emit();
  renderers[tab]?.();
}

function buildShell() {
  const app = document.getElementById('app')!;
  app.textContent = '';
  screens.clear();
  tabBtns.clear();
  for (const tb of TABS) {
    const sc = h('section', { class: 'screen', id: 'screen-' + tb.id, 'aria-label': tb.label() });
    screens.set(tb.id, sc);
    app.append(sc);
  }
  mountToday(screens.get('today')!);
  renderers.trends = mountTrends(screens.get('trends')!, (tab) => goTab(tab));
  mountPlan(screens.get('plan')!);
  const nav = h('nav', { class: 'tabs', role: 'tablist' });
  for (const tb of TABS) {
    const b = h('button', { class: 'tab', type: 'button', role: 'tab' }, svg(tb.icon), h('span', null, tb.label()));
    b.addEventListener('click', () => goTab(tb.id));
    tabBtns.set(tb.id, b);
    nav.append(b);
  }
  app.append(nav);
  goTab('today');
}

function showUnreadable(): Promise<void> {
  return new Promise((resolve) => {
    const restore = h('button', { class: 'btn pri', type: 'button' }, t('restore'));
    const fresh = h('button', { class: 'btn', type: 'button' }, t('startFresh'));
    const el = h('div', { class: 'cover' }, h('div', { class: 'bg' }), waveMark(72), h('h2', null, t('unreadableTitle')), h('p', { class: 'sp', style: 'text-align:center;max-width:320px;line-height:1.5' }, t('unreadableText')), restore, fresh);
    document.body.append(el);
    restore.addEventListener('click', () => {
      el.remove();
      S.data = emptyData();
      resolve();
      setTimeout(openRestore, 300);
    });
    fresh.addEventListener('click', async () => {
      await S.vault.wipe();
      S.data = emptyData();
      el.remove();
      resolve();
    });
  });
}

async function boot() {
  S.prefs = await loadPrefs();
  setLang(S.prefs.lang || detectLang());
  document.title = t('appName');

  if (isNative()) {
    StatusBar.setStyle({ style: Style.Light }).catch(() => {});
    if (platform() === 'android') StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
    void Keyboard.addListener('keyboardWillShow', (i) => setKeyboardHeight(platform() === 'ios' ? i.keyboardHeight : 0));
    void Keyboard.addListener('keyboardWillHide', () => setKeyboardHeight(0));
    App.addListener('backButton', () => {
      if (closeTopSheet()) return;
      if (S.tab !== 'today') goTab('today');
      else App.minimizeApp().catch(() => {});
    });
  }

  // While locked, nothing of the diary is on screen.
  const locked = S.prefs.lock ? lockNow() : Promise.resolve();
  SplashScreen.hide().catch(() => {});

  S.vault = new Vault(nativeBackend);
  const res = await S.vault.load();
  if (res.ok) S.data = res.data;
  else {
    await locked;
    await showUnreadable();
  }

  buildShell();
  installPrivacy(!import.meta.env.VITE_DEV_SCENES);
  setWipeHandler(async () => {
    S.day = todayKey();
    buildShell();
    await runOnboarding();
  });

  // keep "today" correct across midnight
  let lastToday = todayKey();
  App.addListener('resume', () => {
    const now = todayKey();
    if (now !== lastToday) {
      if (S.day === lastToday) S.day = now;
      lastToday = now;
      S.emit();
    }
  });

  if (import.meta.env.VITE_DEV_SCENES) {
    const dev = await import('./dev/scenes');
    dev.installScenes({ goTab, buildShell, closeAllSheets });
  }

  await locked;
  if (!S.prefs.onboarded) await runOnboarding();
  if (S.prefs.reminder) void scheduleReminder(S.prefs.remindAt, false);

}

boot().catch((e) => {
  console.error(e);
  document.body.append(h('div', { class: 'cover' }, h('h2', null, t('error'))));
});
