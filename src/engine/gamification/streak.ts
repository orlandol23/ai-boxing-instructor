import type { StreakState } from './types';

/**
 * Streak de treino (SPECS §5): dias consecutivos com >= 1 sessão,
 * expirando à meia-noite local. Tudo opera sobre chaves de dia local
 * (YYYY-MM-DD) — a virada do dia é a meia-noite do fuso do aparelho.
 */

/** Chave do dia local (YYYY-MM-DD) de um epoch ms. */
export function localDateKey(epochMs: number): string {
  const d = new Date(epochMs);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Dia local imediatamente anterior a uma chave YYYY-MM-DD. */
export function previousDateKey(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  // Meio-dia evita surpresas de DST ao subtrair um dia.
  const noon = new Date(y, m - 1, d, 12, 0, 0);
  noon.setDate(noon.getDate() - 1);
  return localDateKey(noon.getTime());
}

/**
 * Avança a streak ao registrar uma sessão no dia `dateKey`:
 * - mesmo dia da última sessão → inalterada;
 * - dia seguinte ao da última sessão → +1;
 * - qualquer salto maior (ou primeira sessão) → recomeça em 1.
 */
export function advanceStreak(streak: StreakState, dateKey: string): StreakState {
  if (streak.lastDate === dateKey) return streak;
  if (streak.lastDate === previousDateKey(dateKey)) {
    return { count: streak.count + 1, lastDate: dateKey };
  }
  return { count: 1, lastDate: dateKey };
}

/**
 * Streak vigente para exibição no dia `todayKey`. Treinou hoje ou ontem
 * → a contagem vale; um dia inteiro sem treino → expirou (0). Ela só é
 * efetivamente zerada no estado quando a próxima sessão chegar.
 */
export function currentStreak(streak: StreakState, todayKey: string): number {
  if (!streak.lastDate) return 0;
  if (streak.lastDate === todayKey || streak.lastDate === previousDateKey(todayKey)) {
    return streak.count;
  }
  return 0;
}
