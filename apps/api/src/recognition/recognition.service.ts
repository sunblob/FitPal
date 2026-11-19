import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import {
  nutritionLabelSchema,
  photoRecognitionSchema,
  type ImageMediaType,
  type Language,
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
  withLanguage,
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

  private consume(userId: string, lang: Language) {
    const now = Date.now();
    const recent = (this.usage.get(userId) ?? []).filter((t) => now - t < HOUR_MS);
    if (recent.length >= HOURLY_LIMIT) {
      throw new HttpException(
        lang === 'ru'
          ? 'Слишком много запросов к ИИ за час, попробуй позже'
          : 'Too many AI requests this hour, try again later',
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
    lang: Language,
  ): Promise<NutritionLabel> {
    this.consume(userId, lang);
    const raw = await this.claude.parse({
      schema: nutritionLabelSchema,
      system: withLanguage(LABEL_SYSTEM, lang),
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
    lang: Language,
    hint?: string,
  ): Promise<PhotoRecognition> {
    this.consume(userId, lang);
    const raw = await this.claude.parse({
      schema: photoRecognitionSchema,
      system: withLanguage(RECOGNITION_SYSTEM, lang),
      prompt: recognitionPrompt(hint),
      images: [image],
      effort: 'medium',
      maxTokens: 8000,
    });
    return sanitizeRecognition(raw);
  }

  async recognizeText(userId: string, text: string, lang: Language): Promise<PhotoRecognition> {
    this.consume(userId, lang);
    const raw = await this.claude.parse({
      schema: photoRecognitionSchema,
      system: withLanguage(TEXT_RECOGNITION_SYSTEM, lang),
      prompt: textRecognitionPrompt(text),
      effort: 'low',
      maxTokens: 4000,
    });
    return sanitizeRecognition(raw);
  }
}
