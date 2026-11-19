import { z } from 'zod';
import type { ActivityLevel, Goal, MealType } from './schemas.js';
import type { Equipment, ExerciseLevel, Muscle, WorkoutGoal } from './workouts.js';

/** Язык интерфейса и ответов ИИ. */
export const languageSchema = z.enum(['en', 'ru']);
export type Language = z.infer<typeof languageSchema>;
export const LANGUAGES = languageSchema.options;

export const updateLanguageSchema = z.object({ language: languageSchema });
export type UpdateLanguage = z.infer<typeof updateLanguageSchema>;

/** Языки Telegram, для которых по умолчанию показываем русский интерфейс. */
const RUSSIAN_DEFAULT = new Set(['ru', 'uk', 'be', 'kk', 'ky', 'uz', 'tg', 'hy', 'az', 'ka']);

/** Язык по умолчанию из language_code Telegram: русский для русскоязычных регионов, иначе английский. */
export function languageFromTelegram(code: string | null | undefined): Language {
  const base = code?.toLowerCase().split(/[-_]/)[0];
  return base && RUSSIAN_DEFAULT.has(base) ? 'ru' : 'en';
}

export const LANGUAGE_NAMES: Record<Language, string> = { en: 'English', ru: 'Русский' };

/** Локаль для Intl (даты, числа). */
export const LOCALES: Record<Language, string> = { en: 'en-GB', ru: 'ru-RU' };

export const MEAL_LABELS: Record<Language, Record<MealType, string>> = {
  ru: { breakfast: 'Завтрак', lunch: 'Обед', dinner: 'Ужин', snack: 'Перекус' },
  en: { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' },
};

export const ACTIVITY_LABELS: Record<Language, Record<ActivityLevel, string>> = {
  ru: {
    sedentary: 'Сидячий образ жизни',
    light: 'Лёгкая активность (1–3 тренировки в неделю)',
    moderate: 'Средняя (3–5 тренировок)',
    active: 'Высокая (6–7 тренировок)',
    very_active: 'Очень высокая (физическая работа + спорт)',
  },
  en: {
    sedentary: 'Sedentary',
    light: 'Light (1–3 workouts a week)',
    moderate: 'Moderate (3–5 workouts)',
    active: 'High (6–7 workouts)',
    very_active: 'Very high (physical job + sport)',
  },
};

export const GOAL_LABELS: Record<Language, Record<Goal, string>> = {
  ru: { lose: 'Похудеть', maintain: 'Держать вес', gain: 'Набрать' },
  en: { lose: 'Lose weight', maintain: 'Maintain', gain: 'Gain weight' },
};

export const MUSCLE_LABELS: Record<Language, Record<Muscle, string>> = {
  ru: {
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
  },
  en: {
    abdominals: 'Abs',
    abductors: 'Abductors',
    adductors: 'Adductors',
    biceps: 'Biceps',
    calves: 'Calves',
    chest: 'Chest',
    forearms: 'Forearms',
    glutes: 'Glutes',
    hamstrings: 'Hamstrings',
    lats: 'Lats',
    'lower back': 'Lower back',
    'middle back': 'Middle back',
    neck: 'Neck',
    quadriceps: 'Quads',
    shoulders: 'Shoulders',
    traps: 'Traps',
    triceps: 'Triceps',
  },
};

export const EQUIPMENT_LABELS: Record<Language, Record<Equipment | 'body only', string>> = {
  ru: {
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
  },
  en: {
    'body only': 'Bodyweight',
    barbell: 'Barbell',
    dumbbell: 'Dumbbells',
    kettlebells: 'Kettlebells',
    cable: 'Cable machines',
    machine: 'Machines',
    bands: 'Bands',
    'medicine ball': 'Medicine ball',
    'exercise ball': 'Exercise ball',
    'foam roll': 'Foam roller',
    'e-z curl bar': 'EZ bar',
    other: 'Other (pull-up bar, dip bars, bench)',
  },
};

export const LEVEL_LABELS: Record<Language, Record<ExerciseLevel, string>> = {
  ru: { beginner: 'Новичок', intermediate: 'Средний', expert: 'Продвинутый' },
  en: { beginner: 'Beginner', intermediate: 'Intermediate', expert: 'Advanced' },
};

export const WORKOUT_GOAL_LABELS: Record<Language, Record<WorkoutGoal, string>> = {
  ru: {
    hypertrophy: 'Набор мышц',
    strength: 'Сила',
    fat_loss: 'Похудение',
    endurance: 'Выносливость',
    general: 'Общая форма',
  },
  en: {
    hypertrophy: 'Muscle gain',
    strength: 'Strength',
    fat_loss: 'Fat loss',
    endurance: 'Endurance',
    general: 'General fitness',
  },
};
