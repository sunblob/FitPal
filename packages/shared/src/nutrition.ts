import type { ActivityLevel, Goal, Nutrients, Profile } from './schemas.js';

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
