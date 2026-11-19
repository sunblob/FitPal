import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().default(3000),
  DATABASE_URL: z.string().url(),
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_BOT_MODE: z.enum(['polling', 'webhook', 'off']).default('polling'),
  PUBLIC_API_URL: z.string().url().optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional(),
  MINIAPP_URL: z.string().url().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  /** Модель Claude для генерации планов и переводов. */
  ANTHROPIC_MODEL: z.string().default('claude-opus-5-5'),
  /** Откуда брать картинки упражнений (free-exercise-db через jsDelivr). */
  EXERCISE_MEDIA_BASE_URL: z
    .string()
    .url()
    .default('https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/'),
});

export type EnvVars = z.infer<typeof envSchema>;

/** Провайдер с проверенными переменными окружения. */
export abstract class Env {}
export interface Env extends EnvVars {}
