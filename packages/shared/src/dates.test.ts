import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, todayIn } from './dates.js';

test('todayIn respects timezone', () => {
  const now = new Date('2026-11-19T23:30:00Z');
  assert.equal(todayIn('UTC', now), '2026-11-19');
  assert.equal(todayIn('Europe/Bratislava', now), '2026-11-20');
});

test('addDays crosses month boundary', () => {
  assert.equal(addDays('2026-11-30', 1), '2026-12-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
});
