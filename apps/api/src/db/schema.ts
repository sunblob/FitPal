import {
  bigint,
  boolean,
  date,
  uniqueIndex,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
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
export const languageEnum = pgEnum('language', ['en', 'ru']);
export const aiRequestKindEnum = pgEnum('ai_request_kind', [
  'photo',
  'label',
  'text',
  'workout_plan',
  'translation',
]);

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
  /** Язык интерфейса, бота и ответов ИИ. При регистрации берётся из language_code. */
  language: languageEnum('language').notNull().default('en'),
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
  /** Последний запрос из Mini App или сообщение боту, для статистики активности. */
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
  /** Напоминание, если за день ничего не записано. */
  dailyReminder: boolean('daily_reminder').notNull().default(true),
  /** Итоги недели по воскресеньям. */
  weeklySummary: boolean('weekly_summary').notNull().default(true),
  /** Час уведомлений бота по местному времени. */
  reminderHour: integer('reminder_hour').notNull().default(20),
  /** Местная дата последнего напоминания, чтобы не слать дважды за день. */
  lastReminderOn: date('last_reminder_on', { mode: 'string' }),
  /** Местная дата последнего воскресного итога недели. */
  lastWeeklyReportOn: date('last_weekly_report_on', { mode: 'string' }),
  /** Прибавлять к норме калории за шаги сверх обычных 5000. */
  addStepsKcal: boolean('add_steps_kcal').notNull().default(false),
  ...timestamps,
});

/** Продукты: свои, кэш из Open Food Facts, встроенный справочник. Значения на 100 г. */
export const foods = pgTable(
  'foods',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    /** Английское название (есть у встроенного справочника), для пользователей с English. */
    nameEn: text('name_en'),
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
    /** Картинка товара из Open Food Facts (маленькая, с их CDN). */
    imageUrl: text('image_url'),
    /** Группа встроенного справочника (vegetables, dairy…), по ней Mini App выбирает иконку. */
    category: text('category'),
    source: foodSourceEnum('source').notNull(),
    ownerId: uuid('owner_id').references(() => users.id, { onDelete: 'cascade' }),
    kcal: real('kcal').notNull(),
    protein: real('protein').notNull(),
    fat: real('fat').notNull(),
    carbs: real('carbs').notNull(),
    /** Клетчатка и сахар на 100 г; null — нет данных. */
    fiber: real('fiber'),
    sugar: real('sugar'),
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
    fiber: real('fiber'),
    sugar: real('sugar'),
    eatenAt: timestamp('eaten_at', { withTimezone: true }).notNull().defaultNow(),
    ...timestamps,
  },
  (t) => [index('diary_user_eaten_idx').on(t.userId, t.eatenAt)],
);

/** Дни, которые пользователь отметил как заполненные («всё записал»). */
export const closedDays = pgTable(
  'closed_days',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    date: date('date', { mode: 'string' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.date] })],
);

/** Избранные продукты пользователя: показываются отдельной вкладкой в поиске. */
export const favoriteFoods = pgTable(
  'favorite_foods',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    foodId: uuid('food_id')
      .notNull()
      .references(() => foods.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.foodId] })],
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

/** Выпитая вода за день, одна запись на день. */
export const waterLogs = pgTable(
  'water_logs',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    date: date('date', { mode: 'string' }).notNull(),
    ml: integer('ml').notNull(),
    ...timestamps,
  },
  (t) => [primaryKey({ columns: [t.userId, t.date] })],
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

/** Отметки «упражнение сделано»: одна запись на упражнение в день. */
export const exerciseLogs = pgTable(
  'exercise_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    date: date('date', { mode: 'string' }).notNull(),
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercises.id, { onDelete: 'cascade' }),
    planId: uuid('plan_id').references(() => workoutPlans.id, { onDelete: 'set null' }),
    sets: integer('sets'),
    ...timestamps,
  },
  (t) => [uniqueIndex('exercise_logs_user_date_exercise_idx').on(t.userId, t.date, t.exerciseId)],
);

/** Журнал запросов к Claude: для статистики в админке. */
export const aiRequests = pgTable(
  'ai_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    kind: aiRequestKindEnum('kind').notNull(),
    model: text('model').notNull(),
    inputTokens: integer('input_tokens').notNull().default(0),
    outputTokens: integer('output_tokens').notNull().default(0),
    ok: boolean('ok').notNull(),
    durationMs: integer('duration_ms').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('ai_requests_created_idx').on(t.createdAt)],
);

export type User = typeof users.$inferSelect;
export type Food = typeof foods.$inferSelect;
export type DiaryEntry = typeof diaryEntries.$inferSelect;
export type WeightLog = typeof weightLogs.$inferSelect;
export type StepLog = typeof stepLogs.$inferSelect;
export type Exercise = typeof exercises.$inferSelect;
export type WorkoutPlan = typeof workoutPlans.$inferSelect;
export type ExerciseLog = typeof exerciseLogs.$inferSelect;
export type AiRequest = typeof aiRequests.$inferSelect;
