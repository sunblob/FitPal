import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, gte, lte } from 'drizzle-orm';
import type { ExerciseLogDto, LogExercise } from '@fitpal/shared';
import { DB, type Database } from '../db/db.module.js';
import { exerciseLogs, exercises } from '../db/schema.js';

@Injectable()
export class WorkoutLogService {
  constructor(@Inject(DB) private readonly db: Database) {}

  /** Отмечает упражнение сделанным за день. Повторная отметка обновляет подходы. */
  async log(userId: string, input: LogExercise & { date: string }): Promise<ExerciseLogDto> {
    const [exercise] = await this.db
      .select({ id: exercises.id })
      .from(exercises)
      .where(eq(exercises.id, input.exerciseId));
    if (!exercise) throw new NotFoundException('Упражнение не найдено');

    const values = { sets: input.sets ?? null, planId: input.planId ?? null };
    await this.db
      .insert(exerciseLogs)
      .values({ userId, date: input.date, exerciseId: input.exerciseId, ...values })
      .onConflictDoUpdate({
        target: [exerciseLogs.userId, exerciseLogs.date, exerciseLogs.exerciseId],
        set: values,
      });
    const [row] = await this.list(userId, input.date, input.date, input.exerciseId);
    return row!;
  }

  async unlog(userId: string, exerciseId: string, date: string): Promise<void> {
    await this.db
      .delete(exerciseLogs)
      .where(
        and(
          eq(exerciseLogs.userId, userId),
          eq(exerciseLogs.date, date),
          eq(exerciseLogs.exerciseId, exerciseId),
        ),
      );
  }

  async list(
    userId: string,
    from?: string,
    to?: string,
    exerciseId?: string,
  ): Promise<ExerciseLogDto[]> {
    const rows = await this.db
      .select({
        date: exerciseLogs.date,
        exerciseId: exerciseLogs.exerciseId,
        nameEn: exercises.nameEn,
        nameRu: exercises.nameRu,
        sets: exerciseLogs.sets,
        planId: exerciseLogs.planId,
        doneAt: exerciseLogs.createdAt,
      })
      .from(exerciseLogs)
      .innerJoin(exercises, eq(exercises.id, exerciseLogs.exerciseId))
      .where(
        and(
          eq(exerciseLogs.userId, userId),
          from ? gte(exerciseLogs.date, from) : undefined,
          to ? lte(exerciseLogs.date, to) : undefined,
          exerciseId ? eq(exerciseLogs.exerciseId, exerciseId) : undefined,
        ),
      )
      .orderBy(asc(exerciseLogs.date), asc(exerciseLogs.createdAt));
    return rows.map(({ nameEn, nameRu, doneAt, ...r }) => ({
      ...r,
      name: nameRu ?? nameEn,
      doneAt: doneAt.toISOString(),
    }));
  }
}
