import type { FoodDto, Language } from '@fitpal/shared';
import type { Food } from '../db/schema.js';

/** Название продукта на языке пользователя: английское есть только у встроенного справочника. */
export function localizedFoodName(
  food: { name: string; nameEn: string | null },
  lang: Language,
): string {
  return lang === 'en' && food.nameEn ? food.nameEn : food.name;
}

export function toFoodDto(food: Food, lang: Language): FoodDto {
  return {
    id: food.id,
    name: localizedFoodName(food, lang),
    brand: food.brand,
    barcode: food.barcode,
    source: food.source,
    imageUrl: food.imageUrl,
    category: food.category,
    per100g: { kcal: food.kcal, protein: food.protein, fat: food.fat, carbs: food.carbs },
  };
}
