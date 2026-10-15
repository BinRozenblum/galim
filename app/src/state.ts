import { todayKey, type DayKey } from './dates';
import { emptyData, emptyEntry, isEmptyEntry, type Data, type Entry } from './model';
import type { Prefs } from './platform';
import { Vault } from './vault';

export type Tab = 'today' | 'trends' | 'plan';

type Listener = () => void;

class AppState {
  data: Data = emptyData();
  prefs!: Prefs;
  vault!: Vault;
  tab: Tab = 'today';
  day: DayKey = todayKey();
  trendsRange = 30;
  doctorRange = 60;
  private listeners = new Set<Listener>();
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private savedListeners = new Set<(ok: boolean) => void>();

  on(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  emit() {
    this.listeners.forEach((f) => f());
  }
  onSaved(fn: (ok: boolean) => void) {
    this.savedListeners.add(fn);
    return () => this.savedListeners.delete(fn);
  }

  entry(day: DayKey = this.day): Entry {
    return this.data.entries[day] ?? emptyEntry();
  }

  /** Apply a change to a day's entry and save (debounced, encrypted). */
  setEntry(day: DayKey, patch: Partial<Entry>) {
    const next: Entry = { ...this.entry(day), ...patch, t: Date.now() };
    if (isEmptyEntry(next)) delete this.data.entries[day];
    else this.data.entries[day] = next;
    this.changed();
  }

  /** Mark data dirty: schedules a save and notifies views. */
  changed(render = true) {
    if (render) this.emit();
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => void this.flush(), 250);
  }

  async flush(): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    try {
      await this.vault.save(this.data);
      this.savedListeners.forEach((f) => f(true));
    } catch (e) {
      console.error('save failed', e);
      this.savedListeners.forEach((f) => f(false));
      // retry once a bit later; data stays in memory meanwhile
      this.saveTimer = setTimeout(() => void this.flush(), 2000);
    }
  }
}

export const S = new AppState();
