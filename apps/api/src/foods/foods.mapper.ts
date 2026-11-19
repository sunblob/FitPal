import type { FoodDto } from '@fitpal/shared';
import type { Food } from '../db/schema.js';

export function toFoodDto(food: Food): FoodDto {
  return {
    id: food.id,
    name: food.name,
    brand: food.brand,
    barcode: food.barcode,
    source: food.source,
    per100g: { kcal: food.kcal, protein: food.protein, fat: food.fat, carbs: food.carbs },
  };
}
