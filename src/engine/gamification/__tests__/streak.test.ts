import { describe, expect, it } from 'vitest';
import { advanceStreak, currentStreak, localDateKey, previousDateKey } from '../streak';

describe('localDateKey', () => {
  it('formats the local day as YYYY-MM-DD with leading zeros', () => {
    expect(localDateKey(new Date(2026, 0, 5, 9, 30).getTime())).toBe('2026-01-05');
    expect(localDateKey(new Date(2026, 11, 25, 23, 59).getTime())).toBe('2026-12-25');
  });

  it('the roll-over happens at LOCAL midnight', () => {
    expect(localDateKey(new Date(2026, 5, 10, 23, 59, 59).getTime())).toBe('2026-06-10');
    expect(localDateKey(new Date(2026, 5, 11, 0, 0, 0).getTime())).toBe('2026-06-11');
  });
});

describe('previousDateKey', () => {
  it('crosses month, year and leap-year boundaries', () => {
    expect(previousDateKey('2026-06-11')).toBe('2026-06-10');
    expect(previousDateKey('2026-03-01')).toBe('2026-02-28');
    expect(previousDateKey('2024-03-01')).toBe('2024-02-29'); // leap year
    expect(previousDateKey('2026-01-01')).toBe('2025-12-31');
  });
});

describe('advanceStreak', () => {
  it('the first session starts the streak at 1', () => {
    expect(advanceStreak({ count: 0, lastDate: null }, '2026-06-11')).toEqual({
      count: 1,
      lastDate: '2026-06-11',
    });
  });

  it('a second session on the same day does not change the streak', () => {
    const streak = { count: 3, lastDate: '2026-06-11' };
    expect(advanceStreak(streak, '2026-06-11')).toEqual(streak);
  });

  it('training on the next day increments it', () => {
    expect(advanceStreak({ count: 3, lastDate: '2026-06-10' }, '2026-06-11')).toEqual({
      count: 4,
      lastDate: '2026-06-11',
    });
  });

  it('skipping a day (or more) restarts it at 1', () => {
    expect(advanceStreak({ count: 9, lastDate: '2026-06-08' }, '2026-06-11')).toEqual({
      count: 1,
      lastDate: '2026-06-11',
    });
  });

  it('increments across a month roll-over', () => {
    expect(advanceStreak({ count: 5, lastDate: '2026-05-31' }, '2026-06-01').count).toBe(6);
  });
});

describe('currentStreak (expiry at local midnight)', () => {
  it('keeps the count if the last session was today or yesterday', () => {
    expect(currentStreak({ count: 4, lastDate: '2026-06-11' }, '2026-06-11')).toBe(4);
    expect(currentStreak({ count: 4, lastDate: '2026-06-10' }, '2026-06-11')).toBe(4);
  });

  it('expires (0) once a whole day has passed with no training', () => {
    expect(currentStreak({ count: 4, lastDate: '2026-06-09' }, '2026-06-11')).toBe(0);
  });

  it('is 0 when no session has ever been recorded', () => {
    expect(currentStreak({ count: 0, lastDate: null }, '2026-06-11')).toBe(0);
  });
});
