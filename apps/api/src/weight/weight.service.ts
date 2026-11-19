import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, gte, lte } from 'drizzle-orm';
import { DB, type Database } from '../db/db.module.js';
import { users, weightLogs, type WeightLog } from '../db/schema.js';

const today = () => new Date().toISOString().slice(0, 10);

@Injectable()
export class WeightService {
  constructor(@Inject(DB) private readonly db: Database) {}

  /**
   * Записывает вес за день (повторная запись за тот же день перезаписывает).
   * Если это самое свежее взвешивание, обновляет текущий вес в профиле.
   */
  async log(userId: string, weightKg: number, date = today()): Promise<WeightLog> {
    return this.db.transaction(async (tx) => {
      const [entry] = await tx
        .insert(weightLogs)
        .values({ userId, date, weightKg })
        .onConflictDoUpdate({ target: [weightLogs.userId, weightLogs.date], set: { weightKg } })
        .returning();

      const [latest] = await tx
        .select({ date: weightLogs.date })
        .from(weightLogs)
        .where(eq(weightLogs.userId, userId))
        .orderBy(desc(weightLogs.date))
        .limit(1);
      if (latest?.date === date) {
        await tx.update(users).set({ weightKg }).where(eq(users.id, userId));
      }
      return entry!;
    });
  }

  history(userId: string, from?: string, to?: string): Promise<WeightLog[]> {
    return this.db
      .select()
      .from(weightLogs)
      .where(
        and(
          eq(weightLogs.userId, userId),
          from ? gte(weightLogs.date, from) : undefined,
          to ? lte(weightLogs.date, to) : undefined,
        ),
      )
      .orderBy(asc(weightLogs.date));
  }
}
