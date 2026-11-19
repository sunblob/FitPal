import { z } from 'zod';

/** Цель по шагам на день, пока пользователь не задаёт свою. */
export const DEFAULT_STEPS_GOAL = 10_000;

export const logStepsSchema = z.object({
  steps: z.number().int().min(0).max(100_000),
  /** Дата в формате YYYY-MM-DD, по умолчанию сегодня. */
  date: z.iso.date().optional(),
});
export type LogSteps = z.infer<typeof logStepsSchema>;

export interface StepLogDto {
  date: string;
  steps: number;
}

/**
 * Примерный расход на ходьбу: около 0.5 ккал на килограмм веса за 1000 шагов
 * (≈ 40 ккал на 1000 шагов при 80 кг). Это оценка, норма калорий от неё не меняется:
 * бытовая активность уже заложена в коэффициент активности профиля.
 */
export function stepsKcal(steps: number, weightKg: number | null | undefined): number {
  const kg = weightKg && weightKg > 0 ? weightKg : 70;
  return Math.round(steps * kg * 0.0005);
}

export const updateStepsKcalSchema = z.object({ addStepsKcal: z.boolean() });
export type UpdateStepsKcal = z.infer<typeof updateStepsKcalSchema>;

/** Обычная бытовая ходьба уже заложена в коэффициент активности профиля. */
export const STEPS_BASELINE = 5000;

/**
 * Сколько калорий прибавить к норме за шаги, если это включено в профиле:
 * только за шаги сверх обычных 5000, чтобы не посчитать активность дважды.
 */
export function stepsBonusKcal(steps: number, weightKg: number | null | undefined): number {
  return stepsKcal(Math.max(0, steps - STEPS_BASELINE), weightKg);
}
