import { test } from 'node:test';
import assert from 'node:assert/strict';
import { currentStreak, streakDto } from './streak.js';

const today = '2026-11-19';

test('currentStreak counts consecutive days ending today', () => {
  assert.equal(currentStreak(new Set(['2026-11-17', '2026-11-18', today]), today), 3);
});

test('currentStreak keeps the streak while today is still empty', () => {
  assert.equal(currentStreak(new Set(['2026-11-17', '2026-11-18']), today), 2);
});

test('currentStreak stops at a gap', () => {
  assert.equal(currentStreak(new Set(['2026-11-15', '2026-11-17', '2026-11-18']), today), 2);
  assert.equal(currentStreak(new Set(['2026-11-16']), today), 0);
});

test('streakDto lists the last seven days ending today', () => {
  const dto = streakDto(new Set([today, '2026-11-13']), today);
  assert.equal(dto.week.length, 7);
  assert.deepEqual(dto.week[0], { date: '2026-11-13', logged: true });
  assert.deepEqual(dto.week[6], { date: today, logged: true });
  assert.equal(dto.current, 1);
});
