import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { Bot, InlineKeyboard, type Context } from 'grammy';
import type { Update } from 'grammy/types';
import {
  languageSchema,
  LANGUAGE_NAMES,
  LANGUAGES,
  mealTypeSchema,
  recognizeTextSchema,
  scaleNutrients,
  sumNutrients,
  type Language,
  type PhotoRecognition,
  type RecognizedFood,
} from '@fitpal/shared';
import { Env } from '../config/env.js';
import { DiaryService } from '../diary/diary.service.js';
import { RecognitionService } from '../recognition/recognition.service.js';
import { UsersService } from '../users/users.service.js';
import { BOT_TEXT } from './messages.js';
import { formatRecognition, mealButtons } from './photo-message.js';

/** Распознанная, но ещё не записанная еда. Живёт в памяти: после рестарта пользователь пришлёт её заново. */
interface PendingFood {
  userId: string;
  lang: Language;
  items: RecognizedFood[];
  expiresAt: number;
}
const PENDING_TTL_MS = 60 * 60 * 1000;

export const WEBHOOK_PATH = 'telegram/webhook';

@Injectable()
export class BotService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(BotService.name);
  readonly bot: Bot;

  private readonly pending = new Map<string, PendingFood>();

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
      await ctx.reply(BOT_TEXT[user.language].greeting(user.firstName), {
        reply_markup: this.miniAppKeyboard(user.language),
      });
    });

    this.bot.command('language', async (ctx) => {
      if (!ctx.from) return;
      const user = await this.users.upsertFromTelegram(ctx.from);
      const keyboard = new InlineKeyboard();
      for (const lang of LANGUAGES) keyboard.text(LANGUAGE_NAMES[lang], `lang:${lang}`);
      await ctx.reply(BOT_TEXT[user.language].chooseLanguage, { reply_markup: keyboard });
    });
    this.bot.callbackQuery(/^lang:(\w+)$/, (ctx) => this.onLanguageChoice(ctx));

    this.bot.on('message:photo', (ctx) => this.onPhoto(ctx));
    this.bot.on('message:text', (ctx) => this.onText(ctx));
    this.bot.callbackQuery(/^ph:(\w+):(\w+)$/, (ctx) => this.onPhotoChoice(ctx));

    this.bot.catch((err) => this.logger.error(err.error, err.stack));
  }

  private miniAppKeyboard(lang: Language) {
    return this.env.MINIAPP_URL
      ? new InlineKeyboard().webApp(BOT_TEXT[lang].openDiary, this.env.MINIAPP_URL)
      : undefined;
  }

  private async onLanguageChoice(ctx: Context) {
    const parsed = languageSchema.safeParse((ctx.match as RegExpMatchArray)[1]);
    if (!ctx.from || !parsed.success) return;
    const user = await this.users.upsertFromTelegram(ctx.from);
    await this.users.setLanguage(user.id, parsed.data);
    const t = BOT_TEXT[parsed.data];
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(t.languageSet, { reply_markup: this.miniAppKeyboard(parsed.data) });
  }

  private async onPhoto(ctx: Context) {
    const photo = ctx.message?.photo?.at(-1);
    if (!ctx.from || !photo) return;
    await this.recognizeAndOffer(ctx, 'photo', async (userId, lang) => {
      const file = await ctx.api.getFile(photo.file_id);
      const res = await fetch(
        `https://api.telegram.org/file/bot${this.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`,
      );
      if (!res.ok) throw new Error(`Telegram file download failed: ${res.status}`);
      const data = Buffer.from(await res.arrayBuffer()).toString('base64');
      return this.recognition.recognize(
        userId,
        { mediaType: 'image/jpeg', data },
        lang,
        ctx.message?.caption,
      );
    });
  }

  private async onText(ctx: Context) {
    const text = ctx.message?.text?.trim();
    // Неизвестные команды не отправляем в ИИ
    if (!ctx.from || !text || text.startsWith('/')) return;
    const parsed = recognizeTextSchema.safeParse({ text });
    if (!parsed.success) {
      const user = await this.users.upsertFromTelegram(ctx.from);
      await ctx.reply(BOT_TEXT[user.language].tooLong);
      return;
    }
    await this.recognizeAndOffer(ctx, 'text', (userId, lang) =>
      this.recognition.recognizeText(userId, parsed.data.text, lang),
    );
  }

  /** Общий сценарий для фото и текста: распознать, показать список и кнопки приёмов пищи. */
  private async recognizeAndOffer(
    ctx: Context,
    source: 'photo' | 'text',
    run: (userId: string, lang: Language) => Promise<PhotoRecognition>,
  ) {
    if (!ctx.from) return;
    const user = await this.users.upsertFromTelegram(ctx.from);
    const lang = user.language;
    const t = BOT_TEXT[lang];
    if (!this.recognition.enabled) {
      await ctx.reply(t.aiDisabled);
      return;
    }
    const status = await ctx.reply(source === 'photo' ? t.lookingAtPhoto : t.counting);

    try {
      const result = await run(user.id, lang);
      const text = formatRecognition(result, source, lang);
      if (result.items.length === 0) {
        await ctx.api.editMessageText(status.chat.id, status.message_id, text);
        return;
      }

      this.cleanupPending();
      const id = randomBytes(6).toString('hex');
      this.pending.set(id, {
        userId: user.id,
        lang,
        items: result.items,
        expiresAt: Date.now() + PENDING_TTL_MS,
      });

      const keyboard = new InlineKeyboard();
      mealButtons(lang).forEach(({ meal, label }, i) => {
        keyboard.text(label, `ph:${id}:${meal}`);
        if (i % 2 === 1) keyboard.row();
      });
      keyboard.text(t.dontSave, `ph:${id}:cancel`);
      await ctx.api.editMessageText(status.chat.id, status.message_id, text, {
        reply_markup: keyboard,
      });
    } catch (e) {
      this.logger.error(`Food recognition (${source}) failed: ${(e as Error).message}`);
      const message =
        (e as { status?: number }).status === 429
          ? t.rateLimited
          : source === 'photo'
            ? t.photoFailed
            : t.textFailed;
      await ctx.api.editMessageText(status.chat.id, status.message_id, message);
    }
  }

  private async onPhotoChoice(ctx: Context) {
    const [, id, choice] = ctx.match as RegExpMatchArray;
    const entry = id ? this.pending.get(id) : undefined;
    if (!entry || entry.expiresAt < Date.now()) {
      const user = ctx.from && (await this.users.findByTelegramId(ctx.from.id));
      await ctx.answerCallbackQuery({ text: BOT_TEXT[user ? user.language : 'en'].expired });
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
      await this.diary.add(entry.userId, { ...item, meal }, entry.lang);
    }
    const total = sumNutrients(entry.items.map((i) => scaleNutrients(i.per100g, i.grams)));
    const t = BOT_TEXT[entry.lang];
    const label = mealButtons(entry.lang).find((b) => b.meal === meal)?.label ?? meal;
    await ctx.answerCallbackQuery({ text: t.saved });
    await ctx.editMessageText(t.savedTo(label, total.kcal), {
      reply_markup: this.miniAppKeyboard(entry.lang),
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
    // Список команд по умолчанию на английском, для русского интерфейса Telegram на русском
    for (const lang of LANGUAGES) {
      const { commands } = BOT_TEXT[lang];
      await this.bot.api.setMyCommands(
        [
          { command: 'start', description: commands.start },
          { command: 'language', description: commands.language },
        ],
        lang === 'en' ? {} : { language_code: lang },
      );
    }

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
