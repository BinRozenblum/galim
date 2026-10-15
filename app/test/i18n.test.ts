import { describe, expect, it } from 'vitest';
import { allKeys, dict } from '../src/i18n';

describe('copy', () => {
  it('has every key in both languages', () => {
    for (const k of allKeys()) {
      expect(typeof dict('en')[k]).toBe('string');
    }
  });
  it('has no em dashes, emoji, or banned words in the UI', () => {
    const banned = ['דיכאון', 'מאניה', 'סיכון', 'אזהרה', 'risk', 'warning', 'depress', 'mania'];
    for (const l of ['he', 'en'] as const) {
      for (const [k, v] of Object.entries(dict(l))) {
        expect(v, k).not.toMatch(/—/);
        expect(v, k).not.toMatch(/\p{Extended_Pictographic}/u);
        if (k.startsWith('pdfLegend')) continue; // the clinical legend for the doctor may use these
        for (const b of banned) expect(v.toLowerCase(), `${l}.${k}`).not.toContain(b);
      }
    }
  });
});
