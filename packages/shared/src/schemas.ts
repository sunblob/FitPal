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

/**
 * КБЖУ плюс клетчатка и сахар. Они известны не для всех продуктов (есть у Open Food Facts
 * и у своих продуктов, если их ввели), поэтому null — «нет данных», а не ноль.
 * Отдельная схема: nutrientsSchema уходит в structured output ИИ и меняться не должна.
 */
export const foodNutrientsSchema = nutrientsSchema.extend({
  fiber: z.number().min(0).nullable().optional(),
  sugar: z.number().min(0).nullable().optional(),
});
export type FoodNutrients = z.infer<typeof foodNutrientsSchema>;

export const foodSourceSchema = z.enum(['manual', 'openfoodfacts', 'builtin', 'ai']);
export type FoodSource = z.infer<typeof foodSourceSchema>;

export const mealTypeSchema = z.enum(['breakfast', 'lunch', 'dinner', 'snack']);
export type MealType = z.infer<typeof mealTypeSchema>;

export const createDiaryEntrySchema = z.object({
  foodId: z.uuid().optional(),
  name: z.string().min(1).max(200),
  grams: z.number().positive().max(5000),
  per100g: foodNutrientsSchema,
  meal: mealTypeSchema,
  eatenAt: z.iso.datetime().optional(),
});
export type CreateDiaryEntry = z.infer<typeof createDiaryEntrySchema>;

/** Правка записи дневника: вес порции, приём пищи, время. КБЖУ пересчитываются по весу. */
export const updateDiaryEntrySchema = z
  .object({
    grams: z.number().positive().max(5000),
    meal: mealTypeSchema,
    eatenAt: z.iso.datetime(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');
export type UpdateDiaryEntry = z.infer<typeof updateDiaryEntrySchema>;

/** Повтор записей из другого дня: весь день или один приём пищи. */
export const copyDiarySchema = z
  .object({
    fromDate: z.iso.date(),
    toDate: z.iso.date(),
    meal: mealTypeSchema.optional(),
  })
  .refine((v) => v.fromDate !== v.toDate, 'Dates must differ');
export type CopyDiary = z.infer<typeof copyDiarySchema>;

export const logWeightSchema = z.object({
  weightKg: z.number().min(30).max(300),
  /** Дата в формате YYYY-MM-DD, по умолчанию сегодня. */
  date: z.iso.date().optional(),
});
export type LogWeight = z.infer<typeof logWeightSchema>;

export const MEAL_TYPES = mealTypeSchema.options;

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
  per100g: foodNutrientsSchema,
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
  per100g: FoodNutrients;
}

export interface DiaryEntryDto {
  id: string;
  foodId: string | null;
  name: string;
  meal: MealType;
  grams: number;
  eatenAt: string;
  nutrients: FoodNutrients;
  /** Фото и группа продукта, если запись сделана из базы продуктов. */
  imageUrl: string | null;
  category: string | null;
}

/** Недавно съеденное: продукт из базы или запись без продукта (фото, ИИ). */
export interface RecentFoodDto {
  foodId: string | null;
  name: string;
  brand: string | null;
  imageUrl: string | null;
  category: string | null;
  per100g: FoodNutrients;
  /** Вес последней порции, его предлагаем по умолчанию. */
  lastGrams: number;
}

export interface DiaryDayDto {
  date: string;
  /** Пользователь отметил день как заполненный. */
  closed: boolean;
  target: Nutrients | null;
  totals: Nutrients;
  /** Клетчатка и сахар за день по записям, где они известны; null — данных нет ни в одной. */
  fiberSugar: { fiber: number; sugar: number } | null;
  /** Калории от шагов, прибавленные к норме (если включено в профиле). */
  stepsBonusKcal: number;
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
