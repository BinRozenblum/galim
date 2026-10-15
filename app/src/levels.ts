export type Mood = -3 | -2 | -1 | 0 | 1 | 2 | 3;

export interface Level {
  v: Mood;
  color: string;
  /** text colour on top of the level colour */
  on: string;
}

// Same palette as the owner's web mood diary.
export const LEVELS: Level[] = [
  { v: 3, color: '#E0664A', on: '#FFFFFF' },
  { v: 2, color: '#EC924F', on: '#FFFFFF' },
  { v: 1, color: '#F1BE5E', on: '#3A2A10' },
  { v: 0, color: '#5DB892', on: '#FFFFFF' },
  { v: -1, color: '#8E9FE6', on: '#FFFFFF' },
  { v: -2, color: '#5B6FD1', on: '#FFFFFF' },
  { v: -3, color: '#3A46A3', on: '#FFFFFF' },
];

export function level(v: number): Level {
  return LEVELS.find((l) => l.v === v) ?? LEVELS[3];
}

export function isMood(v: unknown): v is Mood {
  return typeof v === 'number' && Number.isInteger(v) && v >= -3 && v <= 3;
}

/** "+2", "0", "−2" (true minus sign, reads better than a hyphen) */
export function signed(v: number): string {
  if (v > 0) return '+' + v;
  if (v < 0) return '−' + Math.abs(v);
  return '0';
}

export const TAGS = ['anxiety', 'irritable', 'racing', 'mixed'] as const;
export type Tag = (typeof TAGS)[number];
