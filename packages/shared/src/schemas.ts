import { z } from 'zod';

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
