import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lowestWithin, weeklyChange } from './weight-stats.js';

const logs = [
  { date: '2026-11-01', weightKg: 80 },
  { date: '2026-11-08', weightKg: 79.4 },
  { date: '2026-11-12', weightKg: 78.9 },
  { date: '2026-11-15', weightKg: 79.2 },
];

test('lowestWithin finds the minimum in the last 10 days', () => {
  assert.deepEqual(lowestWithin(logs, '2026-11-19'), { date: '2026-11-12', weightKg: 78.9 });
  assert.equal(lowestWithin(logs, '2026-12-30'), null);
});

test('weeklyChange compares with a weigh-in at least a week earlier', () => {
  // 15.11 против 08.11
  assert.equal(weeklyChange(logs), -0.2);
  assert.equal(weeklyChange([{ date: '2026-11-15', weightKg: 79 }]), null);
});
