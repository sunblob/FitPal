import { test } from 'node:test';
import assert from 'node:assert/strict';
import { logStepsSchema, stepsBonusKcal, stepsKcal } from './steps.js';

test('stepsKcal scales with steps and weight', () => {
  assert.equal(stepsKcal(10_000, 80), 400);
  assert.equal(stepsKcal(0, 80), 0);
  assert.equal(stepsKcal(5_000, 60), 150);
});

test('stepsKcal falls back to 70 kg without weight', () => {
  assert.equal(stepsKcal(10_000, null), 350);
});

test('logStepsSchema rejects fractional and negative steps', () => {
  assert.equal(logStepsSchema.safeParse({ steps: 8000 }).success, true);
  assert.equal(logStepsSchema.safeParse({ steps: -1 }).success, false);
  assert.equal(logStepsSchema.safeParse({ steps: 10.5 }).success, false);
});

test('stepsBonusKcal counts only steps above the everyday 5000', () => {
  assert.equal(stepsBonusKcal(4_000, 80), 0);
  assert.equal(stepsBonusKcal(15_000, 80), stepsKcal(10_000, 80));
});
