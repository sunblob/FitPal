import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { Bot, InlineKeyboard } from 'grammy';
import type { Update } from 'grammy/types';
import { Env } from '../config/env.js';
import { UsersService } from '../users/users.service.js';

export const WEBHOOK_PATH = 'telegram/webhook';

@Injectable()
export class BotService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(BotService.name);
  readonly bot: Bot;

  constructor(
    private readonly env: Env,
    private readonly users: UsersService,
  ) {
    this.bot = new Bot(env.TELEGRAM_BOT_TOKEN);
    this.registerHandlers();
  }

  private registerHandlers() {
    this.bot.command('start', async (ctx) => {
      if (!ctx.from) return;
      const user = await this.users.upsertFromTelegram(ctx.from);
      const name = user.firstName ?? 'друг';

      const keyboard = this.env.MINIAPP_URL
        ? new InlineKeyboard().webApp('Открыть дневник', this.env.MINIAPP_URL)
        : undefined;

      await ctx.reply(
        `Привет, ${name}! Я FitPal и помогу считать калории.\n\n` +
          'Записывай еду вручную, ищи в базе, сканируй штрихкод или просто пришли фото тарелки.',
        { reply_markup: keyboard },
      );
    });

    this.bot.on('message:photo', async (ctx) => {
      await ctx.reply('Распознавание еды по фото скоро появится.');
    });

    this.bot.catch((err) => this.logger.error(err.error, err.stack));
  }

  async onApplicationBootstrap() {
    if (this.env.TELEGRAM_BOT_MODE === 'off') {
      this.logger.warn('Bot is disabled (TELEGRAM_BOT_MODE=off)');
      return;
    }
    await this.bot.init();
    await this.bot.api.setMyCommands([{ command: 'start', description: 'Начать' }]);

    if (this.env.TELEGRAM_BOT_MODE === 'webhook') {
      if (!this.env.PUBLIC_API_URL) throw new Error('PUBLIC_API_URL is required in webhook mode');
      const url = `${this.env.PUBLIC_API_URL.replace(/\/$/, '')}/api/${WEBHOOK_PATH}`;
      await this.bot.api.setWebhook(url, { secret_token: this.env.TELEGRAM_WEBHOOK_SECRET });
      this.logger.log(`Webhook set: ${url}`);
    } else {
      await this.bot.api.deleteWebhook();
      void this.bot.start({
        onStart: (me) => this.logger.log(`Polling as @${me.username}`),
      });
    }
  }

  async onApplicationShutdown() {
    if (this.bot.isRunning()) await this.bot.stop();
  }

  handleUpdate(update: Update) {
    return this.bot.handleUpdate(update);
  }
}
