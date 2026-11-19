import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { and, arrayOverlaps, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { Equipment, ExerciseDto, ExerciseLevel, Muscle } from '@fitpal/shared';
import { ClaudeService } from '../ai/claude.service.js';
import { Env } from '../config/env.js';
import { DB, type Database } from '../db/db.module.js';
import { exercises, type Exercise } from '../db/schema.js';

export const EXERCISES_DATA_URL =
  'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/dist/exercises.json';

const LEVEL_ORDER: ExerciseLevel[] = ['beginner', 'intermediate', 'expert'];

/** Запись из free-exercise-db/dist/exercises.json. */
const sourceExerciseSchema = z.object({
  id: z.string(),
  name: z.string(),
  force: z.string().nullable().optional(),
  level: z.string().nullable().optional(),
  mechanic: z.string().nullable().optional(),
  equipment: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  primaryMuscles: z.array(z.string()),
  secondaryMuscles: z.array(z.string()),
  instructions: z.array(z.string()),
  images: z.array(z.string()),
});

const nameTranslationSchema = z.object({
  items: z.array(z.object({ id: z.string(), name: z.string() })),
});
const instructionsTranslationSchema = z.object({ instructions: z.array(z.string()) });

const TRANSLATE_SYSTEM =
  'Ты переводчик фитнес-терминологии с английского на русский. Используй названия упражнений, ' +
  'привычные в русскоязычных залах (например «Жим штанги лёжа», «Тяга верхнего блока», ' +
  '«Румынская тяга»). Без кавычек и пояснений.';

@Injectable()
export class ExercisesService {
  private readonly logger = new Logger(ExercisesService.name);

  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly env: Env,
    private readonly claude: ClaudeService,
  ) {}

  /** Загружает каталог из free-exercise-db и upsert'ит его. Русские названия не трогает. */
  async importCatalog(url = EXERCISES_DATA_URL): Promise<number> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Не удалось скачать каталог: HTTP ${res.status}`);
    const items = z.array(sourceExerciseSchema).parse(await res.json());

    for (let i = 0; i < items.length; i += 200) {
      const rows = items.slice(i, i + 200).map((e) => ({
        id: e.id,
        nameEn: e.name,
        force: e.force ?? null,
        level: e.level ?? null,
        mechanic: e.mechanic ?? null,
        equipment: e.equipment ?? null,
        category: e.category ?? null,
        primaryMuscles: e.primaryMuscles,
        secondaryMuscles: e.secondaryMuscles,
        instructionsEn: e.instructions,
        images: e.images,
      }));
      await this.db
        .insert(exercises)
        .values(rows)
        .onConflictDoUpdate({
          target: exercises.id,
          set: {
            nameEn: sql`excluded.name_en`,
            force: sql`excluded.force`,
            level: sql`excluded.level`,
            mechanic: sql`excluded.mechanic`,
            equipment: sql`excluded.equipment`,
            category: sql`excluded.category`,
            primaryMuscles: sql`excluded.primary_muscles`,
            secondaryMuscles: sql`excluded.secondary_muscles`,
            instructionsEn: sql`excluded.instructions_en`,
            images: sql`excluded.images`,
          },
        });
    }
    return items.length;
  }

  /** Переводит на русский названия, у которых ещё нет перевода. Возвращает число переведённых. */
  async translateMissingNames(batchSize = 60): Promise<number> {
    let done = 0;
    for (;;) {
      const batch = await this.db
        .select({ id: exercises.id, nameEn: exercises.nameEn })
        .from(exercises)
        .where(isNull(exercises.nameRu))
        .orderBy(exercises.id)
        .limit(batchSize);
      if (batch.length === 0) return done;

      const { items } = await this.claude.parse({
        schema: nameTranslationSchema,
        system: TRANSLATE_SYSTEM,
        effort: 'low',
        prompt:
          'Переведи названия упражнений на русский. Верни каждый id без изменений.\n\n' +
          batch.map((e) => `${e.id}\t${e.nameEn}`).join('\n'),
      });

      const known = new Map(batch.map((e) => [e.id, e.nameEn]));
      let translated = 0;
      for (const item of items) {
        if (!known.has(item.id) || !item.name.trim()) continue;
        await this.db
          .update(exercises)
          .set({ nameRu: item.name.trim() })
          .where(eq(exercises.id, item.id));
        translated++;
      }
      // Если Claude ничего не вернул для этой пачки, не крутимся вечно.
      if (translated === 0) throw new Error('Перевод названий не удался');
      done += translated;
      this.logger.log(`Переведено названий: ${done}`);
    }
  }

  /**
   * Кандидаты для плана: упражнения на выбранные мышцы (основные или вспомогательные),
   * которые можно сделать с доступным инвентарём и не сложнее уровня пользователя.
   */
  async findCandidates(opts: {
    muscles: Muscle[];
    equipment: Equipment[];
    level: ExerciseLevel;
  }): Promise<Exercise[]> {
    const levels = LEVEL_ORDER.slice(0, LEVEL_ORDER.indexOf(opts.level) + 1);
    const equipment = ['body only', ...opts.equipment];
    return this.db
      .select()
      .from(exercises)
      .where(
        and(
          or(
            arrayOverlaps(exercises.primaryMuscles, opts.muscles),
            arrayOverlaps(exercises.secondaryMuscles, opts.muscles),
          ),
          or(isNull(exercises.equipment), inArray(exercises.equipment, equipment)),
          or(isNull(exercises.level), inArray(exercises.level, levels)),
        ),
      );
  }

  async findByIds(ids: string[]): Promise<Map<string, Exercise>> {
    if (ids.length === 0) return new Map();
    const rows = await this.db.select().from(exercises).where(inArray(exercises.id, ids));
    return new Map(rows.map((r) => [r.id, r]));
  }

  /** Карточка упражнения. При первом открытии переводит инструкцию на русский и кэширует её. */
  async getDetails(id: string): Promise<ExerciseDto> {
    const [row] = await this.db.select().from(exercises).where(eq(exercises.id, id));
    if (!row) throw new NotFoundException();
    if (row.instructionsRu || !this.claude.enabled || row.instructionsEn.length === 0) {
      return this.toDto(row);
    }

    try {
      const { instructions } = await this.claude.parse({
        schema: instructionsTranslationSchema,
        system: TRANSLATE_SYSTEM,
        effort: 'low',
        prompt:
          `Переведи шаги техники упражнения «${row.nameEn}» на русский. ` +
          'Сохрани количество и порядок шагов.\n\n' +
          row.instructionsEn.map((s, i) => `${i + 1}. ${s}`).join('\n'),
      });
      const [updated] = await this.db
        .update(exercises)
        .set({ instructionsRu: instructions })
        .where(eq(exercises.id, id))
        .returning();
      return this.toDto(updated ?? row);
    } catch (e) {
      this.logger.warn(`Не удалось перевести инструкцию ${id}: ${String(e)}`);
      return this.toDto(row);
    }
  }

  toDto(row: Exercise): ExerciseDto {
    const name = row.nameRu ?? row.nameEn;
    const query = row.nameRu ? `${row.nameRu} техника выполнения` : `${row.nameEn} exercise form`;
    return {
      id: row.id,
      name,
      nameEn: row.nameEn,
      level: row.level,
      equipment: row.equipment,
      category: row.category,
      primaryMuscles: row.primaryMuscles,
      secondaryMuscles: row.secondaryMuscles,
      images: row.images.map((p) => new URL(p, this.env.EXERCISE_MEDIA_BASE_URL).toString()),
      instructions: row.instructionsRu ?? row.instructionsEn,
      youtubeUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
    };
  }
}
