import { z } from 'zod';

/** Пустая строка из .env считается «не задано»: срабатывает .optional() или .default(). */
const unsetIfEmpty = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === '' ? undefined : v), schema);

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().default(3000),
  DATABASE_URL: z.string().url(),
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_BOT_MODE: z.enum(['polling', 'webhook', 'off']).default('polling'),
  PUBLIC_API_URL: unsetIfEmpty(z.string().url().optional()),
  TELEGRAM_WEBHOOK_SECRET: unsetIfEmpty(z.string().optional()),
  MINIAPP_URL: unsetIfEmpty(z.string().url().optional()),
  /** База Open Food Facts для поиска продуктов и штрихкодов. */
  OFF_BASE_URL: unsetIfEmpty(z.string().url().default('https://world.openfoodfacts.org')),
  /** Товары каких стран (теги OFF через запятую) показывать в поиске первыми. */
  OFF_PREFERRED_COUNTRIES: unsetIfEmpty(
    z
      .string()
      .default('en:slovakia,en:czech-republic')
      .transform((s) =>
        s
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean),
      ),
  ),
  ANTHROPIC_API_KEY: unsetIfEmpty(z.string().optional()),
  /** Модель Claude для генерации планов и переводов. */
  ANTHROPIC_MODEL: unsetIfEmpty(z.string().default('claude-opus-5-5')),
  /** Telegram ID через запятую, кому открыта админка. Пусто — админка выключена. */
  ADMIN_TELEGRAM_IDS: unsetIfEmpty(
    z
      .string()
      .default('')
      .transform((s) =>
        s
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean)
          .map(Number)
          .filter(Number.isSafeInteger),
      ),
  ),
  /** Откуда брать картинки упражнений (free-exercise-db через jsDelivr). */
  EXERCISE_MEDIA_BASE_URL: unsetIfEmpty(
    z
      .string()
      .url()
      .default('https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/'),
  ),
});

export type EnvVars = z.infer<typeof envSchema>;

/** Провайдер с проверенными переменными окружения. */
export abstract class Env {}
export interface Env extends EnvVars {}
