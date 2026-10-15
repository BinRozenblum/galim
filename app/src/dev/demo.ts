// Realistic demo data for store screenshots (dev-scenes builds only).
import { addDays, todayKey } from '../dates';
import { emptyData, type Data, type Entry } from '../model';
import type { Mood } from '../levels';
import type { Lang } from '../i18n';

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

export function demoData(lang: Lang, days = 120): Data {
  const d = emptyData();
  const r = rng(7);
  const today = todayKey();
  for (let i = days - 1; i >= 0; i--) {
    const k = addDays(today, -i);
    if (i > 3 && r() < 0.08) continue; // a few missed days, no big deal
    // shape: mostly balanced, a mild dip ~8-6 weeks ago, a mild upswing + less sleep in the last week
    let base = 0;
    if (i <= 62 && i >= 44) base = -1 + (i <= 56 && i >= 50 ? -0.6 : 0);
    if (i <= 9 && i >= 4) base = 0.8;
    if (i <= 3) base = 1.3;
    let mood = Math.round(base + (r() - 0.5) * 1.1);
    mood = Math.max(-3, Math.min(3, mood));
    let sleep = 7.3 + (r() - 0.5) * 1.4;
    if (base < 0) sleep += 0.9;
    if (i <= 8) sleep = 5.6 + (r() - 0.5) * 0.9;
    sleep = Math.round(sleep * 2) / 2;
    const e: Entry = {
      mood: mood as Mood,
      sleep,
      meds: r() > 0.07,
      energy: Math.max(1, Math.min(5, Math.round(3 + base * 0.9 + (r() - 0.5)))),
      tags: [],
      note: '',
      t: Date.now() - i * 86400000,
    };
    if (base >= 1 && r() > 0.5) e.tags.push('racing');
    if (base >= 1 && r() > 0.6) e.tags.push('irritable');
    if (base < 0 && r() > 0.6) e.tags.push('anxiety');
    if (i === 2) e.note = lang === 'he' ? 'הרבה רעיונות בראש, קשה להירדם. הלכתי לישון ב-2 בלילה.' : 'Lots of ideas, hard to fall asleep. Went to bed at 2am.';
    if (i === 52) e.note = lang === 'he' ? 'יום כבד. נשארתי בבית רוב היום.' : 'Heavy day. Stayed home most of the day.';
    if (i === 30) e.note = lang === 'he' ? 'פגישה טובה עם ד״ר לוי.' : 'Good appointment with Dr. Levy.';
    d.entries[k] = e;
  }
  // today: the mockup's day (balanced, 7.5h, meds yes, energy 3, irritable)
  d.entries[today] = { mood: 0, sleep: 7.5, meds: true, energy: 3, tags: ['irritable'], note: '', t: Date.now() };
  const he = lang === 'he';
  d.plan = {
    signs: [
      { id: 's1', text: he ? 'ישן פחות מ-6 שעות כמה לילות' : 'Sleeping under 6 hours for a few nights' },
      { id: 's2', text: he ? 'מתחיל הרבה פרויקטים בבת אחת' : 'Starting lots of projects at once' },
      { id: 's3', text: he ? 'לא עונה לחברים יותר מיומיים' : 'Not answering friends for more than two days' },
    ],
    helps: [
      { id: 'h1', text: he ? 'הליכה בבוקר, בלי מסכים אחרי 23:00' : 'A morning walk, no screens after 11pm' },
      { id: 'h2', text: he ? 'לקבוע תור מוקדם אצל הפסיכיאטר' : 'Book an early appointment with my psychiatrist' },
    ],
    people: [
      { id: 'p1', name: he ? 'רונית' : 'Ronit', relation: he ? 'אחותי' : 'My sister', phone: '050-0000000' },
      { id: 'p2', name: he ? 'ד״ר לוי' : 'Dr. Levy', relation: he ? 'הפסיכיאטר שלי' : 'My psychiatrist', phone: '03-0000000' },
    ],
  };
  d.name = '';
  return d;
}
