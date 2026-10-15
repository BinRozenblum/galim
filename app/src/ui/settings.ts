import { Share } from '@capacitor/share';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { backupFileName, BackupError, exportBackup, importBackup } from '../backup';
import { fromB64 } from '../crypto';
import { todayKey } from '../dates';
import { t } from '../i18n';
import { authenticate, deviceCanLock } from '../lock';
import { emptyData, mergeData, type Data } from '../model';
import { cancelReminder, scheduleReminder } from '../notify';
import { clearPrefs, isNative, removeTemp, savePrefs, writeTemp } from '../platform';
import { S } from '../state';
import { openAbout } from './about';
import { confirmDialog, closeAllSheets, h, I, sheet, svg, toast } from './dom';
import { openTimePicker } from './timepicker';

type RowOpts = { icon: string; tint: [string, string]; title: string; sub?: string; end?: HTMLElement; onClick?: () => void; danger?: boolean };

function row(o: RowOpts): HTMLElement {
  const tag = o.onClick ? 'button' : 'div';
  const r = h(tag as 'div', { class: 'set' + (o.danger ? ' danger' : ''), ...(o.onClick ? { type: 'button' } : {}) });
  const ico = h('span', { class: 'ico', style: `background:${o.tint[0]};color:${o.tint[1]}` }, svg(o.icon));
  r.append(ico, h('div', { class: 'st' }, h('b', null, o.title), o.sub ? h('small', null, o.sub) : null));
  if (o.end) r.append(o.end);
  if (o.onClick) r.addEventListener('click', o.onClick);
  return r;
}

let onWipe: () => void = () => {};
export function setWipeHandler(fn: () => void) {
  onWipe = fn;
}

/** All settings rows. `rerender` is called after a change that alters a row. */
export function settingsRows(rerender: () => void): HTMLElement[] {
  const p = S.prefs;
  const lockTog = h('span', { class: 'tog' + (p.lock ? ' on' : ''), role: 'switch', 'aria-checked': String(p.lock) });
  const remVal = h('span', { class: 'val num' + (p.reminder ? '' : ' off') }, p.reminder ? p.remindAt : t('reminderOff'));
  return [
    row({ icon: I.device, tint: ['#E3F3EE', '#1F8A6E'], title: t('privacyOnly'), sub: t('privacyOnlySub') }),
    row({
      icon: I.lock,
      tint: ['#EFE8FD', '#6D28D9'],
      title: t('lock'),
      sub: t('lockSub'),
      end: lockTog,
      onClick: async () => {
        if (S.prefs.lock) {
          if (!(await authenticate())) return;
          S.prefs.lock = false;
        } else {
          if (!(await deviceCanLock())) {
            toast(t('lockNoDevice'));
            return;
          }
          if (!(await authenticate())) return;
          S.prefs.lock = true;
        }
        await savePrefs(S.prefs);
        rerender();
      },
    }),
    row({
      icon: I.clock,
      tint: ['#FFF2E2', '#C27A2C'],
      title: t('reminder'),
      sub: t('reminderSub'),
      end: remVal,
      onClick: () => void editReminder(rerender),
    }),
    row({ icon: I.download, tint: ['#EEF0FB', '#5B6FD1'], title: t('backup'), sub: t('backupSub'), onClick: openBackup }),
    row({ icon: I.upload, tint: ['#EEF0FB', '#5B6FD1'], title: t('restore'), sub: t('restoreSub'), onClick: openRestore }),
    row({
      icon: I.user,
      tint: ['#F3EEF9', '#7A5BB5'],
      title: t('myName'),
      sub: S.data.name ? S.data.name : t('myNameSub'),
      onClick: () => editName(rerender),
    }),
    row({ icon: I.info, tint: ['#F3EEF9', '#7A5BB5'], title: t('about'), sub: t('aboutSub'), onClick: openAbout }),
    row({ icon: I.trash, tint: ['#FBE9EF', '#B4324F'], title: t('wipe'), sub: t('wipeSub'), danger: true, onClick: () => void wipe() }),
  ];
}

