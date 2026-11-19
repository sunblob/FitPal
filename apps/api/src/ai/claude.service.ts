import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import type { z } from 'zod';
import { Env } from '../config/env.js';

type Effort = 'low' | 'medium' | 'high';

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

  constructor(private readonly env: Env) {
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
  }): Promise<z.infer<S>> {
    if (!this.client) throw new ServiceUnavailableException('ANTHROPIC_API_KEY не задан');

    const response = await this.client.beta.messages.parse({
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
      output_config: { effort: opts.effort ?? 'medium', format: betaZodOutputFormat(opts.schema) },
    });

    if (response.stop_reason === 'refusal') {
      this.logger.warn(`Claude refused: ${JSON.stringify(response.stop_details)}`);
      throw new ServiceUnavailableException('Claude отказался выполнить запрос');
    }
    if (response.stop_reason === 'max_tokens' || response.parsed_output == null) {
      throw new ServiceUnavailableException('Claude вернул неполный ответ, попробуй ещё раз');
    }
    return response.parsed_output as z.infer<S>;
  }
}
