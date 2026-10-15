import { BACKUP_ITERATIONS, deriveKey, fromB64, open, randomBytes, seal, toB64 } from './crypto';
import { normalizeData, type Data } from './model';

/** On-disk format of a .galim backup file (JSON, everything sensitive encrypted). */
export interface BackupFile {
  app: 'galim';
  fmt: 1;
  kdf: 'PBKDF2-SHA256';
  iter: number;
  salt: string;
  iv: string;
  ct: string;
}

const AAD = 'galim-backup-v1';

export async function exportBackup(data: Data, password: string, iterations = BACKUP_ITERATIONS): Promise<string> {
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt, iterations);
  const s = await seal(key, JSON.stringify({ ...data, exportedAt: Date.now() }), AAD);
  const file: BackupFile = { app: 'galim', fmt: 1, kdf: 'PBKDF2-SHA256', iter: iterations, salt: toB64(salt), iv: s.iv, ct: s.ct };
  return JSON.stringify(file);
}

export class BackupError extends Error {
  constructor(public kind: 'format' | 'password') {
    super(kind);
  }
}

export function parseBackup(text: string): BackupFile {
  let f: Partial<BackupFile>;
  try {
    f = JSON.parse(text);
  } catch {
    throw new BackupError('format');
  }
  if (!f || f.app !== 'galim' || f.fmt !== 1 || typeof f.salt !== 'string' || typeof f.iv !== 'string' || typeof f.ct !== 'string') {
    throw new BackupError('format');
  }
  const iter = typeof f.iter === 'number' && f.iter >= 100_000 && f.iter <= 10_000_000 ? f.iter : BACKUP_ITERATIONS;
  return { app: 'galim', fmt: 1, kdf: 'PBKDF2-SHA256', iter, salt: f.salt, iv: f.iv, ct: f.ct };
}

export async function importBackup(text: string, password: string): Promise<Data> {
  const f = parseBackup(text);
  const key = await deriveKey(password, fromB64(f.salt), f.iter);
  let plain: string;
  try {
    plain = await open(key, { iv: f.iv, ct: f.ct }, AAD);
  } catch {
    throw new BackupError('password');
  }
  try {
    return normalizeData(JSON.parse(plain));
  } catch {
    throw new BackupError('format');
  }
}

export function backupFileName(today: string): string {
  return `galim-backup-${today}.galim`;
}
