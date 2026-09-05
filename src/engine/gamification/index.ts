/**
 * Gamification engine (F6): XP/level/rank rules, streak, badges and daily
 * quests (SPECS §5), all pure functions and data. Persistence is the
 * HistoryStore's job (src/services/historyStore.ts).
 */
export * from './types';
export * from './xp';
export * from './streak';
export * from './badges';
export * from './quests';
export * from './applySession';
export * from './selectors';
