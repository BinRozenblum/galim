// Dev scenes for simulator screenshots. Only bundled when VITE_DEV_SCENES=1.
// Commands come from tools/scenesrv.js (GET http://localhost:8913/cmd).
import { addDays, todayKey } from '../dates';
import { setLang, type Lang } from '../i18n';
import { lockNow } from '../lock';
import { emptyData } from '../model';
import { pendingReminders } from '../notify';
import { savePrefs } from '../platform';
import { S, type Tab } from '../state';
import { demoData } from './demo';
import { openCrisis } from '../ui/crisis';
import { openDatePicker } from '../ui/datepicker';
import { openDoctor } from '../ui/doctor';
import { openSettings, openBackup, openRestore } from '../ui/settings';
import { openAbout } from '../ui/about';
import { openTimePicker } from '../ui/timepicker';
import { confirmDialog } from '../ui/dom';
import { runOnboarding } from '../ui/onboarding';
import { renderReportPages, buildReportPdf } from '../report/report';
import { lastDays } from '../dates';
import { toB64 } from '../crypto';
import { exportBackup, importBackup } from '../backup';
import { t } from '../i18n';

interface Ctx {
  goTab: (t: Tab) => void;
  buildShell: () => void;
  closeAllSheets: () => void;
}

const SRV = 'http://localhost:8913';

function log(v: unknown) {
  fetch(SRV + '/log', { method: 'POST', body: typeof v === 'string' ? v : JSON.stringify(v) }).catch(() => {});
}

export function installScenes(ctx: Ctx) {
  const w = window as unknown as Record<string, unknown>;
  // auto-seed on first launch of a dev build (Android has no scene server)
  if (!Object.keys(S.data.entries).length) {
    S.data = demoData((document.documentElement.lang as Lang) || 'he');
    S.prefs.onboarded = true;
    void savePrefs(S.prefs);
    S.changed();
    ctx.buildShell();
  }

  const scene = async (raw: string) => {
    const u = new URL('https://dev/' + raw);
    const p = Object.fromEntries(u.searchParams);
    const name = u.pathname.slice(1);
    if (name !== 'eval' && name !== 'tap') {
      ctx.closeAllSheets();
      document.querySelectorAll('.ob').forEach((x) => x.remove());
    }
    if (p.lang) {
      S.prefs.lang = p.lang as Lang;
      await savePrefs(S.prefs);
      setLang(p.lang as Lang);
      ctx.buildShell();
    }
    switch (name) {
      case 'seed':
        S.data = demoData((p.lang as Lang) || (document.documentElement.lang as Lang));
        S.prefs.onboarded = true;
        S.changed();
        await S.flush();
        ctx.buildShell();
        break;
      case 'empty':
        S.data = emptyData();
        S.changed();
        await S.flush();
        ctx.buildShell();
        break;
      case 'tab':
        if (p.range) S.trendsRange = +p.range;
        if (p.drange) S.doctorRange = +p.drange;
        S.day = p.day ? addDays(todayKey(), +p.day) : S.day;
        ctx.goTab((p.t as Tab) || 'today');
        break;
      case 'onboarding': {
        document.querySelectorAll('.ob').forEach((x) => x.remove());
        void runOnboarding();
        const n = +(p.step || 0);
        for (let i = 0; i < n; i++) (document.querySelector('.ob-foot .btn') as HTMLElement)?.click();
        break;
      }
      case 'lock':
        void lockNow();
        break;
      case 'crisis':
        openCrisis();
        break;
      case 'note':
        ctx.goTab('today');
        (document.querySelector('.chip.note') as HTMLElement)?.click();
        break;
      case 'date':
        openDatePicker(S.day, () => {});
        break;
      case 'doctor':
        if (p.drange) S.doctorRange = +p.drange;
        openDoctor();
        break;
      case 'settings':
        openSettings();
        break;
      case 'time':
        void openTimePicker(S.prefs.remindAt, { allowOff: true });
        break;
      case 'backup':
        openBackup();
        break;
      case 'restore':
        openRestore();
        break;
      case 'about':
        openAbout();
        break;
      case 'wipe1':
        void confirmDialog({ title: t('wipeQ1'), text: t('wipeT1'), ok: t('wipeContinue'), cancel: t('cancel'), danger: true });
        break;
      case 'wipe2':
        void confirmDialog({ title: t('wipeQ2'), text: t('wipeT2'), ok: t('wipeFinal'), cancel: t('cancel'), danger: true });
        break;
      case 'tap':
        (document.querySelector(p.sel) as HTMLElement)?.click();
        break;
      case 'eval': {
        let out: unknown;
        try {
          out = await (0, eval)(p.code);
        } catch (e) {
          out = 'ERR ' + (e as Error).message;
        }
        log(out);
        break;
      }
    }
  };

  // QA helpers callable through eval
  w.__qa = {
    pending: () => pendingReminders(),
    pdf: async (n = 60) => {
      const pages = await renderReportPages(S.data, lastDays(todayKey(), n));
      const bytes = await buildReportPdf(pages);
      await fetch(SRV + '/file?name=sample-report.pdf', { method: 'POST', body: toB64(bytes) });
      return { pages: pages.length, bytes: bytes.length };
    },
    backupRoundtrip: async () => {
      const txt = await exportBackup(S.data, 'qa-pass-123');
      const back = await importBackup(txt, 'qa-pass-123');
      let wrong = 'no-error';
      try {
        await importBackup(txt, 'nope');
      } catch (e) {
        wrong = (e as Error).message;
      }
      return { size: txt.length, entries: Object.keys(back.entries).length, same: JSON.stringify(back.entries) === JSON.stringify(S.data.entries), wrongPassword: wrong };
    },
    reload: async () => {
      const r = await S.vault.load();
      return r.ok ? { ok: true, entries: Object.keys(r.data.entries).length, people: r.data.plan.people.length } : r;
    },
    setPref: async (k: string, v: unknown) => {
      (S.prefs as unknown as Record<string, unknown>)[k] = v;
      await savePrefs(S.prefs);
      return S.prefs;
    },
    state: () => ({ tab: S.tab, day: S.day, prefs: S.prefs, entries: Object.keys(S.data.entries).length, w: innerWidth, h: innerHeight }),
  };
  w.__scene = scene;

  let lastId: number | null = null;
  setInterval(async () => {
    try {
      const c = await (await fetch(SRV + '/cmd')).json();
      if (lastId === null) {
        lastId = c.id;
        return;
      }
      if (c.id !== lastId) {
        lastId = c.id;
        await scene(c.url);
      }
    } catch {
      /* no scene server */
    }
  }, 600);
}
