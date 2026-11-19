import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { Bot, InlineKeyboard, type Context } from 'grammy';
import type { Update } from 'grammy/types';
import { mealTypeSchema, scaleNutrients, sumNutrients, type RecognizedFood } from '@fitpal/shared';
import { Env } from '../config/env.js';
import { DiaryService } from '../diary/diary.service.js';
import { RecognitionService } from '../recognition/recognition.service.js';
import { UsersService } from '../users/users.service.js';
import { MEAL_BUTTONS, formatRecognition } from './photo-message.js';

/** Распознанные, но ещё не записанные фото. Живут в памяти: после рестарта пользователь пришлёт фото заново. */
interface PendingPhoto {
  userId: string;
  items: RecognizedFood[];
  expiresAt: number;
}
const PENDING_TTL_MS = 60 * 60 * 1000;

export const WEBHOOK_PATH = 'telegram/webhook';

@Injectable()
export class BotService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(BotService.name);
  readonly bot: Bot;

  private readonly pending = new Map<string, PendingPhoto>();

  constructor(
    private readonly env: Env,
    private readonly users: UsersService,
    private readonly recognition: RecognitionService,
    private readonly diary: DiaryService,
  ) {
    this.bot = new Bot(env.TELEGRAM_BOT_TOKEN);
    this.registerHandlers();
  }

  private registerHandlers() {
    this.bot.command('start', async (ctx) => {
      if (!ctx.from) return;
      const user = await this.users.upsertFromTelegram(ctx.from);
      const name = user.firstName ?? 'друг';

      const keyboard = this.miniAppKeyboard();

      await ctx.reply(
        `Привет, ${name}! Я FitPal и помогу считать калории.\n\n` +
          'Записывай еду вручную, ищи в базе, сканируй штрихкод или просто пришли фото тарелки.',
        { reply_markup: keyboard },
      );
    });

    this.bot.on('message:photo', (ctx) => this.onPhoto(ctx));
    this.bot.callbackQuery(/^ph:(\w+):(\w+)$/, (ctx) => this.onPhotoChoice(ctx));

    this.bot.catch((err) => this.logger.error(err.error, err.stack));
  }

  private miniAppKeyboard() {
    return this.env.MINIAPP_URL
      ? new InlineKeyboard().webApp('Открыть дневник', this.env.MINIAPP_URL)
      : undefined;
  }

  private async onPhoto(ctx: Context) {
    const photo = ctx.message?.photo?.at(-1);
    if (!ctx.from || !photo) return;
    if (!this.recognition.enabled) {
      await ctx.reply('Распознавание по фото пока не настроено.');
      return;
    }
    const user = await this.users.upsertFromTelegram(ctx.from);
    const status = await ctx.reply('Смотрю на фото…');

    try {
      const file = await ctx.api.getFile(photo.file_id);
      const res = await fetch(
        `https://api.telegram.org/file/bot${this.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`,
      );
      if (!res.ok) throw new Error(`Telegram file download failed: ${res.status}`);
      const data = Buffer.from(await res.arrayBuffer()).toString('base64');

      const result = await this.recognition.recognize(
        user.id,
        { mediaType: 'image/jpeg', data },
        ctx.message?.caption,
      );
      const text = formatRecognition(result);
      if (result.items.length === 0) {
        await ctx.api.editMessageText(status.chat.id, status.message_id, text);
        return;
      }

      this.cleanupPending();
      const id = randomBytes(6).toString('hex');
      this.pending.set(id, {
        userId: user.id,
        items: result.items,
        expiresAt: Date.now() + PENDING_TTL_MS,
      });

      const keyboard = new InlineKeyboard();
      MEAL_BUTTONS.forEach(({ meal, label }, i) => {
        keyboard.text(label, `ph:${id}:${meal}`);
        if (i % 2 === 1) keyboard.row();
      });
      keyboard.text('Не записывать', `ph:${id}:cancel`);
      await ctx.api.editMessageText(status.chat.id, status.message_id, text, {
        reply_markup: keyboard,
      });
    } catch (e) {
      this.logger.error(`Photo recognition failed: ${(e as Error).message}`);
      const message =
        (e as { status?: number }).status === 429
          ? 'Слишком много фото за час, попробуй позже.'
          : 'Не получилось распознать фото. Попробуй ещё раз или добавь еду в дневнике.';
      await ctx.api.editMessageText(status.chat.id, status.message_id, message);
    }
  }

  private async onPhotoChoice(ctx: Context) {
    const [, id, choice] = ctx.match as RegExpMatchArray;
    const entry = id ? this.pending.get(id) : undefined;
    if (!entry || entry.expiresAt < Date.now()) {
      await ctx.answerCallbackQuery({ text: 'Это фото уже неактуально, пришли его ещё раз.' });
      return;
    }
    this.pending.delete(id!);

    if (choice === 'cancel') {
      await ctx.answerCallbackQuery();
      await ctx.editMessageReplyMarkup();
      return;
    }
    const meal = mealTypeSchema.parse(choice);
    for (const item of entry.items) {
      await this.diary.add(entry.userId, { ...item, meal });
    }
    const total = sumNutrients(entry.items.map((i) => scaleNutrients(i.per100g, i.grams)));
    const label = MEAL_BUTTONS.find((b) => b.meal === meal)?.label.toLowerCase() ?? meal;
    await ctx.answerCallbackQuery({ text: 'Записал' });
    await ctx.editMessageText(`Записал в ${label}: ${total.kcal} ккал.`, {
      reply_markup: this.miniAppKeyboard(),
    });
  }

  private cleanupPending() {
    const now = Date.now();
    for (const [id, p] of this.pending) if (p.expiresAt < now) this.pending.delete(id);
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
