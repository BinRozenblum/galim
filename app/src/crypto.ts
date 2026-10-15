// AES-256-GCM via WebCrypto (the OS's own crypto). No custom primitives.

const subtle = () => globalThis.crypto.subtle;

export function toB64(bytes: Uint8Array): string {
  let s = '';
  const CH = 0x8000;
  for (let i = 0; i < bytes.length; i += CH) s += String.fromCharCode(...bytes.subarray(i, i + CH));
  return btoa(s);
}

export function fromB64(b64: string): Uint8Array<ArrayBuffer> {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export function randomBytes(n: number): Uint8Array<ArrayBuffer> {
  const a = new Uint8Array(n);
  globalThis.crypto.getRandomValues(a);
  return a;
}

export async function importAesKey(raw: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  return subtle().importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export interface Sealed {
  iv: string;
  ct: string;
}

export async function seal(key: CryptoKey, plaintext: string, aad?: string): Promise<Sealed> {
  const iv = randomBytes(12);
  const params: AesGcmParams = { name: 'AES-GCM', iv };
  if (aad) params.additionalData = new TextEncoder().encode(aad);
  const ct = new Uint8Array(await subtle().encrypt(params, key, new TextEncoder().encode(plaintext)));
  return { iv: toB64(iv), ct: toB64(ct) };
}

export async function open(key: CryptoKey, s: Sealed, aad?: string): Promise<string> {
  const params: AesGcmParams = { name: 'AES-GCM', iv: fromB64(s.iv) };
  if (aad) params.additionalData = new TextEncoder().encode(aad);
  const pt = await subtle().decrypt(params, key, fromB64(s.ct));
  return new TextDecoder().decode(pt);
}

export const BACKUP_ITERATIONS = 310_000;

export async function deriveKey(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<CryptoKey> {
  const base = await subtle().importKey('raw', new TextEncoder().encode(password.normalize('NFC')), 'PBKDF2', false, ['deriveKey']);
  return subtle().deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}
