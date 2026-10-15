// Tiny DOM helpers + portaled bottom sheets / dialogs.

type Attrs = Record<string, string | number | boolean | null | undefined | EventListener> & { class?: string };
type Child = Node | string | null | undefined | false;

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs | null = null, ...children: (Child | Child[])[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === undefined || v === false) continue;
      if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v as EventListener);
      else if (k === 'html') el.innerHTML = String(v);
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, String(v));
    }
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c);
  }
  return el;
}

export function svg(markup: string, cls = 'ic'): HTMLElement {
  const s = document.createElement('span');
  s.className = cls;
  s.setAttribute('aria-hidden', 'true');
  s.innerHTML = markup;
  return s;
}

export const I = {
  today: '<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15.5" rx="1.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4M9 14.8l2.1 2.1 4-4.4"/></svg>',
  trends: '<svg viewBox="0 0 24 24"><path d="M3.5 20.5h17M6.5 16.5v-4M10.5 16.5v-9M14.5 16.5v-6M18.5 16.5V4.5"/></svg>',
  plan: '<svg viewBox="0 0 24 24"><path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z"/></svg>',
  doctor: '<svg viewBox="0 0 24 24"><path d="M14 3H7a1.5 1.5 0 0 0-1.5 1.5v15A1.5 1.5 0 0 0 7 21h10a1.5 1.5 0 0 0 1.5-1.5V7.5z"/><path d="M14 3v4.5h4.5M9 12.5h6M9 16h6"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M6 12h12M12 6v12"/></svg>',
  minus: '<svg viewBox="0 0 24 24"><path d="M6 12h12"/></svg>',
  phone: '<svg viewBox="0 0 24 24"><path d="M5 4.5h3.5l1.6 4-2.2 1.4a10 10 0 0 0 6.2 6.2l1.4-2.2 4 1.6V19a1.5 1.5 0 0 1-1.6 1.5A15.5 15.5 0 0 1 3.5 6.1 1.5 1.5 0 0 1 5 4.5z"/></svg>',
  device: '<svg viewBox="0 0 24 24"><rect x="6" y="2.5" width="12" height="19" rx="2"/><path d="M10.5 18.5h3"/></svg>',
  lock: '<svg viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="10" rx="1.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><path d="M12 7v5l3 2"/><circle cx="12" cy="12" r="8.5"/></svg>',
  download: '<svg viewBox="0 0 24 24"><path d="M12 3.5v11M7.5 10l4.5 4.5 4.5-4.5M4.5 19.5h15"/></svg>',
  upload: '<svg viewBox="0 0 24 24"><path d="M12 15V4M7.5 8.5L12 4l4.5 4.5M4.5 19.5h15"/></svg>',
  user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8.5" r="3.8"/><path d="M4.8 20c.9-3.6 3.8-5.6 7.2-5.6s6.3 2 7.2 5.6"/></svg>',
  info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.2"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10.5 11v5.5M13.5 11v5.5"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.5-2-3.4-2.3 1a7.4 7.4 0 0 0-2.6-1.5L14.2 2.6h-4l-.3 2.5a7.4 7.4 0 0 0-2.6 1.5l-2.3-1-2 3.4 2 1.5a7.6 7.6 0 0 0 0 3l-2 1.5 2 3.4 2.3-1a7.4 7.4 0 0 0 2.6 1.5l.3 2.5h4l.3-2.5a7.4 7.4 0 0 0 2.6-1.5l2.3 1 2-3.4z"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg>',
  chevR: '<svg viewBox="0 0 24 24"><path d="M9.5 5.5L16 12l-6.5 6.5"/></svg>',
  chevL: '<svg viewBox="0 0 24 24"><path d="M14.5 5.5L8 12l6.5 6.5"/></svg>',
  note: '<svg viewBox="0 0 24 24"><path d="M4.5 19.5l1-4L15.8 5.2a2 2 0 0 1 2.9 0l.1.1a2 2 0 0 1 0 2.9L8.5 18.5z"/></svg>',
  chat: '<svg viewBox="0 0 24 24"><path d="M4.5 18.5V7A2.5 2.5 0 0 1 7 4.5h10A2.5 2.5 0 0 1 19.5 7v7a2.5 2.5 0 0 1-2.5 2.5H8.5z"/></svg>',
  heart: '<svg viewBox="0 0 24 24"><path d="M12 19.5s-7-4.3-7-9.4A4 4 0 0 1 12 7.6a4 4 0 0 1 7 2.5c0 5.1-7 9.4-7 9.4z"/></svg>',
  share: '<svg viewBox="0 0 24 24"><path d="M12 15V4M7.5 8.5L12 4l4.5 4.5M6 12.5v6.5a1.5 1.5 0 0 0 1.5 1.5h9a1.5 1.5 0 0 0 1.5-1.5v-6.5"/></svg>',
  ext: '<svg viewBox="0 0 24 24"><path d="M14 4.5h5.5V10M19.5 4.5L11 13M17 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 4 18.5v-10A1.5 1.5 0 0 1 5.5 7H10"/></svg>',
  mail: '<svg viewBox="0 0 24 24"><rect x="3.5" y="5.5" width="17" height="13" rx="1.5"/><path d="M4 6.5l8 6 8-6"/></svg>',
  shield: '<svg viewBox="0 0 24 24"><path d="M12 3.5l7 2.5v5.5c0 4.4-3 7.7-7 9-4-1.3-7-4.6-7-9V6z"/><path d="M9 12l2.2 2.2L15.5 10"/></svg>',
};

