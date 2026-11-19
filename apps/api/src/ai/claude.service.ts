import { Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import type { z } from 'zod';
import { Env } from '../config/env.js';
import { DB, type Database } from '../db/db.module.js';
import { aiRequests } from '../db/schema.js';

type Effort = 'low' | 'medium' | 'high';

export type AiRequestKind = (typeof aiRequests.kind.enumValues)[number];

export interface AiTrack {
  kind: AiRequestKind;
  userId?: string;
}

export interface ClaudeImage {
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp';
  /** base64 без префикса data: */
  data: string;
}

/** Тонкая обёртка над Anthropic SDK: один запрос, ответ строго по Zod-схеме. */
@Injectable()
export class ClaudeService {
  private readonly logger = new Logger(ClaudeService.name);
  private readonly client: Anthropic | null;

  constructor(
    private readonly env: Env,
    @Inject(DB) private readonly db: Database,
  ) {
    this.client = env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }) : null;
  }

  get enabled(): boolean {
    return this.client !== null;
  }

  async parse<S extends z.ZodType>(opts: {
    schema: S;
    system: string;
    prompt: string;
    /** Картинки идут в сообщение перед текстом запроса. */
    images?: ClaudeImage[];
    effort?: Effort;
    maxTokens?: number;
    /** Для журнала запросов в админке. */
    track: AiTrack;
  }): Promise<z.infer<S>> {
    if (!this.client) throw new ServiceUnavailableException('ANTHROPIC_API_KEY не задан');

    const startedAt = Date.now();
    const response = await this.client.beta.messages
      .parse({
        model: this.env.ANTHROPIC_MODEL,
        max_tokens: opts.maxTokens ?? 16000,
        // При отказе классификатора сервер сам повторит запрос на запасной модели.
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        system: opts.system,
        messages: [
          {
            role: 'user',
            content: opts.images?.length
              ? [
                  ...opts.images.map((img) => ({
                    type: 'image' as const,
                    source: { type: 'base64' as const, media_type: img.mediaType, data: img.data },
                  })),
                  { type: 'text' as const, text: opts.prompt },
                ]
              : opts.prompt,
          },
        ],
        output_config: {
          effort: opts.effort ?? 'medium',
          format: betaZodOutputFormat(opts.schema),
        },
      })
      .catch((err: unknown) => {
        this.record(opts.track, startedAt, false);
        throw err;
      });
    this.record(
      opts.track,
      startedAt,
      response.stop_reason !== 'refusal' && response.parsed_output != null,
      response.model,
      response.usage,
    );

    if (response.stop_reason === 'refusal') {
      this.logger.warn(`Claude refused: ${JSON.stringify(response.stop_details)}`);
      throw new ServiceUnavailableException(
        'Не получилось выполнить запрос, попробуй изменить пожелания',
      );
    }
    if (response.stop_reason === 'max_tokens' || response.parsed_output == null) {
      throw new ServiceUnavailableException(
        'Не получилось получить полный ответ, попробуй ещё раз',
      );
    }
    return response.parsed_output as z.infer<S>;
  }

  /** Пишет запрос в журнал; ошибка записи не должна ломать сам запрос. */
  private record(
    track: AiTrack,
    startedAt: number,
    ok: boolean,
    model: string = this.env.ANTHROPIC_MODEL,
    usage?: { input_tokens: number; output_tokens: number },
  ): void {
    this.db
      .insert(aiRequests)
      .values({
        userId: track.userId ?? null,
        kind: track.kind,
        model,
        inputTokens: usage?.input_tokens ?? 0,
        outputTokens: usage?.output_tokens ?? 0,
        ok,
        durationMs: Date.now() - startedAt,
      })
      .catch((err: unknown) => this.logger.warn(`Не удалось записать AI-запрос: ${String(err)}`));
  }
}
