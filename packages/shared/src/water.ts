import { z } from 'zod';

/** Один стакан в счётчике воды. */
export const GLASS_ML = 250;

export const logWaterSchema = z.object({
  ml: z.number().int().min(0).max(10_000),
  /** Дата в формате YYYY-MM-DD, по умолчанию сегодня. */
  date: z.iso.date().optional(),
});
export type LogWater = z.infer<typeof logWaterSchema>;

export const waterDayQuerySchema = z.object({ date: z.iso.date() });

export interface WaterLogDto {
  date: string;
  ml: number;
}

/**
 * Ориентир воды на день: около 30 мл на килограмм веса, округлено до стакана,
 * в пределах 1,5–3,5 л. Без веса — 2 л.
 */
export function waterGoalMl(weightKg: number | null | undefined): number {
  if (!weightKg || weightKg <= 0) return 2000;
  const ml = Math.round((weightKg * 30) / GLASS_ML) * GLASS_ML;
  return Math.min(3500, Math.max(1500, ml));
}
