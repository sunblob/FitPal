import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { and, eq, isNotNull, sql } from 'drizzle-orm';
import { GrammyError } from 'grammy';
import { Env } from '../config/env.js';
import { DB, type Database } from '../db/db.module.js';
import { closedDays, diaryEntries, users, type User } from '../db/schema.js';
import { DiaryService } from '../diary/diary.service.js';
import { BotService } from './bot.service.js';
import { BOT_TEXT } from './messages.js';

const CHECK_EVERY_MS = 10 * 60 * 1000;
/** Напоминаем только тем, кто пользуется дневником: была запись за последние две недели. */
const ACTIVE_WITHIN = sql`interval '14 days'`;

/**
 * Вечернее напоминание в боте, если за сегодня ничего не записано и день не отмечен
 * заполненным. Час выбирает пользователь (по умолчанию 20:00 по его времени), не чаще раза в день.
 */
@Injectable()
export class RemindersService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(RemindersService.name);
  private timer: NodeJS.Timeout | undefined;
  private running = false;

  constructor(
    private readonly env: Env,
    @Inject(DB) private readonly db: Database,
    private readonly bot: BotService,
    private readonly diary: DiaryService,
  ) {}

  onApplicationBootstrap() {
    if (this.env.TELEGRAM_BOT_MODE === 'off') return;
    this.timer = setInterval(() => void this.tick(), CHECK_EVERY_MS);
    this.timer.unref();
    void this.tick();
  }

  onApplicationShutdown() {
    clearInterval(this.timer);
  }

  /** Пользователи, которым пора напомнить прямо сейчас. */
  dueUsers(): Promise<User[]> {
    const tz = users.timezone;
    const localToday = sql`(now() at time zone ${tz})::date`;
    return this.db
      .select()
      .from(users)
      .where(
        and(
          isNotNull(users.reminderHour),
          sql`extract(hour from now() at time zone ${tz}) >= ${users.reminderHour}`,
          sql`(${users.lastReminderOn} is null or ${users.lastReminderOn} < ${localToday})`,
          sql`not exists (select 1 from ${diaryEntries} where ${diaryEntries.userId} = ${users.id}
                and (${diaryEntries.eatenAt} at time zone ${tz})::date = ${localToday})`,
          sql`not exists (select 1 from ${closedDays} where ${closedDays.userId} = ${users.id}
                and ${closedDays.date} = ${localToday})`,
          sql`exists (select 1 from ${diaryEntries} where ${diaryEntries.userId} = ${users.id}
                and ${diaryEntries.eatenAt} > now() - ${ACTIVE_WITHIN})`,
        ),
      );
  }

  async tick() {
    if (this.running) return;
    this.running = true;
    try {
      for (const user of await this.dueUsers()) await this.remind(user);
    } catch (e) {
      this.logger.error(`Reminders failed: ${(e as Error).message}`);
    } finally {
      this.running = false;
    }
  }

  private async remind(user: User) {
    // Сначала отмечаем, чтобы при ошибке отправки не слать повторно каждые 10 минут
    await this.db
      .update(users)
      .set({ lastReminderOn: sql`(now() at time zone ${user.timezone})::date` })
      .where(eq(users.id, user.id));
    const { current } = await this.diary.streak(user);
    const text = BOT_TEXT[user.language];
    try {
      await this.bot.bot.api.sendMessage(user.telegramId, text.reminder(current), {
        reply_markup: this.bot.miniAppKeyboard(user.language),
      });
    } catch (e) {
      // Пользователь заблокировал бота: больше не напоминаем
      if (e instanceof GrammyError && e.error_code === 403) {
        await this.db.update(users).set({ reminderHour: null }).where(eq(users.id, user.id));
      } else {
        this.logger.warn(`Reminder to ${user.id} failed: ${(e as Error).message}`);
      }
    }
  }
}
