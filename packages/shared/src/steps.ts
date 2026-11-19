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
