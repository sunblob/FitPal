import { z } from 'zod';
import {
  activityLevelSchema,
  foodSourceSchema,
  goalSchema,
  mealTypeSchema,
  sexSchema,
} from './schemas.js';
import { languageSchema } from './i18n.js';

/** Данные от Telegram Login Widget: https://core.telegram.org/widgets/login#receiving-authorization-data */
export const adminLoginSchema = z.object({
  id: z.number().int(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  username: z.string().optional(),
  photo_url: z.string().optional(),
  auth_date: z.number().int(),
  hash: z.string().regex(/^[0-9a-f]{64}$/),
});
export type AdminLogin = z.infer<typeof adminLoginSchema>;

export interface AdminSession {
  token: string;
  expiresAt: string;
  telegramId: number;
  name: string;
}

export const ADMIN_PAGE_SIZES = [25, 50, 100] as const;

export const adminListQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export type AdminListQuery = z.infer<typeof adminListQuerySchema>;

export const adminFoodsQuerySchema = adminListQuerySchema.extend({
  source: foodSourceSchema.optional(),
});
export const adminDiaryQuerySchema = adminListQuerySchema.extend({
  userId: z.uuid().optional(),
});

export interface AdminPage<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

const nullableText = z.string().trim().max(500).nullable();
const nullableNumber = z.number().nullable();

export const adminUserUpdateSchema = z
  .object({
    username: nullableText,
    firstName: nullableText,
    language: languageSchema,
    sex: sexSchema.nullable(),
    birthYear: z.number().int().min(1900).max(2100).nullable(),
    heightCm: nullableNumber,
    weightKg: nullableNumber,
    activityLevel: activityLevelSchema.nullable(),
    goal: goalSchema.nullable(),
    targetWeightKg: nullableNumber,
    weeklyRateKg: nullableNumber,
    targetKcal: z.number().int().nullable(),
    targetProtein: z.number().int().nullable(),
    targetFat: z.number().int().nullable(),
    targetCarbs: z.number().int().nullable(),
    timezone: z.string().min(1).max(100),
  })
  .partial();
export type AdminUserUpdate = z.infer<typeof adminUserUpdateSchema>;

const macros = {
  kcal: z.number().min(0).max(10000),
  protein: z.number().min(0).max(1000),
  fat: z.number().min(0).max(1000),
  carbs: z.number().min(0).max(1000),
};

const adminFoodFields = z.object({
  name: z.string().trim().min(1).max(300),
  nameEn: nullableText.optional(),
  brand: nullableText.optional(),
  barcode: z.string().trim().max(50).nullable().optional(),
  aliases: nullableText.optional(),
  category: nullableText.optional(),
  imageUrl: z.url().nullable().optional(),
  source: foodSourceSchema,
  ...macros,
});
export const adminFoodCreateSchema = adminFoodFields.extend({
  source: foodSourceSchema.default('manual'),
});
// Не через create.partial(): иначе default('manual') перезапишет источник при любой правке
export const adminFoodUpdateSchema = adminFoodFields.partial();
export type AdminFoodCreate = z.infer<typeof adminFoodCreateSchema>;
export type AdminFoodUpdate = z.infer<typeof adminFoodUpdateSchema>;

export const adminExerciseUpdateSchema = z
  .object({
    nameEn: z.string().trim().min(1).max(300),
    nameRu: nullableText,
    level: nullableText,
    category: nullableText,
    equipment: nullableText,
    force: nullableText,
    mechanic: nullableText,
    instructionsEn: z.array(z.string().max(2000)).max(50),
    instructionsRu: z.array(z.string().max(2000)).max(50).nullable(),
  })
  .partial();
export type AdminExerciseUpdate = z.infer<typeof adminExerciseUpdateSchema>;

export const adminDiaryUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(300),
    meal: mealTypeSchema,
    grams: z.number().min(0).max(100000),
    ...macros,
    eatenAt: z.iso.datetime({ offset: true }),
  })
  .partial();
export type AdminDiaryUpdate = z.infer<typeof adminDiaryUpdateSchema>;

export interface AdminDayStat {
  date: string;
  signups: number;
  activeUsers: number;
  diaryEntries: number;
  aiRequests: number;
}

export interface AdminStats {
  users: { total: number; activeToday: number; active7d: number; new7d: number; new30d: number };
  diary: { total: number; today: number; last7d: number };
  ai: {
    today: number;
    last7d: number;
    last30d: number;
    failed7d: number;
    inputTokens30d: number;
    outputTokens30d: number;
    byKind30d: { kind: string; count: number }[];
  };
  catalog: { foods: number; exercises: number; workoutPlans: number };
  /** Последние 30 дней по UTC, от старых к новым. */
  daily: AdminDayStat[];
}
