import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  bmr,
  dailyTarget,
  mealBudgets,
  rescaleNutrients,
  scaleNutrients,
  weightPlan,
} from './nutrition.js';
import type { Profile } from './schemas.js';

const profile: Profile = {
  sex: 'male',
  birthYear: 1996,
  heightCm: 180,
  weightKg: 80,
  activityLevel: 'moderate',
  goal: 'maintain',
};
const now = new Date('2026-06-01');

test('bmr follows Mifflin-St Jeor', () => {
  // 10*80 + 6.25*180 - 5*30 + 5
  assert.equal(bmr(profile, now), 1780);
});

test('dailyTarget applies activity factor', () => {
  assert.equal(dailyTarget(profile, now).kcal, Math.round(1780 * 1.55));
});

test('scaleNutrients scales per-100g values', () => {
  assert.deepEqual(scaleNutrients({ kcal: 343, protein: 12.6, fat: 3.3, carbs: 62.1 }, 150), {
    kcal: 515,
    protein: 18.9,
    fat: 5,
    carbs: 93.2,
  });
});

test('rescaleNutrients recalculates a portion for a new weight', () => {
  const n = scaleNutrients({ kcal: 343, protein: 12.6, fat: 3.3, carbs: 62.1 }, 150);
  assert.deepEqual(rescaleNutrients(n, 150, 300), {
    kcal: 1030,
    protein: 37.8,
    fat: 10,
    carbs: 186.4,
  });
  assert.deepEqual(rescaleNutrients(n, 150, 150), n);
});

test('rescaleNutrients keeps values when the old weight is zero', () => {
  const n = { kcal: 10, protein: 1, fat: 1, carbs: 1 };
  assert.deepEqual(rescaleNutrients(n, 0, 100), n);
});

test('dailyTarget subtracts deficit for weight loss', () => {
  const t = dailyTarget({ ...profile, goal: 'lose', weeklyRateKg: 0.5 }, now);
  assert.equal(t.kcal, Math.round(1780 * 1.55 - (0.5 * 7700) / 7));
});

test('weightPlan estimates weeks to target', () => {
  const plan = weightPlan({ ...profile, goal: 'lose', targetWeightKg: 74, weeklyRateKg: 0.5 }, now);
  assert.equal(plan?.weeks, 12);
  assert.equal(plan?.etaDate, '2026-08-24');
});

test('mealBudgets gives empty meals their usual share of the target', () => {
  const b = mealBudgets(2000, { breakfast: 500, lunch: 0, dinner: 0, snack: 0 });
  assert.deepEqual(b, { breakfast: null, lunch: 700, dinner: 600, snack: 200 });
});

test('mealBudgets never offers more than is left', () => {
  const b = mealBudgets(2000, { breakfast: 900, lunch: 900, dinner: 0, snack: 0 });
  assert.deepEqual(b, { breakfast: null, lunch: null, dinner: 200, snack: 200 });
});

test('mealBudgets gives nothing when the target is reached', () => {
  const b = mealBudgets(1000, { breakfast: 600, lunch: 500, dinner: 0, snack: 0 });
  assert.deepEqual(b, { breakfast: null, lunch: null, dinner: null, snack: null });
});
