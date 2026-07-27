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

describe('paridade entre locales', () => {
  it('toda chave do en existe no pt-BR', () => {
    const missing = [...flatEn.keys()].filter((k) => !flatPt.has(k));
    expect(missing, `faltando no pt-BR: ${missing.join(', ')}`).toEqual([]);
  });

  it('toda chave do pt-BR existe no en', () => {
    const missing = [...flatPt.keys()].filter((k) => !flatEn.has(k));
    expect(missing, `faltando no en: ${missing.join(', ')}`).toEqual([]);
  });

  it('os dois bundles têm exatamente o mesmo número de chaves', () => {
    expect(flatPt.size).toBe(flatEn.size);
    expect(flatEn.size).toBeGreaterThan(100);
  });

  it('nenhuma tradução é vazia ou só espaço', () => {
    for (const [locale, flat] of [
      ['en', flatEn],
      ['pt-BR', flatPt],
    ] as const) {
      for (const [key, value] of flat) {
        expect(value.trim(), `${locale}:${key} vazia`).not.toBe('');
      }
    }
  });

  it('os placeholders {{…}} batem chave a chave', () => {
    for (const [key, value] of flatEn) {
      const translated = flatPt.get(key) ?? '';
      expect(placeholders(translated), `placeholders divergentes em ${key}`).toEqual(
        placeholders(value)
      );
    }
  });

  it('o registro de resources expõe os dois locales sob o namespace common', () => {
    expect(Object.keys(resources).sort()).toEqual([...SUPPORTED_LOCALES].sort());
    for (const locale of SUPPORTED_LOCALES) {
      expect(resources[locale].common).toBeTypeOf('object');
    }
  });
});

describe('toda chave prometida pelo engine existe nos dois locales', () => {
  const bundles = [
    ['en', en],
    ['pt-BR', ptBR],
  ] as const;

  function expectKeys(keys: readonly string[], label: string) {
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      for (const [locale, bundle] of bundles) {
        expect(get(bundle, key), `${label} ${key} faltando em ${locale}`).toBeTruthy();
      }
    }
  }

  it('frases do coach de voz (CoachingRules)', () => {
    expectKeys(Object.values(COACHING_PHRASE_KEYS).flat(), 'frase');
  });

  it('notas de correção e destaque (SessionTracker)', () => {
    expectKeys(
      [
        ...Object.values(CORRECTION_NOTE_KEYS),
        GENERIC_CORRECTION_NOTE_KEY,
        HIGH_SCORE_STREAK_NOTE_KEY,
        GOOD_PUNCHES_NOTE_KEY,
      ],
      'nota'
    );
  });

  it('as notas carregam os placeholders que o engine preenche', () => {
    for (const [, bundle] of bundles) {
      for (const key of Object.values(CORRECTION_NOTE_KEYS)) {
        expect(placeholders(get(bundle, key)!)).toEqual(['count']);
      }
      expect(placeholders(get(bundle, GENERIC_CORRECTION_NOTE_KEY)!)).toEqual(['count', 'rule']);
      expect(placeholders(get(bundle, HIGH_SCORE_STREAK_NOTE_KEY)!)).toEqual(['round', 'seconds']);
      expect(placeholders(get(bundle, GOOD_PUNCHES_NOTE_KEY)!)).toEqual(['count', 'round']);
    }
  });

  it('descrições de missão (QUEST_POOL)', () => {
    expectKeys(
      QUEST_POOL.map((q) => q.descriptionKey),
      'missão'
    );
  });

  it('nomes e critérios de badge (BADGES)', () => {
    expectKeys(
      BADGES.flatMap((b) => [b.nameKey, b.descriptionKey]),
      'badge'
    );
  });

  it('ranks e dias da semana', () => {
    expectKeys(Object.values(RANK_LABEL_KEYS), 'rank');
    expectKeys(WEEKDAY_LABEL_KEYS, 'weekday');
    expect(WEEKDAY_LABEL_KEYS).toHaveLength(7);
  });
});
