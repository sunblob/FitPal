import {
  bigint,
  date,
  uniqueIndex,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import type { GenerateWorkoutPlan, WorkoutPlanBody } from '@fitpal/shared';

export const sexEnum = pgEnum('sex', ['male', 'female']);
export const activityEnum = pgEnum('activity_level', [
  'sedentary',
  'light',
  'moderate',
  'active',
  'very_active',
]);
export const goalEnum = pgEnum('goal', ['lose', 'maintain', 'gain']);
export const foodSourceEnum = pgEnum('food_source', ['manual', 'openfoodfacts', 'builtin', 'ai']);
export const mealEnum = pgEnum('meal_type', ['breakfast', 'lunch', 'dinner', 'snack']);

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  telegramId: bigint('telegram_id', { mode: 'number' }).notNull().unique(),
  username: text('username'),
  firstName: text('first_name'),
  languageCode: text('language_code'),
  sex: sexEnum('sex'),
  birthYear: integer('birth_year'),
  heightCm: real('height_cm'),
  weightKg: real('weight_kg'),
  activityLevel: activityEnum('activity_level'),
  goal: goalEnum('goal'),
  targetWeightKg: real('target_weight_kg'),
  weeklyRateKg: real('weekly_rate_kg'),
  targetKcal: integer('target_kcal'),
  targetProtein: integer('target_protein'),
  targetFat: integer('target_fat'),
  targetCarbs: integer('target_carbs'),
  timezone: text('timezone').notNull().default('Europe/Moscow'),
  ...timestamps,
});

/** Продукты: свои, кэш из Open Food Facts, встроенный справочник. Значения на 100 г. */
export const foods = pgTable(
  'foods',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    brand: text('brand'),
    barcode: text('barcode').unique(),
    /** Ключ встроенного справочника (usda:<fdc_id> или ref:<slug>), по нему обновляется сид. */
    externalId: text('external_id').unique(),
    /** Синонимы через запятую, участвуют в поиске. */
    aliases: text('aliases'),
    /** Нормализованные название, синонимы и бренд (см. foods/search-text.ts). */
    searchText: text('search_text'),
    /** Порядок во встроенном справочнике: самые обычные продукты группы идут первыми. */
    sortOrder: integer('sort_order'),
    source: foodSourceEnum('source').notNull(),
    ownerId: uuid('owner_id').references(() => users.id, { onDelete: 'cascade' }),
    kcal: real('kcal').notNull(),
    protein: real('protein').notNull(),
    fat: real('fat').notNull(),
    carbs: real('carbs').notNull(),
    ...timestamps,
  },
  (t) => [index('foods_name_idx').on(t.name)],
);

/** Записи дневника. КБЖУ копируются, чтобы правка продукта не меняла историю. */
export const diaryEntries = pgTable(
  'diary_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    foodId: uuid('food_id').references(() => foods.id, { onDelete: 'set null' }),
    name: text('name').notNull(),
    meal: mealEnum('meal').notNull(),
    grams: real('grams').notNull(),
    kcal: real('kcal').notNull(),
    protein: real('protein').notNull(),
    fat: real('fat').notNull(),
    carbs: real('carbs').notNull(),
    eatenAt: timestamp('eaten_at', { withTimezone: true }).notNull().defaultNow(),
    ...timestamps,
  },
  (t) => [index('diary_user_eaten_idx').on(t.userId, t.eatenAt)],
);

/** Взвешивания: одна запись на день, для графика веса. */
export const weightLogs = pgTable(
  'weight_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    date: date('date', { mode: 'string' }).notNull(),
    weightKg: real('weight_kg').notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex('weight_logs_user_date_idx').on(t.userId, t.date)],
);

/** Шаги за день, вводятся вручную: одна запись на день. */
export const stepLogs = pgTable(
  'step_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    date: date('date', { mode: 'string' }).notNull(),
    steps: integer('steps').notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex('step_logs_user_date_idx').on(t.userId, t.date)],
);

/** Каталог упражнений (импорт из free-exercise-db, id — slug оттуда). */
export const exercises = pgTable(
  'exercises',
  {
    id: text('id').primaryKey(),
    nameEn: text('name_en').notNull(),
    nameRu: text('name_ru'),
    force: text('force'),
    level: text('level'),
    mechanic: text('mechanic'),
    equipment: text('equipment'),
    category: text('category'),
    primaryMuscles: text('primary_muscles').array().notNull(),
    secondaryMuscles: text('secondary_muscles').array().notNull(),
    instructionsEn: jsonb('instructions_en').$type<string[]>().notNull(),
    instructionsRu: jsonb('instructions_ru').$type<string[]>(),
    /** Относительные пути картинок в репозитории free-exercise-db. */
    images: text('images').array().notNull(),
    ...timestamps,
  },
  (t) => [index('exercises_primary_muscles_idx').using('gin', t.primaryMuscles)],
);

/** Планы тренировок, сгенерированные Claude. */
export const workoutPlans = pgTable(
  'workout_plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    /** Параметры запроса (GenerateWorkoutPlan). */
    params: jsonb('params').$type<GenerateWorkoutPlan>().notNull(),
    /** План со ссылками на exercises.id (WorkoutPlanBody). */
    plan: jsonb('plan').$type<WorkoutPlanBody>().notNull(),
    ...timestamps,
  },
  (t) => [index('workout_plans_user_idx').on(t.userId, t.createdAt)],
);

export type User = typeof users.$inferSelect;
export type Food = typeof foods.$inferSelect;
export type DiaryEntry = typeof diaryEntries.$inferSelect;
export type WeightLog = typeof weightLogs.$inferSelect;
export type StepLog = typeof stepLogs.$inferSelect;
export type Exercise = typeof exercises.$inferSelect;
export type WorkoutPlan = typeof workoutPlans.$inferSelect;
