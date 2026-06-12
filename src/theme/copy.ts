import type { Theme } from './theme';
import type { QuestDefinition } from '../engine/gamification/quests';
import type { BadgeDefinition } from '../engine/gamification/badges';

/**
 * Copy por tema (SPECS §8.3) — dicionário PT-BR central com chaves
 * duplas adult/kids. Componentes NUNCA condicionam strings inline: tudo
 * que muda com o tema resolve aqui.
 *
 * Regra de ouro: só a "skin" muda. Objetivos, métricas e feedback
 * técnico de treino (guarda, base, qualidade de golpe) são idênticos nos
 * dois temas — precisão > tema.
 */

export interface ThemedText {
  adult: string;
  kids: string;
}

/* ------------------------------------------------------------ UI geral */

export const UI_COPY = {
  /** Subtítulo da Home sem perfil com nome (fallback). */
  homeTagline: {
    adult: 'Seu instrutor virtual de boxe',
    kids: 'Sua arena arcade de boxe',
  },
  /** Estado "todas as missões do dia completas" (/progress). */
  questsAllDone: {
    adult: 'Missões de hoje completas — volte amanhã para 3 novas!',
    kids: 'O reino está a salvo por hoje — volte amanhã para 3 novas aventuras!',
  },
} satisfies Record<string, ThemedText>;

export type UiCopyKey = keyof typeof UI_COPY;

export function uiCopy(key: UiCopyKey, theme: Theme): string {
  return UI_COPY[key][theme];
}

/** Saudação da Home com o nome do perfil ativo. */
export function homeGreeting(name: string, theme: Theme): string {
  return theme === 'kids'
    ? `Olá, ${name}! Pronta para a aventura de hoje?`
    : `E aí, ${name} — pronto para treinar?`;
}

/* ----------------------------------------------------- missões diárias */

/**
 * Skin RPG das missões no kids (SPECS §5): mesmo objetivo e mesma
 * métrica, só a narrativa muda. Chaveado pelo id estável do QUEST_POOL;
 * id sem entrada cai na copy adulta (nunca quebra com missão nova).
 */
export const KIDS_QUEST_COPY: Record<string, string> = {
  jabs_good_30: 'Flechas certeiras: acerte 30 jabs caprichados',
  crosses_good_20: 'Golpe do dragão: 20 crosses caprichados',
  hooks_20: 'Giro real: 20 hooks (qualquer mão)',
  punches_100: 'Invasão ao castelo: 100 golpes no dia',
  good_punches_50: 'Tesouro do reino: 50 golpes caprichados no dia',
  rounds_3: 'Jornada da coroa: complete 3 rounds',
  guard_80_round: 'Defenda o castelo: guarda ≥ 80 no round',
  base_80_round: 'Raízes de pedra: base ≥ 80 no round',
};

export function questDescription(
  quest: Pick<QuestDefinition, 'id' | 'description'>,
  theme: Theme
): string {
  if (theme === 'kids') return KIDS_QUEST_COPY[quest.id] ?? quest.description;
  return quest.description;
}

/* --------------------------------------------------------------- badges */

/**
 * Nomes de badge com skin kids onde a metáfora RPG faz sentido; os
 * demais (contagens neutras como "100 Golpes") mantêm o nome adulto.
 * A descrição (critério técnico) nunca muda.
 */
export const KIDS_BADGE_NAMES: Record<string, string> = {
  first_session: 'Primeira Aventura',
  iron_guard: 'Escudo do Castelo',
  perfect_session: 'Round Encantado',
  streak_7: 'Chama de 7 Dias',
  streak_30: 'Chama de 30 Dias',
  full_arsenal: 'Arsenal Real',
};

export function badgeName(badge: Pick<BadgeDefinition, 'id' | 'name'>, theme: Theme): string {
  if (theme === 'kids') return KIDS_BADGE_NAMES[badge.id] ?? badge.name;
  return badge.name;
}
