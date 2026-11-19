import { test } from 'node:test';
import assert from 'node:assert/strict';
import { logExerciseSchema, summarizeExerciseLogs, type ExerciseLogDto } from './workouts.js';

const log = (date: string, exerciseId: string, sets: number | null): ExerciseLogDto => ({
  date,
  exerciseId,
  name: exerciseId,
  sets,
  planId: null,
  doneAt: `${date}T10:00:00.000Z`,
});

test('summarizeExerciseLogs groups by day and sums sets', () => {
  const summary = summarizeExerciseLogs([
    log('2026-11-19', 'squat', 4),
    log('2026-11-18', 'push-up', 3),
    log('2026-11-19', 'plank', null),
    log('2026-11-19', 'row', 3),
  ]);
  assert.deepEqual(summary, [
    { date: '2026-11-18', exercises: 1, sets: 3 },
    { date: '2026-11-19', exercises: 3, sets: 7 },
  ]);
});

test('logExerciseSchema validates sets range', () => {
  assert.equal(logExerciseSchema.safeParse({ exerciseId: 'Squat', sets: 3 }).success, true);
  assert.equal(logExerciseSchema.safeParse({ exerciseId: 'Squat', sets: 0 }).success, false);
  assert.equal(logExerciseSchema.safeParse({ exerciseId: '' }).success, false);
});
