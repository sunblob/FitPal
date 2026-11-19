import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { dailyTarget, type Profile } from '@fitpal/shared';
import type { TelegramUser } from '../auth/init-data.js';
import { DB, type Database } from '../db/db.module.js';
import { users, weightLogs, type User } from '../db/schema.js';

@Injectable()
export class UsersService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async upsertFromTelegram(tg: TelegramUser): Promise<User> {
    const values = {
      telegramId: tg.id,
      username: tg.username ?? null,
      firstName: tg.first_name ?? null,
      languageCode: tg.language_code ?? null,
    };
    const [user] = await this.db
      .insert(users)
      .values(values)
      .onConflictDoUpdate({ target: users.telegramId, set: values })
      .returning();
    return user!;
  }

  async findByTelegramId(telegramId: number): Promise<User | undefined> {
    return this.db.query.users.findFirst({ where: eq(users.telegramId, telegramId) });
  }

  /** Сохраняет профиль, пересчитывает дневную норму и записывает вес за сегодня. */
  async updateProfile(userId: string, profile: Profile): Promise<User> {
    const target = dailyTarget(profile);
    const date = new Date().toISOString().slice(0, 10);
    return this.db.transaction(async (tx) => {
      await tx
        .insert(weightLogs)
        .values({ userId, date, weightKg: profile.weightKg })
        .onConflictDoUpdate({
          target: [weightLogs.userId, weightLogs.date],
          set: { weightKg: profile.weightKg },
        });
      const [user] = await tx
        .update(users)
        .set({
          ...profile,
          targetKcal: target.kcal,
          targetProtein: target.protein,
          targetFat: target.fat,
          targetCarbs: target.carbs,
        })
        .where(eq(users.id, userId))
        .returning();
      return user!;
    });
  }
}
