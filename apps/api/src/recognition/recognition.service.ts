import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import {
  nutritionLabelSchema,
  photoRecognitionSchema,
  type ImageMediaType,
  type NutritionLabel,
  type PhotoRecognition,
  type RecognizedFood,
} from '@fitpal/shared';
import { ClaudeService } from '../ai/claude.service.js';
import {
  LABEL_PROMPT,
  LABEL_SYSTEM,
  RECOGNITION_SYSTEM,
  TEXT_RECOGNITION_SYSTEM,
  recognitionPrompt,
  textRecognitionPrompt,
} from './recognition.prompt.js';

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Приводит ответ модели к разумным границам, чтобы не попасть в дневник с мусором. */
export function sanitizeRecognition(raw: PhotoRecognition): PhotoRecognition {
  const items: RecognizedFood[] = raw.items
    .filter((i) => i.name.trim() && Number.isFinite(i.grams) && i.grams > 0)
    .map((i) => ({
      name: i.name.trim().slice(0, 200),
      grams: Math.round(clamp(i.grams, 1, 5000)),
      per100g: {
        kcal: Math.round(clamp(i.per100g.kcal, 0, 900)),
        protein: round1(clamp(i.per100g.protein, 0, 100)),
        fat: round1(clamp(i.per100g.fat, 0, 100)),
        carbs: round1(clamp(i.per100g.carbs, 0, 100)),
      },
    }));
  return { items, note: raw.note?.trim() || null };
}

/** Чистит ответ по этикетке: границы КБЖУ и пустые строки. */
export function sanitizeLabel(raw: NutritionLabel): NutritionLabel {
  const text = (s: string | null) => s?.trim().slice(0, 200) || null;
  const n = raw.per100g;
  return {
    name: text(raw.name),
    brand: text(raw.brand),
    per100g: n
      ? {
          kcal: Math.round(clamp(n.kcal, 0, 900)),
          protein: round1(clamp(n.protein, 0, 100)),
          fat: round1(clamp(n.fat, 0, 100)),
          carbs: round1(clamp(n.carbs, 0, 100)),
        }
      : null,
    note: raw.note?.trim() || null,
  };
}

/**
 * Сколько запросов к ИИ (фото и описания вместе) один пользователь может сделать за час:
 * защищает ключ Anthropic от перерасхода.
 */
const HOURLY_LIMIT = 30;
const HOUR_MS = 60 * 60 * 1000;

@Injectable()
export class RecognitionService {
  private readonly usage = new Map<string, number[]>();

  constructor(private readonly claude: ClaudeService) {}

  private consume(userId: string) {
    const now = Date.now();
    const recent = (this.usage.get(userId) ?? []).filter((t) => now - t < HOUR_MS);
    if (recent.length >= HOURLY_LIMIT) {
      throw new HttpException(
        'Слишком много запросов к ИИ за час, попробуй позже',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    recent.push(now);
    this.usage.set(userId, recent);
  }

  get enabled() {
    return this.claude.enabled;
  }

  async readLabel(
    userId: string,
    image: { mediaType: ImageMediaType; data: string },
  ): Promise<NutritionLabel> {
    this.consume(userId);
    const raw = await this.claude.parse({
      schema: nutritionLabelSchema,
      system: LABEL_SYSTEM,
      prompt: LABEL_PROMPT,
      images: [image],
      effort: 'low',
      maxTokens: 2000,
    });
    return sanitizeLabel(raw);
  }

  async recognize(
    userId: string,
    image: { mediaType: ImageMediaType; data: string },
    hint?: string,
  ): Promise<PhotoRecognition> {
    this.consume(userId);
    const raw = await this.claude.parse({
      schema: photoRecognitionSchema,
      system: RECOGNITION_SYSTEM,
      prompt: recognitionPrompt(hint),
      images: [image],
      effort: 'medium',
      maxTokens: 8000,
    });
    return sanitizeRecognition(raw);
  }

  async recognizeText(userId: string, text: string): Promise<PhotoRecognition> {
    this.consume(userId);
    const raw = await this.claude.parse({
      schema: photoRecognitionSchema,
      system: TEXT_RECOGNITION_SYSTEM,
      prompt: textRecognitionPrompt(text),
      effort: 'low',
      maxTokens: 4000,
    });
    return sanitizeRecognition(raw);
  }
}
