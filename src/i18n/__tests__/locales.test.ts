import { describe, expect, it } from 'vitest';
import en from '../locales/en';
import ptBR from '../locales/pt-BR';
import { SUPPORTED_LOCALES, resources } from '..';
import { COACHING_PHRASE_KEYS } from '../../engine/CoachingRules';
import {
  CORRECTION_NOTE_KEYS,
  GENERIC_CORRECTION_NOTE_KEY,
  GOOD_PUNCHES_NOTE_KEY,
  HIGH_SCORE_STREAK_NOTE_KEY,
} from '../../engine/SessionTracker';
import { QUEST_POOL } from '../../engine/gamification/quests';
import { BADGES } from '../../engine/gamification/badges';
import { RANK_LABEL_KEYS } from '../../engine/gamification/xp';
import { WEEKDAY_LABEL_KEYS } from '../../engine/gamification/selectors';

/**
 * Locale files drift silently — one locale gains a key, the other quietly
 * renders the raw key id to a user. These tests make that a build failure,
 * in both directions, and also pin every key the engine promises to emit.
 */

type Bundle = Record<string, unknown>;

function flatten(node: unknown, prefix = ''): Map<string, string> {
  const out = new Map<string, string>();
  if (typeof node !== 'object' || node === null) return out;
  for (const [key, value] of Object.entries(node as Bundle)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') out.set(path, value);
    else for (const [k, v] of flatten(value, path)) out.set(k, v);
  }
  return out;
}

function placeholders(value: string): string[] {
  return [...value.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map((m) => m[1]).sort();
}

function get(bundle: unknown, dottedKey: string): string | undefined {
  let node: unknown = bundle;
  for (const part of dottedKey.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = (node as Bundle)[part];
  }
  return typeof node === 'string' ? node : undefined;
}

const flatEn = flatten(en);
const flatPt = flatten(ptBR);

describe('parity between locales', () => {
  it('every en key exists in pt-BR', () => {
    const missing = [...flatEn.keys()].filter((k) => !flatPt.has(k));
    expect(missing, `missing in pt-BR: ${missing.join(', ')}`).toEqual([]);
  });

  it('every pt-BR key exists in en', () => {
    const missing = [...flatPt.keys()].filter((k) => !flatEn.has(k));
    expect(missing, `missing in en: ${missing.join(', ')}`).toEqual([]);
  });

  it('both bundles hold exactly the same number of keys', () => {
    expect(flatPt.size).toBe(flatEn.size);
    expect(flatEn.size).toBeGreaterThan(100);
  });

  it('no translation is empty or whitespace only', () => {
    for (const [locale, flat] of [
      ['en', flatEn],
      ['pt-BR', flatPt],
    ] as const) {
      for (const [key, value] of flat) {
        expect(value.trim(), `${locale}:${key} is empty`).not.toBe('');
      }
    }
  });

  it('the {{…}} placeholders match key by key', () => {
    for (const [key, value] of flatEn) {
      const translated = flatPt.get(key) ?? '';
      expect(placeholders(translated), `placeholders diverge on ${key}`).toEqual(
        placeholders(value)
      );
    }
  });

  it('the resources registry exposes both locales under the common namespace', () => {
    expect(Object.keys(resources).sort()).toEqual([...SUPPORTED_LOCALES].sort());
    for (const locale of SUPPORTED_LOCALES) {
      expect(resources[locale].common).toBeTypeOf('object');
    }
  });
});

describe('every key the engine promises exists in both locales', () => {
  const bundles = [
    ['en', en],
    ['pt-BR', ptBR],
  ] as const;

  function expectKeys(keys: readonly string[], label: string) {
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      for (const [locale, bundle] of bundles) {
        expect(get(bundle, key), `${label} ${key} missing in ${locale}`).toBeTruthy();
      }
    }
  }

  it('voice coach phrases (CoachingRules)', () => {
    expectKeys(Object.values(COACHING_PHRASE_KEYS).flat(), 'phrase');
  });

  it('correction and highlight notes (SessionTracker)', () => {
    expectKeys(
      [
        ...Object.values(CORRECTION_NOTE_KEYS),
        GENERIC_CORRECTION_NOTE_KEY,
        HIGH_SCORE_STREAK_NOTE_KEY,
        GOOD_PUNCHES_NOTE_KEY,
      ],
      'note'
    );
  });

  it('the notes carry the placeholders the engine fills in', () => {
    for (const [, bundle] of bundles) {
      for (const key of Object.values(CORRECTION_NOTE_KEYS)) {
        expect(placeholders(get(bundle, key)!)).toEqual(['count']);
      }
      expect(placeholders(get(bundle, GENERIC_CORRECTION_NOTE_KEY)!)).toEqual(['count', 'rule']);
      expect(placeholders(get(bundle, HIGH_SCORE_STREAK_NOTE_KEY)!)).toEqual(['round', 'seconds']);
      expect(placeholders(get(bundle, GOOD_PUNCHES_NOTE_KEY)!)).toEqual(['count', 'round']);
    }
  });

  it('quest descriptions (QUEST_POOL)', () => {
    expectKeys(
      QUEST_POOL.map((q) => q.descriptionKey),
      'quest'
    );
  });

  it('badge names and criteria (BADGES)', () => {
    expectKeys(
      BADGES.flatMap((b) => [b.nameKey, b.descriptionKey]),
      'badge'
    );
  });

  it('ranks and weekdays', () => {
    expectKeys(Object.values(RANK_LABEL_KEYS), 'rank');
    expectKeys(WEEKDAY_LABEL_KEYS, 'weekday');
    expect(WEEKDAY_LABEL_KEYS).toHaveLength(7);
  });
});
