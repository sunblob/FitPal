import {
  MEAL_TYPES,
  type ActivityLevel,
  type Goal,
  type MealType,
  type FoodNutrients,
  type Nutrients,
  type Profile,
} from './schemas.js';

const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

/** Примерная энергоёмкость 1 кг массы тела. */
export const KCAL_PER_KG = 7700;
const DEFAULT_WEEKLY_RATE: Record<Goal, number> = { lose: 0.5, maintain: 0, gain: 0.25 };
const MIN_KCAL = { male: 1500, female: 1200 } as const;

/** Базовый обмен по формуле Миффлина — Сан Жеора. */
export function bmr(profile: Profile, now = new Date()): number {
  const age = now.getFullYear() - profile.birthYear;
  const base = 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * age;
  return profile.sex === 'male' ? base + 5 : base - 161;
}

/** Расход калорий за день с учётом активности (TDEE). */
export function tdee(profile: Profile, now = new Date()): number {
  return bmr(profile, now) * ACTIVITY_FACTOR[profile.activityLevel];
}

function weeklyRate(profile: Profile): number {
  return profile.goal === 'maintain'
    ? 0
    : (profile.weeklyRateKg ?? DEFAULT_WEEKLY_RATE[profile.goal]);
}

/** Рекомендуемая дневная норма КБЖУ: TDEE минус/плюс дефицит под выбранный темп. */
export function dailyTarget(profile: Profile, now = new Date()): Nutrients {
  const sign = profile.goal === 'lose' ? -1 : profile.goal === 'gain' ? 1 : 0;
  const delta = (sign * weeklyRate(profile) * KCAL_PER_KG) / 7;
  const kcal = Math.max(MIN_KCAL[profile.sex], Math.round(tdee(profile, now) + delta));
  const protein = Math.round(profile.weightKg * (profile.goal === 'lose' ? 2 : 1.6));
  const fat = Math.round((kcal * 0.3) / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { kcal, protein, fat, carbs };
}

/** КБЖУ порции по значениям на 100 г. */
export function scaleNutrients(per100g: Nutrients, grams: number): Nutrients {
  // Умножаем до деления, чтобы не ловить ошибки округления вроде 3.3 * 1.5 = 4.9499…
  const round = (n: number) => Math.round((n * grams) / 10) / 10;
  return {
    kcal: Math.round((per100g.kcal * grams) / 100),
    protein: round(per100g.protein),
    fat: round(per100g.fat),
    carbs: round(per100g.carbs),
  };
}

/**
 * КБЖУ записи после смены веса порции. В записи хранится только итог порции, поэтому
 * восстанавливаем значения на 100 г из неё и считаем заново.
 */
export function rescaleNutrients(n: Nutrients, fromGrams: number, toGrams: number): Nutrients {
  if (fromGrams <= 0) return n;
  const per100 = (v: number) => (v * 100) / fromGrams;
  return scaleNutrients(
    {
      kcal: per100(n.kcal),
      protein: per100(n.protein),
      fat: per100(n.fat),
      carbs: per100(n.carbs),
    },
    toGrams,
  );
}

/** Обычная доля дневной нормы на каждый приём пищи. */
export const MEAL_SHARES: Record<MealType, number> = {
  breakfast: 0.25,
  lunch: 0.35,
  dinner: 0.3,
  snack: 0.1,
};

/**
 * Ориентир калорий на ещё пустые приёмы пищи: обычная доля дневной нормы, но не больше
 * того, что от нормы осталось. Для заполненных приёмов и когда норма выбрана — null.
 */
export function mealBudgets(
  targetKcal: number,
  eatenKcal: Record<MealType, number>,
): Record<MealType, number | null> {
  const left = targetKcal - MEAL_TYPES.reduce((sum, m) => sum + eatenKcal[m], 0);
  return Object.fromEntries(
    MEAL_TYPES.map((m) => [
      m,
      left > 0 && eatenKcal[m] <= 0
        ? Math.min(Math.round(left), Math.round(targetKcal * MEAL_SHARES[m]))
        : null,
    ]),
  ) as Record<MealType, number | null>;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Клетчатка и сахар порции; null остаётся null («нет данных»). */
export function scaleExtras(
  per100g: Pick<FoodNutrients, 'fiber' | 'sugar'>,
  grams: number,
): { fiber: number | null; sugar: number | null } {
  const scale = (v: number | null | undefined) => (v == null ? null : round1((v * grams) / 100));
  return { fiber: scale(per100g.fiber), sugar: scale(per100g.sugar) };
}

/** Сумма клетчатки и сахара по записям, где они известны. null, если данных нет ни в одной. */
export function sumExtras(
  items: Pick<FoodNutrients, 'fiber' | 'sugar'>[],
): { fiber: number; sugar: number } | null {
  const known = items.filter((n) => n.fiber != null || n.sugar != null);
  if (known.length === 0) return null;
  return {
    fiber: round1(known.reduce((s, n) => s + (n.fiber ?? 0), 0)),
    sugar: round1(known.reduce((s, n) => s + (n.sugar ?? 0), 0)),
  };
}

export function sumNutrients(items: Nutrients[]): Nutrients {
  return items.reduce(
    (acc, n) => ({
      kcal: acc.kcal + n.kcal,
      protein: Math.round((acc.protein + n.protein) * 10) / 10,
      fat: Math.round((acc.fat + n.fat) * 10) / 10,
      carbs: Math.round((acc.carbs + n.carbs) * 10) / 10,
    }),
    { kcal: 0, protein: 0, fat: 0, carbs: 0 },
  );
}

export interface WeightPlan {
  startWeightKg: number;
  targetWeightKg: number;
  weeklyRateKg: number;
  weeks: number;
  /** Ожидаемая дата достижения цели (YYYY-MM-DD). */
  etaDate: string;
}

/** План веса: сколько недель до цели при выбранном темпе. */
export function weightPlan(profile: Profile, now = new Date()): WeightPlan | null {
  const rate = weeklyRate(profile);
  if (!profile.targetWeightKg || rate === 0) return null;
  const diff = Math.abs(profile.weightKg - profile.targetWeightKg);
  const weeks = Math.ceil(diff / rate);
  const eta = new Date(now.getTime() + weeks * 7 * 24 * 60 * 60 * 1000);
  return {
    startWeightKg: profile.weightKg,
    targetWeightKg: profile.targetWeightKg,
    weeklyRateKg: rate,
    weeks,
    etaDate: eta.toISOString().slice(0, 10),
  };
}
