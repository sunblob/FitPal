import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adminFoodCreateSchema, adminFoodUpdateSchema } from './admin.js';

test('food update keeps only the sent fields', () => {
  assert.deepEqual(adminFoodUpdateSchema.parse({ brand: 'Tesco' }), { brand: 'Tesco' });
});

test('food create defaults source to manual', () => {
  const food = adminFoodCreateSchema.parse({ name: 'X', kcal: 1, protein: 0, fat: 0, carbs: 0 });
  assert.equal(food.source, 'manual');
});
