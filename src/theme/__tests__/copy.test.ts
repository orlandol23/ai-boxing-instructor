import { describe, expect, it } from 'vitest';
import {
  THEMED_UI_KEYS,
  badgeDescription,
  badgeName,
  homeGreeting,
  questDescription,
  rankLabel,
  themedCopy,
  uiCopy,
  type Translate,
} from '../copy';
import { QUEST_POOL } from '../../engine/gamification/quests';
import { BADGES } from '../../engine/gamification/badges';
import { RANK_LABEL_KEYS, rankLabelKey } from '../../engine/gamification/xp';
import en from '../../i18n/locales/en';
import ptBR from '../../i18n/locales/pt-BR';

/**
 * copy.ts owns exactly ONE axis: theme. Language is i18next's job.
 *
 * So these tests assert *which key* gets asked for (`…` vs `…_kids`),
 * never what the key says — the prose lives in src/i18n/locales and is
 * covered by the parity suite. That is what makes this file survive a
 * copy edit, or a third locale, untouched.
 */

/** Records the key i18next would be asked for, incl. the theme suffix. */
function spy(): { t: Translate; calls: string[] } {
  const calls: string[] = [];
  const t: Translate = (key, options) => {
    const context = options?.context;
    const resolved = typeof context === 'string' ? `${key}_${context}` : key;
    calls.push(resolved);
    return resolved;
  };
  return { t, calls };
}

