import { describe, expect, it } from 'vitest';
import { advanceStreak, currentStreak, localDateKey, previousDateKey } from '../streak';

describe('localDateKey', () => {
  it('formata o dia local como YYYY-MM-DD com zeros à esquerda', () => {
    expect(localDateKey(new Date(2026, 0, 5, 9, 30).getTime())).toBe('2026-01-05');
    expect(localDateKey(new Date(2026, 11, 25, 23, 59).getTime())).toBe('2026-12-25');
  });

  it('a virada acontece à meia-noite LOCAL', () => {
    expect(localDateKey(new Date(2026, 5, 10, 23, 59, 59).getTime())).toBe('2026-06-10');
    expect(localDateKey(new Date(2026, 5, 11, 0, 0, 0).getTime())).toBe('2026-06-11');
  });
});

describe('previousDateKey', () => {
  it('atravessa viradas de mês, ano e ano bissexto', () => {
    expect(previousDateKey('2026-06-11')).toBe('2026-06-10');
    expect(previousDateKey('2026-03-01')).toBe('2026-02-28');
    expect(previousDateKey('2024-03-01')).toBe('2024-02-29'); // bissexto
    expect(previousDateKey('2026-01-01')).toBe('2025-12-31');
  });
});

describe('advanceStreak', () => {
  it('primeira sessão começa a streak em 1', () => {
    expect(advanceStreak({ count: 0, lastDate: null }, '2026-06-11')).toEqual({
      count: 1,
      lastDate: '2026-06-11',
    });
  });

  it('segunda sessão no mesmo dia não muda a streak', () => {
    const streak = { count: 3, lastDate: '2026-06-11' };
    expect(advanceStreak(streak, '2026-06-11')).toEqual(streak);
  });

  it('treinar no dia seguinte incrementa', () => {
    expect(advanceStreak({ count: 3, lastDate: '2026-06-10' }, '2026-06-11')).toEqual({
      count: 4,
      lastDate: '2026-06-11',
    });
  });

  it('pular um dia (ou mais) reinicia em 1', () => {
    expect(advanceStreak({ count: 9, lastDate: '2026-06-08' }, '2026-06-11')).toEqual({
      count: 1,
      lastDate: '2026-06-11',
    });
  });

  it('incrementa atravessando a virada do mês', () => {
    expect(advanceStreak({ count: 5, lastDate: '2026-05-31' }, '2026-06-01').count).toBe(6);
  });
});

describe('currentStreak (expiração à meia-noite local)', () => {
  it('vale a contagem se a última sessão foi hoje ou ontem', () => {
    expect(currentStreak({ count: 4, lastDate: '2026-06-11' }, '2026-06-11')).toBe(4);
    expect(currentStreak({ count: 4, lastDate: '2026-06-10' }, '2026-06-11')).toBe(4);
  });

  it('expira (0) quando um dia inteiro passou sem treino', () => {
    expect(currentStreak({ count: 4, lastDate: '2026-06-09' }, '2026-06-11')).toBe(0);
  });

  it('sem nenhuma sessão registrada vale 0', () => {
    expect(currentStreak({ count: 0, lastDate: null }, '2026-06-11')).toBe(0);
  });
});
