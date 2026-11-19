import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, gte, lte } from 'drizzle-orm';
import type { StepLogDto } from '@fitpal/shared';
import { DB, type Database } from '../db/db.module.js';
import { stepLogs } from '../db/schema.js';

@Injectable()
export class StepsService {
  constructor(@Inject(DB) private readonly db: Database) {}

  /** Записывает шаги за день. Повторная запись за тот же день перезаписывает значение. */
  async log(userId: string, steps: number, date: string): Promise<StepLogDto> {
    const [entry] = await this.db
      .insert(stepLogs)
      .values({ userId, date, steps })
      .onConflictDoUpdate({ target: [stepLogs.userId, stepLogs.date], set: { steps } })
      .returning({ date: stepLogs.date, steps: stepLogs.steps });
    return entry!;
  }

  history(userId: string, from?: string, to?: string): Promise<StepLogDto[]> {
    return this.db
      .select({ date: stepLogs.date, steps: stepLogs.steps })
      .from(stepLogs)
      .where(
        and(
          eq(stepLogs.userId, userId),
          from ? gte(stepLogs.date, from) : undefined,
          to ? lte(stepLogs.date, to) : undefined,
        ),
      )
      .orderBy(asc(stepLogs.date));
  }
}
