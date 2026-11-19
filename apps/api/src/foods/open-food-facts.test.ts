import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseOffProduct } from './open-food-facts.js';

test('parses product with kcal and prefers Russian name', () => {
  assert.deepEqual(
    parseOffProduct({
      code: '4607065597672',
      product_name: 'Buckwheat',
      product_name_ru: 'Гречка ядрица',
      brands: 'Мистраль, Mistral',
      nutriments: {
        'energy-kcal_100g': 343,
        proteins_100g: 12.6,
        fat_100g: '3.3',
        carbohydrates_100g: 62.14,
      },
    }),
    {
      barcode: '4607065597672',
      name: 'Гречка ядрица',
      brand: 'Мистраль',
      per100g: { kcal: 343, protein: 12.6, fat: 3.3, carbs: 62.1 },
    },
  );
});

test('falls back to kJ when kcal is missing', () => {
  const p = parseOffProduct({
    code: '12345678',
    product_name: 'Milk',
    nutriments: { energy_100g: 268 },
  });
  assert.equal(p?.per100g.kcal, 64);
  assert.equal(p?.brand, null);
});

test('rejects products without name or energy', () => {
  assert.equal(parseOffProduct({ code: '12345678', nutriments: { 'energy-kcal_100g': 10 } }), null);
  assert.equal(parseOffProduct({ code: '12345678', product_name: 'X', nutriments: {} }), null);
  assert.equal(
    parseOffProduct({ code: 'abc', product_name: 'X', nutriments: { 'energy-kcal_100g': 1 } }),
    null,
  );
});
