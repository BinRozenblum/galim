import { t } from '../i18n';
import { uid, type Person, type PlanItem } from '../model';
import { S } from '../state';
import { openCrisis } from './crisis';
import { confirmDialog, h, I, openExternal, sheet, svg } from './dom';

const AV_COLORS = ['#8E7CE0', '#1F9D8A', '#EC924F', '#5B6FD1', '#D0587E', '#5DB892'];

export function mountPlan(root: HTMLElement) {
  const main = h('div', { class: 'main' });
  root.append(main);
  main.append(h('div', { class: 'hd' }, h('div', null, h('small', null, t('planSub')), h('h1', null, t('tabPlan')))));
  const body = h('div');
  const crisis = h(
    'button',
    { class: 'crisis', type: 'button' },
    h('div', { class: 'ct' }, h('b', null, t('hardNow')), h('small', null, t('eranLine'))),
    h('span', { class: 'pill ltr' }, '1201'),
  );
  crisis.addEventListener('click', () => openCrisis());
  main.append(body, h('div', { class: 'crisis-wrap' }, crisis));

  function listSection(kind: 'signs' | 'helps') {
    const items = S.data.plan[kind];
    const addBtn = h('button', { type: 'button' }, svg(I.plus), t('add'));
    addBtn.addEventListener('click', () => editItem(kind, null));
    const card = h('div', { class: 'card sec' }, h('h3', null, t(kind), addBtn));
    const dot = kind === 'signs' ? '#EC924F' : '#5DB892';
    if (!items.length) {
      const ex = h('button', { class: 'li ex', type: 'button' }, h('i', { class: 'b', style: 'background:#DCD4E8' }), h('span', { class: 't' }, t(kind === 'signs' ? 'signsEx' : 'helpsEx')));
      ex.addEventListener('click', () => editItem(kind, null));
      card.append(ex);
    }
    for (const it of items) {
      const b = h('button', { class: 'li', type: 'button' }, h('i', { class: 'b', style: `background:${dot}` }), h('span', { class: 't' }, it.text));
      b.addEventListener('click', () => editItem(kind, it));
      card.append(b);
    }
    return card;
  }

  function peopleSection() {
    const addBtn = h('button', { type: 'button' }, svg(I.plus), t('add'));
    addBtn.addEventListener('click', () => editPerson(null));
    const card = h('div', { class: 'card sec' }, h('h3', null, t('people'), addBtn));
    const people = S.data.plan.people;
    if (!people.length) {
      const ex = h('button', { class: 'li ex', type: 'button' }, h('i', { class: 'b', style: 'background:#DCD4E8' }), h('span', { class: 't' }, t('peopleEx')));
      ex.addEventListener('click', () => editPerson(null));
      card.append(ex);
    }
    people.forEach((p, i) => {
      const info = h('button', { class: 'pinfo', type: 'button' }, h('b', null, p.name || p.phone), h('small', null, p.relation));
      info.addEventListener('click', () => editPerson(p));
      const av = h('span', { class: 'av', style: `background:${AV_COLORS[i % AV_COLORS.length]}` }, (p.name || '?').trim().charAt(0));
      av.addEventListener('click', () => editPerson(p));
      const call = h('button', { class: 'call', type: 'button', 'aria-label': `${t('call')} ${p.name}` }, svg(I.phone));
      if (!p.phone) call.disabled = true;
      call.addEventListener('click', () => openExternal('tel:' + p.phone.replace(/[^\d+*#]/g, '')));
      card.append(h('div', { class: 'person' }, av, info, call));
    });
    return card;
  }

  function editItem(kind: 'signs' | 'helps', item: PlanItem | null) {
    const s = sheet({ title: t(kind === 'signs' ? 'newSign' : 'newHelp'), closeLabel: t('close') });
    const inp = h('textarea', { class: 'textarea', dir: 'auto', style: 'min-height:96px', maxlength: 300, placeholder: t(kind === 'signs' ? 'signsEx' : 'helpsEx') }) as HTMLTextAreaElement;
    inp.value = item?.text ?? '';
    const save = h('button', { class: 'btn pri', type: 'button' }, t('save'));
    const actions = h('div', { class: 'sheet-actions' });
    if (item) {
      const del = h('button', { class: 'btn', type: 'button' }, svg(I.trash), t('delete'));
      del.addEventListener('click', async () => {
        S.data.plan[kind] = S.data.plan[kind].filter((x) => x.id !== item.id);
        S.changed();
        s.close();
      });
      actions.append(del);
    }
    actions.append(save);
    save.addEventListener('click', () => {
      const text = inp.value.trim().slice(0, 300);
      if (item) {
        if (!text) S.data.plan[kind] = S.data.plan[kind].filter((x) => x.id !== item.id);
        else item.text = text;
      } else if (text) S.data.plan[kind].push({ id: uid(), text });
      S.changed();
      s.close();
    });
    s.body.append(inp, actions);
    setTimeout(() => inp.focus(), 260);
  }

  function editPerson(p: Person | null) {
    const s = sheet({ title: t('personTitle'), closeLabel: t('close') });
    const field = (label: string, value: string, attrs: Record<string, string>) => {
      const i = h('input', { class: 'input', value, ...attrs }) as HTMLInputElement;
      return { wrap: h('label', { class: 'field' }, h('span', { class: 'fl' }, label), i), i };
    };
    const name = field(t('personName'), p?.name ?? '', { maxlength: '80', autocomplete: 'off' });
    const rel = field(t('personRel'), p?.relation ?? '', { maxlength: '80', placeholder: t('personRelPh'), autocomplete: 'off' });
    const phone = field(t('personPhone'), p?.phone ?? '', { maxlength: '40', type: 'tel', inputmode: 'tel', dir: 'ltr', autocomplete: 'off' });
    const save = h('button', { class: 'btn pri', type: 'button' }, t('save'));
    const actions = h('div', { class: 'sheet-actions' });
    if (p) {
      const del = h('button', { class: 'btn', type: 'button' }, svg(I.trash), t('delete'));
      del.addEventListener('click', async () => {
        const ok = await confirmDialog({ title: `${t('delete')} ${p.name}?`, ok: t('delete'), cancel: t('cancel'), danger: true });
        if (!ok) return;
        S.data.plan.people = S.data.plan.people.filter((x) => x.id !== p.id);
        S.changed();
        s.close();
      });
      actions.append(del);
    }
    actions.append(save);
    save.addEventListener('click', () => {
      const v = { name: name.i.value.trim(), relation: rel.i.value.trim(), phone: phone.i.value.trim() };
      if (!v.name && !v.phone) {
        name.i.focus();
        return;
      }
      if (p) Object.assign(p, v);
      else S.data.plan.people.push({ id: uid(), ...v });
      S.changed();
      s.close();
    });
    s.body.append(name.wrap, rel.wrap, phone.wrap, actions);
    if (!p) setTimeout(() => name.i.focus(), 260);
  }

  function render() {
    body.replaceChildren(listSection('signs'), listSection('helps'), peopleSection());
  }
  S.on(render);
  render();
}