export async function editReminder(rerender: () => void) {
  const r = await openTimePicker(S.prefs.remindAt, { allowOff: S.prefs.reminder });
  if (r === null) return;
  if (r === 'off') {
    S.prefs.reminder = false;
    await cancelReminder();
  } else {
    const res = await scheduleReminder(r);
    if (res !== 'ok') {
      toast(res === 'denied' ? t('reminderDenied') : t('error'));
      S.prefs.reminder = false;
    } else {
      S.prefs.reminder = true;
      S.prefs.remindAt = r;
    }
  }
  await savePrefs(S.prefs);
  rerender();
}

export function openSettings() {
  const s = sheet({ title: t('settings'), full: true, closeLabel: t('close') });
  const card = h('div', { class: 'card set-card', style: 'margin-top:4px' });
  const render = () => card.replaceChildren(...settingsRows(render));
  render();
  s.body.append(card);
  const off = S.on(render);
  s.closed.then(() => off());
}

function editName(rerender: () => void) {
  const s = sheet({ title: t('myName'), closeLabel: t('close') });
  const i = h('input', { class: 'input', maxlength: 80, placeholder: t('myNamePh'), autocomplete: 'name' }) as HTMLInputElement;
  i.value = S.data.name;
  const save = h('button', { class: 'btn pri', type: 'button' }, t('save'));
  save.addEventListener('click', () => {
    S.data.name = i.value.trim().slice(0, 80);
    S.changed();
    rerender();
    s.close();
  });
  s.body.append(h('p', { class: 'sp' }, t('myNameSub')), i, h('div', { class: 'sheet-actions' }, save));
  setTimeout(() => i.focus(), 260);
}

// ---------- backup ----------

function passField(label: string, auto: string) {
  const i = h('input', { class: 'input', type: 'password', autocomplete: auto, dir: 'ltr', maxlength: 200 }) as HTMLInputElement;
  return { el: h('label', { class: 'field' }, h('span', { class: 'fl' }, label), i), i };
}

export function openBackup() {
  const s = sheet({ title: t('bkTitle'), closeLabel: t('close') });
  const p1 = passField(t('bkPass'), 'new-password');
  const p2 = passField(t('bkPass2'), 'new-password');
  const err = h('div', { class: 'err-msg' });
  const go = h('button', { class: 'btn pri wide', type: 'button' }, svg(I.download), t('bkMake'));
  s.body.append(h('p', { class: 'sp' }, t('bkText')), p1.el, p2.el, h('div', { class: 'hint', style: 'margin:-6px 0 6px' }, t('bkShort')), err, go);
  go.addEventListener('click', async () => {
    err.textContent = '';
    if (p1.i.value.length < 6) {
      err.textContent = t('bkShort');
      return;
    }
    if (p1.i.value !== p2.i.value) {
      err.textContent = t('bkMismatch');
      return;
    }
    go.disabled = true;
    go.textContent = t('bkWorking');
    const name = backupFileName(todayKey());
    try {
      await S.flush();
      const text = await exportBackup(S.data, p1.i.value);
      p1.i.value = p2.i.value = '';
      await shareText(name, text);
      s.body.replaceChildren(
        h('p', { class: 'ok-msg', style: 'font-size:17px;margin:6px 0 8px' }, t('bkDone')),
        h('p', { class: 'sp' }, t('bkRemember')),
        (() => {
          const again = h('button', { class: 'btn wide', type: 'button' }, svg(I.share), t('send'));
          again.addEventListener('click', () => void shareText(name, text));
          return again;
        })(),
      );
    } catch (e) {
      console.error(e);
      err.textContent = t('error');
      go.disabled = false;
      go.textContent = t('bkMake');
    }
  });
}

async function shareText(name: string, text: string) {
  if (!isNative()) {
    const a = h('a', { href: URL.createObjectURL(new Blob([text], { type: 'application/octet-stream' })), download: name });
    a.click();
    return;
  }
  const uri = await writeTemp(name, text, false);
  try {
    await Share.share({ title: name, files: [uri] });
  } catch {
    /* user closed the share sheet */
  } finally {
    setTimeout(() => void removeTemp(name), 60_000);
  }
}

