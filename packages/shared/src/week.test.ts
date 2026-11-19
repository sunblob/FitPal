import { test } from 'node:test';
import assert from 'node:assert/strict';
import { averageOfLogged, macroShares } from './week.js';

test('macroShares splits calories by macro and sums to 100', () => {
  // 100 г белка = 400 ккал, 50 г жира = 450, 100 г углеводов = 400
  assert.deepEqual(macroShares({ protein: 100, fat: 50, carbs: 100 }), {
    protein: 32,
    fat: 36,
    carbs: 32,
  });
  const s = macroShares({ protein: 13, fat: 7, carbs: 31 });
  assert.equal(s.protein + s.fat + s.carbs, 100);
});

test('macroShares is all zeros without food', () => {
  assert.deepEqual(macroShares({ protein: 0, fat: 0, carbs: 0 }), {
    protein: 0,
    fat: 0,
    carbs: 0,
  });
});

test('averageOfLogged skips empty days', () => {
  const day = (kcal: number) => ({ nutrients: { kcal, protein: kcal / 10, fat: 0, carbs: 0 } });
  assert.deepEqual(averageOfLogged([day(2000), day(0), day(1000)]), {
    kcal: 1500,
    protein: 150,
    fat: 0,
    carbs: 0,
  });
  assert.equal(averageOfLogged([day(0)]), null);
});