/** The Galim wave mark (same drawing as the app icon). */
export function waveMark(size = 72): HTMLElement {
  const s = document.createElement('span');
  s.className = 'mark';
  s.setAttribute('aria-hidden', 'true');
  s.innerHTML = `<svg viewBox="0 0 1024 1024" width="${size}" height="${size}" style="fill:none;stroke-linecap:round;display:block">
    <defs><linearGradient id="mk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EDE4FF"/><stop offset="1" stop-color="#FCE6D8"/></linearGradient></defs>
    <rect width="1024" height="1024" rx="228" fill="url(#mk)"/><path d="M192 400 Q272 332 352 400 T512 400 T672 400 T832 400" stroke="#6D28D9" stroke-width="46"/><path d="M192 512 Q272 444 352 512 T512 512 T672 512 T832 512" stroke="#8E7CE0" stroke-width="46"/><path d="M192 624 Q272 556 352 624 T512 624 T672 624 T832 624" stroke="#5DB892" stroke-width="46"/></svg>`;
  return s;
}

// ---------- sheets (portaled to <body>) ----------

export interface Sheet {
  root: HTMLElement;
  panel: HTMLElement;
  body: HTMLElement;
  close: () => void;
  closed: Promise<void>;
}

const stack: Sheet[] = [];
let z = 1000;

export function openSheets() {
  return stack.length;
}

export function closeTopSheet(): boolean {
  const s = stack[stack.length - 1];
  if (!s) return false;
  s.close();
  return true;
}

export function closeAllSheets() {
  while (stack.length) stack[stack.length - 1].close();
}

export interface SheetOpts {
  title?: string;
  full?: boolean;
  cls?: string;
  dismissable?: boolean;
  onClose?: () => void;
  closeLabel?: string;
}

export function sheet(opts: SheetOpts = {}): Sheet {
  const root = h('div', { class: 'sheet-root' + (opts.full ? ' full' : '') + (opts.cls ? ' ' + opts.cls : '') });
  root.style.zIndex = String(++z);
  const scrim = h('div', { class: 'scrim' });
  const body = h('div', { class: 'sheet-body' });
  const panel = h('div', { class: 'panel', role: 'dialog', 'aria-modal': 'true' });
  if (opts.title !== undefined) {
    const closeBtn = h('button', { class: 'icon-btn sheet-x', type: 'button', 'aria-label': opts.closeLabel ?? 'x' }, svg(I.close));
    panel.append(h('div', { class: 'sheet-head' }, h('h2', null, opts.title), closeBtn));
    closeBtn.addEventListener('click', () => s.close());
  } else {
    panel.append(h('div', { class: 'grab' }));
  }
  panel.append(body);
  root.append(scrim, panel);
  document.body.append(root);
  let resolve!: () => void;
  const closed = new Promise<void>((r) => (resolve = r));
  let done = false;
  const s: Sheet = {
    root,
    panel,
    body,
    closed,
    close() {
      if (done) return;
      done = true;
      const i = stack.indexOf(s);
      if (i >= 0) stack.splice(i, 1);
      root.classList.remove('in');
      (document.activeElement as HTMLElement | null)?.blur?.();
      setTimeout(() => root.remove(), 220);
      opts.onClose?.();
      resolve();
    },
  };
  if (opts.dismissable !== false) scrim.addEventListener('click', () => s.close());
  stack.push(s);
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('in')));
  return s;
}

/** Centered confirm dialog. Resolves true on confirm. */
export function confirmDialog(o: { title: string; text?: string; ok: string; cancel: string; danger?: boolean }): Promise<boolean> {
  return new Promise((res) => {
    const s = sheet({ cls: 'dialog' });
    let answer = false;
    s.closed.then(() => res(answer));
    const okBtn = h('button', { class: 'btn ' + (o.danger ? 'danger' : 'pri'), type: 'button' }, o.ok);
    const noBtn = h('button', { class: 'btn', type: 'button' }, o.cancel);
    okBtn.addEventListener('click', () => {
      answer = true;
      s.close();
    });
    noBtn.addEventListener('click', () => s.close());
    s.body.append(h('h2', { class: 'dlg-t' }, o.title));
    if (o.text) s.body.append(h('p', { class: 'dlg-p' }, o.text));
    s.body.append(h('div', { class: 'dlg-btns' }, noBtn, okBtn));
  });
}

let toastTimer: ReturnType<typeof setTimeout> | null = null;
export function toast(msg: string) {
  document.querySelector('.toast')?.remove();
  const el = h('div', { class: 'toast', role: 'status' }, msg);
  document.body.append(el);
  requestAnimationFrame(() => el.classList.add('in'));
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove('in');
    setTimeout(() => el.remove(), 300);
  }, 2600);
}

/** Opens an external link / tel: / mailto: through the OS. */
export function openExternal(url: string) {
  const a = h('a', { href: url, target: '_blank', rel: 'noopener' });
  document.body.append(a);
  a.click();
  a.remove();
}

/** Keeps a soft-keyboard height in --kb so sheets can lift above it. */
export function setKeyboardHeight(px: number) {
  document.documentElement.style.setProperty('--kb', px + 'px');
  document.documentElement.classList.toggle('kb-open', px > 0);
}
