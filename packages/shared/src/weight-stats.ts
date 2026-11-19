import { addDays } from './dates.js';

export interface WeightPoint {
  date: string;
  weightKg: number;
}

/** Минимальный вес за последние `days` дней (включая сегодня), null — взвешиваний не было. */
export function lowestWithin(logs: WeightPoint[], today: string, days = 10): WeightPoint | null {
  const from = addDays(today, -(days - 1));
  let low: WeightPoint | null = null;
  for (const l of logs) {
    if (l.date < from || l.date > today) continue;
    if (!low || l.weightKg < low.weightKg) low = l;
  }
  return low;
}

/**
 * Изменение веса за неделю: последнее взвешивание минус последнее взвешивание
 * не позже чем за 7 дней до него. null, если сравнить не с чем.
 */
export function weeklyChange(logs: WeightPoint[]): number | null {
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
  const last = sorted[sorted.length - 1];
  if (!last) return null;
  const cutoff = addDays(last.date, -7);
  const before = sorted.filter((l) => l.date <= cutoff).pop();
  if (!before) return null;
  return Math.round((last.weightKg - before.weightKg) * 10) / 10;
}
