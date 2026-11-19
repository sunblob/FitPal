import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseOffProduct, preferCountries, type OffProduct } from './open-food-facts.js';

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
      countries: [],
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

test('falls back to Slovak name and keeps countries', () => {
  const p = parseOffProduct({
    code: '8586000000000',
    product_name_sk: 'Ryža guľatozrnná',
    countries_tags: ['en:slovakia', 1],
    nutriments: { 'energy-kcal_100g': 350 },
  });
  assert.equal(p?.name, 'Ryža guľatozrnná');
  assert.deepEqual(p?.countries, ['en:slovakia']);
});

test('preferCountries moves Slovak products first and keeps order', () => {
  const p = (barcode: string, countries: string[]): OffProduct => ({
    barcode,
    name: barcode,
    brand: null,
    countries,
    per100g: { kcal: 1, protein: 0, fat: 0, carbs: 0 },
  });
  const sorted = preferCountries(
    [p('1', ['en:russia']), p('2', ['en:slovakia']), p('3', []), p('4', ['en:czech-republic'])],
    ['en:slovakia', 'en:czech-republic'],
  );
  assert.deepEqual(
    sorted.map((x) => x.barcode),
    ['2', '4', '1', '3'],
  );
});