async function pickBackupText(): Promise<string | null> {
  if (isNative()) {
    try {
      const r = await FilePicker.pickFiles({ limit: 1, readData: true });
      const f = r.files[0];
      if (!f?.data) return null;
      return new TextDecoder().decode(fromB64(f.data));
    } catch {
      return null;
    }
  }
  return new Promise((res) => {
    const i = h('input', { type: 'file' }) as HTMLInputElement;
    i.addEventListener('change', async () => res(i.files?.[0] ? await i.files[0].text() : null));
    i.click();
  });
}

export function openRestore() {
  const s = sheet({ title: t('rsTitle'), closeLabel: t('close') });
  let fileText: string | null = null;
  const pick = h('button', { class: 'btn wide', type: 'button' }, svg(I.upload), t('rsPick'));
  const fileOk = h('div', { class: 'ok-msg', style: 'margin:8px 0' });
  const pass = passField(t('rsPass'), 'current-password');
  const err = h('div', { class: 'err-msg' });
  const openBtn = h('button', { class: 'btn pri wide', type: 'button' }, t('rsOpen'));
  const step2 = h('div', { style: 'display:none' }, pass.el, err, openBtn);
  s.body.append(h('p', { class: 'sp' }, t('rsText')), pick, fileOk, step2);

  pick.addEventListener('click', async () => {
    const txt = await pickBackupText();
    if (!txt) return;
    try {
      const j = JSON.parse(txt);
      if (j?.app !== 'galim') throw 0;
    } catch {
      fileOk.textContent = '';
      err.textContent = t('rsBadFile');
      step2.style.display = '';
      openBtn.style.display = 'none';
      pass.el.style.display = 'none';
      return;
    }
    fileText = txt;
    fileOk.textContent = '✓ ' + t('rsPick');
    err.textContent = '';
    step2.style.display = '';
    openBtn.style.display = '';
    pass.el.style.display = '';
    pass.i.focus();
  });

  openBtn.addEventListener('click', async () => {
    if (!fileText) return;
    err.textContent = '';
    openBtn.disabled = true;
    openBtn.textContent = t('bkWorking');
    let data: Data;
    try {
      data = await importBackup(fileText, pass.i.value);
    } catch (e) {
      err.textContent = e instanceof BackupError && e.kind === 'password' ? t('rsBadPass') : t('rsBadFile');
      openBtn.disabled = false;
      openBtn.textContent = t('rsOpen');
      return;
    }
    pass.i.blur();
    const n = Object.keys(data.entries).length;
    const merge = h('button', { class: 'set', type: 'button' }, h('div', { class: 'st' }, h('b', null, t('rsMerge')), h('small', null, t('rsMergeSub'))));
    const replace = h('button', { class: 'set danger', type: 'button' }, h('div', { class: 'st' }, h('b', null, t('rsReplace')), h('small', null, t('rsReplaceSub'))));
    merge.addEventListener('click', async () => {
      S.data = mergeData(S.data, data);
      await done();
    });
    replace.addEventListener('click', async () => {
      const ok = await confirmDialog({ title: t('rsReplaceConfirm'), ok: t('rsReplace'), cancel: t('cancel'), danger: true });
      if (!ok) return;
      S.data = data;
      await done();
    });
    s.body.replaceChildren(h('p', { class: 'sp', style: 'font-weight:700' }, t('rsFound', { n })), h('div', { class: 'card set-card', style: 'margin-top:0' }, merge, replace));
  });

  async function done() {
    S.changed();
    await S.flush();
    s.close();
    toast(t('rsDone'));
  }
}

async function wipe() {
  const a = await confirmDialog({ title: t('wipeQ1'), text: t('wipeT1'), ok: t('wipeContinue'), cancel: t('cancel'), danger: true });
  if (!a) return;
  const b = await confirmDialog({ title: t('wipeQ2'), text: t('wipeT2'), ok: t('wipeFinal'), cancel: t('cancel'), danger: true });
  if (!b) return;
  await cancelReminder();
  await S.vault.wipe();
  await clearPrefs();
  S.data = emptyData();
  S.prefs = { onboarded: false, lock: false, reminder: false, remindAt: '21:00', lang: S.prefs.lang };
  closeAllSheets();
  onWipe();
}
