import { describe, expect, it } from 'vitest';
import { Vault, type Backend } from '../src/vault';
import { emptyData, mergeData, normalizeData, type Data } from '../src/model';
import { BackupError, exportBackup, importBackup, parseBackup } from '../src/backup';

function memBackend() {
  const files = new Map<string, string>();
  let key: string | null = null;
  const be: Backend & { files: Map<string, string>; setKey: (k: string | null) => void } = {
    files,
    setKey: (k) => (key = k),
    readKey: async () => key,
    writeKey: async (k) => void (key = k),
    deleteKey: async () => void (key = null),
    readFile: async (n) => files.get(n) ?? null,
    writeFile: async (n, t) => void files.set(n, t),
    deleteFile: async (n) => void files.delete(n),
  };
  return be;
}

function sample(): Data {
  const d = emptyData();
  d.entries['2026-10-14'] = { mood: 2, sleep: 5.5, meds: true, energy: 4, tags: ['racing'], note: 'שורה סודית', t: 100 };
  d.entries['2026-10-13'] = { mood: -1, sleep: 8, meds: false, energy: 2, tags: [], note: '', t: 50 };
  d.plan.people.push({ id: 'p1', name: 'רונית', relation: 'אחותי', phone: '050' });
  d.plan.signs.push({ id: 's1', text: 'פחות שינה' });
  d.name = 'Test';
  return d;
}

describe('encrypted vault', () => {
  it('round-trips and never stores plaintext', async () => {
    const be = memBackend();
    const v = new Vault(be);
    expect((await v.load()).ok).toBe(true);
    await v.save(sample());
    for (const txt of be.files.values()) {
      expect(txt).not.toContain('שורה');
      expect(txt).not.toContain('Test');
      expect(txt).not.toContain('mood');
    }
    const r = await new Vault(be).load();
    expect(r.ok && r.data).toEqual(sample());
  });

  it('survives a torn write of the newest slot', async () => {
    const be = memBackend();
    const v = new Vault(be);
    await v.load();
    const a = sample();
    await v.save(a); // seq 1 -> slot b
    const b = sample();
    b.name = 'newer';
    await v.save(b); // seq 2 -> slot a
    be.files.set('galim-a.dat', be.files.get('galim-a.dat')!.slice(0, 40)); // crash mid-write
    const r = await new Vault(be).load();
    expect(r.ok && r.data.name).toBe('Test');
    // and the next save goes past the damaged one
    const v2 = new Vault(be);
    await v2.load();
    await v2.save(b);
    const r2 = await new Vault(be).load();
    expect(r2.ok && r2.data.name).toBe('newer');
  });

  it('reports unreadable data instead of overwriting it when the key is gone', async () => {
    const be = memBackend();
    const v = new Vault(be);
    await v.load();
    await v.save(sample());
    be.setKey(null);
    const r = await new Vault(be).load();
    expect(r.ok).toBe(false);
    expect(be.files.size).toBe(1);
  });

  it('serialises concurrent saves', async () => {
    const be = memBackend();
    const v = new Vault(be);
    await v.load();
    const d = sample();
    await Promise.all([1, 2, 3, 4, 5].map((i) => v.save({ ...d, name: 'n' + i })));
    const r = await new Vault(be).load();
    expect(r.ok && r.data.name).toBe('n5');
  });

  it('wipe removes key and files', async () => {
    const be = memBackend();
    const v = new Vault(be);
    await v.load();
    await v.save(sample());
    await v.wipe();
    expect(be.files.size).toBe(0);
    expect(await be.readKey()).toBeNull();
  });
});

describe('backup', () => {
  it('exports and imports with the password', async () => {
    const txt = await exportBackup(sample(), 'secret-pass', 100_000);
    expect(txt).not.toContain('רונית');
    const f = parseBackup(txt);
    expect(f.iter).toBe(100_000);
    expect(await importBackup(txt, 'secret-pass')).toEqual(sample());
  });
  it('uses at least 310k PBKDF2 iterations by default', async () => {
    const txt = await exportBackup(sample(), 'x123456');
    expect(JSON.parse(txt).iter).toBeGreaterThanOrEqual(310_000);
  });
  it('rejects a wrong password and a foreign file', async () => {
    const txt = await exportBackup(sample(), 'secret-pass', 100_000);
    await expect(importBackup(txt, 'wrong')).rejects.toEqual(new BackupError('password'));
    await expect(importBackup('{"hello":1}', 'x')).rejects.toEqual(new BackupError('format'));
    await expect(importBackup('not json', 'x')).rejects.toEqual(new BackupError('format'));
  });
  it('merge keeps the newer day and unites the plan', () => {
    const base = sample();
    const inc = sample();
    inc.entries['2026-10-14'] = { ...inc.entries['2026-10-14'], mood: 0, t: 50 }; // older: ignored
    inc.entries['2026-10-13'] = { ...inc.entries['2026-10-13'], mood: 1, t: 999 }; // newer: wins
    inc.entries['2026-09-01'] = { mood: 0, sleep: null, meds: null, energy: null, tags: [], note: '', t: 1 };
    inc.plan.signs.push({ id: 's9', text: 'סימן חדש' });
    inc.plan.people.push({ id: 'p1', name: 'דני', relation: '', phone: '052' });
    const m = mergeData(base, inc);
    expect(m.entries['2026-10-14'].mood).toBe(2);
    expect(m.entries['2026-10-13'].mood).toBe(1);
    expect(m.entries['2026-09-01']).toBeDefined();
    expect(m.plan.signs.map((s) => s.text)).toEqual(['פחות שינה', 'סימן חדש']);
    expect(m.plan.people).toHaveLength(2);
    expect(new Set(m.plan.people.map((p) => p.id)).size).toBe(2);
  });
  it('normalizes hostile input', () => {
    const d = normalizeData({
      entries: { 'bad-key': { mood: 1 }, '2026-10-14': { mood: 9, sleep: 30, energy: 7, tags: ['racing', 'x'], note: 'a'.repeat(5000), meds: 'yes' } },
      plan: { people: [{ name: 'a' }, {}], signs: [{ text: '' }] },
    });
    expect(Object.keys(d.entries)).toEqual(['2026-10-14']);
    const e = d.entries['2026-10-14'];
    expect(e.mood).toBeNull();
    expect(e.sleep).toBeNull();
    expect(e.energy).toBeNull();
    expect(e.meds).toBeNull();
    expect(e.tags).toEqual(['racing']);
    expect(e.note).toHaveLength(1000);
    expect(d.plan.people).toHaveLength(1);
    expect(d.plan.signs).toHaveLength(0);
  });
});
