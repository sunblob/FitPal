import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { WaterLogDto } from '@fitpal/shared';
import { DB, type Database } from '../db/db.module.js';
import { waterLogs } from '../db/schema.js';

@Injectable()
export class WaterService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async day(userId: string, date: string): Promise<WaterLogDto> {
    const [row] = await this.db
      .select({ ml: waterLogs.ml })
      .from(waterLogs)
      .where(and(eq(waterLogs.userId, userId), eq(waterLogs.date, date)));
    return { date, ml: row?.ml ?? 0 };
  }

  /** Сохраняет итог за день: клиент присылает общее количество, а не прибавку. */
  async log(userId: string, ml: number, date: string): Promise<WaterLogDto> {
    const [row] = await this.db
      .insert(waterLogs)
      .values({ userId, date, ml })
      .onConflictDoUpdate({ target: [waterLogs.userId, waterLogs.date], set: { ml } })
      .returning({ date: waterLogs.date, ml: waterLogs.ml });
    return row!;
  }
}
