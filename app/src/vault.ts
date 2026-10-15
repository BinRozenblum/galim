// Encrypted, crash-safe persistence of the whole Data object.
//
// - A random 256-bit AES key lives in the OS key store (iOS Keychain /
//   Android Keystore) via the backend.
// - Data is written as AES-GCM ciphertext to one of two slot files (A/B)
//   with an increasing sequence number. A write always goes to the slot that
//   does NOT hold the newest good copy, so a crash mid-write can only damage
//   the older copy; on load the newest slot that decrypts wins.

import { fromB64, importAesKey, open, randomBytes, seal, toB64 } from './crypto';
import { emptyData, normalizeData, type Data } from './model';

export interface Backend {
  readKey(): Promise<string | null>;
  writeKey(b64: string): Promise<void>;
  deleteKey(): Promise<void>;
  readFile(name: string): Promise<string | null>;
  writeFile(name: string, text: string): Promise<void>;
  deleteFile(name: string): Promise<void>;
}

const SLOTS = ['galim-a.dat', 'galim-b.dat'] as const;
const AAD = 'galim-data-v1';

interface SlotFile {
  seq: number;
  iv: string;
  ct: string;
}

export type LoadResult = { ok: true; data: Data } | { ok: false; reason: 'unreadable' };

export class Vault {
  private key: CryptoKey | null = null;
  private seq = 0;
  private chain: Promise<void> = Promise.resolve();

  constructor(private be: Backend) {}

  private async ensureKey(create: boolean): Promise<CryptoKey | null> {
    if (this.key) return this.key;
    let b64 = await this.be.readKey();
    if (!b64) {
      if (!create) return null;
      b64 = toB64(randomBytes(32));
      await this.be.writeKey(b64);
      // read back to be sure the key store really kept it before any data depends on it
      const check = await this.be.readKey();
      if (check !== b64) throw new Error('key store did not persist the key');
    }
    this.key = await importAesKey(fromB64(b64));
    return this.key;
  }

  private async readSlots(): Promise<SlotFile[]> {
    const out: SlotFile[] = [];
    for (const name of SLOTS) {
      try {
        const txt = await this.be.readFile(name);
        if (!txt) continue;
        const f = JSON.parse(txt) as SlotFile;
        if (typeof f.seq === 'number' && typeof f.iv === 'string' && typeof f.ct === 'string') out.push(f);
      } catch {
        /* damaged slot: ignore, the other one is still there */
      }
    }
    return out.sort((a, b) => b.seq - a.seq);
  }

  async load(): Promise<LoadResult> {
    const slots = await this.readSlots();
    if (!slots.length) {
      await this.ensureKey(true);
      this.seq = 0;
      return { ok: true, data: emptyData() };
    }
    const key = await this.ensureKey(false);
    if (!key) return { ok: false, reason: 'unreadable' };
    for (const s of slots) {
      try {
        const txt = await open(key, s, AAD);
        this.seq = slots[0].seq;
        return { ok: true, data: normalizeData(JSON.parse(txt)) };
      } catch {
        /* try the older slot */
      }
    }
    return { ok: false, reason: 'unreadable' };
  }

  /** Serialised: concurrent calls are queued so slots never interleave. */
  save(data: Data): Promise<void> {
    const snapshot = JSON.stringify(data);
    const run = async () => {
      const key = await this.ensureKey(true);
      const seq = this.seq + 1;
      const sealed = await seal(key!, snapshot, AAD);
      const file: SlotFile = { seq, iv: sealed.iv, ct: sealed.ct };
      await this.be.writeFile(SLOTS[seq % 2], JSON.stringify(file));
      this.seq = seq;
    };
    const p = this.chain.then(run, run);
    this.chain = p.catch(() => {});
    return p;
  }

  /** Removes all data files and the key. */
  async wipe(): Promise<void> {
    await this.chain.catch(() => {});
    for (const n of SLOTS) await this.be.deleteFile(n).catch(() => {});
    await this.be.deleteKey().catch(() => {});
    this.key = null;
    this.seq = 0;
  }
}
