import {
  MEAL_LABELS,
  MEAL_TYPES,
  scaleNutrients,
  sumNutrients,
  type Language,
  type PhotoRecognition,
} from '@fitpal/shared';
import { BOT_TEXT } from './messages.js';

/** Текст ответа бота с распознанными блюдами. */
export function formatRecognition(
  result: PhotoRecognition,
  source: 'photo' | 'text' = 'photo',
  lang: Language = 'ru',
): string {
  const t = BOT_TEXT[lang];
  if (result.items.length === 0) {
    return result.note ?? (source === 'photo' ? t.noFoodPhoto : t.noFoodText);
  }
  const portions = result.items.map((i) => ({ item: i, n: scaleNutrients(i.per100g, i.grams) }));
  const total = sumNutrients(portions.map((p) => p.n));
  const lines = portions.map(({ item, n }) => t.item(item.name, item.grams, n.kcal));
  return [
    source === 'photo' ? t.seePhoto : t.seeText,
    ...lines,
    '',
    t.total(total.kcal, total.protein, total.fat, total.carbs),
    ...(result.note ? ['', result.note] : []),
    '',
    t.whereToSave,
  ].join('\n');
}

/** Кнопки приёмов пищи на языке пользователя. */
export function mealButtons(lang: Language) {
  return MEAL_TYPES.map((meal) => ({ meal, label: MEAL_LABELS[lang][meal] }));
}
