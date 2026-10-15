import { isKey, type DayKey } from './dates';
import { isMood, TAGS, type Mood, type Tag } from './levels';

export const SCHEMA_VERSION = 1;
export const NOTE_MAX = 1000;

export interface Entry {
  mood: Mood | null;
  sleep: number | null; // hours, 0..24 in 0.5 steps
  meds: boolean | null;
  energy: number | null; // 1..5
  tags: Tag[];
  note: string;
  /** ms epoch of last change; used when merging backups */
  t: number;
}

export interface PlanItem {
  id: string;
  text: string;
}

export interface Person {
  id: string;
  name: string;
  relation: string;
  phone: string;
}

export interface Plan {
  signs: PlanItem[];
  helps: PlanItem[];
  people: Person[];
}

export interface Data {
  v: number;
  entries: Record<DayKey, Entry>;
  plan: Plan;
  /** optional name printed on the doctor summary */
  name: string;
}

export function emptyData(): Data {
  return { v: SCHEMA_VERSION, entries: {}, plan: { signs: [], helps: [], people: [] }, name: '' };
}

export function emptyEntry(): Entry {
  return { mood: null, sleep: null, meds: null, energy: null, tags: [], note: '', t: 0 };
}

export function isEmptyEntry(e: Entry | undefined): boolean {
  if (!e) return true;
  return e.mood === null && e.sleep === null && e.meds === null && e.energy === null && e.tags.length === 0 && !e.note.trim();
}

export function uid(): string {
  const a = new Uint8Array(8);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');

export function cleanSleep(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  const r = Math.round(v * 2) / 2;
  return r < 0 || r > 24 ? null : r;
}

export function cleanEntry(raw: unknown): Entry | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const e: Entry = {
    mood: isMood(r.mood) ? r.mood : null,
    sleep: cleanSleep(r.sleep),
    meds: typeof r.meds === 'boolean' ? r.meds : null,
    energy: typeof r.energy === 'number' && Number.isInteger(r.energy) && r.energy >= 1 && r.energy <= 5 ? r.energy : null,
    tags: Array.isArray(r.tags) ? (TAGS.filter((t) => (r.tags as unknown[]).includes(t)) as Tag[]) : [],
    note: str(r.note, NOTE_MAX),
    t: typeof r.t === 'number' && Number.isFinite(r.t) ? r.t : 0,
  };
  return isEmptyEntry(e) ? null : e;
}

function cleanItems(raw: unknown): PlanItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => ({ id: str(x?.id, 40) || uid(), text: str(x?.text, 300).trim() }))
    .filter((x) => x.text)
    .slice(0, 100);
}

function cleanPeople(raw: unknown): Person[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => ({
      id: str(x?.id, 40) || uid(),
      name: str(x?.name, 80).trim(),
      relation: str(x?.relation, 80).trim(),
      phone: str(x?.phone, 40).trim(),
    }))
    .filter((x) => x.name || x.phone)
    .slice(0, 50);
}

/**
 * Validates anything that came from disk or from a backup file and upgrades
 * older schema versions. Unknown fields are dropped; nothing throws.
 */
export function normalizeData(raw: unknown): Data {
  const d = emptyData();
  if (!raw || typeof raw !== 'object') return d;
  const r = raw as Record<string, unknown>;
  // Migrations go here, keyed on r.v (only v1 exists so far).
  const entries = r.entries && typeof r.entries === 'object' ? (r.entries as Record<string, unknown>) : {};
  for (const [k, v] of Object.entries(entries)) {
    if (!isKey(k)) continue;
    const e = cleanEntry(v);
    if (e) d.entries[k] = e;
  }
  const p = (r.plan && typeof r.plan === 'object' ? r.plan : {}) as Record<string, unknown>;
  d.plan = { signs: cleanItems(p.signs), helps: cleanItems(p.helps), people: cleanPeople(p.people) };
  d.name = str(r.name, 80);
  return d;
}

/** Merge `incoming` into `base`: per day the most recently changed entry wins; plan lists are united. */
export function mergeData(base: Data, incoming: Data): Data {
  const out: Data = JSON.parse(JSON.stringify(base));
  for (const [k, e] of Object.entries(incoming.entries)) {
    const cur = out.entries[k];
    if (!cur || e.t > cur.t) out.entries[k] = { ...e, tags: [...e.tags] };
  }
  const uniteItems = (a: PlanItem[], b: PlanItem[]) => {
    const seen = new Set(a.map((x) => x.text.trim()));
    return [...a, ...b.filter((x) => !seen.has(x.text.trim())).map((x) => ({ ...x, id: a.some((y) => y.id === x.id) ? uid() : x.id }))];
  };
  out.plan.signs = uniteItems(out.plan.signs, incoming.plan.signs);
  out.plan.helps = uniteItems(out.plan.helps, incoming.plan.helps);
  const seenP = new Set(out.plan.people.map((p) => p.name + '|' + p.phone));
  for (const p of incoming.plan.people) {
    if (!seenP.has(p.name + '|' + p.phone)) out.plan.people.push({ ...p, id: out.plan.people.some((y) => y.id === p.id) ? uid() : p.id });
  }
  if (!out.name && incoming.name) out.name = incoming.name;
  return out;
}
