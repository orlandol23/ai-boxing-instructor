import type { StreakState } from './types';

/**
 * Training streak (SPECS §5): consecutive days with >= 1 session, expiring
 * at local midnight. Everything works on local day keys (YYYY-MM-DD), so
 * the day rolls over at midnight in the device's time zone.
 */

/** Local day key (YYYY-MM-DD) for an epoch in ms. */
export function localDateKey(epochMs: number): string {
  const d = new Date(epochMs);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** The local day immediately before a YYYY-MM-DD key. */
export function previousDateKey(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  // Midday avoids DST surprises when subtracting a day.
  const noon = new Date(y, m - 1, d, 12, 0, 0);
  noon.setDate(noon.getDate() - 1);
  return localDateKey(noon.getTime());
}

/**
 * Advances the streak when a session is recorded on the day `dateKey`:
 * - same day as the last session: unchanged;
 * - the day after the last session: +1;
 * - any larger jump (or the first session): restarts at 1.
 */
export function advanceStreak(streak: StreakState, dateKey: string): StreakState {
  if (streak.lastDate === dateKey) return streak;
  if (streak.lastDate === previousDateKey(dateKey)) {
    return { count: streak.count + 1, lastDate: dateKey };
  }
  return { count: 1, lastDate: dateKey };
}

/**
 * The streak to display on the day `todayKey`. Trained today or
 * yesterday: the count holds. A whole day with no training: it expired
 * (0). It is only actually zeroed in the state when the next session
 * arrives.
 */
export function currentStreak(streak: StreakState, todayKey: string): number {
  if (!streak.lastDate) return 0;
  if (streak.lastDate === todayKey || streak.lastDate === previousDateKey(todayKey)) {
    return streak.count;
  }
  return 0;
}
