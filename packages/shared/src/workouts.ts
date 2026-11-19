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

export const MUSCLE_LABELS_RU: Record<Muscle, string> = {
  abdominals: 'Пресс',
  abductors: 'Отводящие бедра',
  adductors: 'Приводящие бедра',
  biceps: 'Бицепс',
  calves: 'Икры',
  chest: 'Грудь',
  forearms: 'Предплечья',
  glutes: 'Ягодицы',
  hamstrings: 'Бицепс бедра',
  lats: 'Широчайшие',
  'lower back': 'Поясница',
  'middle back': 'Середина спины',
  neck: 'Шея',
  quadriceps: 'Квадрицепс',
  shoulders: 'Плечи',
  traps: 'Трапеции',
  triceps: 'Трицепс',
};

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

export const EQUIPMENT_LABELS_RU: Record<Equipment | 'body only', string> = {
  'body only': 'Свой вес',
  barbell: 'Штанга',
  dumbbell: 'Гантели',
  kettlebells: 'Гири',
  cable: 'Блочные тренажёры',
  machine: 'Тренажёры',
  bands: 'Резинки',
  'medicine ball': 'Медбол',
  'exercise ball': 'Фитбол',
  'foam roll': 'Ролик',
  'e-z curl bar': 'EZ-гриф',
  other: 'Другое (турник, брусья, скамья)',
};

export const exerciseLevelSchema = z.enum(['beginner', 'intermediate', 'expert']);
export type ExerciseLevel = z.infer<typeof exerciseLevelSchema>;

export const LEVEL_LABELS_RU: Record<ExerciseLevel, string> = {
  beginner: 'Новичок',
  intermediate: 'Средний',
  expert: 'Продвинутый',
};

export const workoutGoalSchema = z.enum([
  'strength',
  'hypertrophy',
  'fat_loss',
  'endurance',
  'general',
]);
export type WorkoutGoal = z.infer<typeof workoutGoalSchema>;

export const WORKOUT_GOAL_LABELS_RU: Record<WorkoutGoal, string> = {
  hypertrophy: 'Набор мышц',
  strength: 'Сила',
  fat_loss: 'Похудение',
  endurance: 'Выносливость',
  general: 'Общая форма',
};

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
  /** Инструкции на русском, если уже переведены, иначе на английском. */
  instructions: string[];
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
