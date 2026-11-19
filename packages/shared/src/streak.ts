import { z } from 'zod';
import { addDays } from './dates.js';

/** Отметка «день заполнен» (или снятие отметки). */
export const closeDaySchema = z.object({
  date: z.iso.date(),
  closed: z.boolean(),
});
export type CloseDay = z.infer<typeof closeDaySchema>;

/** Уведомления бота: что присылать и в котором часу (по местному времени). */
export const updateNotificationsSchema = z
  .object({
    dailyReminder: z.boolean(),
    weeklySummary: z.boolean(),
    reminderHour: z.number().int().min(0).max(23),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');
export type UpdateNotifications = z.infer<typeof updateNotificationsSchema>;

export const DEFAULT_REMINDER_HOUR = 20;

export interface StreakDto {
  /** Сколько дней подряд есть записи (или день отмечен заполненным). */
  current: number;
  /** Последние 7 дней, сегодня последний. */
  week: { date: string; logged: boolean }[];
}

/**
 * Серия дней подряд с записями. Сегодня ещё не закончилось, поэтому пустой сегодняшний день
 * серию не обрывает: считаем от вчера.
 */
export function currentStreak(logged: ReadonlySet<string>, today: string): number {
  let day = logged.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (logged.has(day)) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}

export function streakDto(logged: ReadonlySet<string>, today: string): StreakDto {
  return {
    current: currentStreak(logged, today),
    week: Array.from({ length: 7 }, (_, i) => {
      const date = addDays(today, i - 6);
      return { date, logged: logged.has(date) };
    }),
  };
}
