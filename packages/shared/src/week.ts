import type { Nutrients } from './schemas.js';

export interface WeekSummaryDto {
  /** 7 дней по порядку, последний — запрошенный день. */
  days: { date: string; nutrients: Nutrients }[];
  target: Nutrients | null;
}

export interface MacroShares {
  protein: number;
  fat: number;
  carbs: number;
}

/**
 * Доли белков, жиров и углеводов в калориях (4 / 9 / 4 ккал на грамм), в процентах.
 * Округление так, чтобы в сумме было ровно 100. Без БЖУ — нули.
 */
export function macroShares(n: Pick<Nutrients, 'protein' | 'fat' | 'carbs'>): MacroShares {
  const keys = ['protein', 'fat', 'carbs'] as const;
  const kcal: MacroShares = { protein: n.protein * 4, fat: n.fat * 9, carbs: n.carbs * 4 };
  const total = kcal.protein + kcal.fat + kcal.carbs;
  const shares: MacroShares = { protein: 0, fat: 0, carbs: 0 };
  if (total <= 0) return shares;
  const exact = keys.map((k) => ({ k, v: (kcal[k] / total) * 100 }));
  for (const { k, v } of exact) shares[k] = Math.floor(v);
  // Остаток до 100 отдаём тем, у кого больше дробная часть
  let left = 100 - shares.protein - shares.fat - shares.carbs;
  for (const { k } of [...exact].sort((a, b) => (b.v % 1) - (a.v % 1))) {
    if (left-- <= 0) break;
    shares[k]++;
  }
  return shares;
}

/** Среднее за дни, в которые что-то записано. Пустые дни среднее не занижают. */
export function averageOfLogged(days: { nutrients: Nutrients }[]): Nutrients | null {
  const logged = days.filter((d) => d.nutrients.kcal > 0);
  if (logged.length === 0) return null;
  const avg = (key: keyof Nutrients) =>
    Math.round((logged.reduce((s, d) => s + d.nutrients[key], 0) / logged.length) * 10) / 10;
  return {
    kcal: Math.round(logged.reduce((s, d) => s + d.nutrients.kcal, 0) / logged.length),
    protein: avg('protein'),
    fat: avg('fat'),
    carbs: avg('carbs'),
  };
}
