import { test } from 'node:test';
import assert from 'node:assert/strict';
import { waterGoalMl } from './water.js';

test('waterGoalMl is about 30 ml per kg rounded to a glass', () => {
  assert.equal(waterGoalMl(80), 2500);
  assert.equal(waterGoalMl(70), 2000);
});

test('waterGoalMl stays between 1.5 and 3.5 litres and defaults to 2', () => {
  assert.equal(waterGoalMl(40), 1500);
  assert.equal(waterGoalMl(150), 3500);
  assert.equal(waterGoalMl(null), 2000);
});
