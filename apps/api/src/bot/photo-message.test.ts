import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatRecognition } from './photo-message.js';

test('formatRecognition lists items and totals', () => {
  const text = formatRecognition({
    items: [
      {
        name: 'Гречка отварная',
        grams: 200,
        per100g: { kcal: 110, protein: 4.2, fat: 1.1, carbs: 21.3 },
      },
      { name: 'Котлета', grams: 100, per100g: { kcal: 250, protein: 15, fat: 18, carbs: 8 } },
    ],
    note: 'Вес примерный',
  });
  assert.match(text, /• Гречка отварная, 200 г: 220 ккал/);
  assert.match(text, /Итого 470 ккал · Б 23.4 · Ж 20.2 · У 50.6/);
  assert.match(text, /Вес примерный/);
});

test('formatRecognition explains empty result', () => {
  assert.equal(formatRecognition({ items: [], note: 'На фото кот' }), 'На фото кот');
});

test('formatRecognition uses text wording for descriptions', () => {
  const text = formatRecognition(
    {
      items: [{ name: 'Борщ', grams: 300, per100g: { kcal: 50, protein: 2, fat: 2.5, carbs: 5 } }],
      note: null,
    },
    'text',
  );
  assert.match(text, /^Вот как я это посчитал:/);
  assert.match(text, /• Борщ, 300 г: 150 ккал/);
  assert.match(formatRecognition({ items: [], note: null }, 'text'), /Опиши подробнее/);
});
