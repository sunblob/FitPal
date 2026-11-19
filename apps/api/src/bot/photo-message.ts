import {
  MEAL_LABELS_RU,
  scaleNutrients,
  sumNutrients,
  type PhotoRecognition,
} from '@fitpal/shared';

/** Текст ответа бота с распознанными блюдами. */
export function formatRecognition(result: PhotoRecognition): string {
  if (result.items.length === 0) {
    return result.note ?? 'Не нашёл еды на фото. Попробуй снять поближе.';
  }
  const portions = result.items.map((i) => ({ item: i, n: scaleNutrients(i.per100g, i.grams) }));
  const total = sumNutrients(portions.map((p) => p.n));
  const lines = portions.map(({ item, n }) => `• ${item.name}, ${item.grams} г: ${n.kcal} ккал`);
  return [
    'Вот что я вижу:',
    ...lines,
    '',
    `Итого ${total.kcal} ккал · Б ${total.protein} · Ж ${total.fat} · У ${total.carbs}`,
    ...(result.note ? ['', result.note] : []),
    '',
    'Куда записать?',
  ].join('\n');
}

export const MEAL_BUTTONS = (
  Object.entries(MEAL_LABELS_RU) as [keyof typeof MEAL_LABELS_RU, string][]
).map(([meal, label]) => ({ meal, label }));
