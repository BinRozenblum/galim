import { App } from '@capacitor/app';
import { BiometricAuth } from '@aparajita/capacitor-biometric-auth';
import { PrivacyScreen } from '@capacitor/privacy-screen';
import { t } from './i18n';
import { isNative } from './platform';
import { S } from './state';
import { h, waveMark } from './ui/dom';

const RELOCK_MS = 60_000;
let cover: HTMLElement | null = null;
let lockEl: HTMLElement | null = null;
let hiddenAt = 0;
let authInFlight = false;

export async function deviceCanLock(): Promise<boolean> {
  if (!isNative()) return true;
  try {
    const r = await BiometricAuth.checkBiometry();
    return r.isAvailable || r.deviceIsSecure;
  } catch {
    return false;
  }
}

export async function authenticate(): Promise<boolean> {
  if (!isNative()) return true;
  if (authInFlight) return false;
  authInFlight = true;
  try {
    await BiometricAuth.authenticate({
      reason: t('unlockReason'),
      cancelTitle: t('cancel'),
      allowDeviceCredential: true,
      iosFallbackTitle: '',
      androidTitle: t('appName'),
      androidSubtitle: t('unlockReason'),
      androidConfirmationRequired: false,
    });
    return true;
  } catch {
    return false;
  } finally {
    // the OS prompt makes the app inactive briefly; don't count that as "away"
    hiddenAt = 0;
    setTimeout(() => (authInFlight = false), 400);
  }
}

function showCover() {
  if (cover || lockEl) return;
  cover = h('div', { class: 'cover', 'aria-hidden': 'true' }, h('div', { class: 'bg' }), waveMark(84));
  document.body.append(cover);
}

function hideCover() {
  cover?.remove();
  cover = null;
}

export function isLocked() {
  return !!lockEl;
}

/** Full-screen lock; resolves when unlocked. */
export function lockNow(): Promise<void> {
  hideCover();
  if (lockEl) return Promise.resolve();
  return new Promise((resolve) => {
    const btn = h('button', { class: 'btn pri', type: 'button' }, t('unlock'));
    lockEl = h('div', { class: 'cover lock' }, h('div', { class: 'bg' }), waveMark(84), h('h2', null, t('locked')), btn);
    document.body.append(lockEl);
    const tryUnlock = async () => {
      if (await authenticate()) {
        lockEl?.remove();
        lockEl = null;
        resolve();
      }
    };
    btn.addEventListener('click', tryUnlock);
    setTimeout(tryUnlock, 350);
  });
}

/** Hide content while in the background; re-lock after a minute away. */
export function installPrivacy(enableNative: boolean) {
  if (isNative() && enableNative) {
    PrivacyScreen.enable({ ios: { blurEffect: 'light' }, android: { dimBackground: false, privacyModeOnActivityHidden: 'splash' } }).catch(() => {});
  }
  App.addListener('appStateChange', ({ isActive }) => {
    if (authInFlight) return;
    if (!isActive) {
      hiddenAt = Date.now();
      showCover();
      void S.flush();
      return;
    }
    const away = hiddenAt ? Date.now() - hiddenAt : 0;
    hiddenAt = 0;
    if (S.prefs.lock && away >= RELOCK_MS) void lockNow();
    else hideCover();
  });
  App.addListener('pause', () => void S.flush());
}
