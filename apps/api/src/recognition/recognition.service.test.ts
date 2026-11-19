import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeRecognition } from './recognition.service.js';

test('sanitizeRecognition clamps values and drops empty items', () => {
  const result = sanitizeRecognition({
    items: [
      {
        name: '  Гречка ',
        grams: 180.6,
        per100g: { kcal: 110.4, protein: 4.23, fat: 1.14, carbs: 21.3 },
      },
      { name: '', grams: 100, per100g: { kcal: 10, protein: 0, fat: 0, carbs: 0 } },
      { name: 'Масло', grams: 0, per100g: { kcal: 900, protein: 0, fat: 100, carbs: 0 } },
      { name: 'Странное', grams: 99999, per100g: { kcal: 5000, protein: -3, fat: 200, carbs: 50 } },
    ],
    note: '  ',
  });
  assert.deepEqual(result, {
    items: [
      { name: 'Гречка', grams: 181, per100g: { kcal: 110, protein: 4.2, fat: 1.1, carbs: 21.3 } },
      { name: 'Странное', grams: 5000, per100g: { kcal: 900, protein: 0, fat: 100, carbs: 50 } },
    ],
    note: null,
  });
});
