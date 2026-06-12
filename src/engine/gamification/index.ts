/**
 * Motor de gamificação (F6) — regras de XP/nível/rank, streak, badges e
 * missões diárias (SPECS §5), todas funções/dados puros. Persistência é
 * responsabilidade do HistoryStore (src/services/historyStore.ts).
 */
export * from './types';
export * from './xp';
export * from './streak';
export * from './badges';
export * from './quests';
export * from './applySession';
export * from './selectors';
