import { z } from 'zod';

function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export const sexSchema = z.enum(['male', 'female']);
export type Sex = z.infer<typeof sexSchema>;

export const activityLevelSchema = z.enum([
  'sedentary',
  'light',
  'moderate',
  'active',
  'very_active',
]);
export type ActivityLevel = z.infer<typeof activityLevelSchema>;

export const goalSchema = z.enum(['lose', 'maintain', 'gain']);
export type Goal = z.infer<typeof goalSchema>;

export const profileSchema = z.object({
  sex: sexSchema,
  birthYear: z.number().int().min(1900).max(2100),
  heightCm: z.number().min(100).max(250),
  weightKg: z.number().min(30).max(300),
  activityLevel: activityLevelSchema,
  goal: goalSchema,
  /** Целевой вес для плана похудения или набора. */
  targetWeightKg: z.number().min(30).max(300).optional(),
  /** Желаемый темп, кг в неделю (0.25–1). */
  weeklyRateKg: z.number().min(0.1).max(1).optional(),
  /** IANA-таймзона, чтобы правильно резать дни в дневнике. */
  timezone: z.string().min(1).max(64).refine(isValidTimezone, 'Unknown timezone').optional(),
});
export type Profile = z.infer<typeof profileSchema>;

/** Пищевая ценность на 100 г продукта. */
export const nutrientsSchema = z.object({
  kcal: z.number().min(0),
  protein: z.number().min(0),
  fat: z.number().min(0),
  carbs: z.number().min(0),
});
export type Nutrients = z.infer<typeof nutrientsSchema>;

export const foodSourceSchema = z.enum(['manual', 'openfoodfacts', 'builtin', 'ai']);
export type FoodSource = z.infer<typeof foodSourceSchema>;

export const mealTypeSchema = z.enum(['breakfast', 'lunch', 'dinner', 'snack']);
export type MealType = z.infer<typeof mealTypeSchema>;

export const createDiaryEntrySchema = z.object({
  foodId: z.uuid().optional(),
  name: z.string().min(1).max(200),
  grams: z.number().positive().max(5000),
  per100g: nutrientsSchema,
  meal: mealTypeSchema,
  eatenAt: z.iso.datetime().optional(),
});
export type CreateDiaryEntry = z.infer<typeof createDiaryEntrySchema>;

export const logWeightSchema = z.object({
  weightKg: z.number().min(30).max(300),
  /** Дата в формате YYYY-MM-DD, по умолчанию сегодня. */
  date: z.iso.date().optional(),
});
export type LogWeight = z.infer<typeof logWeightSchema>;

export const MEAL_TYPES = mealTypeSchema.options;
export const MEAL_LABELS_RU: Record<MealType, string> = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
  dinner: 'Ужин',
  snack: 'Перекус',
};

export const ACTIVITY_LABELS_RU: Record<ActivityLevel, string> = {
  sedentary: 'Сидячий образ жизни',
  light: 'Лёгкая активность (1–3 тренировки в неделю)',
  moderate: 'Средняя (3–5 тренировок)',
  active: 'Высокая (6–7 тренировок)',
  very_active: 'Очень высокая (физическая работа + спорт)',
};

export const GOAL_LABELS_RU: Record<Goal, string> = {
  lose: 'Похудеть',
  maintain: 'Держать вес',
  gain: 'Набрать',
};

/** Дата дня в формате YYYY-MM-DD. */
export const dayQuerySchema = z.object({
  date: z.iso.date(),
});
export type DayQuery = z.infer<typeof dayQuerySchema>;

/** EAN-8, UPC-A, EAN-13, GTIN-14. */
export const barcodeSchema = z.string().regex(/^\d{8,14}$/, 'Invalid barcode');

export const createFoodSchema = z.object({
  name: z.string().trim().min(1).max(200),
  brand: z.string().trim().max(200).optional(),
  /** Штрихкод отсканированного товара: по нему продукт найдётся при следующем скане. */
  barcode: barcodeSchema.optional(),
  per100g: nutrientsSchema,
});
export type CreateFood = z.infer<typeof createFoodSchema>;

export const foodSearchQuerySchema = z.object({
  q: z.string().trim().max(100).default(''),
});
export type FoodSearchQuery = z.infer<typeof foodSearchQuerySchema>;

export interface FoodDto {
  id: string;
  name: string;
  brand: string | null;
  barcode: string | null;
  source: FoodSource;
  /** Фото товара (Open Food Facts), если есть. */
  imageUrl: string | null;
  /** Группа встроенного справочника для иконки: vegetables, dairy… */
  category: string | null;
  per100g: Nutrients;
}

export interface DiaryEntryDto {
  id: string;
  foodId: string | null;
  name: string;
  meal: MealType;
  grams: number;
  eatenAt: string;
  nutrients: Nutrients;
  /** Фото и группа продукта, если запись сделана из базы продуктов. */
  imageUrl: string | null;
  category: string | null;
}

export interface DiaryDayDto {
  date: string;
  target: Nutrients | null;
  totals: Nutrients;
  meals: Record<MealType, { entries: DiaryEntryDto[]; totals: Nutrients }>;
}

export const barcodeParamSchema = z.object({ code: barcodeSchema });
export type BarcodeParam = z.infer<typeof barcodeParamSchema>;

/** Одно блюдо, распознанное на фото. КБЖУ на 100 г, вес порции оценён моделью. */
export const recognizedFoodSchema = z.object({
  name: z.string(),
  grams: z.number(),
  per100g: nutrientsSchema,
});
export type RecognizedFood = z.infer<typeof recognizedFoodSchema>;

export const photoRecognitionSchema = z.object({
  items: z.array(recognizedFoodSchema),
  /** Пояснение, если еды на фото нет или оценка ненадёжна. */
  note: z.string().nullable(),
});
export type PhotoRecognition = z.infer<typeof photoRecognitionSchema>;

export const imageMediaTypeSchema = z.enum(['image/jpeg', 'image/png', 'image/webp']);
export type ImageMediaType = z.infer<typeof imageMediaTypeSchema>;

/** Максимальный размер фото в base64 (~5 МБ исходника). */
export const MAX_IMAGE_BASE64_LENGTH = 7_000_000;

export const recognizePhotoSchema = z.object({
  mediaType: imageMediaTypeSchema,
  /** Картинка в base64 без префикса data:. */
  data: z
    .string()
    .min(100)
    .max(MAX_IMAGE_BASE64_LENGTH)
    .regex(/^[A-Za-z0-9+/]+=*$/, 'Invalid base64'),
  /** Необязательная подсказка пользователя: «овсянка на воде, 300 г». */
  hint: z.string().trim().max(300).optional(),
});
export type RecognizePhoto = z.infer<typeof recognizePhotoSchema>;

/** Таблица пищевой ценности с упаковки: значения на 100 г. */
export const nutritionLabelSchema = z.object({
  /** Название товара, если оно видно на фото. */
  name: z.string().nullable(),
  brand: z.string().nullable(),
  /** null, если таблицу не удалось прочитать. */
  per100g: nutrientsSchema.nullable(),
  note: z.string().nullable(),
});
export type NutritionLabel = z.infer<typeof nutritionLabelSchema>;

/** Описание еды словами: «борщ со сметаной и кусок чёрного хлеба». */
export const recognizeTextSchema = z.object({
  text: z.string().trim().min(2).max(500),
});
export type RecognizeText = z.infer<typeof recognizeTextSchema>;
