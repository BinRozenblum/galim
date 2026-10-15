import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { KeychainAccess, SecureStorage } from '@aparajita/capacitor-secure-storage';
import type { Backend } from './vault';

export const isNative = () => Capacitor.isNativePlatform();
export const platform = () => Capacitor.getPlatform();

// iOS: Library/NoCloud is excluded from iCloud/iTunes backups ("everything
// stays on this phone"). Android: internal app storage, allowBackup=false.
const dataDir = () => (platform() === 'ios' ? Directory.LibraryNoCloud : Directory.Data);
const KEY_NAME = 'datakey';

let secureReady: Promise<void> | null = null;
function secure() {
  secureReady ??= (async () => {
    await SecureStorage.setKeyPrefix('galim_');
    if (platform() === 'ios') {
      await SecureStorage.setSynchronize(false);
      await SecureStorage.setDefaultKeychainAccess(KeychainAccess.afterFirstUnlockThisDeviceOnly);
    }
  })();
  return secureReady;
}

export const nativeBackend: Backend = {
  async readKey() {
    await secure();
    const v = await SecureStorage.get(KEY_NAME, false);
    return typeof v === 'string' && v ? v : null;
  },
  async writeKey(b64) {
    await secure();
    await SecureStorage.set(KEY_NAME, b64, false);
  },
  async deleteKey() {
    await secure();
    await SecureStorage.remove(KEY_NAME);
  },
  async readFile(name) {
    try {
      const r = await Filesystem.readFile({ path: name, directory: dataDir(), encoding: Encoding.UTF8 });
      return typeof r.data === 'string' ? r.data : await (r.data as Blob).text();
    } catch {
      return null;
    }
  },
  async writeFile(name, text) {
    await Filesystem.writeFile({ path: name, directory: dataDir(), data: text, encoding: Encoding.UTF8, recursive: true });
  },
  async deleteFile(name) {
    await Filesystem.deleteFile({ path: name, directory: dataDir() });
  },
};

// ---- non-sensitive settings (needed before the vault is unlocked) ----

export interface Prefs {
  onboarded: boolean;
  lock: boolean;
  reminder: boolean;
  remindAt: string; // "HH:MM"
  lang: '' | 'he' | 'en'; // '' = follow device (only dev scenes override)
}

const DEFAULT_PREFS: Prefs = { onboarded: false, lock: false, reminder: false, remindAt: '21:00', lang: '' };

export async function loadPrefs(): Promise<Prefs> {
  try {
    const { value } = await Preferences.get({ key: 'galim.prefs' });
    if (!value) return { ...DEFAULT_PREFS };
    const p = JSON.parse(value) as Partial<Prefs>;
    const at = typeof p.remindAt === 'string' && /^\d{2}:\d{2}$/.test(p.remindAt) ? p.remindAt : DEFAULT_PREFS.remindAt;
    return {
      onboarded: !!p.onboarded,
      lock: !!p.lock,
      reminder: !!p.reminder,
      remindAt: at,
      lang: p.lang === 'he' || p.lang === 'en' ? p.lang : '',
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export async function savePrefs(p: Prefs): Promise<void> {
  await Preferences.set({ key: 'galim.prefs', value: JSON.stringify(p) });
}

export async function clearPrefs(): Promise<void> {
  await Preferences.remove({ key: 'galim.prefs' });
}

// ---- temp files for sharing (cache dir, removed after use) ----

export async function writeTemp(name: string, data: string, base64: boolean): Promise<string> {
  const r = await Filesystem.writeFile({
    path: name,
    directory: Directory.Cache,
    data,
    ...(base64 ? {} : { encoding: Encoding.UTF8 }),
    recursive: true,
  });
  return r.uri;
}

export async function removeTemp(name: string): Promise<void> {
  await Filesystem.deleteFile({ path: name, directory: Directory.Cache }).catch(() => {});
}