function walk(bundle: unknown, dottedKey: string): string | undefined {
  let node: unknown = bundle;
  for (const part of dottedKey.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : undefined;
}

/** Resolves a key the way i18next does: `key_<context>`, else `key`. */
function lookup(bundle: unknown, dottedKey: string): string | undefined {
  const direct = walk(bundle, dottedKey);
  if (direct !== undefined) return direct;
  const withoutContext = dottedKey.replace(/_(adult|kids)$/, '');
  return withoutContext === dottedKey ? undefined : walk(bundle, withoutContext);
}

describe('themedCopy — o eixo do tema', () => {
  it('adiciona o sufixo de contexto do tema à chave pedida', () => {
    const { t, calls } = spy();
    themedCopy(t, 'home.tagline', 'adult');
    themedCopy(t, 'home.tagline', 'kids');
    expect(calls).toEqual(['home.tagline_adult', 'home.tagline_kids']);
  });

  it('repassa os dados de interpolação junto do contexto', () => {
    const seen: Record<string, unknown>[] = [];
    const t: Translate = (key, options) => {
      seen.push({ key, ...options });
      return key;
    };
    homeGreeting(t, 'Orlando', 'kids');
    expect(seen[0]).toMatchObject({ key: 'home.greeting', context: 'kids', name: 'Orlando' });
  });
});

describe('copy por tema — missões diárias', () => {
  it('pede a chave do motor, com o sufixo do tema', () => {
    const { t } = spy();
    const guard = QUEST_POOL.find((q) => q.id === 'guard_80_round')!;
    expect(questDescription(t, guard, 'adult')).toBe('quests.guard_80_round.description_adult');
    expect(questDescription(t, guard, 'kids')).toBe('quests.guard_80_round.description_kids');
  });

  it('TODA missão do pool tem skin kids nos dois idiomas', () => {
    for (const quest of QUEST_POOL) {
      const kidsKey = `${quest.descriptionKey}_kids`;
      for (const [name, bundle] of [
        ['en', en],
        ['pt-BR', ptBR],
      ] as const) {
        expect(walk(bundle, kidsKey), `skin kids faltando p/ ${quest.id} em ${name}`).toBeTruthy();
        expect(walk(bundle, kidsKey)).not.toBe(walk(bundle, quest.descriptionKey));
      }
    }
  });

  it('missão futura sem skin cai na copy adulta (nunca quebra)', () => {
    // Missão nova sem entrada `_kids`: o fallback de contexto do i18next
    // devolve a copy adulta em vez de string vazia.
    const bundleWithNewQuest = { quests: { dodges_10: { description: '10 slips' } } };
    expect(walk(bundleWithNewQuest, 'quests.dodges_10.description_kids')).toBeUndefined();
    expect(lookup(bundleWithNewQuest, 'quests.dodges_10.description_kids')).toBe('10 slips');
  });

  it('a skin muda só a narrativa: alvo e métrica seguem no texto', () => {
    // precisão > tema: o número do objetivo aparece nas duas versões
    const punches = QUEST_POOL.find((q) => q.id === 'punches_100')!;
    for (const bundle of [en, ptBR]) {
      expect(walk(bundle, punches.descriptionKey)).toContain('100');
      expect(walk(bundle, `${punches.descriptionKey}_kids`)).toContain('100');
    }
  });
});

describe('copy por tema — ranks (motor → UI)', () => {
  it('o motor devolve a chave do rank; a UI resolve tema + idioma', () => {
    expect(rankLabelKey(1)).toBe('ranks.bronze');
    expect(rankLabelKey(35)).toBe('ranks.champion');

    const { t } = spy();
    expect(rankLabel(t, 1, 'adult')).toBe('ranks.bronze_adult');
    expect(rankLabel(t, 1, 'kids')).toBe('ranks.bronze_kids');
    expect(rankLabel(t, 35, 'kids')).toBe('ranks.champion_kids');
  });

  it('Cinturões no adulto, Coroas no kids, nos dois idiomas (SPECS §1)', () => {
    for (const bundle of [en, ptBR]) {
      for (const key of Object.values(RANK_LABEL_KEYS)) {
        const adult = lookup(bundle, `${key}_adult`);
        const kids = lookup(bundle, `${key}_kids`);
        expect(adult).toBeTruthy();
        expect(kids).toBeTruthy();
        expect(kids).not.toBe(adult);
      }
    }
  });
});

describe('copy por tema — badges e UI', () => {
  it('badge com metáfora RPG pede a chave `_kids`; o critério nunca é temático', () => {
    const { t } = spy();
    const ironGuard = BADGES.find((b) => b.id === 'iron_guard')!;
    expect(badgeName(t, ironGuard, 'adult')).toBe('badges.iron_guard.name_adult');
    expect(badgeName(t, ironGuard, 'kids')).toBe('badges.iron_guard.name_kids');
    expect(badgeDescription(t, ironGuard)).toBe('badges.iron_guard.description');
  });

  it('contagem neutra não ganha skin kids; a metáfora RPG ganha', () => {
    for (const bundle of [en, ptBR]) {
      // "100 Golpes" é um contador — mesma copy nos dois temas.
      expect(walk(bundle, 'badges.punches_100.name_kids')).toBeUndefined();
      expect(lookup(bundle, 'badges.punches_100.name_kids')).toBe(
        walk(bundle, 'badges.punches_100.name')
      );
      // "Guarda de Ferro" vira "Escudo do Castelo".
      expect(walk(bundle, 'badges.iron_guard.name_kids')).toBeTruthy();
    }
  });

  it('toda badge do catálogo tem nome e descrição nos dois idiomas', () => {
    for (const badge of BADGES) {
      for (const bundle of [en, ptBR]) {
        expect(walk(bundle, badge.nameKey), `nome faltando: ${badge.id}`).toBeTruthy();
        expect(walk(bundle, badge.descriptionKey), `desc faltando: ${badge.id}`).toBeTruthy();
      }
    }
  });

  it('todo bloco de badge nos locales aponta p/ um id real do catálogo', () => {
    const ids = new Set<string>(BADGES.map((b) => b.id));
    for (const bundle of [en, ptBR]) {
      const badges = (bundle as unknown as { badges: Record<string, unknown> }).badges;
      for (const [id, value] of Object.entries(badges)) {
        if (typeof value !== 'object' || value === null) continue; // `badges.locked`
        expect(ids.has(id), `id órfão: ${id}`).toBe(true);
      }
    }
  });

  it('saudação da Home e textos de UI resolvem por tema', () => {
    const { t } = spy();
    expect(homeGreeting(t, 'Orlando', 'adult')).toBe('home.greeting_adult');
    expect(uiCopy(t, 'home.tagline', 'kids')).toBe('home.tagline_kids');

    for (const bundle of [en, ptBR]) {
      for (const key of THEMED_UI_KEYS) {
        const adult = lookup(bundle, `${key}_adult`);
        const kids = lookup(bundle, `${key}_kids`);
        expect(adult).toBeTruthy();
        expect(kids).not.toBe(adult);
      }
      expect(walk(bundle, 'home.greeting')).toContain('{{name}}');
      expect(walk(bundle, 'home.greeting_kids')).toContain('{{name}}');
    }
  });
});
