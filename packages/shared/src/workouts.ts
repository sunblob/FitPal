import { z } from 'zod';

/** Мышечные группы в терминах free-exercise-db. */
export const muscleSchema = z.enum([
  'abdominals',
  'abductors',
  'adductors',
  'biceps',
  'calves',
  'chest',
  'forearms',
  'glutes',
  'hamstrings',
  'lats',
  'lower back',
  'middle back',
  'neck',
  'quadriceps',
  'shoulders',
  'traps',
  'triceps',
]);
export type Muscle = z.infer<typeof muscleSchema>;

/** Инвентарь, доступный пользователю. «body only» есть всегда. */
export const equipmentSchema = z.enum([
  'barbell',
  'dumbbell',
  'kettlebells',
  'cable',
  'machine',
  'bands',
  'medicine ball',
  'exercise ball',
  'foam roll',
  'e-z curl bar',
  'other',
]);
export type Equipment = z.infer<typeof equipmentSchema>;

export const exerciseLevelSchema = z.enum(['beginner', 'intermediate', 'expert']);
export type ExerciseLevel = z.infer<typeof exerciseLevelSchema>;

export const workoutGoalSchema = z.enum([
  'strength',
  'hypertrophy',
  'fat_loss',
  'endurance',
  'general',
]);
export type WorkoutGoal = z.infer<typeof workoutGoalSchema>;

/** Запрос на генерацию плана тренировок. */
export const generateWorkoutPlanSchema = z.object({
  goal: workoutGoalSchema,
  level: exerciseLevelSchema,
  daysPerWeek: z.number().int().min(1).max(7),
  sessionMinutes: z.number().int().min(15).max(150),
  muscles: z.array(muscleSchema).min(1),
  equipment: z.array(equipmentSchema),
  /** Свободный текст: травмы, любимые упражнения, пожелания. */
  notes: z.string().max(500).optional(),
});
export type GenerateWorkoutPlan = z.infer<typeof generateWorkoutPlanSchema>;

/** Упражнение в плане, как его хранит сервер (ссылка на каталог по id). */
export const planExerciseSchema = z.object({
  exerciseId: z.string(),
  sets: z.number().int(),
  /** Повторения или время, например «8–12» или «30 сек». */
  reps: z.string(),
  restSec: z.number().int(),
  notes: z.string(),
});
export type PlanExercise = z.infer<typeof planExerciseSchema>;

export const planDaySchema = z.object({
  name: z.string(),
  focus: z.string(),
  exercises: z.array(planExerciseSchema),
});
export type PlanDay = z.infer<typeof planDaySchema>;

export const workoutPlanBodySchema = z.object({
  title: z.string(),
  summary: z.string(),
  days: z.array(planDaySchema),
  tips: z.array(z.string()),
});
export type WorkoutPlanBody = z.infer<typeof workoutPlanBodySchema>;

/** Упражнение из каталога в виде, удобном для Mini App. */
export interface ExerciseDto {
  id: string;
  name: string;
  nameEn: string;
  level: string | null;
  equipment: string | null;
  category: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  /** Абсолютные URL картинок: начало и конец движения. */
  images: string[];
  /** Инструкции на языке пользователя; для русского, пока нет перевода, на английском. */
  instructions: string[];
  /** Язык `instructions`: 'en', пока русский перевод ещё не готов. */
  instructionsLang: 'ru' | 'en';
  youtubeUrl: string;
}

export interface WorkoutPlanSummaryDto {
  id: string;
  title: string;
  summary: string;
  daysCount: number;
  createdAt: string;
}

export interface WorkoutPlanDto extends WorkoutPlanSummaryDto {
  params: GenerateWorkoutPlan;
  days: Array<{
    name: string;
    focus: string;
    exercises: Array<Omit<PlanExercise, 'exerciseId'> & { exercise: ExerciseDto }>;
  }>;
  tips: string[];
}

/** Отметка «упражнение сделано» за день. Повторная отметка за тот же день обновляет подходы. */
export const logExerciseSchema = z.object({
  exerciseId: z.string().min(1).max(200),
  /** Дата в формате YYYY-MM-DD, по умолчанию сегодня. */
  date: z.iso.date().optional(),
  /** Сколько подходов сделано, обычно берётся из плана. */
  sets: z.number().int().min(1).max(20).optional(),
  planId: z.uuid().optional(),
});
export type LogExercise = z.infer<typeof logExerciseSchema>;

export interface ExerciseLogDto {
  date: string;
  exerciseId: string;
  name: string;
  sets: number | null;
  planId: string | null;
  doneAt: string;
}

/** Итоги тренировок за день: сколько упражнений и подходов отмечено. */
export interface WorkoutDaySummary {
  date: string;
  exercises: number;
  sets: number;
}

/** Сводка по дням из списка отметок, дни по возрастанию. */
export function summarizeExerciseLogs(logs: ExerciseLogDto[]): WorkoutDaySummary[] {
  const byDate = new Map<string, WorkoutDaySummary>();
  for (const log of logs) {
    const day = byDate.get(log.date) ?? { date: log.date, exercises: 0, sets: 0 };
    day.exercises += 1;
    day.sets += log.sets ?? 0;
    byDate.set(log.date, day);
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}
